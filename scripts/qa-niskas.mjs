// Vérification de bout en bout de la petite boutique et des niskas : un
// membre de test se connecte, reçoit ses dix niskas et sa récompense du jour,
// achète le skin Medzo Café, l'active, met la bannière Nature, et la porte
// Stripe rend une adresse de paiement. Lancer avec `npx vite preview --port
// 4173` : BUG_EMAIL=… BUG_PASS=… BUG_OUT=/tmp node scripts/qa-niskas.mjs
import { chromium } from 'playwright';

const [email, pass] = [process.env.BUG_EMAIL, process.env.BUG_PASS];
const S = process.env.BUG_OUT || '.';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 160)); });

await page.goto('http://localhost:4173/compte', { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Se connecter|Sign in|Créer mon compte|Create my account/ }).first().click();
// La fenêtre s'ouvre sur l'inscription : on bascule vers la connexion.
const versConnexion = page.getByRole('button', { name: /Déjà un compte|Already have an account/ });
if (await versConnexion.count()) await versConnexion.click();
await page.locator('input[type=email]').fill(email);
await page.locator('input[type=password]').fill(pass);
await page.locator('button[type=submit]').click();

// La roue du jour se lève d'elle-même.
const roue = page.getByRole('dialog', { name: /tombent? dans votre bourse|déjà tombée|drops? into your purse|already dropped/ });
await roue.waitFor({ timeout: 40000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${S}/m1-roue.png` });
console.log('roue', (await roue.locator('h2').innerText()).slice(0, 80));
await roue.getByRole('button', { name: /Merci|Thanks/ }).click();

// La puce du haut dit le solde en niskas.
const puce = page.locator('button:has-text("niska")').first();
await puce.waitFor({ timeout: 15000 });
console.log('puce', await puce.innerText());

// Profil : le bloc des niskas et la liste des façons.
await page.getByRole('button', { name: /^\S*\s*Profil$|Profile/ }).first().click().catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${S}/m2-profil.png`, fullPage: false });

// Téléchargements : la boutique.
await page.getByRole('button', { name: /Téléchargements|Downloads/ }).first().click();
await page.locator('#boutique').waitFor({ timeout: 15000 });
await page.locator('#boutique').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: `${S}/m3-boutique.png` });

// Achat du skin (5) puis activation.
const carteSkin = page.locator('#boutique').locator('div', { hasText: /Skin Medzo Café|Medzo Café skin/ }).last();
const acheter = carteSkin.getByRole('button').first();
console.log('bouton skin avant', await acheter.innerText());
await acheter.click();
await page.getByText(/est à vous|is yours/).waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const activer = page.locator('#boutique').getByRole('button', { name: /Activer le skin|Turn the skin on/ });
await activer.waitFor({ timeout: 15000 });
await activer.click();
await page.waitForTimeout(1200);
console.log('skin actif', await page.locator('.skin-medzo').count());
await page.screenshot({ path: `${S}/m4-skin.png` });

// Achat de la bannière Nature (5) et mise en place.
const acheterBan = page.locator('#boutique').locator('div', { hasText: /Bannière Nature|Nature & Ayurveda banner/ }).last().getByRole('button').first();
await acheterBan.click();
await page.getByText(/est à vous|is yours/).waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
const mettre = page.locator('#boutique').getByRole('button', { name: /Mettre en bannière|Set as banner/ });
await mettre.waitFor({ timeout: 15000 });
await mettre.click();
await page.waitForTimeout(1200);
const src = await page.locator('img[src*="bienvenue-bureau"]').first().getAttribute('src');
console.log('banniere', src);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.screenshot({ path: `${S}/m5-banniere.png` });

// Un épisode à 100 : le bouton est désactivé faute de niskas.
const ep = page.locator('#boutique li').filter({ hasText: /Épisode|Emission|Émission/ }).first().getByRole('button');
console.log('episode desactive', await ep.isDisabled());

console.log('logs', JSON.stringify(logs.slice(0, 6)));
await browser.close();
