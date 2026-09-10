const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const { sendSMS, messages } = require('../services/sms');
const { sendEmail, emailTemplates } = require('../services/email');
const { sanitizeText } = require('../utils/sanitize');
const { recordMovement } = require('../services/ledger');
const { requireAdmin, requireCsrf } = require('../middleware/auth');
const { createNotification } = require('../services/notify');

// ── POST /disputes ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { transactionId, reason, reasonCategory, evidence, raisedBy } = req.body;
  const cleanReason = reason ? sanitizeText(reason) : reason;

  if (!transactionId || !reason || !raisedBy) {
    return res.status(400).json({
      error: 'transactionId, reason, and raisedBy are required'
    });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
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
router.post('/:id/response', async (req, res) => {
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
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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

    res.json(dispute);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dispute' });
  }
});

// ── POST /disputes/:id/resolve ───────────────────────────────────────────────
 router.post('/:id/resolve', requireAdmin, requireCsrf, async (req, res) => {
  const { decision, decisionReason, decidedBy, approvedBy, partialAmount } = req.body;

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

    const transaction = dispute.transaction;

        const { approverToken } = req.body;

    if (transaction.amount >= 500 && !approverToken) {
      return res.status(400).json({
        error: 'Transactions above GHS 500 require a second admin to authenticate approval. Provide approverToken.'
      });
    }

    let approvedByVerified = null;
    if (approverToken) {
      try {
        const jwt = require('jsonwebtoken');
        const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
        const approverPayload = jwt.verify(approverToken, ADMIN_JWT_SECRET);
        approvedByVerified = approverPayload.name;

        if (approverPayload.id === req.admin.id) {
          return res.status(400).json({
            error: 'The approving admin must be a different, separately authenticated admin.'
          });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid or expired approver session.' });
      }
    }
    const approvedBy = approvedByVerified;

    if (approvedBy && approvedBy === decidedBy) {
      return res.status(400).json({
        error: 'The approving admin must be different from the deciding admin.'
      });
    }

      const USE_MOCK_TRANSFER = process.env.USE_MOCK_TRANSFER !== 'false';
    const { transferToMomo, mockTransfer, refundBuyer, mockRefund } = require('../services/paystack');
    const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;
    const refundFn    = USE_MOCK_TRANSFER ? mockRefund   : refundBuyer;

    if (decision === 'PARTIAL_SPLIT') {
      const sellerAmount = parseFloat(partialAmount);
      const buyerRefund = transaction.amount - sellerAmount;

      const transferResult = await transferFn({
        amount: sellerAmount,
        momoNumber: transaction.sellerMomo,
        transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'VERIFIED_ESCROW',
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
        fromAccount: 'VERIFIED_ESCROW',
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
      const verifiedFee  = parseFloat((transaction.amount * 0.03).toFixed(2));
      const sellerAmount = parseFloat((transaction.amount - verifiedFee).toFixed(2));

      const transferResult = await transferFn({
        amount: sellerAmount,
        momoNumber: transaction.sellerMomo,
        transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'VERIFIED_ESCROW',
        toAccount: 'SELLER_MOMO',
        amount: sellerAmount,
        reference: transferResult.transfer_code || transferResult.status,
        note: 'Dispute resolved: release to seller'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount: 'VERIFIED_ESCROW',
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
        fromAccount: 'VERIFIED_ESCROW',
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

module.exports = router;