// Renders the app icons in assets/ from the water-buddy artwork below.
// Usage: node scripts/render-icons.mjs   (needs Playwright + Chromium installed)
//
// The icon is SENSA's own water-buddy character on Stanford Cardinal. It
// intentionally does NOT include any Stanford logo (Stanford's identity rules
// don't allow logos in non-Stanford product icons without separate approval).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright is loaded with require() so a globally installed copy also works.
const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARDINAL = '#8C1515';
const DROPLET = 'M50 8 C50 8 18 44 18 64 A32 32 0 0 0 82 64 C82 44 50 8 50 8 Z';
const top = 96 - 0.7 * 88;
const WAVE = `M-10 ${top} Q2.5 ${top - 3} 15 ${top} T40 ${top} T65 ${top} T90 ${top} T115 ${top} V110 H-10 Z`;

/** The happy water buddy in a 100×100 box. */
const buddy = `
  <defs><clipPath id="b"><path d="${DROPLET}"/></clipPath></defs>
  <path d="${DROPLET}" fill="#E3F4F7"/>
  <g clip-path="url(#b)"><path d="${WAVE}" fill="#36AFC7" opacity="0.75"/></g>
  <path d="${DROPLET}" fill="none" stroke="#007C92" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="36" cy="44" rx="4.5" ry="9" fill="#fff" opacity="0.75" transform="rotate(-25 36 44)"/>
  <ellipse cx="42" cy="60" rx="2.8" ry="3.8" fill="#11343B"/><circle cx="42.9" cy="58.6" r="0.9" fill="#fff"/>
  <ellipse cx="58" cy="60" rx="2.8" ry="3.8" fill="#11343B"/><circle cx="58.9" cy="58.6" r="0.9" fill="#fff"/>
  <circle cx="35" cy="68" r="3.5" fill="#F2A1A1" opacity="0.6"/><circle cx="65" cy="68" r="3.5" fill="#F2A1A1" opacity="0.6"/>
  <path d="M42 69 q8 8 16 0" stroke="#11343B" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;

/** Places the buddy at `scale` of the canvas, centered (slightly lifted for optical balance). */
const placed = (scale) => `<g transform="translate(${50 - 50 * scale} ${48 - 50 * scale}) scale(${scale})">${buddy}</g>`;
const svg = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}${body}</svg>`;
const silhouette = (scale, color = '#FFFFFF') =>
  `<g transform="translate(${50 - 50 * scale} ${48 - 50 * scale}) scale(${scale})"><path d="${DROPLET}" fill="${color}"/></g>`;

const icons = [
  // iOS / store icon (iOS rounds the corners itself).
  { file: 'icon.png', size: 1024, svg: svg(placed(0.78), CARDINAL) },
  // Android adaptive icon: foreground stays inside the central safe zone.
  { file: 'android-icon-foreground.png', size: 512, svg: svg(placed(0.56)), transparent: true },
  { file: 'android-icon-background.png', size: 512, svg: svg('', CARDINAL) },
  { file: 'android-icon-monochrome.png', size: 432, svg: svg(silhouette(0.56)), transparent: true },
  // Native splash (background color comes from app.json, light/dark).
  { file: 'splash-icon.png', size: 1024, svg: svg(placed(0.9)), transparent: true },
  // Web favicon.
  { file: 'favicon.png', size: 48, svg: svg(`<rect width="100" height="100" rx="22" fill="${CARDINAL}"/>${placed(0.8)}`), transparent: true },
  // Android status-bar notification icon: must be white on transparent.
  { file: 'notification-icon.png', size: 96, svg: svg(silhouette(0.86)), transparent: true },
];

mkdirSync(join(root, 'assets/brand'), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const icon of icons) {
  writeFileSync(join(root, 'assets/brand', icon.file.replace('.png', '.svg')), icon.svg);
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${icon.svg.replace('<svg ', `<svg width="${icon.size}" height="${icon.size}" `)}</body></html>`,
  );
  await page.screenshot({ path: join(root, 'assets', icon.file), omitBackground: !!icon.transparent });
  console.log('wrote assets/' + icon.file);
}
await browser.close();
