// Escapes user text before it is used inside a RegExp (search boxes, duplicate-name checks).
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Indian mobile numbers: keep the last 10 digits, accept +91 / 0 prefixes.
const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
};

const toPositiveInt = (value, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
};

module.exports = { escapeRegex, normalizePhone, toPositiveInt };
