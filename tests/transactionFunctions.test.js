// Import your actual functions
const { releaseFunds } = require('../src/routes/transactions');


// Mock transfer function
const mockTransferFn = jest.fn();

describe('Transaction Function Tests', () => {

  beforeEach(() => {
    mockTransferFn.mockClear();
  });

  test('releaseFunds calls transferFn and processes correctly', async () => {

    const transaction = {
      id: 'tx123',
      sellerMomo: '0240000000'
    };

    const sellerAmount = 100;

    mockTransferFn.mockResolvedValue({
      status: 'success'
    });

    const result = await releaseFunds({
      transaction,
      sellerAmount,
      transferFn: mockTransferFn
    });

    // ✅ transfer function was called
    expect(mockTransferFn).toHaveBeenCalledTimes(1);

    // ✅ correct parameters sent
    expect(mockTransferFn).toHaveBeenCalledWith({
      amount: 100,
      momoNumber: '0240000000',
      transactionId: 'tx123'
    });

    // ✅ result is returned
    expect(result).toBeDefined();

  });

});