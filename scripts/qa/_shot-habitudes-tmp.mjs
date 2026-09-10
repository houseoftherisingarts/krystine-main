import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const OUT = process.argv[2] || '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';

const b = await chromium.launch();

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  await p.goto(`${BASE}/admin/habitudes`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  // Se connecter en mode courriel réel (Auth émulateur), pas le bypass local.
  const emailTab = p.locator('button:has-text("Email")');
  if (await emailTab.count()) await emailTab.click();
  await p.waitForTimeout(300);
  await p.fill('input[type="email"]', 'houseoftherisingarts@gmail.com');
  await p.fill('input[type="password"]', 'EssaiHabitudes2026!');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(3000);

  await p.waitForSelector('text=comptes au total', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/habitudes-${tag}-tendances.png`, fullPage: true });

  // Ouvrir la fiche de Sophie Tremblay (recherche par nom).
  const recherche = p.locator('input[placeholder*="Chercher"]');
  await recherche.fill('Sophie');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/habitudes-${tag}-recherche.png`, fullPage: true });
  const resultat = p.locator('button:has-text("Sophie Tremblay")').first();
  if (await resultat.count()) {
    await resultat.click();
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/habitudes-${tag}-fiche-sophie.png`, fullPage: true });
  } else {
    console.log(`[${tag}] Sophie Tremblay introuvable dans la recherche`);
  }

  // Ouvrir la fiche de Julie Corriveau (suivi éteint).
  await p.locator('button:has-text("Fermer")').click().catch(() => {});
  await recherche.fill('Julie');
  await p.waitForTimeout(700);
  const julie = p.locator('button:has-text("Julie Corriveau")').first();
  if (await julie.count()) {
    await julie.click();
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/habitudes-${tag}-fiche-julie-eteinte.png`, fullPage: true });
  } else {
    console.log(`[${tag}] Julie Corriveau introuvable`);
  }

  console.log(`[${tag}] erreurs JS:`, errs.slice(0, 8));
  await ctx.close();
}

await b.close();
