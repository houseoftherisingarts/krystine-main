// La Ronde, passe des parcours : jusqu'au bord de l'action, jamais au-delà (rien soumis, rien payé).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APPAREILS } from './pages.mjs';

const SITE = process.env.RONDE_SITE || 'https://www.krystinestlaurent.ca';
const SORTIE = '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/7cc8fb01-d47a-4868-b79a-80434059bb32/scratchpad/la-ronde/parcours';
mkdirSync(SORTIE, { recursive: true });
const choisis = (process.env.RONDE_APPAREILS || '360,390,820,1180,1440').split(',');
const nav = await chromium.launch();
const bilan = [];

async function contexte(app, consentement = true) {
  const ctx = await nav.newContext({ viewport: app.viewport, isMobile: !!app.isMobile, hasTouch: !!app.hasTouch, userAgent: app.userAgent, deviceScaleFactor: 1, locale: 'fr-CA' });
  await ctx.addInitScript((c) => { try { if (c) localStorage.setItem('inspirata.consent.v1', 'rejected'); localStorage.setItem('vh.moi', '1'); } catch {} }, consentement);
  return ctx;
}
const court = (t) => String(t).split('\n')[0].slice(0, 160);

// Ce que voit la visiteuse en bas de l'écran : les éléments fixes qui s'empilent.
const empilement = (pg) => pg.evaluate(() => {
  const vh = innerHeight, vw = innerWidth;
  return [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el); if (s.position !== 'fixed' && s.position !== 'sticky') return false;
    const b = el.getBoundingClientRect(); if (b.width < 20 || b.height < 20 || b.bottom < vh * 0.55 || b.top > vh || s.visibility === 'hidden' || Number(s.opacity) < 0.1 || b.width * b.height > vw * vh * 0.6) return false;
    let p = el.parentElement; while (p && p !== document.body) { if (['fixed', 'sticky'].includes(getComputedStyle(p).position)) return false; p = p.parentElement; } return true;
  }).map((el) => { const b = el.getBoundingClientRect(); return `${(el.innerText || el.getAttribute('aria-label') || el.tagName).replace(/\s+/g, ' ').slice(0, 40)} [${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)}]`; });
});

