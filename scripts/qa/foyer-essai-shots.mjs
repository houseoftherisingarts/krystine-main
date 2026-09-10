import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const b = await chromium.launch();

// 1) Visiteuse ordinaire (aucun __devAdmin) : doit repartir vers /accueil.
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  console.log('VISITEUSE → url finale :', p.url());
  await p.screenshot({ path: '/tmp/fe-visiteuse-redirect.png' });
  await c.close();
}

// 2) Administratrice — vue admin, desktop puis mobile.
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  await c.addInitScript(() => { try { localStorage.setItem('__devAdmin', '1'); } catch {} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('ERREUR PAGE', w, String(e).slice(0, 200)));
  await p.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `/tmp/fe-admin-${w}.png`, fullPage: true });
  console.log(`fe-admin-${w}.png`, '→ url', p.url());
  await c.close();
}

// 3) Administratrice — téléverse une vraie vidéo sur la première porte,
//    capture la barre de progression puis le lecteur embarqué une fois posé.
{
  const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('__devAdmin', '1'); } catch {} });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('ERREUR UPLOAD', String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERREUR', m.text().slice(0, 200)); });
  await p.goto(`${BASE}/foyer-essai`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  const boutons = p.locator('button:has-text("Ajouter une vidéo")');
  const compteBoutons = await boutons.count();
  console.log('boutons "Ajouter une vidéo" trouvés :', compteBoutons);

  if (compteBoutons > 0) {
    // Le bouton déclenche un input file caché juste avant lui dans la carte.
    const premiereCarte = p.locator('input[type="file"]').first();
    await premiereCarte.setInputFiles('public/foyer/chandelle.mp4');
    await p.waitForTimeout(400);
    await p.screenshot({ path: '/tmp/fe-upload-en-cours.png' });
    console.log('capture pendant l\'envoi prise');
    // Attendre la fin réelle du téléversement (le bouton "Ajouter"/"Remplacer" revient).
    await p.waitForSelector('video', { timeout: 30000 }).catch(e => console.log('PAS de <video> après 30s :', String(e).slice(0, 150)));
    await p.waitForTimeout(1000);
    await p.screenshot({ path: '/tmp/fe-apres-upload.png', fullPage: true });
    console.log('capture après upload prise');

    // Bascule en vue cliente : les boutons d'édition doivent disparaître,
    // la vidéo doit rester visible.
    await p.getByRole('button', { name: /Voir comme une cliente/i }).click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: '/tmp/fe-vue-cliente.png', fullPage: true });
    console.log('capture vue cliente prise');
  }
  await c.close();
}

await b.close();
console.log('TERMINÉ');
