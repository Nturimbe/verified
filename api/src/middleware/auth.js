const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { isRevoked } = require('../services/revocation');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

async function verifyAdminSession(req) {
  const token = req.cookies?.admin_session;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (await isRevoked(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  const payload = await verifyAdminSession(req);
  if (!payload) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  req.admin = payload;
  next();
}

async function requireSuperAdmin(req, res, next) {
  const payload = await verifyAdminSession(req);
  if (!payload) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  if (payload.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  req.admin = payload;
  req.adminName = payload.name;
  next();
}

// Derives the expected CSRF token from the session's own jti — no second
// cookie needed. This must run AFTER requireAdmin, since it reads req.admin.
function deriveCsrfToken(jti) {
  return crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(jti).digest('hex');
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (!req.admin?.jti) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const headerToken   = req.headers['x-csrf-token'];
  const expectedToken = deriveCsrfToken(req.admin.jti);

  if (!headerToken || headerToken !== expectedToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

module.exports = { verifyAdminSession, requireAdmin, requireSuperAdmin, requireCsrf, deriveCsrfToken };