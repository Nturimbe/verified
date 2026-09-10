// Every valid move a transaction can make
// Key: current state → Value: array of states it is allowed to move to
const TRANSITIONS = {
  CREATED:    ['FUNDED'],
  FUNDED:     ['DISPATCHED', 'DISPUTED'],
  DISPATCHED: ['CONFIRMED', 'DISPUTED'],
  CONFIRMED:  ['RESOLVED'],
  DISPUTED:   ['RESOLVED'],
  RESOLVED:   []  // terminal state — nothing can happen after this
};

// Check if a transition is allowed
function canTransition(currentState, newState) {
  const allowed = TRANSITIONS[currentState];
  if (!allowed) return false;
  return allowed.includes(newState);
}

// Attempt a transition — returns the new state or throws an error
function transition(currentState, newState) {
  if (!canTransition(currentState, newState)) {
    throw new Error(
      `Invalid transition: cannot move from ${currentState} to ${newState}`
    );
  }
  return newState;
}

// Atomically transition a transaction — the WHERE clause includes the
// expected current state, so the database itself rejects the write if
// another request already changed the state first. This closes the
// read-check-write race window entirely, since Postgres guarantees
// only one concurrent UPDATE can match a given row's current state.
async function atomicTransition(prisma, transactionId, fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(`Invalid transition: cannot move from ${fromState} to ${toState}`);
  }

  const result = await prisma.transaction.updateMany({
    where: { id: transactionId, state: fromState },
    data:  { state: toState }
  });

  if (result.count === 0) {
    throw new Error(
      `Transition conflict: transaction was not in expected state '${fromState}' — likely already updated by a concurrent request.`
    );
  }

  return toState;
}

module.exports = { transition, canTransition, atomicTransition, TRANSITIONS };