for (const cle of choisis) {
  const app = APPAREILS.find((a) => a.cle === cle);
  const noter = (nom, ok, detail, capture = '', extra = {}) => { bilan.push({ nom, appareil: cle, ok, detail, capture, ...extra }); console.log(ok ? 'OK ' : 'KO ', cle, nom, '|', detail); };
  const shot = async (pg, nom, full = false) => { const f = join(SORTIE, `${nom}-${cle}.jpg`); await pg.screenshot({ path: f, type: 'jpeg', quality: 62, fullPage: full }).catch(() => {}); return f; };

  // 0. Première visite, bannière des témoins : ce qui s'empile en bas
  for (const p of ['/accueil', '/vata', '/rituels-essentiels', '/quiz']) {
    const ctx = await contexte(app, false); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + p, { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3500);
      const e = await empilement(pg);
      noter(`Premier écran avec les témoins ${p}`, e.length <= 2, `${e.length} éléments fixes en bas : ${e.join(' | ')}`, await shot(pg, `temoins${p.replace(/\//g, '_')}`));
      if (p !== '/quiz') { await pg.evaluate(() => scrollTo(0, document.documentElement.scrollHeight * 0.5)); await pg.waitForTimeout(1500); const e2 = await empilement(pg); noter(`Mi-page avec les témoins ${p}`, e2.length <= 2, `${e2.length} éléments fixes en bas : ${e2.join(' | ')}`, await shot(pg, `temoins-mi${p.replace(/\//g, '_')}`)); }
    } catch (x) { noter(`Premier écran avec les témoins ${p}`, false, court(x.message)); }
    await ctx.close();
  }

  // 1. Le quiz, question par question
  { const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + '/quiz', { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3000);
      await shot(pg, 'quiz-00-ouverture');
      // le bouton de départ, s'il y en a un
      const depart = pg.getByRole('button', { name: /commencer|je commence|débuter|me situer/i }).first();
      if (await depart.isVisible().catch(() => false)) { await depart.click(); await pg.waitForTimeout(1500); }
      let n = 0;
      for (let i = 0; i < 15; i++) {
        const choix = pg.locator('button:has(span.rounded-full)').first();
        if (!(await choix.count())) break;
        // les choix de cette question sont-ils tous visibles et entiers ?
        const coupes = await pg.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.querySelector('span.rounded-full')).filter((b) => { const r = b.getBoundingClientRect(); return r.right > innerWidth + 1 || r.left < -1; }).length);
        const f = await shot(pg, `quiz-q${String(i + 1).padStart(2, '0')}`);
        if (coupes) noter(`Quiz question ${i + 1}`, false, `${coupes} choix coupés sur le côté`, f);
        await choix.click({ timeout: 8000 }); n++; await pg.waitForTimeout(1200);
      }
      await pg.waitForTimeout(3000);
      const f = await shot(pg, 'quiz-formulaire');
      const ff = await shot(pg, 'quiz-formulaire-entier', true);
      const t = await pg.locator('body').innerText();
      const courriel = await pg.locator('input[type=email]').count();
      const robot = await pg.waitForSelector('iframe[src*="recaptcha"]', { timeout: 20000 }).then(() => true).catch(() => false);
      const bouton = /Recevoir ma lecture et sa suite/i.test(t);
      const sansLettres = /sans (les )?lettres|seulement (mon|le) résultat|résultat seul/i.test(t);
      noter('Quiz complet jusqu’au formulaire', n >= 9 && courriel > 0 && robot && bouton && !sansLettres, `${n} questions; courriel ${courriel ? 'présent' : 'ABSENT'}; case anti-robot ${robot ? 'présente' : 'ABSENTE'}; bouton « Recevoir ma lecture et sa suite » ${bouton ? 'présent' : 'ABSENT'}${sansLettres ? '; OPTION SANS LETTRES PRÉSENTE' : ''}`, f, { pleine: ff });
    } catch (x) { noter('Quiz complet jusqu’au formulaire', false, court(x.message)); }
    await ctx.close(); }

  // 2-3. VATA et Rituels essentiels jusqu'au formulaire Stripe
  for (const [nom, adresse, sel] of [['VATA jusqu’à Stripe', '/vata', { role: 'button', name: /commencer/i }], ['Rituels essentiels jusqu’à Stripe', '/rituels-essentiels', { role: 'link', name: /j.accède/i }]]) {
    const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + adresse, { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(2500);
      const boutons = await pg.evaluate(() => [...document.querySelectorAll('a,button')].filter((b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.width > 0 && /commencer|j.accède|acheter|je m.inscris|paiement/i.test(b.innerText); }).map((b) => b.innerText.replace(/\s+/g, ' ').slice(0, 40)));
      noter(`${nom} : boutons d’achat au premier écran`, boutons.length <= 1, `${boutons.length} : ${boutons.join(' | ')}`, await shot(pg, `achat-premier${adresse.replace(/\//g, '_')}`));
      await pg.getByRole(sel.role, { name: sel.name }).first().click({ timeout: 15000 });
      await pg.waitForURL(/paiement/, { timeout: 20000 }); await pg.waitForTimeout(2000);
      const f1 = await shot(pg, `paiement${adresse.replace(/\//g, '_')}`);
      const t = await pg.locator('body').innerText();
      const prix = (t.match(/\d{2,3}(,\d{2})?\s?\$/g) || []).slice(0, 6).join(' ');
      const note = /vous vous engagez à régler chaque versement/i.test(t);
      await pg.getByRole('button', { name: /continuer vers le paiement/i }).first().click({ timeout: 15000 });
      const stripe = await pg.waitForSelector('iframe[src*="stripe.com"]', { timeout: 30000 }).then(() => true).catch(() => false);
      await pg.waitForTimeout(6000);
      const visible = await pg.evaluate(() => { const r = [...document.querySelectorAll('iframe[src*="stripe.com"]')].map((x) => x.getBoundingClientRect()).find((x) => x.height > 200); return !!r && r.top < innerHeight - 150 && r.bottom > 150; }).catch(() => false);
      const f2 = await shot(pg, `stripe${adresse.replace(/\//g, '_')}`);
      noter(nom, stripe && visible, `prix vus : ${prix || 'AUCUN'}; note des versements ${note ? 'présente' : 'absente'}; Stripe ${stripe ? (visible ? 'ouvert et visible' : 'HORS ÉCRAN') : 'ABSENT'}`, f2, { avant: f1 });
    } catch (x) { noter(nom, false, court(x.message), await shot(pg, `echec${adresse.replace(/\//g, '_')}`)); }
    await ctx.close();
  }

  // 4. Compte : connexion et création
  { const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + '/compte', { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3000);
      const f0 = await shot(pg, 'compte-ouverture');
      const email0 = await pg.locator('input[type=email]:visible').count();
      noter('Connexion : fenêtre', email0 > 0, email0 ? 'champ courriel visible' : 'aucun champ courriel au premier écran', f0);
      const creer = pg.getByRole('button', { name: /créer (un|mon) compte/i }).first();
      if (await creer.isVisible().catch(() => false)) { await creer.click(); await pg.waitForTimeout(1500); }
      const f = await shot(pg, 'compte-creation');
      const email = await pg.locator('input[type=email]:visible').count(); const mdp = await pg.locator('input[type=password]:visible').count();
      noter('Création de compte : fenêtre', email > 0 && mdp > 0, `courriel ${email}, mot de passe ${mdp}`, f);
    } catch (x) { noter('Compte', false, court(x.message)); }
    await ctx.close(); }

  // 5. Liste d'attente
  { const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + '/liste-attente?programme=pitta', { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3000);
      const f = await shot(pg, 'liste-attente', true);
      const email = await pg.locator('input[type=email]').count();
      noter('Liste d’attente : formulaire', email > 0, email ? 'formulaire présent' : 'aucun champ courriel', f);
    } catch (x) { noter('Liste d’attente', false, court(x.message)); }
    await ctx.close(); }

  // 6. Infolettre : le formulaire d'inscription (accueil, podcast, médias)
  for (const p of ['/podcast', '/medias', '/accueil']) {
    const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + p, { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(2500);
      await pg.evaluate(async () => { for (let i = 0; i < 40; i++) { scrollBy(0, innerHeight * 0.8); await new Promise((r) => setTimeout(r, 200)); } });
      const champ = pg.locator('input[type=email]').first();
      if (await champ.count()) { await champ.scrollIntoViewIfNeeded().catch(() => {}); await pg.waitForTimeout(1200); noter(`Infolettre ${p}`, true, 'formulaire trouvé', await shot(pg, `infolettre${p.replace(/\//g, '_')}`)); }
      else noter(`Infolettre ${p}`, false, 'aucun champ courriel sur la page');
    } catch (x) { noter(`Infolettre ${p}`, false, court(x.message)); }
    await ctx.close();
  }

  // 7. « Un commentaire ? Écrivez-nous »
  { const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + '/vata', { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3000);
      const b = pg.getByRole('button', { name: /commentaire|écrivez-nous|^\?$/i }).first();
      if (await b.isVisible().catch(() => false)) {
        await b.click(); await pg.waitForTimeout(1500);
        const f = await shot(pg, 'commentaire');
        const champ = await pg.locator('textarea:visible').count();
        noter('Un commentaire ? Écrivez-nous', champ > 0, champ ? 'formulaire ouvert' : 'aucune zone de texte après le clic', f);
      } else noter('Un commentaire ? Écrivez-nous', false, 'bouton introuvable ou invisible', await shot(pg, 'commentaire-absent'));
    } catch (x) { noter('Un commentaire ? Écrivez-nous', false, court(x.message)); }
    await ctx.close(); }

  // 8. Panier de la boutique
  { const ctx = await contexte(app); const pg = await ctx.newPage();
    try {
      await pg.goto(SITE + '/boutique/produit/huile-nasale-nez-zen', { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(3500);
      const f0 = await shot(pg, 'produit');
      const ajouter = pg.getByRole('button', { name: /ajouter|panier/i }).first();
      await ajouter.click({ timeout: 10000 }); await pg.waitForTimeout(3000);
      const f = await shot(pg, 'panier');
      const liens = await pg.$$eval('a[href*="checkout"], a[href*="cart"], a[href*="inspiratanature"]', (as) => as.map((a) => a.href).slice(0, 5));
      const t = await pg.locator('body').innerText();
      noter('Panier boutique', /panier/i.test(t), `après l’ajout; liens de caisse : ${liens.join(' ') || 'aucun lien visible (bouton)'}`, f, { avant: f0 });
      const caisse = pg.getByRole('button', { name: /passer à la caisse|commander|payer|caisse/i }).first();
      if (await caisse.isVisible().catch(() => false)) {
        const [pop] = await Promise.all([pg.waitForEvent('popup', { timeout: 8000 }).catch(() => null), caisse.click()]);
        const cible = pop || pg; await cible.waitForLoadState('load').catch(() => {}); await cible.waitForTimeout(3000);
        const u = cible.url(); const lang = await cible.evaluate(() => document.documentElement.lang).catch(() => '');
        const f2 = join(SORTIE, `caisse-shopify-${cle}.jpg`); await cible.screenshot({ path: f2, type: 'jpeg', quality: 60 }).catch(() => {});
        noter('Panier jusqu’à la caisse Shopify', /fr/i.test(lang), `caisse : ${u.slice(0, 120)} (langue ${lang})`, f2);
      }
    } catch (x) { noter('Panier boutique', false, court(x.message), await shot(pg, 'panier-echec')); }
    await ctx.close(); }
}
await nav.close();
writeFileSync(join(SORTIE, 'bilan.json'), JSON.stringify(bilan, null, 1));
