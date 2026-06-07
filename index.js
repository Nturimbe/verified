// index.js

//sentry setup
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});

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

// Redirect root to seller create page
app.get('/', (req, res) => {
  res.redirect('/create.html');
});
app.use('/', pages);

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Verified backend is running.', version: '0.1.0' });
});

//Sentry error handler
app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});