// Le filet du matin, côté parcours (Krystine, 4 oct. 2026).
// Chaque matin, sur l'ordinateur de Krystine, un vrai navigateur invisible
// refait les gestes d'une visiteuse sur le site EN LIGNE : le quiz jusqu'au
// formulaire du résultat (avec la case anti-robot), puis VATA jusqu'à la
// caisse. Le verdict s'écrit dans le coffre (00_inbox/🩺 FILET DU MATIN.md)
// et une notification apparaît s'il y a un problème. Rien n'est soumis, rien
// n'est acheté. Le volet serveur (pages, clés, mouvement) est
// functions/src/filet.ts. Lancé par ~/Library/LaunchAgents/ca.krystinestlaurent.filet.plist.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SITE = 'https://www.krystinestlaurent.ca';
const COFFRE = join(homedir(), 'Documents/OBSIDIAN VAULT/Krystine Vault/00_inbox');
const resultats = [];
const noter = (nom, ok, detail = '') => resultats.push({ nom, ok, detail });

const navigateur = await chromium.launch();
for (const [largeur, hauteur, appareil] of [[1440, 900, 'ordinateur'], [390, 844, 'téléphone']]) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  // 1. Le quiz, jusqu'au formulaire.
  try {
    await page.goto(SITE + '/quiz', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2500);
    let repondues = 0;
    for (let i = 0; i < 15; i++) {
      const choix = page.locator('button:has(span.rounded-full)').first();
      if (!(await choix.count())) break;
      await choix.click();
      repondues++;
      await page.waitForTimeout(1100);
    }
    await page.waitForTimeout(3000);
    const courriel = await page.locator('input[type=email]').count();
    // La case de Google arrive parfois lentement : on lui laisse 20 s avant de conclure.
    const robot = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 20000 }).then(() => 1).catch(() => 0);
    noter(`Quiz jusqu'au formulaire (${appareil})`, repondues >= 9 && courriel > 0, `${repondues} questions répondues, formulaire ${courriel ? 'présent' : 'ABSENT'}`);
    noter(`Case « Je ne suis pas un robot » (${appareil})`, robot > 0, robot ? 'visible' : 'ABSENTE : le formulaire ne peut pas être envoyé');
  } catch (e) {
    noter(`Quiz (${appareil})`, false, e.message.split('\n')[0]);
  }

  // 2. VATA, du bouton d'achat jusqu'à la caisse (sans rien payer).
  try {
    await page.goto(SITE + '/vata', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);
    const bouton = page.getByRole('button', { name: /commencer/i }).first();
    await bouton.scrollIntoViewIfNeeded();
    await bouton.click();
    await page.waitForURL(/paiement/, { timeout: 20000 });
    await page.waitForTimeout(2000);
    const prix = /\d{3}\s?\$/.test(await page.locator('body').innerText());
    noter(`VATA jusqu'à la caisse (${appareil})`, prix, prix ? 'la page de paiement affiche le prix' : 'page de paiement sans prix');
  } catch (e) {
    noter(`VATA jusqu'à la caisse (${appareil})`, false, e.message.split('\n')[0]);
  }

  // 3. L'espace client répond.
  try {
    await page.goto(SITE + '/compte', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(2000);
    const texte = (await page.locator('body').innerText()).trim().length;
    noter(`Espace client /compte (${appareil})`, texte > 50, texte > 50 ? 'la page s\'affiche' : 'page vide');
  } catch (e) {
    noter(`Espace client /compte (${appareil})`, false, e.message.split('\n')[0]);
  }

  noter(`Erreurs JavaScript (${appareil})`, erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' · ') : 'aucune');
  await page.close();
}
await navigateur.close();

const problemes = resultats.filter((r) => !r.ok);
const maintenant = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' });
const lignes = resultats.map((r) => `| ${r.ok ? '✅' : '🔴'} | ${r.nom} | ${r.detail} |`).join('\n');
const note = `---
titre: "🩺 FILET DU MATIN"
maj: ${new Date().toISOString()}
rôle: vérification automatique du site chaque matin (parcours d'une visiteuse). Volet serveur : sante/filetDuMatin dans la base.
---

# 🩺 Filet du matin : ${problemes.length ? `🔴 ${problemes.length} problème(s)` : '✅ tout fonctionne'}

*Vérifié le ${maintenant}, sur le site en ligne.*

${problemes.length ? '> [!danger] À corriger\n> Ouvrez Iris et dites « regarde le filet du matin ».\n' : ''}
| | Vérification | Détail |
|---|---|---|
${lignes}
`;
mkdirSync(COFFRE, { recursive: true });
writeFileSync(join(COFFRE, '🩺 FILET DU MATIN.md'), note);

if (problemes.length) {
  try {
    execFileSync('osascript', ['-e', `display notification "${problemes.length} problème(s) sur le site. Ouvrez Iris." with title "Filet du matin" sound name "Basso"`]);
  } catch { /* la notification est un plus */ }
}
console.log(problemes.length ? `FILET : ${problemes.length} problème(s)` : 'FILET : tout fonctionne');
process.exit(problemes.length ? 1 : 0);
