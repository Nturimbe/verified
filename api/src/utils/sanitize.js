const sanitizeHtml = require('sanitize-html');

function sanitizeText(input) {
  if (!input) return input;
  return sanitizeHtml(String(input), {
    allowedTags:       [],
    allowedAttributes: {}
  });
}

module.exports = { sanitizeText };