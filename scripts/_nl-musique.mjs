import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', e => console.log('pageerror', e.message.slice(0, 120)));
await page.goto('http://localhost:3011/compte', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const cookie = page.getByRole('button', { name: /J'accepte/i }); if (await cookie.count()) await cookie.first().click().catch(() => {});

// ouvrir le menu musique
await page.locator('button[aria-label="Ouvrir le menu de la musique"]').first().click();
await page.waitForTimeout(600);
console.log('menu ouvert, boutons :', await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b => /Jouer|Play|Pause/.test(b.textContent || '')).map(b => b.textContent.trim())));
// choisir la première piste disponible
const piste = page.locator('button[role="menuitemradio"]').first();
if (await piste.count()) { await piste.click(); await page.waitForTimeout(1500); }
console.log('après choix : bouton =', await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b => /Jouer|Play|Pause/.test(b.textContent || '')).map(b => b.textContent.trim())));
// pause puis play via le bouton
const pauseBtn = page.locator('button', { hasText: /^Pause$/ }).first();
if (await pauseBtn.count()) { await pauseBtn.click(); await page.waitForTimeout(500); console.log('après clic Pause :', await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b => /Jouer|Play|Pause/.test(b.textContent || '')).map(b => b.textContent.trim()))); }
const jouer = page.locator('button', { hasText: /^Jouer$/ }).first();
if (await jouer.count()) { await jouer.click(); await page.waitForTimeout(800); console.log('après clic Jouer :', await page.evaluate(() => Array.from(document.querySelectorAll('button')).filter(b => /Jouer|Play|Pause/.test(b.textContent || '')).map(b => b.textContent.trim()))); }
await page.screenshot({ path: process.argv[2] + '/musique.png', clip: { x: 900, y: 0, width: 540, height: 420 } });
await browser.close();
