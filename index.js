require('dotenv').config();
const express      = require('express');
const transactions = require('./src/routes/transactions');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/transactions', transactions);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Verified backend is running.',
    version: '0.1.0'
  });
});

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});