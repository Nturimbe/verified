
const express = require('express');
const router  = express.Router();
const prisma  = require('../db');

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

// ── Dashboard overview ───────────────────────────────────────────────────────
router.get('/overview', requireAdmin, async (req, res) => {
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
router.get('/transactions', requireAdmin, async (req, res) => {
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
router.get('/transactions/:id', requireAdmin, async (req, res) => {
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

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data:  { state: newState }
    });

    // Log the admin action in dispute audit if a dispute exists
    const dispute = await prisma.dispute.findFirst({
      where: { transactionId: req.params.id }
    });

    if (dispute) {
      await prisma.disputeAuditLog.create({
        data: {
          disputeId:   dispute.id,
          action:      `ADMIN_STATE_CHANGE_TO_${newState}`,
          performedBy: 'ADMIN',
          note:        reason
        }
      });
    }

    res.json({
      message: `Transaction state updated to ${newState}`,
      id:      updated.id,
      state:   updated.state
    });

  } catch (error) {
    console.error('Admin state change error:', error);
    res.status(500).json({ error: 'Failed to update transaction state' });
  }
});

// ── All disputes ─────────────────────────────────────────────────────────────
router.get('/disputes', requireAdmin, async (req, res) => {
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
router.get('/reconcile', requireAdmin, async (req, res) => {
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