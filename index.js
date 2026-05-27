require('dotenv').config();
const express      = require('express');
const transactions = require('./src/routes/transactions');
const pages        = require('./src/routes/pages');
const disputes = require('./src/routes/disputes');


const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/transactions', transactions);
app.use('/disputes', disputes);
app.use('/', pages);

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Verified backend is running.', version: '0.1.0' });
});

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});