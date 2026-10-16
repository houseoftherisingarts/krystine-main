// L'intérieur des cours vu par une acheteuse (copie locale, accès d'aperçu sur localhost seulement).
// Clique chaque carte de module, capture la liste des capsules, ouvre les documents à télécharger.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SITE = process.env.RONDE_SITE || 'http://localhost:5202';
const SORTIE = '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/cours-interieur';
mkdirSync(SORTIE, { recursive: true });
const cours = (process.argv[2] || '/cours/rituels-vivants?apercu=1,/cours/vata?apercu=1,/cours/kajabi-2149348838?apercu=1').split(',');
const apps = [{ cle: '390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { cle: '1440', viewport: { width: 1440, height: 900 } }];
const nav = await chromium.launch();
const bilan = [];
for (const c of cours) for (const a of apps) {
  const nom = c.replace(/[^a-z0-9]+/gi, '_') + '-' + a.cle;
  const ctx = await nav.newContext({ viewport: a.viewport, isMobile: !!a.isMobile, hasTouch: !!a.hasTouch, deviceScaleFactor: 1, locale: 'fr-CA' });
  await ctx.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'rejected'); localStorage.setItem('vh.moi', '1'); } catch {} });
  const pg = await ctx.newPage();
  const r = { cours: c, appareil: a.cle, etapes: [], erreurs: [] };
  pg.on('pageerror', (e) => r.erreurs.push(e.message.slice(0, 160)));
  await pg.goto(SITE + c, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(4000);
  // descente pour tout révéler, puis capture pleine page
  await pg.evaluate(async () => { for (let i = 0; i < 40; i++) { scrollBy(0, innerHeight * 0.8); await new Promise((r) => setTimeout(r, 250)); } scrollTo(0, 0); });
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: join(SORTIE, `${nom}-page.jpg`), fullPage: true, type: 'jpeg', quality: 60 });
  r.texte = await pg.evaluate(() => document.body.innerText);
  // les cartes de module / semaine
  const cartes = pg.locator('button, [role=button], a').filter({ hasText: /^(\s*)(MODULE \d|Module \d|Semaine \d|SEMAINE \d|Introduction|INTRODUCTION|Conclusion|CONCLUSION|Pilier|PILIER)/ });
  const n = Math.min(await cartes.count(), 14);
  for (let i = 0; i < n; i++) {
    const carte = cartes.nth(i);
    const t = ((await carte.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 60);
    try {
      await carte.scrollIntoViewIfNeeded({ timeout: 4000 });
      await carte.click({ timeout: 5000 });
      await pg.waitForTimeout(1800);
      const f = join(SORTIE, `${nom}-carte${String(i).padStart(2, '0')}.jpg`);
      await pg.screenshot({ path: f, type: 'jpeg', quality: 60 });
      r.etapes.push({ carte: t, capture: f });
    } catch (e) { r.etapes.push({ carte: t, erreur: e.message.split('\n')[0].slice(0, 120) }); }
  }
  // les documents à télécharger : ouvrir l'aperçu du premier, capturer
  const docs = pg.locator('button, a').filter({ hasText: /guide|PDF|Télécharger|télécharger|Document|document|Plantes/ });
  const nd = Math.min(await docs.count(), 4);
  for (let i = 0; i < nd; i++) {
    const d = docs.nth(i);
    const t = ((await d.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 60);
    try {
      await d.scrollIntoViewIfNeeded({ timeout: 4000 });
      const avant = pg.url();
      const [popup] = await Promise.all([pg.waitForEvent('popup', { timeout: 3000 }).catch(() => null), d.click({ timeout: 5000 })]);
      await pg.waitForTimeout(2500);
      const f = join(SORTIE, `${nom}-doc${i}.jpg`);
      await pg.screenshot({ path: f, type: 'jpeg', quality: 60 });
      r.etapes.push({ document: t, capture: f, nouvelOnglet: !!popup, url: pg.url() !== avant ? pg.url() : '' });
      if (popup) await popup.close();
      await pg.keyboard.press('Escape').catch(() => {});
      if (pg.url() !== avant) await pg.goBack().catch(() => {});
      await pg.waitForTimeout(800);
    } catch (e) { r.etapes.push({ document: t, erreur: e.message.split('\n')[0].slice(0, 120) }); }
  }
  bilan.push(r);
  console.log(nom, r.etapes.length, 'étapes', r.erreurs.length, 'erreurs');
  await ctx.close();
}
await nav.close();
writeFileSync(join(SORTIE, 'bilan.json'), JSON.stringify(bilan, null, 1));
