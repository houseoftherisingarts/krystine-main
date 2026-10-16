// Le quiz : la question 2 est-elle lisible une fois l'animation finie ? (capture à 0,6 s, 1,5 s et 4 s après le clic)
import { chromium } from 'playwright';
const S = '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/parcours';
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-CA' });
await ctx.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'rejected'); localStorage.setItem('vh.moi', '1'); } catch {} });
const pg = await ctx.newPage();
await pg.goto('https://www.krystinestlaurent.ca/quiz', { waitUntil: 'load' }); await pg.waitForTimeout(3000);
await pg.locator('button:has(span.rounded-full)').first().click();
for (const t of [600, 1500, 4000]) {
  await pg.waitForTimeout(t === 600 ? 600 : t === 1500 ? 900 : 2500);
  const op = await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('span.rounded-full')); let o = 1; for (let x = b; x; x = x.parentElement) o *= Number(getComputedStyle(x).opacity); return o.toFixed(2); });
  console.log(`${t} ms : opacité réelle des choix ${op}`);
  await pg.screenshot({ path: `${S}/quiz-q02-apres-${t}ms-390.jpg`, type: 'jpeg', quality: 62 });
}
await nav.close();
