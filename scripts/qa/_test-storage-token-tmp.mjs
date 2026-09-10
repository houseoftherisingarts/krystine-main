import { chromium } from 'playwright';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:5199/admin/habitudes', { waitUntil: 'domcontentloaded' });
await p.locator('button:has-text("Email")').click();
await p.fill('input[type="email"]', 'houseoftherisingarts@gmail.com');
await p.fill('input[type="password"]', 'EssaiHabitudes2026!');
await p.click('button[type="submit"]');
await p.waitForSelector('text=comptes au total', { timeout: 20000 });
await p.goto('http://localhost:5199/foyer-essai', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);

// Téléverser un vrai fichier dans une porte vide (janvier), pour obtenir une
// VRAIE adresse de téléchargement émise par l'émulateur Storage.
const carteJanvier = p.locator('text=Recommencer sans se trahir').locator('xpath=ancestor::div[contains(@class,"rounded-[15px]")]');
const inputFile = carteJanvier.locator('input[type="file"]');
await inputFile.setInputFiles('public/foyer/allumette.mp4');
await p.waitForTimeout(6000);
await p.screenshot({ path: '/tmp/upload-apres.png' });

const videoUrl = await carteJanvier.locator('video').getAttribute('src');
console.log('URL de téléchargement obtenue:', videoUrl);

if (!videoUrl) {
  console.log('ÉCHEC: aucune URL de téléchargement trouvée après upload.');
  await b.close();
  process.exit(1);
}

// 1) Requête SANS jeton (retirer le paramètre token) — doit être refusée.
const sansJeton = new URL(videoUrl);
sansJeton.searchParams.delete('token');
const r1 = await fetch(sansJeton.toString());
console.log('Sans le jeton :', r1.status);

// 2) Requête AVEC le jeton, depuis un contexte anonyme (aucun cookie, aucune
// session Firebase Auth) — doit réussir malgré la règle isAdmin().
const ctx2 = await b.newContext();
const p2 = await ctx2.newPage();
const r2 = await p2.goto(videoUrl);
console.log('Avec le jeton (contexte anonyme) :', r2.status(), r2.headers()['content-type']);

await ctx2.close();
await b.close();
