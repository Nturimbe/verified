// index.js

//sentry setup
/*Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});
*/

require('dotenv').config();
const express      = require('express');
//const path         = require('path');
const transactions = require('./src/routes/transactions');
const pages        = require('./src/routes/pages');
const disputes = require('./src/routes/disputes');
const adminRoutes = require('./src/routes/admin');

app.use('/admin/api', adminRoutes);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
//app.use(Sentry.Handlers.errorHandler());

// Routes
app.use('/transactions', transactions);
app.use('/disputes', disputes);


// Redirect root to seller create page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use('/', pages);

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Verified backend is running.', version: '0.1.0' });
});

/* Sentry error monitoring — only initialises if DSN is configured
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  try {
    // New API (v8+)
    Sentry.setupExpressErrorHandler(app);
  } catch (e) {
    // Fallback for older API
    if (Sentry.Handlers && Sentry.Handlers.errorHandler) {
      app.use(Sentry.Handlers.errorHandler());
    }
  }
} */

  // 404 handler — must be last
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});
app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});