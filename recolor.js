const fs   = require('fs');
const path = require('path');

// ── Define your colour swap ───────────────────────────────────────────────────
// Option A
/*
const SWAPS = [
  { from: '#1B3A6B', to: '#1A7A4A' },  // navy    → primary green
  { from: '#162F55', to: '#145C37' },  // dark navy → dark green
  { from: '#C8922A', to: '#F5C518' },  // gold    → yellow
  { from: '#AABBD4', to: '#A8D5B8' },  // muted navy → muted green
  { from: '#EEF3FA', to: '#EDF7F2' },  // light blue bg → light green bg
  { from: '#F4F7FB', to: '#F4FBF7' },  // page bg → light green tint
];*/
// Option B (uncomment to use)
const SWAPS = [
  { from: '#1B3A6B', to: '#2E7D52' },  // navy      → emerald green
  { from: '#162F55', to: '#1B5C3A' },  // dark navy  → dark green
  { from: '#C8922A', to: '#E8A020' },  // gold       → amber yellow
  { from: '#AABBD4', to: '#A8C5B0' },  // muted navy → muted green
  { from: '#EEF3FA', to: '#EDF7F2' },  // light blue → light green
  { from: '#F4F7FB', to: '#F4FBF7' },  // page bg    → light green tint
];

// ── Files to update ───────────────────────────────────────────────────────────
const FILES = [
  'public/create.html',
  'public/pay.html',
  'public/dispatch.html',
  'public/confirm.html',
  'public/admin.html',
  'public/terms.html',
  'public/privacy.html',
  'public/dispute-policy.html',
  'src/routes/pages.js',
];

FILES.forEach(filePath => {
  const full = path.join(__dirname, filePath);
  if (!fs.existsSync(full)) {
    console.log(`Skipped (not found): ${filePath}`);
    return;
  }

  let content = fs.readFileSync(full, 'utf8');

  SWAPS.forEach(({ from, to }) => {
    // Replace both lowercase and uppercase hex
    const lower = from.toLowerCase();
    const upper = from.toUpperCase();
    content = content.split(lower).join(to);
    content = content.split(upper).join(to);
  });

  fs.writeFileSync(full, content, 'utf8');
  console.log(`Updated: ${filePath}`);
});

console.log('\nAll done. Check your pages and delete this script.');