// Captures des chansons des doshas : la leçon « La chanson de … » ouverte dans
// un cours (lecteur + bouton Télécharger, avec le nom et le poids du fichier
// reçu) et la médiathèque de l'admin filtrée sur Musique.
//   JETON=<fichier du jeton admin-jeton.mjs> node scripts/qa/chansons-shots.mjs <dossier de sortie> [formationId] [titre]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, sortie = '.', formation = 'kajabi-2148864751', titre = 'La chanson de Kapha'] = process.argv;
const BASE = process.env.BASE || 'http://localhost:5199';
const token = fs.readFileSync(process.env.JETON, 'utf8').trim();
const b = await chromium.launch();
const nettoyer = async (p) => {
  for (const t of ["J'ACCEPTE", "J'accepte", 'Commencer', 'Fermer', 'Compris']) {
    const x = p.locator(`button:has-text("${t}")`).first();
    if (await x.count().catch(() => 0)) { await x.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
  }
  await p.keyboard.press('Escape').catch(() => {});
};
for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, acceptDownloads: true });
  const p = await c.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(async (t) => {
    const src = await fetch('/src/firebase/auth.ts').then((r) => r.text());
    const a = await import(src.match(/"([^"]*firebase_auth\.js[^"]*)"/)[1]);
    const { auth } = await import('/src/firebase.ts');
    await a.signInWithCustomToken(auth, t);
  }, token);
  await p.waitForTimeout(1500);
  await p.goto(`${BASE}/cours/${formation}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  await nettoyer(p);
  await p.getByText(titre, { exact: true }).first().click();
  await p.waitForTimeout(4000);
  await p.getByRole('heading', { name: titre }).first().scrollIntoViewIfNeeded().catch(() => {});
  await p.evaluate(() => window.scrollBy(0, -40));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${sortie}/chanson-cours-${tag}.jpg`, quality: 75 });
  if (tag === 'desktop') {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.getByRole('button', { name: /Télécharger/ }).first().click()]);
    const f = `${sortie}/${dl.suggestedFilename()}`;
    await dl.saveAs(f);
    console.log('téléchargé :', dl.suggestedFilename(), fs.statSync(f).size);
  }
  await p.goto(`${BASE}/admin/mediatheque`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  await nettoyer(p);
  await p.getByRole('button', { name: /Musique/ }).first().click().catch(() => console.log('pas de pastille Musique'));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${sortie}/chanson-mediatheque-${tag}.jpg`, fullPage: tag === 'mobile', quality: 75 });
  await c.close();
}
await b.close();
