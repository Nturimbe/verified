const rateLimit = require('express-rate-limit');

const createTxLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many requests. Please try again in 15 minutes.' }
});

const paymentLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many payment attempts. Please wait.' }
});

const adminLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many login attempts. Please wait.' }
});

const otpRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many code requests. Please wait 15 minutes.' }
});

const otpVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many attempts. Please request a new code.' }
});

const adminMutationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 60,
  message: { error: 'Too many admin actions. Please slow down.' }
});

module.exports = {
  createTxLimit, paymentLimit, adminLoginLimit,
  otpRequestLimit, otpVerifyLimit, adminMutationLimit
};