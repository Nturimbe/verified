require('dotenv').config();
const express      = require('express');
const cookieParser = require('cookie-parser');

const transactions    = require('./src/routes/transactions');
const pages           = require('./src/routes/pages');
const disputes        = require('./src/routes/disputes');
const adminRoutes     = require('./src/routes/admin');
const adminAuthRoutes = require('./src/routes/adminAuth');
const authRoutes      = require('./src/routes/auth');

const { requireAdmin, requireCsrf } = require('./src/middleware/auth');
const { alertCrash } = require('./src/services/alerts');
const {
  createTxLimit, paymentLimit, adminLoginLimit,
  otpRequestLimit, otpVerifyLimit, adminMutationLimit
} = require('./src/config/rateLimiters');

const app  = express();
const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  alertCrash('uncaughtException', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  alertCrash('unhandledRejection', reason);
});

// ── CORS + security headers ──────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    /^https:\/\/verified[a-z0-9-]*\.vercel\.app$/.test(origin)
  );
  if (isAllowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-csrf-token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'payment=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(cookieParser());
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/transactions/webhook')) req.rawBody = buf;
  }
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/transactions/initiate-payment', paymentLimit);
app.post('/transactions', createTxLimit);
app.use('/transactions', transactions);

app.use('/disputes', disputes);

app.use('/admin/api', requireAdmin, requireCsrf, adminMutationLimit, adminRoutes);

app.use('/admin/auth/login', adminLoginLimit);
app.use('/admin/auth', adminAuthRoutes);

app.use('/auth/request-otp', otpRequestLimit);
app.use('/auth/verify-otp', otpVerifyLimit);
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Verified API is running.', version: '0.1.0' });
});

app.use('/', pages);

app.get('/health', (req, res) => {
  res.json({ message: 'Verified backend is running.', version: '0.1.0' });
});

if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  try {
    Sentry.setupExpressErrorHandler(app);
  } catch (e) {
    if (Sentry.Handlers?.errorHandler) app.use(Sentry.Handlers.errorHandler());
  }
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  alertCrash(`${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong. Our team has been notified.' });
});

app.listen(PORT, () => {
  console.log(`Verified server running on port ${PORT}`);
});