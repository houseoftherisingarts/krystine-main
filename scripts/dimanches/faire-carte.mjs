// Fabrique la carte offerte des Dimanches d'Origine (public/dimanches/carte-dix-couples.pdf)
// à partir de scripts/dimanches/carte.html.   node scripts/dimanches/faire-carte.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
const html = fileURLToPath(new URL('./carte.html', import.meta.url));
mkdirSync('public/dimanches', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`file://${html}`, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: 'public/dimanches/carte-dix-couples.pdf', format: 'Letter', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await b.close();
console.log('✓ public/dimanches/carte-dix-couples.pdf');
