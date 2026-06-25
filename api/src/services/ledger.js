const prisma = require('../db');

// Write a pair of ledger entries (debit + credit) for a movement
async function recordMovement({ transactionId, fromAccount, toAccount, amount, note, reference }) {
  await prisma.$transaction([
    // Debit — money leaves this account
    prisma.ledgerEntry.create({
      data: {
        transactionId,
        entryType: 'DEBIT',
        account:   fromAccount,
        amount:    amount,
        note:      note || null,
        reference: reference || null
      }
    }),
    // Credit — money arrives in this account
    prisma.ledgerEntry.create({
      data: {
        transactionId,
        entryType: 'CREDIT',
        account:   toAccount,
        amount:    amount,
        note:      note || null,
        reference: reference || null
      }
    })
  ]);
}

// Check that all ledger entries for a transaction net to zero
// DEBIT total must equal CREDIT total
async function reconcile(transactionId) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { transactionId }
  });

  let balance = 0;
  for (const entry of entries) {
    if (entry.entryType === 'DEBIT')  balance -= entry.amount;
    if (entry.entryType === 'CREDIT') balance += entry.amount;
  }

  // Allow for floating point rounding (e.g. 0.00000001)
  if (Math.abs(balance) > 0.001) {
    throw new Error(
      `Ledger out of balance for transaction ${transactionId}. Difference: ${balance}`
    );
  }

  return true;
}

module.exports = { recordMovement, reconcile };