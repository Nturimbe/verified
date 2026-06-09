const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const { sendSMS, messages } = require('../services/sms');
const { sendEmail, emailTemplates } = require('../services/email');

// ── POST /disputes ───────────────────────────────────────────────────────────
// Buyer raises a dispute
router.post('/', async (req, res) => {
  const { transactionId, reason, reasonCategory, evidence, raisedBy } = req.body;

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

    // Set 48-hour response deadline for seller
    const responseDeadline = new Date();
    responseDeadline.setHours(responseDeadline.getHours() + 48);

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        transactionId,
        reason,
        reasonCategory: reasonCategory || 'OTHER',
        evidence:       evidence || null,
        raisedBy,
        status:          'OPEN',
        responseDeadline
      }
    });

    // Log the action
    await prisma.disputeAuditLog.create({
      data: {
        disputeId:   dispute.id,
        action:      'DISPUTE_OPENED',
        performedBy: raisedBy,
        note:        `Reason: ${reason}`
      }
    });

    // Move transaction to DISPUTED
    await prisma.transaction.update({
      where: { id: transactionId },
      data:  { state: 'DISPUTED' }
    });

    // Notify both parties
    if (transaction.sellerMomo) {
      await sendSMS(
        transaction.sellerMomo,
        `Verified DISPUTE: A dispute has been raised on "${transaction.itemName}". ` +
        `Please respond within 48 hours. Dispute ID: ${dispute.id.split('-')[0]}`
      );
    }
    if (transaction.buyerPhone) {
      await sendSMS(
        transaction.buyerPhone,
        `Verified: Your dispute for "${transaction.itemName}" has been received. ` +
        `Reference: ${dispute.id.split('-')[0]}. Our team reviews within 48 hours.`
      );
    }
    

    res.status(201).json({
      message:  'Dispute raised. Funds are frozen.',
      disputeId: dispute.id,
      deadline: responseDeadline
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// ── POST /disputes/:id/response ──────────────────────────────────────────────
// Seller submits their response
router.post('/:id/response', async (req, res) => {
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ error: 'Response text is required' });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where:   { id: req.params.id },
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
      data:  { sellerResponse: response }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId:   dispute.id,
        action:      'SELLER_RESPONDED',
        performedBy: dispute.transaction.sellerMomo,
        note:        response
      }
    });

    res.json({ message: 'Response recorded. Admin will review shortly.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// ── GET /disputes ────────────────────────────────────────────────────────────
// Admin — list all open disputes
router.get('/', async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where:   { status: 'OPEN' },
      include: {
        transaction: { include: { ledgerEntries: true } },
        auditLogs:   { orderBy: { createdAt: 'asc' } }
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
// Admin — view a single dispute with full context
router.get('/:id', async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where:   { id: req.params.id },
      include: {
        transaction: { include: { ledgerEntries: true } },
        auditLogs:   { orderBy: { createdAt: 'asc' } }
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
// Admin — resolve a dispute
router.post('/:id/resolve', async (req, res) => {
  const { decision, decisionReason, decidedBy, approvedBy } = req.body;

  if (!decision || !decisionReason || !decidedBy) {
    return res.status(400).json({
      error: 'decision, decisionReason, and decidedBy are required'
    });
  }

  if (!['RELEASE_TO_SELLER', 'REFUND_TO_BUYER'].includes(decision)) {
    return res.status(400).json({
      error: 'decision must be RELEASE_TO_SELLER or REFUND_TO_BUYER'
    });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where:   { id: req.params.id },
      include: { transaction: true }
    });

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    if (dispute.status !== 'OPEN') {
      return res.status(400).json({ error: 'Dispute already resolved' });
    }

    const transaction = dispute.transaction;

    // Dual approval required for transactions above GHS 500
    if (transaction.amount >= 500 && !approvedBy) {
      return res.status(400).json({
        error: `Transactions above GHS 500 require a second admin approval. Provide approvedBy.`
      });
    }

    if (approvedBy && approvedBy === decidedBy) {
      return res.status(400).json({
        error: 'The approving admin must be different from the deciding admin.'
      });
    }

    // Update dispute
    await prisma.dispute.update({
      where: { id: req.params.id },
      data: {
        status:         'RESOLVED',
        decision,
        decisionReason,
        decidedBy,
        approvedBy:     approvedBy || null,
        decidedAt:      new Date()
      }
    });

    // Audit log
    await prisma.disputeAuditLog.create({
      data: {
        disputeId:   dispute.id,
        action:      `RESOLVED_${decision}`,
        performedBy: decidedBy,
        note:        `${decisionReason}${approvedBy ? ` | Approved by: ${approvedBy}` : ''}`
      }
    });

    // Move transaction to RESOLVED
    await prisma.transaction.update({
      where: { id: transaction.id },
      data:  { state: 'RESOLVED' }
    });

    // Notify both parties of outcome
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
      message:  `Dispute resolved. Decision: ${decision}`,
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