require('dotenv').config();
const express      = require('express');
const path         = require('path');
const transactions = require('./src/routes/transactions');
const pages        = require('./src/routes/pages');
const disputes     = require('./src/routes/disputes');
const adminRoutes  = require('./src/routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/transactions', transactions);
app.use('/disputes', disputes);
app.use('/admin/api', adminRoutes);

// Root — serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Pages router — handles /pay/:id and /admin
app.use('/', pages);

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Verified backend is running.', version: '0.1.0' });
});

// Sentry — only if DSN is configured
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  try {
    Sentry.setupExpressErrorHandler(app);
  } catch (e) {
    if (Sentry.Handlers && Sentry.Handlers.errorHandler) {
      app.use(Sentry.Handlers.errorHandler());
    }
  }
}

// 404 handler — must be last
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});