const request = require('supertest');
const app = require('../index');

test('POST /transactions creates transaction', async () => {
  const res = await request(app)
    .post('/transactions')
    .send({
      item_name: "Phone",
      amount: 500,
      sellerMomo: "024xxxxxxx"
    });

  expect(res.statusCode).toBe(201);
  expect(res.body).toHaveProperty('id');
});