// Script temporaire — vérification que le hero de /formations n'est pas cassé.
import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await page.goto('http://localhost:3023/formations', { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/formations-1440-viewport-only.png` });
await page.locator('#a-votre-rythme').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/formations-1440-rythme.png` });
await browser.close();
