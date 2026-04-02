// Generate PWA icons from SVG
import fs from 'fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="SIZE" height="SIZE">
  <rect width="100" height="100" fill="#0f172a"/>
  <rect x="15" y="10" width="70" height="80" rx="8" fill="#334155"/>
  <rect x="25" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
  <rect x="55" y="5" width="20" height="15" rx="3" fill="#fbbf24"/>
  <rect x="25" y="30" width="50" height="6" rx="2" fill="#fbbf24"/>
  <rect x="25" y="45" width="40" height="5" rx="2" fill="#94a3b8"/>
  <rect x="25" y="58" width="45" height="5" rx="2" fill="#94a3b8"/>
  <rect x="25" y="71" width="35" height="5" rx="2" fill="#94a3b8"/>
</svg>`;

// Write SVG files that can be converted — for now write the SVGs directly
// Users can convert these to PNG with any tool, or we use them as-is
for (const size of [192, 512]) {
  const content = svg.replace(/SIZE/g, String(size));
  fs.writeFileSync(`public/icons/icon-${size}x${size}.svg`, content);
  console.log(`Created icon-${size}x${size}.svg`);
}

// Also create a simple Apple touch icon SVG
const apple = svg.replace(/SIZE/g, '180');
fs.writeFileSync('public/icons/apple-touch-icon.svg', apple);
console.log('Created apple-touch-icon.svg');
