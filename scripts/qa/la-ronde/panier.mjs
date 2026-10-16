// Panier boutique et compte : ajout au panier puis caisse Shopify (sans payer), et fenêtre de création de compte.
import { chromium } from 'playwright';
import { join } from 'node:path';
const SITE = 'https://www.krystinestlaurent.ca';
const S = '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/parcours';
const nav = await chromium.launch();
for (const [cle, vp, mob] of [['390', { width: 390, height: 844 }, true], ['1440', { width: 1440, height: 900 }, false]]) {
  const ctx = await nav.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, locale: 'fr-CA', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
  await ctx.addInitScript(() => { try { localStorage.setItem('inspirata.consent.v1', 'rejected'); localStorage.setItem('vh.moi', '1'); } catch {} });
  const pg = await ctx.newPage();
  await pg.goto(SITE + '/boutique/produit/huile-nasale-nez-zen', { waitUntil: 'load' }); await pg.waitForTimeout(3500);
  const b = pg.getByRole('button', { name: /ajouter au panier/i }).first();
  console.log(cle, 'bouton ajouter visible :', await b.isVisible().catch(() => false));
  await b.click({ timeout: 10000 }); await pg.waitForTimeout(3500);
  await pg.screenshot({ path: join(S, `panier2-${cle}.jpg`), type: 'jpeg', quality: 62 });
  const t = (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log(cle, 'panier :', /panier est vide/i.test(t) ? 'VIDE' : 'rempli', (t.match(/Sous-total[^A-Z]{0,30}/i) || [''])[0]);
  const caisse = pg.getByRole('button', { name: /passer la commande|caisse|payer/i }).or(pg.getByRole("link", { name: /passer la commande|caisse|payer/i })).first();
  if (await caisse.isVisible().catch(() => false)) {
    const [pop] = await Promise.all([pg.waitForEvent('popup', { timeout: 8000 }).catch(() => null), caisse.click()]);
    const c = pop || pg; await c.waitForLoadState('load').catch(() => {}); await c.waitForTimeout(4000);
    console.log(cle, 'caisse :', c.url().slice(0, 140), 'lang', await c.evaluate(() => document.documentElement.lang).catch(() => '?'));
    await c.screenshot({ path: join(S, `caisse2-${cle}.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
  } else console.log(cle, 'aucun bouton de caisse visible');
  // compte
  const p2 = await ctx.newPage();
  await p2.goto(SITE + '/compte', { waitUntil: 'load' }); await p2.waitForTimeout(3000);
  const boutons = await p2.$$eval('button, a', (bs) => bs.filter((x) => /cr[ée]er|connexion|connecter|google/i.test(x.innerText)).map((x) => x.innerText.replace(/\s+/g, ' ').trim()).slice(0, 8));
  console.log(cle, 'compte, boutons :', boutons.join(' | '));
  const c2 = p2.getByRole('button', { name: /créer (mon|un) (compte|espace)/i }).first();
  if (await c2.count()) { await c2.scrollIntoViewIfNeeded(); await c2.click(); await p2.waitForTimeout(1500); }
  console.log(cle, 'champs visibles : courriel', await p2.locator('input[type=email]:visible').count(), 'mot de passe', await p2.locator('input[type=password]:visible').count());
  await p2.screenshot({ path: join(S, `compte2-${cle}.jpg`), type: 'jpeg', quality: 62 });
  await ctx.close();
}
await nav.close();
