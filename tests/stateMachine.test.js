const { transition } = require('../src/services/stateMachine');

describe('State Machine Tests', () => {

  // ✅ VALID TRANSITIONS

  test('CREATED → FUNDED is valid', () => {
    expect(transition('CREATED', 'FUNDED')).toBe('FUNDED');
  });

  test('FUNDED → DISPATCHED is valid', () => {
    expect(transition('FUNDED', 'DISPATCHED')).toBe('DISPATCHED');
  });

  test('FUNDED → DISPUTED is valid', () => {
    expect(transition('FUNDED', 'DISPUTED')).toBe('DISPUTED');
  });

  test('DISPATCHED → CONFIRMED is valid', () => {
    expect(transition('DISPATCHED', 'CONFIRMED')).toBe('CONFIRMED');
  });

  test('CONFIRMED → RESOLVED is valid', () => {
    expect(transition('CONFIRMED', 'RESOLVED')).toBe('RESOLVED');
  });

  // ✅ INVALID TRANSITIONS

  test('CREATED → CONFIRMED should fail', () => {
    expect(() => {
      transition('CREATED', 'CONFIRMED');
    }).toThrow();
  });

  test('FUNDED → CREATED should fail', () => {
    expect(() => {
      transition('FUNDED', 'CREATED');
    }).toThrow();
  });

  test('DISPATCHED → CREATED should fail', () => {
    expect(() => {
      transition('DISPATCHED', 'CREATED');
    }).toThrow();
  });

  test('RESOLVED → FUNDED should fail', () => {
    expect(() => {
      transition('RESOLVED', 'FUNDED');
    }).toThrow();
  });

  // ✅ EDGE CASE

  test('invalid state should throw error', () => {
    expect(() => {
      transition('FAKE', 'CREATED');
    }).toThrow();
  });

});
