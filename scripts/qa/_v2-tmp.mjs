import { chromium } from 'playwright';
const S = process.argv[2];
const browser = await chromium.launch();
for (const [w,h,tag] of [[1440,900,'1440'],[390,844,'390']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:4181/foyer', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 200); await page.waitForTimeout(600);
  const img = page.locator('img[src="/foyer/calendrier-annee.webp"]');
  await img.waitFor({ timeout: 30000 });
  await img.evaluate((el, block) => el.scrollIntoView({ block }), tag === '1440' ? 'center' : 'start');
  await page.waitForTimeout(2500);
  const box = await img.boundingBox();
  const y = Math.max(0, box.y);
  await page.screenshot({ path: `${S}/cal-${tag}.png`, clip: { x: box.x, y, width: box.width, height: Math.min(box.height, h - y) } });
  const tailles = await page.evaluate(() => [...document.querySelectorAll('img[src*="-cutout.webp"]')].map(i => { const r = i.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
  console.log(tag, 'portes', [...new Set(tailles)].join(' | '), 'n=', tailles.length);
  if (tag === '1440') {
    await page.hover('button[aria-label="Ouvrir la porte de Mars"]', { force: true }); await page.waitForTimeout(700);
    await page.screenshot({ path: `${S}/cal-hover.png`, clip: { x: box.x, y, width: box.width, height: Math.min(box.height, h - y) } });
    await page.click('button[aria-label="Ouvrir la porte de Mars"]', { force: true }); await page.waitForTimeout(1800);
    await page.screenshot({ path: `${S}/cal-open.png`, clip: { x: box.x, y, width: box.width, height: Math.min(box.height, h - y) } });
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5)); await page.waitForTimeout(1200);
  for (const sel of ['[role=group][aria-label=Langue]', 'button[title="Musique d’ambiance"]', 'button[aria-label="Poser une question"]', 'button:has-text("Rejoindre")']) {
    const b = await page.locator(sel).first().boundingBox().catch(() => null);
    console.log(tag, sel, b && `center=${Math.round(b.y + b.height/2)} h=${Math.round(b.height)} x=${Math.round(b.x)}..${Math.round(b.x+b.width)}`);
  }
  await page.screenshot({ path: `${S}/bas-${tag}.png`, clip: { x: 0, y: h - 130, width: w, height: 130 } });
  const m = page.locator('button[title="Musique d’ambiance"]');
  console.log(tag, 'musique avant', await m.getAttribute('aria-pressed'));
  await m.click({ force: true }); await page.waitForTimeout(800);
  console.log(tag, 'musique après clic', await m.getAttribute('aria-pressed'));
  await page.close();
}
await browser.close();
