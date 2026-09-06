import { chromium } from 'playwright';
// Vérification du bouton « Problème technique » de l'espace client, de bout en
// bout : connexion d'un membre de test, capture d'écran, envoi, réponse de la
// porte Vexel. Lancer : BUG_EMAIL=… BUG_PASS=… BUG_OUT=/tmp node scripts/qa-bug.mjs
// (avec `npx vite preview --port 4173` qui tourne).


const S = process.env.BUG_OUT || '.';
const [email, pass] = [process.env.BUG_EMAIL, process.env.BUG_PASS];
const mobile = process.argv.includes('--mobile');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`); });
let vexelRep = null;
page.on('response', async (r) => {
  if (r.url().includes('recevoirDemande')) { try { vexelRep = { status: r.status(), json: await r.json() }; } catch { vexelRep = { status: r.status() }; } }
});

await page.goto('http://localhost:4173/compte', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Se connecter|Sign in/ }).first().click();
await page.locator('input[type=email]').fill(email);
await page.locator('input[type=password]').fill(pass);
await page.locator('button[type=submit]').click();
await page.getByRole('button', { name: /Problème technique|Technical issue/ }).waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${S}/01-portail${mobile ? '-m' : ''}.png` });

await page.getByRole('button', { name: /Problème technique|Technical issue/ }).click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: `${S}/02-popup${mobile ? '-m' : ''}.png` });

await page.getByRole('button', { name: /Capturer l’écran|Take a screenshot/ }).click();
await page.locator('[role=dialog] img').waitFor({ timeout: 30000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${S}/03-capture${mobile ? '-m' : ''}.png` });
const dims = await page.locator('[role=dialog] img').evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight, src: img.src.slice(0, 30) }));
console.log('capture', JSON.stringify(dims));

await page.locator('[role=dialog] textarea').fill(`Test automatisé du bouton Problème technique (${new Date().toISOString()}). À supprimer.`);
await page.getByRole('button', { name: /^Envoyer$|^Send$/ }).click();
await page.getByText(/Merci\. Le rapport est parti|Thank you\. The report/).waitFor({ timeout: 40000 });
await page.screenshot({ path: `${S}/04-merci${mobile ? '-m' : ''}.png` });
console.log('vexel', JSON.stringify(vexelRep));
console.log('logs', JSON.stringify(logs.filter((l) => !/favicon|Tracking Prevention|third-party cookie/i.test(l)).slice(0, 8)));
await browser.close();
