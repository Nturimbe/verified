const express = require('express');
const router  = express.Router();
const prisma  = require('../db');
const { transition }    = require('../services/stateMachine');
const { recordMovement } = require('../services/ledger');

// ── POST /transactions ──────────────────────────────────────────────────────
// Create a new transaction (seller generates a link)
router.post('/', async (req, res) => {
  const { itemName, amount, sellerMomo, deliveryHours } = req.body;

  if (!itemName || !amount || !sellerMomo) {
    return res.status(400).json({
      error: 'itemName, amount, and sellerMomo are required'
    });
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        itemName,
        amount:        parseFloat(amount),
        sellerMomo,
        deliveryHours: deliveryHours || 72,
        state:         'CREATED'
      }
    });

    res.status(201).json({
      message:    'Transaction created',
      id:         transaction.id,
      state:      transaction.state,
      paymentUrl: `http://localhost:3000/pay/${transaction.id}`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// ── GET /transactions/:id ───────────────────────────────────────────────────
// View a transaction and its ledger
router.get('/:id', async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where:   { id: req.params.id },
      include: { ledgerEntries: true, disputes: true }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// ── PATCH /transactions/:id/state ───────────────────────────────────────────
// Move a transaction to the next state
router.patch('/:id/state', async (req, res) => {
  const { newState, buyerName, buyerPhone } = req.body;

  if (!newState) {
    return res.status(400).json({ error: 'newState is required' });
  }

  try {
    // 1. Fetch current transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // 2. Check state machine — will throw if transition is invalid
    transition(transaction.state, newState);

    // 3. Write ledger entry for this state change
    if (newState === 'FUNDED') {
      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'BUYER_WALLET',
        toAccount:     'VERIFIED_ESCROW',
        amount:        transaction.amount,
        note:          'Buyer payment received — funds held in escrow'
      });
    }

    if (newState === 'RESOLVED' && transaction.state === 'CONFIRMED') {
      const verifiedFee = parseFloat((transaction.amount * 0.02).toFixed(2));
      const sellerAmount = parseFloat((transaction.amount - verifiedFee).toFixed(2));

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'VERIFIED_ESCROW',
        toAccount:     'SELLER_MOMO',
        amount:        sellerAmount,
        note:          'Buyer confirmed receipt — funds released to seller'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'VERIFIED_ESCROW',
        toAccount:     'VERIFIED_FEES',
        amount:        verifiedFee,
        note:          '2% Verified platform fee'
      });
    }

    // 4. Update the transaction state in the database
    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        state: newState,
        ...(buyerName  && { buyerName }),
        ...(buyerPhone && { buyerPhone })
      },
      include: { ledgerEntries: true }
    });

    res.json({
      message:  `Transaction moved to ${newState}`,
      id:       updated.id,
      state:    updated.state,
      ledger:   updated.ledgerEntries
    });

  } catch (error) {
    // State machine errors are user errors — 400
    // Database errors are server errors — 500
    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction state' });
  }
});

module.exports = router;