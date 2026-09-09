require('dotenv').config();
const axios = require('axios');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json'
  }
});

// Generate a payment link for a transaction
async function initializePayment({ email, amount, transactionId, metadata }) {
  const response = await paystackApi.post('/transaction/initialize', {
    email,
    amount: Math.round(amount * 100), // Paystack uses pesewas (kobo equivalent)
    reference: transactionId,
    callback_url: `${process.env.BASE_URL}/transactions/verify/${transactionId}`,
    metadata: metadata || {}
  });
  return response.data.data;
}

// Verify a payment after buyer completes it
async function verifyPayment(reference) {
  const response = await paystackApi.get(`/transaction/verify/${reference}`);
  return response.data.data;
}

// Refund a buyer's original charge (dispute resolved in buyer's favour)
async function refundBuyer({ transactionId, amount, reason }) {
  const response = await paystackApi.post('/refund', {
    transaction: transactionId,
    amount: Math.round(amount * 100),
    merchant_note: reason || 'Verified dispute resolution: refund to buyer'
  });
  return response.data.data;
}

// Mock version for local/dev testing before Paystack refund access is confirmed
function mockRefund({ transactionId, amount }) {
  console.log(`[MOCK REFUND] ${transactionId} — GHS ${amount} would be refunded to buyer`);
  return { status: 'mock_refunded', transaction: transactionId };
}

// Initiate a transfer to seller MoMo
// NOTE: Requires Transfer API to be activated by Paystack
async function transferToMomo({ amount, momoNumber, transactionId, reason }) {
  // Step 1: Create a transfer recipient
  const recipientRes = await paystackApi.post('/transferrecipient', {
    type: 'mobile_money',
    name: `Seller ${momoNumber}`,
    account_number: momoNumber,
    bank_code: 'MTN',  // MTN MoMo — update based on seller's network
    currency: 'GHS'
  });

  const recipientCode = recipientRes.data.data.recipient_code;

  // Step 2: Initiate the transfer
  const transferRes = await paystackApi.post('/transfer', {
    source: 'balance',
    amount: Math.round(amount * 100),
    recipient: recipientCode,
    reason: reason || `Verified escrow release - ${transactionId}`,
    reference: `transfer_${transactionId}`
  });

  return transferRes.data.data;
}

// MOCK transfer — used when Transfer API is not yet activated
// Logs the transfer intent without calling Paystack
function mockTransfer({ amount, momoNumber, transactionId }) {
  console.log(`[MOCK TRANSFER] GHS ${amount} → ${momoNumber} for TXN ${transactionId}`);
  return {
    status: 'mock_success',
    transfer_code: `MOCK_${transactionId}`,
    amount,
    recipient: momoNumber
  };
}

module.exports = {
  initializePayment,
  verifyPayment,
  transferToMomo,
  mockTransfer,
  refundBuyer,
  mockRefund
};