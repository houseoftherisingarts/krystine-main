#!/usr/bin/env node
// Les trois chansons des doshas (Suno, Alex, 10 oct. 2026) : chaque formation
// Vata, Kapha et Pitta reçoit SA chanson comme une leçon audio, avec le même
// fichier joint en document pour le bouton « Télécharger », et la médiathèque
// de l'admin reçoit les trois chansons comme un téléversement de l'admin.
//
//   node scripts/chansons-doshas.mjs <dossier des mp3>   (Vata.mp3, Kapha.mp3, Pitta.mp3)
//
// Rejouable : une leçon ou un média déjà en place avec le même poids est laissé tel quel.
// Le fichier d'une formation vit sous formations-contenu/ (fermé au public, servi
// par la fonction obtenirLecon qui vérifie l'achat, comme le reste du cours).
// Identifiants : gcloud (compte propriétaire du projet), rien d'écrit ici.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PROJET = 'krystinestlaurent-87566';
const BUCKET = `${PROJET}.firebasestorage.app`;
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const DOSSIER = process.argv[2];
if (!DOSSIER) { console.error('Usage : node scripts/chansons-doshas.mjs <dossier des mp3>'); process.exit(1); }
const TOKEN = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const H = { Authorization: `Bearer ${TOKEN}` };

// Où la chanson se pose dans chaque cours : la section d'ouverture (ou la
// section musique de Pitta 2025), juste après sa dernière leçon.
const CHANSONS = {
  Vata: [
    { formation: 'kajabi-2148687644', moduleNom: 'Semaine 0 : Introduction', apres: 4 },               // VATA Essentiel (autonome)
    { formation: 'kajabi-2148727800', moduleNom: "Semaine d'introduction (semaine 0)", apres: 29 },  // Vata guidé, cohorte automne 2024
  ],
  Kapha: [
    { formation: 'kajabi-2148864751', moduleNom: 'INTRODUCTION', apres: 5 },                          // Expérience Ayurveda : saison Kapha
  ],
  Pitta: [
    { formation: 'kajabi-2148698908', moduleNom: 'Module 1', apres: 2 },                              // saison Pitta, 3 jours de découverte
    { formation: 'kajabi-2149054844', moduleNom: 'Module 6', apres: 21 },                             // Expérience estivale 2025 : Pitta (playlist)
  ],
};

const val = v => (typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'boolean' ? { booleanValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(val) } }
  : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } }
  : { stringValue: String(v) });

async function lireDoc(chemin) {
  const r = await fetch(`${FS}/${chemin}`, { headers: H });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`lecture ${chemin} : ${r.status} ${await r.text()}`);
  return (await r.json()).fields || {};
}

async function ecrireDoc(chemin, champs, horodatage) {
  const corps = { writes: [{
    update: { name: `projects/${PROJET}/databases/(default)/documents/${chemin}`, fields: Object.fromEntries(Object.entries(champs).map(([k, v]) => [k, val(v)])) },
    updateMask: { fieldPaths: Object.keys(champs) },  // fusion : un texte ou une vignette posés par Krystine restent
    updateTransforms: [{ fieldPath: horodatage, setToServerValue: 'REQUEST_TIME' }],
  }] };
  const r = await fetch(`${FS.replace(/\/documents$/, '/documents:commit')}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  if (!r.ok) throw new Error(`écriture ${chemin} : ${r.status} ${await r.text()}`);
}

async function poidsStorage(chemin) {
  const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(chemin)}`, { headers: H });
  return r.ok ? Number((await r.json()).size) : 0;
}

/** Téléverse avec ses métadonnées : type, nom de téléchargement, jeton Firebase au besoin. */
async function televerser(chemin, octets, metadata) {
  const frontiere = `chanson${Date.now()}`;
  const corps = Buffer.concat([
    Buffer.from(`--${frontiere}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: chemin, contentType: 'audio/mpeg', ...metadata })}\r\n--${frontiere}\r\nContent-Type: audio/mpeg\r\n\r\n`),
    octets,
    Buffer.from(`\r\n--${frontiere}--`),
  ]);
  const r = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST', headers: { ...H, 'Content-Type': `multipart/related; boundary=${frontiere}` }, body: corps,
  });
  if (!r.ok) throw new Error(`téléversement ${chemin} : ${r.status} ${await r.text()}`);
  return r.json();
}

for (const [dosha, cibles] of Object.entries(CHANSONS)) {
  const source = join(DOSSIER, `${dosha}.mp3`);
  const taille = statSync(source).size;
  const octets = readFileSync(source);
  const nomFichier = `Krystine St-Laurent · ${dosha}.mp3`;
  // « · » n'est pas de l'ASCII : nom encodé (RFC 5987) et repli lisible.
  const disposition = `attachment; filename="Krystine St-Laurent - ${dosha}.mp3"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`;
  const id = `chanson-${dosha.toLowerCase()}`;

  for (const c of cibles) {
    const chemin = `formations-contenu/${c.formation}/${id}.mp3`;
    if (await poidsStorage(chemin) !== taille) await televerser(chemin, octets, { contentDisposition: disposition });
    if (!(await lireDoc(`formations/${c.formation}`))) throw new Error(`formation ${c.formation} introuvable`);
    await ecrireDoc(`formations/${c.formation}/lecons/${id}`, {
      titre: `La chanson de ${dosha}`,
      type: 'audio',
      chemin,
      ordre: c.apres + 0.5,
      moduleNom: c.moduleNom,
      docs: [{ nom: nomFichier, chemin }],
    }, 'creeLe');
    console.log(`${c.formation} · leçon ${id} · ${chemin} (${taille} octets)`);
  }

  // La médiathèque : comme uploadImage() de l'admin (dossier library/, URL à jeton).
  const cheminLib = `library/${id}.mp3`;
  let objet = null;
  if (await poidsStorage(cheminLib) !== taille) objet = await televerser(cheminLib, octets, { contentDisposition: disposition, metadata: { firebaseStorageDownloadTokens: randomUUID() } });
  else objet = await (await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(cheminLib)}`, { headers: H })).json();
  const jeton = String(objet.metadata?.firebaseStorageDownloadTokens || '').split(',')[0];
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(cheminLib)}?alt=media&token=${jeton}`;
  await ecrireDoc(`mediaLibrary/${id}`, {
    url, path: cheminLib, name: nomFichier, contentType: 'audio/mpeg', size: taille, source: 'upload', category: 'musique',
  }, 'uploadedAt');
  console.log(`médiathèque · mediaLibrary/${id} · ${cheminLib}`);
}
