const express  = require('express');
const router   = express.Router();
const prisma   = require('../db');
const { sanitizeText }   = require('../utils/sanitize');
const { transition }     = require('../services/stateMachine');
const { recordMovement } = require('../services/ledger');
const { initializePayment, verifyPayment, mockTransfer } = require('../services/paystack');
const { sendSMS, messages }          = require('../services/sms');
const { sendEmail, emailTemplates }  = require('../services/email');

const USE_MOCK_TRANSFER = true;

// ── POST /transactions ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { itemName, amount, sellerMomo, deliveryHours } = req.body;

  if (!itemName || !amount || !sellerMomo) {
    return res.status(400).json({
      error: 'itemName, amount, and sellerMomo are required'
    });
  }

  try {
    const cleanItemName = sanitizeText(itemName);
    const cleanMomo     = sanitizeText(sellerMomo);

    const transaction = await prisma.transaction.create({
      data: {
        itemName:      cleanItemName,
        amount:        parseFloat(amount),
        sellerMomo:    cleanMomo,
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
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const payment = await verifyPayment(reference);

    if (payment.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful', status: payment.status });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: reference }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.state !== 'CREATED') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
      return res.redirect(`${frontendUrl}/confirm/${transaction.id}`);
    }

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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    res.redirect(`${frontendUrl}/confirm/${updated.id}`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ── POST /transactions/webhook ───────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const secret    = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];

  if (signature && req.rawBody) {
    const hash = require('crypto')
      .createHmac('sha512', secret)
      .update(req.rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.warn('[WEBHOOK] Invalid signature — rejected');
      return res.sendStatus(401);
    }
  }

  const event = req.body;

  res.sendStatus(200);

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: reference }
      });

      if (!transaction || transaction.state !== 'CREATED') {
        console.log(`[WEBHOOK] Skipped ${reference} — state: ${transaction?.state}`);
        return;
      }

      transition(transaction.state, 'FUNDED');

      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'BUYER_WALLET',
        toAccount:     'VERIFIED_ESCROW',
        amount:        transaction.amount,
        reference,
        note:          'Webhook: charge.success received from Paystack'
      });

      await prisma.transaction.update({
        where: { id: reference },
        data:  { state: 'FUNDED' }
      });

      const funded = await prisma.transaction.findUnique({
        where: { id: reference }
      });

      if (funded?.sellerMomo) {
        const dispatchUrl = `${process.env.BASE_URL}/dispatch.html?id=${funded.id}`;
        await sendSMS(
          funded.sellerMomo,
          messages.FUNDED(funded.itemName, funded.amount, dispatchUrl)
        );
      }

      if (funded?.buyerEmail && !funded.buyerEmail.includes('@verified.gh')) {
        const tpl = emailTemplates.paymentReceived({
          itemName:      funded.itemName,
          amount:        funded.amount,
          transactionId: funded.id
        });
        await sendEmail({ to: funded.buyerEmail, ...tpl });
      }

      console.log(`[WEBHOOK] Transaction ${reference} funded`);

    } catch (err) {
      console.error('[WEBHOOK] Processing error:', err);
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

// ── GET /transactions/buyer/:phone ───────────────────────────────────────────
router.get('/buyer/:phone', async (req, res) => {
  try {
    const phone      = req.params.phone;
    const normalised = phone.startsWith('+233')
      ? '0' + phone.slice(4)
      : phone;

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { buyerPhone: normalised },
          { buyerPhone: '+233' + normalised.slice(1) }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(transactions);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
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

    transition(transaction.state, newState);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (newState === 'FUNDED') {
      await recordMovement({
        transactionId: transaction.id,
        fromAccount:   'BUYER_WALLET',
        toAccount:     'VERIFIED_ESCROW',
        amount:        transaction.amount,
        note:          'Manual: buyer payment received'
      });

      if (transaction.sellerMomo) {
        const dispatchUrl = `${baseUrl}/dispatch.html?id=${transaction.id}`;
        await sendSMS(
          transaction.sellerMomo,
          messages.FUNDED(transaction.itemName, transaction.amount, dispatchUrl)
        );
      }
    }

    if (newState === 'DISPATCHED') {
      const confirmUrl  = `${baseUrl}/confirm.html?id=${transaction.id}`;
      const buyerNumber = buyerPhone || transaction.buyerPhone;

      if (buyerNumber) {
        await sendSMS(buyerNumber, messages.DISPATCHED(transaction.itemName, confirmUrl));
      }

      if (transaction.buyerEmail && !transaction.buyerEmail.includes('@verified.gh')) {
        const tpl = emailTemplates.itemDispatched({
          itemName:      transaction.itemName,
          confirmUrl,
          transactionId: transaction.id
        });
        await sendEmail({ to: transaction.buyerEmail, ...tpl });
      }
    }

    if (newState === 'CONFIRMED') {
      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          messages.CONFIRMED(transaction.itemName, transaction.amount)
        );
      }
    }

    if (newState === 'DISPUTED') {
      if (transaction.sellerMomo) {
        await sendSMS(transaction.sellerMomo, messages.DISPUTED(transaction.itemName));
      }
      const buyerNumber = buyerPhone || transaction.buyerPhone;
      if (buyerNumber) {
        await sendSMS(buyerNumber, messages.DISPUTED(transaction.itemName));
      }
    }

    if (newState === 'RESOLVED' && transaction.state === 'CONFIRMED') {
      const verifiedFee  = parseFloat((transaction.amount * 0.03).toFixed(2));
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
        note:          '3% Verified platform fee (incl. Paystack)'
      });

      if (transaction.sellerMomo) {
        await sendSMS(
          transaction.sellerMomo,
          messages.RESOLVED_SELLER(transaction.itemName, sellerAmount)
        );
      }

      if (transaction.buyerEmail && !transaction.buyerEmail.includes('@verified.gh')) {
        const tpl = emailTemplates.transactionComplete({
          itemName: transaction.itemName,
          amount:   sellerAmount
        });
        await sendEmail({ to: transaction.buyerEmail, ...tpl });
      }
    }

    if (newState === 'RESOLVED' && transaction.state === 'DISPUTED') {
      const buyerNumber = buyerPhone || transaction.buyerPhone;
      if (buyerNumber) {
        await sendSMS(buyerNumber, messages.RESOLVED_BUYER(transaction.itemName));
      }
    }

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
router.post('/initiate-payment', async (req, res) => {
  const { transactionId, buyerEmail, buyerPhone } = req.body;

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

    await prisma.transaction.update({
      where: { id: transactionId },
      data:  {
        buyerPhone: buyerPhone || null,
        buyerEmail: buyerEmail || null
      }
    });

    res.json({ paymentUrl: payment.authorization_url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not initialise payment' });
  }
});

// ── POST /transactions/auto-release ─────────────────────────────────────────
router.post('/auto-release', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  try {
    const now        = new Date();
    const dispatched = await prisma.transaction.findMany({
      where: { state: 'DISPATCHED' }
    });

    const expired = dispatched.filter(tx => {
      const dispatchedAt = new Date(tx.updatedAt);
      const windowMs     = tx.deliveryHours * 60 * 60 * 1000;
      return (now - dispatchedAt) >= windowMs;
    });

    const results = [];

    for (const tx of expired) {
      try {
        await prisma.transaction.update({ where: { id: tx.id }, data: { state: 'CONFIRMED' } });

        const verifiedFee  = parseFloat((tx.amount * 0.03).toFixed(2));
        const sellerAmount = parseFloat((tx.amount - verifiedFee).toFixed(2));

        const { transferToMomo } = require('../services/paystack');
        const transferFn = USE_MOCK_TRANSFER ? mockTransfer : transferToMomo;

        const transferResult = await transferFn({
          amount: sellerAmount, momoNumber: tx.sellerMomo, transactionId: tx.id
        });

        await recordMovement({
          transactionId: tx.id, fromAccount: 'VERIFIED_ESCROW', toAccount: 'SELLER_MOMO',
          amount: sellerAmount, reference: transferResult.transfer_code || transferResult.status,
          note: 'Auto-release: delivery window expired'
        });

        await recordMovement({
          transactionId: tx.id, fromAccount: 'VERIFIED_ESCROW', toAccount: 'VERIFIED_FEES',
          amount: verifiedFee, note: '3% Verified platform fee (incl. Paystack)'
        });

        await prisma.transaction.update({ where: { id: tx.id }, data: { state: 'RESOLVED' } });

        if (tx.sellerMomo) {
          await sendSMS(tx.sellerMomo,
            `Verified: Delivery window passed. GHS ${sellerAmount} released to your MoMo.`);
        }
        if (tx.buyerPhone) {
          await sendSMS(tx.buyerPhone,
            `Verified: Delivery window for "${tx.itemName}" passed. Payment released to seller.`);
        }

        results.push({ id: tx.id, status: 'released' });
        console.log(`Auto-released: ${tx.id}`);

      } catch (err) {
        console.error(`Auto-release failed for ${tx.id}:`, err.message);
        results.push({ id: tx.id, status: 'failed', error: err.message });
      }
    }

    res.json({
      checked:  dispatched.length,
      released: results.filter(r => r.status === 'released').length,
      failed:   results.filter(r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    console.error('Auto-release error:', error);
    res.status(500).json({ error: 'Auto-release failed' });
  }
});

// ── GET /transactions/seller/:momo ───────────────────────────────────────────
router.get('/seller/:momo', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where:   { sellerMomo: req.params.momo },
      orderBy: { createdAt: 'desc' },
      include: { ledgerEntries: true }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;