import { chromium } from 'playwright';
const routes = [['/evenements','evenements'],['/medias','medias'],['/cours/vata','vata'],['/accueil','accueil'],['/evenement/lancement-anglicane?apercu=1','vente']];
const out = process.argv[2];
const b = await chromium.launch();
for (const [route, tag] of routes) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('krystine-lang', 'fr'); sessionStorage.setItem('rideau-evenements','1'); } catch {} });
  const p = await c.newPage();
  await p.goto('https://krystinestlaurent.ca' + route, { waitUntil: 'load' });
  await p.waitForTimeout(3500);
  for (const t of ["J'ACCEPTE", "J'accepte"]) { const btn = p.locator(`button:has-text("${t}")`).first(); if (await btn.count().catch(() => 0)) await btn.click({ timeout: 1500 }).catch(() => {}); }
  await p.screenshot({ path: `${out}/${tag}-top.jpg`, quality: 72 });
  await p.evaluate(async () => { const pas = window.innerHeight * 0.6; for (let y = 0; y < document.body.scrollHeight; y += pas) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500)); });
  await p.screenshot({ path: `${out}/${tag}-full.jpg`, fullPage: true, quality: 60 });
  console.log(tag, 'ok');
  await c.close();
}
await b.close();
