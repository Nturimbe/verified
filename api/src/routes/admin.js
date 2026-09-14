
const express = require('express');
const router  = express.Router();
const prisma  = require('../db');

// ── Dashboard overview ───────────────────────────────────────────────────────
  router.get('/overview', async (req, res) => {
  try {
    const [
      totalTransactions,
      byState,
      openDisputes,
      totalVolume,
      recentTransactions
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.groupBy({
        by:      ['state'],
        _count:  { state: true }
      }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.transaction.aggregate({
        where:  { state: 'RESOLVED' },
        _sum:   { amount: true }
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take:    10,
        include: { disputes: true }
      })
    ]);

    const feeRate    = 0.02;
    const totalFees  = (totalVolume._sum.amount || 0) * feeRate;

    res.json({
      totalTransactions,
      byState: byState.reduce((acc, s) => {
        acc[s.state] = s._count.state;
        return acc;
      }, {}),
      openDisputes,
      totalVolume:    totalVolume._sum.amount || 0,
      estimatedFees:  parseFloat(totalFees.toFixed(2)),
      recentTransactions
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

// ── All transactions ─────────────────────────────────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { state, page = 1, limit = 20 } = req.query;
    const where = state ? { state } : {};

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
        include: { ledgerEntries: true, disputes: true }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ── Single transaction ───────────────────────────────────────────────────────
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where:   { id: req.params.id },
      include: { ledgerEntries: true, disputes: { include: { auditLogs: true } } }
    });
    if (!transaction) return res.status(404).json({ error: 'Not found' });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// ── Force state change (admin override) ─────────────────────────────────────
router.patch('/transactions/:id/state', async (req, res) => {
  const { newState, reason } = req.body;

  if (!newState || !reason) {
    return res.status(400).json({
      error: 'newState and reason are both required'
    });
  }

  const VALID_STATES = ['CREATED', 'FUNDED', 'DISPATCHED', 'CONFIRMED', 'DISPUTED', 'RESOLVED'];
  if (!VALID_STATES.includes(newState)) {
    return res.status(400).json({ error: `newState must be one of: ${VALID_STATES.join(', ')}` });
  }

  try {
    const { atomicTransition } = require('../services/stateMachine');
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state === 'DISPUTED') {
      return res.status(400).json({
        error: 'This transaction has an open dispute. Use the Disputes tab to resolve it — not this override.'
      });
    }

    try {
      await atomicTransition(prisma, transaction.id, transaction.state, newState);
    } catch (transitionError) {
      return res.status(400).json({ error: transitionError.message });
    }

    // If admin is force-resolving from CONFIRMED, actually move the money —
    // do not just flip the label.
    if (newState === 'RESOLVED' && transaction.state === 'CONFIRMED') {
      const { splitWithFee } = require('../utils/money');
      const { transferToMomo, mockTransfer } = require('../services/paystack');
      const { recordMovement } = require('../services/ledger');

      const USE_MOCK_TRANSFER = process.env.USE_MOCK_TRANSFER !== 'false';
      const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;
      const { fee: verifiedFee, sellerAmount } = splitWithFee(transaction.amount);

      const transferResult = await transferFn({
        amount: sellerAmount, momoNumber: transaction.sellerMomo, transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'SELLER_MOMO',
        amount: sellerAmount, reference: transferResult.transfer_code || transferResult.status,
        note: `Admin override resolution by ${req.admin.name}: ${reason}`
      });

      await recordMovement({
        transactionId: transaction.id, fromAccount: 'PENDING_RELEASE', toAccount: 'VERIFIED_FEES',
        amount: verifiedFee, note: '3% Verified platform fee (admin override)'
      });
    }

    // Log the admin action in dispute audit if a dispute exists
    const dispute = await prisma.dispute.findFirst({
      where: { transactionId: req.params.id }
    });

    if (dispute) {
      await prisma.disputeAuditLog.create({
        data: {
          disputeId:   dispute.id,
          action:      `ADMIN_STATE_CHANGE_TO_${newState}`,
          performedBy: req.admin.name,
          note:        reason
        }
      });
    }

    res.json({
      message: `Transaction state updated to ${newState}`,
      state:   newState
    });

  } catch (error) {
    console.error('Admin state change error:', error);
    res.status(500).json({ error: 'Failed to update transaction state' });
  }
});

// ── All disputes ─────────────────────────────────────────────────────────────
router.get('/disputes', async (req, res) => {
  try {
    const { status = 'OPEN' } = req.query;
    const disputes = await prisma.dispute.findMany({
      where:   status === 'ALL' ? {} : { status },
      include: {
        transaction: { include: { ledgerEntries: true } },
        auditLogs:   { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ── Ledger reconciliation ────────────────────────────────────────────────────
router.get('/reconcile', async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany();

    const byTransaction = {};
    entries.forEach(e => {
      if (!byTransaction[e.transactionId]) byTransaction[e.transactionId] = 0;
      byTransaction[e.transactionId] +=
        e.entryType === 'CREDIT' ? e.amount : -e.amount;
    });

    const unbalanced = Object.entries(byTransaction)
      .filter(([, balance]) => Math.abs(balance) > 0.01)
      .map(([id, balance]) => ({ transactionId: id, balance }));

    res.json({
      totalEntries:   entries.length,
      totalTransactions: Object.keys(byTransaction).length,
      unbalanced,
      balanced: Object.keys(byTransaction).length - unbalanced.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

module.exports = router;