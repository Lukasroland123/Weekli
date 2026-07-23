// Genererer PWA-ikoner + standard-delekort (OG-billede) fra SVG via sharp.
// Kør: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";

// Kvadratisk app-ikon: grøn baggrund + hvidt "W".
function iconSvg(size) {
  const r = Math.round(size * 0.22);
  const fs = Math.round(size * 0.62);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DARK}"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fs}" fill="#ffffff">W</text>
</svg>`;
}

// Delekort 1200x630: grøn baggrund, "Weekli" + tagline.
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_DARK}"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="50%" y="270" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-weight="800" font-size="150" fill="#ffffff">Weekli</text>
  <text x="50%" y="360" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
    font-weight="500" font-size="46" fill="#eafaef">Billige madplaner &amp; opskrifter</text>
</svg>`;
}

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).png().toFile(join(PUBLIC, name));
  console.log(`✓ ${name} (${size})`);
}

await png(iconSvg(192), "192×192", "icon-192.png");
await png(iconSvg(512), "512×512", "icon-512.png");
await png(iconSvg(180), "180×180", "apple-touch-icon.png");
await sharp(Buffer.from(ogSvg())).png().toFile(join(PUBLIC, "opengraph-image.png"));
console.log("✓ opengraph-image.png (1200×630)");
