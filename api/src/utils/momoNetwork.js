// Ghana MoMo network detection by phone prefix, matching the frontend's
// create-page logic. Maps to Paystack's mobile money bank codes.
const NETWORK_PREFIXES = {
  '024': 'MTN', '054': 'MTN', '055': 'MTN', '059': 'MTN',
  '020': 'VOD', '050': 'VOD',
  '027': 'ATL', '057': 'ATL', '026': 'ATL', '056': 'ATL', '028': 'ATL', '023': 'ATL'
};

// Paystack's mobile money bank codes for Ghana
const PAYSTACK_BANK_CODES = {
  MTN: 'MTN',
  VOD: 'VOD',
  ATL: 'ATL'
};

function detectNetwork(momoNumber) {
  if (!momoNumber || momoNumber.length < 3) return null;
  const prefix = momoNumber.slice(0, 3);
  return NETWORK_PREFIXES[prefix] || null;
}

function getPaystackBankCode(momoNumber) {
  const network = detectNetwork(momoNumber);
  if (!network) {
    throw new Error(`Could not detect MoMo network for number ${momoNumber}. Cannot create transfer recipient.`);
  }
  return PAYSTACK_BANK_CODES[network];
}

module.exports = { detectNetwork, getPaystackBankCode };