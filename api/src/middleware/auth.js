const jwt = require('jsonwebtoken');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

function verifyAdminSession(req) {
  const token = req.cookies?.admin_session;
  if (!token) return null;
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const payload = verifyAdminSession(req);
  if (!payload) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  req.admin = payload;
  next();
}

function requireSuperAdmin(req, res, next) {
  const payload = verifyAdminSession(req);
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

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.admin_csrf;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

module.exports = { verifyAdminSession, requireAdmin, requireSuperAdmin, requireCsrf };