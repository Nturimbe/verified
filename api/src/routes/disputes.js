const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const { sendSMS, messages } = require('../services/sms');
const { sendEmail, emailTemplates } = require('../services/email');
const { sanitizeText } = require('../utils/sanitize');
const { recordMovement } = require('../services/ledger');
const { requireAdmin, requireCsrf } = require('../middleware/auth');
const { requireAuth } = require('./auth');
const { createNotification } = require('../services/notify');
const { splitWithFee, splitPartial } = require('../utils/money');

// ── POST /disputes ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { transactionId, reason, reasonCategory, evidence } = req.body;
  const cleanReason = reason ? sanitizeText(reason) : reason;

  if (!transactionId || !reason) {
    return res.status(400).json({
      error: 'transactionId and reason are required'
    });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const callerPhone = req.user.phone;
    let raisedBy;
    if (callerPhone === transaction.sellerMomo) {
      raisedBy = 'SELLER';
    } else if (callerPhone === transaction.buyerPhone) {
      raisedBy = 'BUYER';
    } else {
      return res.status(403).json({ error: 'You are not a party to this transaction.' });
    }

    if (!['FUNDED', 'DISPATCHED'].includes(transaction.state)) {
      return res.status(400).json({
        error: 'Disputes can only be raised on funded or dispatched transactions'
      });
    }

    const responseDeadline = new Date();
    responseDeadline.setHours(responseDeadline.getHours() + 48);

    const dispute = await prisma.dispute.create({
      data: {
        transactionId,
        reason: cleanReason,
        reasonCategory: reasonCategory || 'OTHER',
        evidence: evidence || null,
        raisedBy,
        status: 'OPEN',
        responseDeadline
      }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId: dispute.id,
        action: 'DISPUTE_OPENED',
        performedBy: raisedBy,
        note: `Reason: ${reason}`
      }
    });

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { state: 'DISPUTED' }
    });

    if (transaction.sellerMomo) {
      await sendSMS(
        transaction.sellerMomo,
        `Verified DISPUTE: A dispute has been raised on "${transaction.itemName}". ` +
        `Please respond within 48 hours. Dispute ID: ${dispute.id.split('-')[0]}`
      );
      await createNotification({
        phone: transaction.sellerMomo,
        title: 'Dispute Raised',
        message: `A dispute was raised on "${transaction.itemName}". Respond within 48 hours.`,
        type: 'DISPUTE',
        link: `/dispatch/${transaction.id}`
      });
    }
    if (transaction.buyerPhone) {
      await sendSMS(
        transaction.buyerPhone,
        `Verified: Your dispute for "${transaction.itemName}" has been received. ` +
        `Reference: ${dispute.id.split('-')[0]}. Our team reviews within 48 hours.`
      );
      await createNotification({
        phone: transaction.buyerPhone,
        title: 'Dispute Received',
        message: `Your dispute for "${transaction.itemName}" is under review.`,
        type: 'DISPUTE',
        link: `/confirm/${transaction.id}`
      });
    }

    if (transaction.buyerEmail && !transaction.buyerEmail.includes('@verified.gh')) {
      const tpl = emailTemplates.disputeRaised({
        itemName: transaction.itemName,
        disputeId: dispute.id
      });
      await sendEmail({ to: transaction.buyerEmail, ...tpl });
    }

    res.status(201).json({
      message: 'Dispute raised. Funds are frozen.',
      disputeId: dispute.id,
      deadline: responseDeadline
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// ── POST /disputes/:id/response ──────────────────────────────────────────────
router.post('/:id/response', requireAuth, async (req, res) => {
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ error: 'Response text is required' });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { transaction: true }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'OPEN') {
      return res.status(400).json({ error: 'Dispute is already resolved' });
    }

    if (req.user.phone !== dispute.transaction.sellerMomo) {
      return res.status(403).json({ error: 'Only the seller can respond to this dispute.' });
    }

    await prisma.dispute.update({
      where: { id: req.params.id },
      data: { sellerResponse: response }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId: dispute.id,
        action: 'SELLER_RESPONDED',
        performedBy: dispute.transaction.sellerMomo,
        note: response
      }
    });
    res.json({ message: 'Response recorded. Admin will review shortly.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// ── GET /disputes ────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: { status: 'OPEN' },
      include: {
        transaction: { include: { ledgerEntries: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(disputes);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ── GET /disputes/:id ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        transaction: { include: { ledgerEntries: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const callerPhone = req.user.phone;
    const isParty = callerPhone === dispute.transaction.sellerMomo ||
                    callerPhone === dispute.transaction.buyerPhone;
    if (!isParty) {
      return res.status(403).json({ error: 'You are not a party to this dispute.' });
    }

    res.json(dispute);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// ── POST /disputes/:id/resolve ───────────────────────────────────────────────
router.post('/:id/resolve', requireAdmin, requireCsrf, async (req, res) => {
  const { decision, decisionReason, decidedBy, partialAmount } = req.body;

  if (!decision || !decisionReason || !decidedBy) {
    return res.status(400).json({
      error: 'decision, decisionReason, and decidedBy are required'
    });
  }

  if (!['RELEASE_TO_SELLER', 'REFUND_TO_BUYER', 'PARTIAL_SPLIT'].includes(decision)) {
    return res.status(400).json({
      error: 'decision must be RELEASE_TO_SELLER, REFUND_TO_BUYER, or PARTIAL_SPLIT'
    });
  }

  if (decision === 'PARTIAL_SPLIT' && (!partialAmount || partialAmount <= 0)) {
return res.status(400).json({ error: 'partialAmount is required for PARTIAL_SPLIT' });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { transaction: true }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

        if (dispute.status !== 'OPEN') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }

    // Atomic claim — if another concurrent request already moved this dispute
    // out of OPEN, this update matches zero rows and we bail before any transfer.
    const claim = await prisma.dispute.updateMany({
      where: { id: req.params.id, status: 'OPEN' },
      data:  { status: 'PROCESSING' }
    });
    if (claim.count === 0) {
      return res.status(409).json({ error: 'This dispute was already being processed by another request.' });
    }

    const transaction = dispute.transaction;
    const needsDualApproval = transaction.amount >= 500;

    if (needsDualApproval) {
      // High-value dispute — record the decision but do NOT move money yet.
      // A second, different admin must call POST /:id/approve to release funds.
           await prisma.dispute.update({
        where: { id: req.params.id },
        data: {
          status:           'PENDING_APPROVAL',
          decision,
          decisionReason,
          decidedBy,
          decidedByAdminId: req.admin.id,
          decidedAt:        new Date(),
          proposedAmount:   decision === 'PARTIAL_SPLIT' ? parseFloat(partialAmount) : null
        }
      });

      await prisma.disputeAuditLog.create({
        data: {
          disputeId:   dispute.id,
          action:      `SUBMITTED_${decision}`,
          performedBy: decidedBy,
          note:        `${decisionReason} | Awaiting second-admin approval (amount ≥ GHS 500)${
            decision === 'PARTIAL_SPLIT' ? ` | Proposed split: seller GHS ${partialAmount}` : ''
          }`
        }
      });

      return res.json({
        message: 'Decision submitted. A second admin must approve before funds are released.',
        disputeId: dispute.id,
        status: 'PENDING_APPROVAL'
      });
    }

    // Below GHS 500 — no second approval required, proceed immediately.
    const approvedBy = null;
    const USE_MOCK_TRANSFER = process.env.USE_MOCK_TRANSFER !== 'false';
    const { transferToMomo, mockTransfer, refundBuyer, mockRefund } = require('../services/paystack');
    const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;
     const refundFn    = USE_MOCK_TRANSFER ? mockRefund   : refundBuyer;

    if (decision === 'PARTIAL_SPLIT') {
            const requestedSellerAmount = parseFloat(partialAmount);
      if (requestedSellerAmount > transaction.amount) {
        return res.status(400).json({
          error: `partialAmount (${requestedSellerAmount}) cannot exceed the transaction total (${transaction.amount}).`
        });
      }
      const { sellerAmount, buyerRefund } = splitPartial(transaction.amount, requestedSellerAmount);
      const transferResult = await transferFn({
        amount: sellerAmount,
        momoNumber: transaction.sellerMomo,
        transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'PENDING_RELEASE',
        toAccount: 'SELLER_MOMO',
        amount: sellerAmount,
        reference: transferResult.transfer_code || transferResult.status,
        note: 'Partial dispute resolution: seller portion'
      });

      const refundResult = await refundFn({
        transactionId: transaction.id,
        amount: buyerRefund,
        reason: 'Partial dispute resolution: buyer refund'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'PENDING_RELEASE',
        toAccount: 'BUYER_REFUND',
        amount: buyerRefund,
        reference: refundResult.status,
        note: 'Partial dispute resolution: buyer refund'
      });

      if (transaction.sellerMomo) {
        await sendSMS(transaction.sellerMomo,
          `Verified: Dispute resolved with partial split. GHS ${sellerAmount} released to your MoMo.`);
      }
      if (transaction.buyerPhone) {
        await sendSMS(transaction.buyerPhone,
          `Verified: Dispute resolved with partial split. GHS ${buyerRefund} refunded to you.`);
      }
    }

    if (decision === 'RELEASE_TO_SELLER') {
      const { fee: verifiedFee, sellerAmount } = splitWithFee(transaction.amount);
      const transferResult = await transferFn({
        amount: sellerAmount,
        momoNumber: transaction.sellerMomo,
        transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'PENDING_RELEASE',
        toAccount: 'SELLER_MOMO',
        amount: sellerAmount,
        reference: transferResult.transfer_code || transferResult.status,
        note: 'Dispute resolved: release to seller'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'PENDING_RELEASE',
        toAccount: 'VERIFIED_FEES',
        amount: verifiedFee,
        note: '3% Verified platform fee on dispute resolution'
      });
    }

    if (decision === 'REFUND_TO_BUYER') {
      const refundResult = await refundFn({
        transactionId: transaction.id,
        amount: transaction.amount,
        reason: 'Dispute resolved: refund to buyer'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'PENDING_RELEASE',
        toAccount: 'BUYER_REFUND',
        amount: transaction.amount,
        reference: refundResult.status,
        note: 'Dispute resolved: refund to buyer'
      });
    }

    await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        decision,
        decisionReason,
        decidedBy,
        approvedBy: approvedBy || null,
        decidedAt: new Date()
      }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId: dispute.id,
        action: `RESOLVED_${decision}`,
        performedBy: decidedBy,
        note: `${decisionReason}${approvedBy ? ` | Approved by: ${approvedBy}` : ''}`
      }
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { state: 'RESOLVED' }
    });

    if (decision === 'RELEASE_TO_SELLER') {
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          `Verified: Dispute resolved in your favour. GHS ${transaction.amount} will be released to your MoMo. Ref: ${dispute.id.split('-')[0]}`
        );
      }
      if (transaction.buyerPhone) {
        await sendSMS(
          transaction.buyerPhone,
          `Verified: Dispute for "${transaction.itemName}" resolved. Decision: payment released to seller. Ref: ${dispute.id.split('-')[0]}`
        );
      }
    }

    if (decision === 'REFUND_TO_BUYER') {
      if (transaction.buyerPhone) {
        await sendSMS(
          transaction.buyerPhone,
          `Verified: Dispute resolved in your favour. A refund of GHS ${transaction.amount} is being processed. Ref: ${dispute.id.split('-')[0]}`
        );
      }
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          `Verified: Dispute for "${transaction.itemName}" resolved in buyer's favour. Ref: ${dispute.id.split('-')[0]}`
        );
      }
    }

    res.json({
      message: `Dispute resolved. Decision: ${decision}`,
      disputeId: dispute.id,
      decision,
      decidedAt: new Date()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// ── POST /disputes/:id/approve ───────────────────────────────────────────────
// Second admin sign-off — only this route actually moves money for
// high-value disputes. Requires a DIFFERENT authenticated admin from
// the one who submitted the decision via /resolve.
router.post('/:id/approve', requireAdmin, requireCsrf, async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: { transaction: true }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: 'This dispute is not awaiting approval.' });
    }

    if (dispute.decidedByAdminId === req.admin.id) {
      return res.status(403).json({
        error: 'You submitted this decision. A different admin must approve it.'
      });
    }

    // Atomic claim — a double-click or retry by the same approving admin
    // will match zero rows on the second attempt and bail before transferring.
    const claim = await prisma.dispute.updateMany({
      where: { id: req.params.id, status: 'PENDING_APPROVAL' },
      data:  { status: 'PROCESSING' }
    });
    if (claim.count === 0) {
      return res.status(409).json({ error: 'This dispute was already being processed.' });
    }

    const transaction   = dispute.transaction;
    const decision       = dispute.decision;
    const partialAmount = dispute.proposedAmount;

    const USE_MOCK_TRANSFER = process.env.USE_MOCK_TRANSFER !== 'false';
    const { transferToMomo, mockTransfer, refundBuyer, mockRefund } = require('../services/paystack');
    const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;
    const refundFn    = USE_MOCK_TRANSFER ? mockRefund   : refundBuyer;

       if (decision === 'PARTIAL_SPLIT') {
      const requestedSellerAmount = parseFloat(partialAmount);
      if (requestedSellerAmount > transaction.amount) {
        return res.status(400).json({
          error: `Stored partialAmount (${requestedSellerAmount}) exceeds the transaction total (${transaction.amount}). Refusing to process.`
        });
      }
      const { sellerAmount, buyerRefund } = splitPartial(transaction.amount, requestedSellerAmount);

      const transferResult = await transferFn({
        amount: sellerAmount, momoNumber: transaction.sellerMomo, transactionId: transaction.id
      });
      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'SELLER_MOMO',
        amount: sellerAmount, reference: transferResult.transfer_code || transferResult.status,
        note: 'Partial dispute resolution: seller portion (approved)'
      });

      const refundResult = await refundFn({
        transactionId: transaction.id, amount: buyerRefund, reason: 'Partial dispute resolution'
      });
      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'BUYER_REFUND',
        amount: buyerRefund, reference: refundResult.status,
        note: 'Partial dispute resolution: buyer refund (approved)'
      });

      if (transaction.sellerMomo) {
        await sendSMS(transaction.sellerMomo,
          `Verified: Dispute resolved with partial split. GHS ${sellerAmount} released to your MoMo.`);
      }
      if (transaction.buyerPhone) {
        await sendSMS(transaction.buyerPhone,
          `Verified: Dispute resolved with partial split. GHS ${buyerRefund} refunded to you.`);
      }
    }

    if (decision === 'RELEASE_TO_SELLER') {
      const verifiedFee  = parseFloat((transaction.amount * 0.03).toFixed(2));
      const sellerAmount = parseFloat((transaction.amount - verifiedFee).toFixed(2));

      const transferResult = await transferFn({
        amount: sellerAmount, momoNumber: transaction.sellerMomo, transactionId: transaction.id
      });
      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'SELLER_MOMO',
        amount: sellerAmount, reference: transferResult.transfer_code || transferResult.status,
        note: 'Dispute resolved: release to seller (approved)'
      });
      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'VERIFIED_FEES',
        amount: verifiedFee, note: '3% Verified platform fee on dispute resolution'
      });

      if (transaction.sellerMomo) {
        await sendSMS(transaction.sellerMomo,
          `Verified: Dispute resolved in your favour. GHS ${sellerAmount} released to your MoMo. Ref: ${dispute.id.split('-')[0]}`);
      }
      if (transaction.buyerPhone) {
        await sendSMS(transaction.buyerPhone,
          `Verified: Dispute for "${transaction.itemName}" resolved. Payment released to seller. Ref: ${dispute.id.split('-')[0]}`);
      }
    }

    if (decision === 'REFUND_TO_BUYER') {
      const refundResult = await refundFn({
        transactionId: transaction.id, amount: transaction.amount, reason: 'Dispute resolved: refund'
      });
      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'BUYER_REFUND',
        amount: transaction.amount, reference: refundResult.status,
        note: 'Dispute resolved: refund to buyer (approved)'
      });

      if (transaction.buyerPhone) {
        await sendSMS(transaction.buyerPhone,
          `Verified: Dispute resolved in your favour. A refund of GHS ${transaction.amount} is being processed. Ref: ${dispute.id.split('-')[0]}`);
      }
      if (transaction.sellerMomo) {
        await sendSMS(transaction.sellerMomo,
          `Verified: Dispute for "${transaction.itemName}" resolved in buyer's favour. Ref: ${dispute.id.split('-')[0]}`);
      }
    }

    await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status:            'RESOLVED',
        approvedBy:        req.admin.name,
        approvedByAdminId: req.admin.id,
        approvedAt:        new Date()
      }
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data:  { state: 'RESOLVED' }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId:   dispute.id,
        action:      `APPROVED_${decision}`,
        performedBy: req.admin.name,
        note:        `Approved and executed by ${req.admin.name}`
      }
    });

    res.json({ message: `Dispute approved and resolved. Decision: ${decision}` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve dispute' });
  }
});

module.exports = router;
