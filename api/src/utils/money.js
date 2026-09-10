// Centralized money math. All amounts stay GHS floats at rest (unchanged
// schema) — every calculation routes through integer pesewas internally
// so repeated multiply/subtract chains can't accumulate floating-point drift.

const FEE_RATE = 0.03;

function toPesewas(ghs) {
  return Math.round(ghs * 100);
}

function toGhs(pesewas) {
  return pesewas / 100;
}

// Splits an amount into { fee, sellerAmount } using the platform fee rate.
function splitWithFee(amountGhs, feeRate = FEE_RATE) {
  const totalPesewas  = toPesewas(amountGhs);
  const feePesewas    = Math.round(totalPesewas * feeRate);
  const sellerPesewas = totalPesewas - feePesewas;
  return {
    fee:          toGhs(feePesewas),
    sellerAmount: toGhs(sellerPesewas)
  };
}

// Splits an amount into a seller portion and buyer-refund remainder,
// for partial dispute resolutions.
function splitPartial(amountGhs, sellerPortionGhs) {
  const totalPesewas  = toPesewas(amountGhs);
  const sellerPesewas = toPesewas(sellerPortionGhs);
  const buyerPesewas  = totalPesewas - sellerPesewas;
  return {
    sellerAmount: toGhs(sellerPesewas),
    buyerRefund:  toGhs(buyerPesewas)
  };
}

module.exports = { toPesewas, toGhs, splitWithFee, splitPartial, FEE_RATE };// Centralized money math. All amounts stay GHS floats at rest (unchanged
// schema) — every calculation routes through integer pesewas internally
// so repeated multiply/subtract chains can't accumulate floating-point drift.

const FEE_RATE = 0.03;

function toPesewas(ghs) {
  return Math.round(ghs * 100);
}

function toGhs(pesewas) {
  return pesewas / 100;
}

// Splits an amount into { fee, sellerAmount } using the platform fee rate.
function splitWithFee(amountGhs, feeRate = FEE_RATE) {
  const totalPesewas  = toPesewas(amountGhs);
  const feePesewas    = Math.round(totalPesewas * feeRate);
  const sellerPesewas = totalPesewas - feePesewas;
  return {
    fee:          toGhs(feePesewas),
    sellerAmount: toGhs(sellerPesewas)
  };
}

// Splits an amount into a seller portion and buyer-refund remainder,
// for partial dispute resolutions.
function splitPartial(amountGhs, sellerPortionGhs) {
  const totalPesewas  = toPesewas(amountGhs);
  const sellerPesewas = toPesewas(sellerPortionGhs);
  const buyerPesewas  = totalPesewas - sellerPesewas;
  return {
    sellerAmount: toGhs(sellerPesewas),
    buyerRefund:  toGhs(buyerPesewas)
  };
}

module.exports = { toPesewas, toGhs, splitWithFee, splitPartial, FEE_RATE };