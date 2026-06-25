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

module.exports = { transition, canTransition, TRANSITIONS };