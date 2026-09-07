// QA sceptique — accueil statique, Médias, pied de page. Lecture seule, pas de compte requis.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'https://krystinestlaurent.ca';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/accueil-medias-footer';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const shoot = async (viewport, name, url, fn) => {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1200);
  if (fn) await fn(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log('shot', name);
};

// A1 — nav desktop (haut de l'accueil)
await shoot({ width: 1440, height: 900 }, 'a1-nav-desktop-1440', `${BASE}/`, async (page) => {
  await page.locator('.navlinks a.btn-gold').scrollIntoViewIfNeeded();
});

// A1 — nav mobile (burger ouvert)
await shoot({ width: 390, height: 844 }, 'a1-nav-mobile-390', `${BASE}/`, async (page) => {
  await page.locator('#mnavBtn').click();
  await page.waitForTimeout(400);
});

// A1 + A2 — tuile tome 3 + carte Devenez votre premier repère, desktop
await shoot({ width: 1440, height: 1400 }, 'a1-a2-tome3-devenez-desktop-1440', `${BASE}/`, async (page) => {
  await page.locator('#tome3').scrollIntoViewIfNeeded();
});

// A2 — carte Expérience Origine (Devenez votre premier repère), gros plan desktop
await shoot({ width: 1440, height: 900 }, 'a2-devenez-closeup-1440', `${BASE}/`, async (page) => {
  await page.locator('.offer-origine').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

// A2 — même carte, mobile
await shoot({ width: 390, height: 844 }, 'a2-devenez-closeup-390', `${BASE}/`, async (page) => {
  await page.locator('.offer-origine').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

// A1 + A3 — bande Foyer d'Origine (les 2 boutons), desktop
await shoot({ width: 1440, height: 900 }, 'a1-a3-foyer-desktop-1440', `${BASE}/`, async (page) => {
  await page.locator('#foyer-attente').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

// A1 — footer / infolettre, desktop
await shoot({ width: 1440, height: 900 }, 'a1-footer-infolettre-1440', `${BASE}/`, async (page) => {
  await page.locator('footer .acct-upsell a.btn-gold').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

// A6 — bas du pied de page (React, /medias) : sceau du Salon + "Plateforme développée par"
await shoot({ width: 1440, height: 900 }, 'a6-footer-salon-1440', `${BASE}/medias`, async (page) => {
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});
await shoot({ width: 1440, height: 900 }, 'a6-footer-nav-full-1440', `${BASE}/medias`, async (page) => {
  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
});

// A4 — Médias : cartes "Regarder les épisodes" + "Les trois saisons réunies"
await shoot({ width: 1440, height: 1200 }, 'a4-medias-cartes-1440', `${BASE}/medias`, async (page) => {
  const h = await page.locator('text=Regarder les épisodes').first();
  await h.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

// A5 — Livres, troisième couverture en gros plan
await shoot({ width: 1440, height: 1100 }, 'a5-livres-tome3-closeup-1440', `${BASE}/medias`, async (page) => {
  const h = await page.locator('#livres').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

await browser.close();
console.log('done');
