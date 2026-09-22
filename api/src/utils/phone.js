// Single source of truth for Ghana phone/MoMo number normalization.
// Always produces 0XXXXXXXXX format — the format detectNetwork() and
// every ledger/SMS lookup in the codebase assumes.
function normalizeGhanaPhone(raw) {
  if (!raw) return raw;
  let phone = raw.replace(/\s/g, '');
  if (phone.startsWith('+233')) {
    phone = '0' + phone.slice(4);
  } else if (phone.startsWith('233') && phone.length === 12) {
    phone = '0' + phone.slice(3);
  }
  return phone;
}

module.exports = { normalizeGhanaPhone };