/**
 * Usage: node screenshot.mjs <url> [label]
 * Example: node screenshot.mjs http://localhost:3000
 * Example: node screenshot.mjs http://localhost:3000 hero
 *
 * Saves to: ./temporary screenshots/screenshot-N[-label].png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const outDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Auto-increment screenshot number
const existing = fs.readdirSync(outDir).filter(f => f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'));
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(outDir, filename);

// Try to find puppeteer
async function findPuppeteer() {
  const candidates = [
    // Local node_modules
    path.join(__dirname, 'node_modules', 'puppeteer'),
    // Windows common locations
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'puppeteer'),
    path.join('C:\\', 'Users', process.env.USERNAME || '', 'AppData', 'Roaming', 'npm', 'node_modules', 'puppeteer'),
    // Mac paths (for portability)
    '/Users/filipbara/Documents/Claude Code/Website building/node_modules/puppeteer',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const mod = await import(new URL(`file:///${p.replace(/\\/g, '/')}/lib/esm/puppeteer/puppeteer.js`).href);
        return mod.default || mod;
      } catch {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
          const main = path.join(p, pkg.main || 'lib/cjs/puppeteer/puppeteer.js');
          const mod = await import(new URL(`file:///${main.replace(/\\/g, '/')}`).href);
          return mod.default || mod;
        } catch {
          continue;
        }
      }
    }
  }
  return null;
}

const puppeteer = await findPuppeteer();

if (!puppeteer) {
  console.error('Puppeteer not found. Install it:');
  console.error('  npm install puppeteer');
  console.error('Or run: npx puppeteer browsers install chrome');
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);
