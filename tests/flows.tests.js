test('Full transaction lifecycle', async () => {
  const tx = await createTransaction(...);

  await fundTransaction(tx.id);
  await dispatchTransaction(tx.id);
  await confirmTransaction(tx.id);

  expect(tx.status).toBe('RESOLVED');
});