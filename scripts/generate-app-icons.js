/**
 * Static PWA/favicon PNGs — avoids next/og ImageResponse prerender
 * failing on Windows OneDrive paths (Invalid URL in @vercel/og).
 *
 * Writes:
 * - src/app/icon.png (512) — App Router metadata convention
 * - src/app/apple-icon.png (180)
 * - public/brand/* — stable URLs for manifest
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function make(size, out) {
  const r = Math.round(size * 0.625);
  const blur = Math.max(2, Math.round(size / 40));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#02040a"/>
      <stop offset="55%" stop-color="#0a1830"/>
      <stop offset="100%" stop-color="#061018"/>
    </linearGradient>
    <radialGradient id="globe" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#45f3ff"/>
      <stop offset="28%" stop-color="#0ea5e9"/>
      <stop offset="62%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#02040a"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${blur}" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r / 2}" fill="url(#globe)" filter="url(#glow)"/>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("[generate-app-icons]", out, `${size}x${size}`);
}

async function main() {
  const root = path.join(__dirname, "..");
  const appDir = path.join(root, "src", "app");
  const brandDir = path.join(root, "public", "brand");
  fs.mkdirSync(brandDir, { recursive: true });

  const icon512 = path.join(brandDir, "icon-512.png");
  const apple180 = path.join(brandDir, "apple-icon-180.png");
  await make(512, icon512);
  await make(180, apple180);

  fs.copyFileSync(icon512, path.join(appDir, "icon.png"));
  fs.copyFileSync(apple180, path.join(appDir, "apple-icon.png"));
  console.log("[generate-app-icons] copied → src/app/icon.png, apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
