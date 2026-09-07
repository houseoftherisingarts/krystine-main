// QA P3 : pop-ups publiques devant les yeux — liste d'attente (WaitlistModal)
// et connexion (SignInModal), après un scroll de 1200px sur /krystine.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/popups-portail';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const rapport = [];
const mesurer = async (selecteur, nom, fichier) => {
  const boite = await page.locator(selecteur).first().boundingBox();
  const vp = page.viewportSize();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.screenshot({ path: `${OUT}/${fichier}` });
  const ok = boite && boite.x === 0 && boite.y === 0 && Math.round(boite.width) === vp.width && Math.round(boite.height) === vp.height;
  console.log(nom, '→ boîte', JSON.stringify(boite), 'viewport', JSON.stringify(vp), 'scrollY', scrollY, ok ? 'OK plein viewport' : 'PROBLÈME');
  rapport.push({ nom, boite, viewport: vp, scrollY, ok });
};
try {
  await page.goto(`${BASE}/krystine`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#events', { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(700);
  console.log('scrollY après scrollTo(1200) :', await page.evaluate(() => window.scrollY));
  await page.screenshot({ path: `${OUT}/10-krystine-apres-scroll-1200.png` });

  // 1. Liste d'attente (WaitlistModal) — clic sur une carte d'événement "liste d'attente"
  const boutonListe = page.locator('button', { hasText: /liste d.attente/i }).first();
  await boutonListe.scrollIntoViewIfNeeded();
  await boutonListe.click();
  await page.waitForTimeout(700);
  await mesurer('.fixed.inset-0.z-\\[120\\]', 'Liste d’attente (WaitlistModal)', '11-waitlist.png');
  await page.locator('.fixed.inset-0.z-\\[120\\]').first().click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(500);
  console.log('waitlist encore ouverte ?', await page.locator('.fixed.inset-0.z-\\[120\\]').count() > 0);

  // 2. Connexion / Créer mon compte (SignInModal) — bouton de la nav, tout en haut
  const boutonCompte = page.locator('button', { hasText: /créer mon compte/i }).first();
  await boutonCompte.scrollIntoViewIfNeeded();
  await boutonCompte.click();
  await page.waitForTimeout(700);
  await mesurer('.fixed.inset-0.z-\\[110\\]', 'Créer mon compte (SignInModal)', '12-signin.png');

  console.log('\n=== RAPPORT P3 ===');
  console.log(JSON.stringify(rapport, null, 2));
} catch (e) {
  console.error('ERREUR', e);
  await page.screenshot({ path: `${OUT}/erreur-p3.png` }).catch(() => {});
} finally {
  await browser.close();
}
