// Script temporaire — vérification mobile de /formations (reducedMotion pour
// éviter l'artefact de capture plein-page avec les animations au scroll).
import { chromium } from 'playwright';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await page.goto('http://localhost:3023/formations', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.locator('#a-votre-rythme').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/formations-390-rythme.png` });
await browser.close();
