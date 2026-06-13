require('dotenv').config();
const express      = require('express');
const path         = require('path');
const transactions = require('./src/routes/transactions');
const pages        = require('./src/routes/pages');
const disputes     = require('./src/routes/disputes');
const adminRoutes  = require('./src/routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;
const rateLimit = require('express-rate-limit');

// Limit transaction creation — 10 per IP per 15 minutes
const createTxLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Too many requests. Please try again in 15 minutes.' }
});

// Stricter limit on payment initiation
const paymentLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  { error: 'Too many payment attempts. Please wait.' }
});

// Strict limit on admin login attempts
const adminLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  { error: 'Too many login attempts.' }
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'payment=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// starts with: app.use(express.json({
// ends with:   }));
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/transactions/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.static('public'));

// Routes
// Raw body for Paystack webhook signature verification — must be before express.json()
app.use('/transactions',           transactions);
app.post('/transactions',          createTxLimit);
app.post('/transactions/initiate-payment', paymentLimit);
app.use('/admin/api',              adminRoutes);
app.post('/admin/api/overview',    adminLoginLimit);
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