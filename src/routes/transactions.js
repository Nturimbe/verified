const express  = require('express');
const router   = express.Router();
const prisma   = require('../db');
const { transition }     = require('../services/stateMachine');
const { recordMovement } = require('../services/ledger');
const { initializePayment, verifyPayment, mockTransfer } = require('../services/paystack');
const { sendSMS, messages } = require('../services/sms');

// Use mock transfer until Paystack activates Transfer API
// Change this to false once Transfer API is live
const USE_MOCK_TRANSFER = true;

// ── POST /transactions ──────────────────────────────────────────────────────
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

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    res.status(201).json({
      message:    'Transaction created',
      id:         transaction.id,
      state:      transaction.state,
      paymentUrl: `${baseUrl}/pay/${transaction.id}`
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// ── GET /transactions/verify/:reference ─────────────────────────────────────
// Paystack redirects buyer here after payment
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    // Verify with Paystack
    const payment = await verifyPayment(reference);

    if (payment.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful', status: payment.status });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: reference }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state !== 'CREATED') {
      return res.json({ message: 'Transaction already processed', state: transaction.state });
    }

    // Move to FUNDED and write ledger
    transition(transaction.state, 'FUNDED');

    await recordMovement({
      transactionId: transaction.id,
      fromAccount:   'BUYER_WALLET',
      toAccount:     'VERIFIED_ESCROW',
      amount:        transaction.amount,
      reference:     payment.reference,
      note:          `Paystack payment confirmed. Channel: ${payment.channel}`
    });

    const updated = await prisma.transaction.update({
      where: { id: reference },
      data:  {
        state:      'FUNDED',
        buyerName:  payment.customer?.first_name || 'Buyer',
        buyerPhone: payment.metadata?.phone || null
      }
    });
    res.redirect(`/confirm.html?id=${updated.id}`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ── POST /transactions/webhook ───────────────────────────────────────────────
// Paystack calls this endpoint directly for payment events
router.post('/webhook', async (req, res) => {
  const event = req.body;

  // Always respond 200 immediately — Paystack retries if you don't
  res.sendStatus(200);

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: reference }
      });

      if (!transaction || transaction.state !== 'CREATED') return;

      transition(transaction.state, 'FUNDED');

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'BUYER_WALLET',
        toAccount:     'VERIFIED_ESCROW',
        amount:        transaction.amount,
        reference:     reference,
        note:          'Webhook: charge.success received from Paystack'
      });

    await prisma.transaction.update({
  where: { id: reference },
  data:  { state: 'FUNDED' }
});

// Notify seller via SMS
const funded = await prisma.transaction.findUnique({
  where: { id: reference }
});

if (funded && funded.sellerMomo) {
  const dispatchUrl = `${process.env.BASE_URL}/dispatch.html?id=${funded.id}`;
  await sendSMS(
    funded.sellerMomo,
    messages.FUNDED(funded.itemName, funded.amount, dispatchUrl)
  );
}

console.log(`Transaction ${reference} funded via webhook`);

    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }
});

// ── GET /transactions/:id ────────────────────────────────────────────────────
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

// ── PATCH /transactions/:id/state ────────────────────────────────────────────

router.patch('/:id/state', async (req, res) => {
  const { newState, buyerName, buyerPhone } = req.body;

  if (!newState) {
    return res.status(400).json({ error: 'newState is required' });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // State machine check
    transition(transaction.state, newState);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // ── Ledger entries + SMS per state ──────────────────────────────────────

    if (newState === 'FUNDED') {
      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'BUYER_WALLET',
        toAccount:     'VERIFIED_ESCROW',
        amount:        transaction.amount,
        note:          'Manual: buyer payment received'
      });

      // Notify seller
      if (transaction.sellerMomo) {
        const dispatchUrl = `${baseUrl}/dispatch.html?id=${transaction.id}`;
        await sendSMS(
          transaction.sellerMomo,
          messages.FUNDED(transaction.itemName, transaction.amount, dispatchUrl)
        );
      }
    }

    if (newState === 'DISPATCHED') {
      const confirmUrl = `${baseUrl}/confirm.html?id=${transaction.id}`;

      // Notify buyer
      const buyerNumber = buyerPhone || transaction.buyerPhone;
      if (buyerNumber) {
        await sendSMS(
          buyerNumber,
          messages.DISPATCHED(transaction.itemName, confirmUrl)
        );
      }
    }

    if (newState === 'CONFIRMED') {
      // Notify seller — funds coming
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          messages.CONFIRMED(transaction.itemName, transaction.amount)
        );
      }
    }

    if (newState === 'DISPUTED') {
      // Notify both parties
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          messages.DISPUTED(transaction.itemName)
        );
      }
      const buyerNumber = buyerPhone || transaction.buyerPhone;
      if (buyerNumber) {
        await sendSMS(
          buyerNumber,
          messages.DISPUTED(transaction.itemName)
        );
      }
    }

    if (newState === 'RESOLVED' && transaction.state === 'CONFIRMED') {
      const verifiedFee  = parseFloat((transaction.amount * 0.02).toFixed(2));
      const sellerAmount = parseFloat((transaction.amount - verifiedFee).toFixed(2));

      const { transferToMomo } = require('../services/paystack');
      const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;

      const transferResult = await transferFn({
        amount:        sellerAmount,
        momoNumber:    transaction.sellerMomo,
        transactionId: transaction.id
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'VERIFIED_ESCROW',
        toAccount:     'SELLER_MOMO',
        amount:        sellerAmount,
        reference:     transferResult.transfer_code || transferResult.status,
        note:          USE_MOCK_TRANSFER
          ? 'MOCK transfer — swap to live when Transfer API activated'
          : 'Live transfer to seller MoMo'
      });

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'VERIFIED_ESCROW',
        toAccount:     'VERIFIED_FEES',
        amount:        verifiedFee,
        note:          '2% Verified platform fee'
      });

      // Notify seller — paid
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          messages.RESOLVED_SELLER(transaction.itemName, sellerAmount)
        );
      }
    }

    if (newState === 'RESOLVED' && transaction.state === 'DISPUTED') {
      // Notify buyer — dispute resolved
      const buyerNumber = buyerPhone || transaction.buyerPhone;
      if (buyerNumber) {
        await sendSMS(
          buyerNumber,
          messages.RESOLVED_BUYER(transaction.itemName)
        );
      }
    }

    // ── Update state in database ─────────────────────────────────────────────
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
      message: `Transaction moved to ${newState}`,
      id:      updated.id,
      state:   updated.state,
      ledger:  updated.ledgerEntries
    });

  } catch (error) {
    if (error.message.includes('Invalid transition')) {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction state' });
  }
});
    

// ── POST /transactions/initiate-payment ─────────────────────────────────────
// Called by the pay page when buyer clicks Pay
router.post('/initiate-payment', async (req, res) => {
  const { transactionId, buyerEmail } = req.body;

  if (!transactionId || !buyerEmail) {
    return res.status(400).json({ error: 'transactionId and buyerEmail are required' });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state !== 'CREATED') {
      return res.status(400).json({ error: 'Transaction already paid' });
    }

    const payment = await initializePayment({
      email:         buyerEmail,
      amount:        transaction.amount,
      transactionId: transaction.id,
      metadata: {
        itemName:      transaction.itemName,
        sellerMomo:    transaction.sellerMomo,
        transactionId: transaction.id
      }
    });

    res.json({ paymentUrl: payment.authorization_url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not initialise payment' });
  }
});
module.exports = router;