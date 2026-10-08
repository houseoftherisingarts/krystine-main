// Crée les trois Dimanches (décision de Krystine, 8 octobre 2026) comme
// directs du site, dans la collection Firestore `liveEvents` : c'est elle qui
// déclenche la confirmation, les rappels (3 jours, veille, 1 h) et la
// rediffusion (functions/src/newsletter/live.ts et dimanches.ts).
//
//   gcloud auth print-access-token > /tmp/jeton
//   node scripts/dimanches/creer-evenements.mjs /tmp/jeton            (essai : n'écrit rien)
//   node scripts/dimanches/creer-evenements.mjs /tmp/jeton --ecrire   (écrit)
//
// Un document qui existe déjà n'est JAMAIS écrasé (le lien du direct, la
// rediffusion et les rappels déjà partis y restent) : le script le signale et
// passe au suivant. Les titres sont provisoires; Krystine les change dans
// Admin › Infolettre › Directs. Les identifiants et étiquettes doivent rester
// ceux de src/lib/dimanches.ts, que la page /dimanches pose à l'inscription.
import { readFileSync } from 'fs';

const [fichierJeton, drapeau] = process.argv.slice(2);
if (!fichierJeton) { console.error('Usage : node scripts/dimanches/creer-evenements.mjs <fichier-jeton> [--ecrire]'); process.exit(1); }
const ecrire = drapeau === '--ecrire';
const tok = readFileSync(fichierJeton, 'utf8').trim();
const H = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
const BASE = 'https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents';

// 9 h à Montréal : UTC−4 le 25 octobre, UTC−5 dès le 1er novembre (heure normale).
const DIMANCHES = [
  { id: 'dimanche-origine-lire',   title: 'Dimanche d’Origine · LIRE',   startsAt: '2026-10-25T13:00:00Z' },
  { id: 'dimanche-origine-trier',  title: 'Dimanche d’Origine · TRIER',  startsAt: '2026-11-01T14:00:00Z' },
  { id: 'dimanche-origine-ancrer', title: 'Dimanche d’Origine · ANCRER', startsAt: '2026-11-08T14:00:00Z' },
];

for (const d of DIMANCHES) {
  const fields = {
    title: { stringValue: d.title },
    startsAt: { timestampValue: d.startsAt },
    // Vide : les courriels mènent alors à la salle du direct du site (/direct)
    // tant que Krystine n'a pas posé le lien dans l'admin.
    youtubeUrl: { stringValue: '' },
    tag: { stringValue: d.id },
    serie: { stringValue: 'dimanches-origine' },
  };
  const heure = new Date(d.startsAt).toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });
  if (!ecrire) { console.log('essai ·', d.id, '·', d.title, '·', heure); continue; }
  const r = await fetch(`${BASE}/liveEvents/${d.id}?currentDocument.exists=false`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
  if (r.ok) { console.log('✓ créé', d.id, '·', heure); continue; }
  const texte = await r.text();
  if (/already exists|ALREADY_EXISTS/i.test(texte)) console.log('= existe déjà, laissé tel quel', d.id);
  else throw new Error(`${d.id} : ${r.status} ${texte}`);
}
if (!ecrire) console.log('\nRien n’a été écrit. Ajoutez --ecrire pour créer les documents.');
