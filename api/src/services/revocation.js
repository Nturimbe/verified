const prisma = require('../db');

async function isRevoked(jti) {
  if (!jti) return false;
  const found = await prisma.revokedToken.findUnique({ where: { jti } });
  return !!found;
}

async function revoke(jti, expiresAt) {
  if (!jti) return;
  try {
    await prisma.revokedToken.create({ data: { jti, expiresAt } });
  } catch (e) {
    // Already revoked or race — safe to ignore
  }
}

module.exports = { isRevoked, revoke };