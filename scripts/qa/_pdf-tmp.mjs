import { chromium } from 'playwright';
const [,, src, out] = process.argv;
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + src, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.pdf({ path: out, format: 'Letter', printBackground: true });
await b.close(); console.log(out);
