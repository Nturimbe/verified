require('dotenv').config();
const express      = require('express');
const path         = require('path');
const transactions = require('./src/routes/transactions');
const pages        = require('./src/routes/pages');
const disputes     = require('./src/routes/disputes');
const adminRoutes  = require('./src/routes/admin');
const cors         = require('cors');
const adminAuthRoutes = require('./src/routes/adminAuth');


const app  = express();
app.use(cors());
const PORT = process.env.PORT || 3001;
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
 const allowedOrigins = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2
].filter(Boolean);
// Security headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    /^https:\/\/verified-api-.*\.vercel\.app$/.test(origin) ||
    /^https:\/\/verified2\.vercel\.app$/.test(origin)
  );

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'payment=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/transactions/webhook')) {
      req.rawBody = buf;
    }
  }
}));


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
app.use('/admin/auth', adminAuthRoutes);

// Root — serve landing page
app.get('/', (req, res) => {
  res.json({ message: 'Verified API is running.', version: '0.1.0' });
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
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});