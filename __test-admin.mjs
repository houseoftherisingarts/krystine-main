import { chromium } from 'playwright';

const BASE = 'http://localhost:8899';
const FAKE_AUTH_MODULE = `
export function getAuth() { return {}; }
export function onAuthStateChanged(auth, cb) {
  setTimeout(() => cb({ email: 'houseoftherisingarts@gmail.com' }), 50);
  return () => {};
}
`;

async function run(viewport, tag) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error' && !/Cloud Firestore backend/.test(msg.text())) errors.push('console.error: ' + msg.text()); });

  // Bouchon réseau : seul le module firebase-auth est remplacé, pour simuler
  // une administratrice reconnue sans jamais toucher au vrai Chrome de Krystine
  // ni au fichier crayon-statique.js lui-même.
  await page.route('**/firebase-auth.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_AUTH_MODULE }));

  await page.goto(BASE + '/accueil/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('[data-crayon]', { timeout: 5000 });
  await page.waitForTimeout(400);

  const dir = '/private/tmp/claude-501/-Users-lesalondesinconnus/b888b2c7-f098-4036-8a5d-c76540f05b53/scratchpad/shots';

  // 1) Le crayon apparaît (bouton rond, admin reconnue)
  await page.screenshot({ path: `${dir}/admin-${tag}-1-pencil.png` });

  // 2) Clic sur le crayon : mode édition, liserés, barre du haut
  await page.click('.cs-pencil');
  await page.waitForTimeout(300);
  const editionOn = await page.evaluate(() => document.body.classList.contains('crayon-edition'));
  const nbTx = await page.evaluate(() => document.querySelectorAll('[data-tx]').length);
  const nbCadre = await page.evaluate(() => document.querySelectorAll('[data-cadre]').length);
  await page.screenshot({ path: `${dir}/admin-${tag}-2-edition.png` });

  // 3) Clic sur un texte connu : la fenêtre s'ouvre avec la bonne valeur
  const cible = await page.evaluate(() => {
    const el = document.querySelector('h1[data-tx], [data-tx]');
    return el ? el.getAttribute('data-tx') : null;
  });
  let texteModalVisible = false;
  let zoneValeur = '';
  if (cible !== null) {
    await page.click(`[data-tx="${cible}"]`);
    await page.waitForTimeout(200);
    texteModalVisible = await page.evaluate(() => {
      const modal = document.querySelectorAll('.cs-modal')[0];
      return modal && !modal.hidden;
    });
    zoneValeur = await page.evaluate(() => document.querySelector('.cs-textarea').value);
    await page.screenshot({ path: `${dir}/admin-${tag}-3-modal-texte.png` });

    // 4) Modifier + Appliquer : le compteur passe à 1 changement, le texte change dans la page
    await page.fill('.cs-textarea', 'TEXTE DE TEST CRAYON');
    await page.click('.cs-apply');
    await page.waitForTimeout(200);
  }
  const compteurApres = await page.evaluate(() => document.querySelector('.cs-count').textContent);
  const pageMontre = await page.evaluate(() => document.body.innerText.includes('TEXTE DE TEST CRAYON'));
  await page.screenshot({ path: `${dir}/admin-${tag}-4-applique.png` });

  // 5) Fermer, puis Quitter : le brouillon est abandonné, le texte revient
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.click('.cs-quit');
  await page.waitForTimeout(200);
  const reveniAuTexteOrigine = await page.evaluate(() => !document.body.innerText.includes('TEXTE DE TEST CRAYON'));
  const editionApresQuitter = await page.evaluate(() => document.body.classList.contains('crayon-edition'));
  await page.screenshot({ path: `${dir}/admin-${tag}-5-quitte.png` });

  console.log(JSON.stringify({
    tag, errors, editionOn, nbTx, nbCadre, cible, texteModalVisible, zoneValeurLen: zoneValeur.length,
    compteurApres, pageMontre, reveniAuTexteOrigine, editionApresQuitter,
  }, null, 2));

  await browser.close();
  return errors.length === 0 && editionOn && nbTx > 0 && texteModalVisible && pageMontre && reveniAuTexteOrigine && !editionApresQuitter;
}

const ok1440 = await run({ width: 1440, height: 900 }, '1440');
const ok390 = await run({ width: 390, height: 844 }, '390');
if (!ok1440 || !ok390) process.exit(1);
