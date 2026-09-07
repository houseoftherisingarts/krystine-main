// Vérification visuelle du Foyer social (agent, 7 septembre 2026). Jetable :
// se supprime à la fin de la tâche. Lance le site sur le port 3021, ouvre les
// pages du Foyer avec un compte qui l'a acheté et avec un compte qui ne l'a
// pas, capture à 1440 et à 390, et note le résultat du paywall.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3021';
const SORTIE = process.env.SORTIE || '/tmp/foyer-captures';
fs.mkdirSync(SORTIE, { recursive: true });

const COMPTES = {
  foyer: { email: 'admin@krystinestlaurent.ca', pw: fs.readFileSync(`${process.env.HOME}/.claude/scripts/.krystine_admin_pw`, 'utf8').trim() },
  sansFoyer: {
    email: fs.readFileSync('/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/qa_email.txt', 'utf8').trim(),
    pw: fs.readFileSync('/private/tmp/claude-501/-Users-lesalondesinconnus/78c2ade9-cdcd-4c68-ace2-f8eabac5d7f6/scratchpad/qa_pw.txt', 'utf8').trim(),
  },
};

const ECRANS = [
  { nom: '1440', viewport: { width: 1440, height: 900 } },
  { nom: '390', viewport: { width: 390, height: 844 } },
];

const dodo = (ms) => new Promise((r) => setTimeout(r, ms));

async function connecter(page, { email, pw }) {
  await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
  await dodo(2500);
  // La carte « Se connecter » de /compte ouvre la fenêtre d'authentification.
  const bouton = page.getByRole('button', { name: /se connecter|sign in/i }).first();
  await bouton.click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(pw);
  await page.locator('form button[type="submit"]').first().click();
  await dodo(5000);
}

async function capturer(page, chemin, nom, ecran) {
  await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
  await dodo(4500);
  const url = page.url();
  const fichier = `${SORTIE}/${nom}-${ecran}.png`;
  await page.screenshot({ path: fichier, fullPage: false });
  return { fichier, url };
}

const journal = [];

for (const ecran of ECRANS) {
  const navigateur = await chromium.launch();

  // 1. La membre du Foyer : les pages s'ouvrent.
  const ctxFoyer = await navigateur.newContext({ viewport: ecran.viewport, deviceScaleFactor: 1 });
  const pageFoyer = await ctxFoyer.newPage();
  pageFoyer.on('console', (m) => { if (m.type() === 'error') journal.push(`  console(foyer/${ecran.nom}): ${m.text().slice(0, 160)}`); });
  await connecter(pageFoyer, COMPTES.foyer);
  for (const [chemin, nom] of [['/foyer/membres', 'foyer-membres'], ['/foyer/fil', 'foyer-fil'], ['/foyer/messages', 'foyer-messages'], ['/foyer/groupes', 'foyer-groupes'], ['/compte?onglet=loyalty', 'compte-niskas']]) {
    const r = await capturer(pageFoyer, chemin, nom, ecran.nom);
    journal.push(`AVEC FOYER  ${ecran.nom}  ${chemin} → ${r.url}  ${r.fichier}`);
  }
  await ctxFoyer.close();

  // 2. La cliente sans le Foyer : le paywall renvoie à la page de vente.
  const ctxSans = await navigateur.newContext({ viewport: ecran.viewport, deviceScaleFactor: 1 });
  const pageSans = await ctxSans.newPage();
  await connecter(pageSans, COMPTES.sansFoyer);
  for (const [chemin, nom] of [['/foyer/fil', 'sansfoyer-fil'], ['/foyer/membres', 'sansfoyer-membres'], ['/membres', 'sansfoyer-ancien-membres'], ['/membre/abc123', 'sansfoyer-ancien-fiche']]) {
    const r = await capturer(pageSans, chemin, nom, ecran.nom);
    journal.push(`SANS FOYER  ${ecran.nom}  ${chemin} → ${r.url}  ${r.fichier}`);
  }

  // 3. Lecture directe de Firestore depuis la page, avec la session de la
  //    cliente : l'annuaire doit être refusé.
  if (ecran.nom === '1440') {
    const essai = await pageSans.evaluate(async () => {
      const { getFirestore, collection, getDocs } = await import('/node_modules/.vite/deps/firebase_firestore.js');
      const { getApps } = await import('/node_modules/.vite/deps/firebase_app.js');
      const app = getApps()[0];
      const db = getFirestore(app);
      const essais = {};
      for (const col of ['members', 'mur']) {
        try { const s = await getDocs(collection(db, col)); essais[col] = `LU ${s.size} documents`; }
        catch (e) { essais[col] = `REFUS ${e.code || e.message}`; }
      }
      return essais;
    }).catch((e) => ({ erreur: String(e).slice(0, 200) }));
    journal.push(`FIRESTORE DIRECT (sans Foyer) : ${JSON.stringify(essai)}`);
  }

  await ctxSans.close();
  await navigateur.close();
}

console.log(journal.join('\n'));
