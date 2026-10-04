// Rapatriement de « Rituels vivants : une introduction à l'Ayurveda » depuis
// Kajabi (Krystine, 4 oct. 2026 : la petite offre d'entrée du tunnel, 27 $).
// Les 11 capsules ont été relevées dans Kajabi (session de Krystine) : titre,
// module, texte et vidéo Wistia. Ce script télécharge chaque vidéo (qualité
// 640 px), la dépose dans Storage, puis écrit la formation MASQUÉE et ses
// leçons dans Firestore, au même format que les cours rapatriés en août.
// Rien n'est publié : Krystine décide du prix et de l'ouverture.
// Usage : node scripts/kajabi/rapatrier-rituels-vivants.mjs [--a-blanc]
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

const A_BLANC = process.argv.includes('--a-blanc');
const PROJET = 'krystinestlaurent-87566';
const BUCKET = 'krystinestlaurent-87566.firebasestorage.app';
const ID = 'rituels-vivants';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

const M1 = 'Capsules d’introduction à l’Ayurveda';
const M2 = 'Capsules d’introduction à l’automassage';
const M3 = 'Capsules d’introduction aux soins du nez et de la bouche';
const M4 = 'Capsule d’introduction aux soins des mains et des pieds';
const M5 = 'Envie d’aller plus loin ?';
const AUTOMASSAGE_SOIR = `Rituel d’auto-massage du soir : 5 x 60

Le soir, lorsque la journée a été longue, il peut être difficile de trouver le temps (ou l’énergie) pour un auto-massage complet. Plutôt que de laisser tomber ce moment de soin, il est possible de concentrer l’attention sur les mains et les pieds.

C’est dans cet esprit qu’a été créé le rituel d’auto-massage 5 x 60 : 300 secondes (5 minutes) pour apaiser le système, bercer le corps et l’accompagner vers le sommeil. En portant l’attention sur les extrémités, ce rituel peut même se faire en écoutant un film ou une série télé.

Veiller à utiliser une huile végétale adaptée (par exemple l’huile Vata si vous utilisez nos huiles), sans appliquer d’huiles essentielles pures directement sur la peau.

TECHNIQUE : MAINS

Déposer une petite quantité d’huile dans les mains et les frotter l’une contre l’autre pour réchauffer la texture.

Avec une légère pression, masser le centre de chaque main, de l’intérieur vers l’extérieur, en observant les points un peu plus sensibles.

Prendre le temps de déloger les tensions entre les doigts.

Huiler délicatement le dessus des ongles afin de nourrir cette zone en douceur.

TECHNIQUE : PIEDS

Les pieds sont nos racines et supportent le corps toute la journée : ils bénéficient énormément d’être huilés et massés régulièrement.

Appliquer une petite quantité d’huile dans les mains, puis masser chaque pied en entier : plante, talon, voûte, dessus du pied.

Porter une attention particulière aux points plus sensibles, en ajustant la pression selon le confort.

En fin de rituel, enfiler une paire de bas pour permettre à l’huile de pénétrer en profondeur et garder les pieds au chaud.

Ce rituel peut être pratiqué en entier ou adapté selon votre réalité du moment. L’essentiel est de revenir à ce geste simple, soir après soir, comme un rendez-vous avec soi.`;

const LECONS = [
  { titre: 'Capsule d’introduction à l’Ayurveda, partie 1', module: M1, wistia: 'dcp8mr9s3q' },
  { titre: 'Capsule d’introduction à l’Ayurveda, partie 2', module: M1, wistia: 'flh84v7ald' },
  { titre: 'Capsule d’introduction à l’Ayurveda, partie 3', module: M1, wistia: '5xj78utnk6' },
  { titre: 'Capsule d’introduction à l’automassage, partie 1', module: M2, wistia: 'ozwviv5wrq' },
  { titre: 'Capsule d’introduction à l’automassage, partie 2', module: M2, wistia: 'hicben7ds8', texte: AUTOMASSAGE_SOIR },
  { titre: 'Capsule d’introduction à l’automassage, partie 3', module: M2, wistia: 'ktwkwhqdc6' },
  { titre: 'Capsule d’introduction à l’automassage, partie 4', module: M2, wistia: 'gy3zg6zqam' },
  { titre: 'Capsule d’introduction aux soins du nez', module: M3, wistia: '0e4f8uwyoc' },
  { titre: 'Capsule d’introduction aux soins de la bouche', module: M3, wistia: 'xqw77868th' },
  { titre: 'Capsule d’introduction aux soins des mains et des pieds', module: M4, wistia: '2b9uz3daeo', texte: 'Pour toute question sur cette capsule, écrivez-nous à teamksl@inspiratanature.com.' },
  { titre: 'Plantes, stress et sagesse : une invitation concrète', module: M5, wistia: 'du3ynqajmw' },
];

async function jeton() {
  // Même accès que scripts/newsletter/fusionner-doublons.mjs : la connexion « firebase login ».
  const candidats = [join(homedir(), '.iris/tools/node_modules/firebase-tools/lib/auth.js')];
  try { candidats.unshift(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim() + '/firebase-tools/lib/auth.js'); } catch { /* rien */ }
  const chemin = candidats.find(existsSync);
  const conf = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!chemin || !existsSync(conf)) throw new Error('Pas de connexion « firebase login » sur cet ordinateur.');
  const auth = createRequire(import.meta.url)(chemin);
  const t = await auth.getAccessToken(JSON.parse(readFileSync(conf, 'utf8')).tokens.refresh_token, []);
  return t.access_token || t;
}

const v = (x) => typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : typeof x === 'boolean' ? { booleanValue: x }
  : Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
  : x === null ? { nullValue: 'NULL_VALUE' }
  : x instanceof Date ? { timestampValue: x.toISOString() }
  : { stringValue: String(x) };
const champs = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)]));

async function ecrire(tk, chemin, o) {
  const r = await fetch(`${FS}/${chemin}`, { method: 'PATCH', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: champs(o) }) });
  if (!r.ok) throw new Error(`Firestore ${chemin} : ${r.status} ${await r.text()}`);
}

async function deposer(tk, nom, corps, type) {
  const r = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(nom)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': type }, body: corps,
  });
  if (!r.ok) throw new Error(`Storage ${nom} : ${r.status} ${await r.text()}`);
}

const tk = A_BLANC ? '' : await jeton();
let ordre = 0;
const modules = [...new Set(LECONS.map((l) => l.module))];
for (const l of LECONS) {
  ordre++;
  const id = String(ordre).padStart(3, '0');
  const j = await (await fetch(`https://fast.wistia.net/embed/medias/${l.wistia}.json`)).json();
  const assets = j.media.assets;
  const choix = assets.find((a) => a.type === 'hd_mp4_video') || assets.find((a) => a.type === 'iphone_video') || assets.find((a) => a.type === 'mp4_video');
  const image = assets.find((a) => a.type === 'still_image');
  const duree = Math.round(j.media.duration || 0);
  console.log(`${id} · ${l.titre} · ${choix.type} ${Math.round(choix.size / 1e6)} Mo · ${Math.round(duree / 60)} min`);
  if (A_BLANC) continue;
  let url = choix.url; if (!/\.(mp4|bin)(\?|$)/.test(url)) url += '.mp4';
  const video = Buffer.from(await (await fetch(url)).arrayBuffer());
  const base = `formations-contenu/${ID}/${id}`;
  await deposer(tk, `${base}/video.mp4`, video, 'video/mp4');
  if (image) {
    const img = Buffer.from(await (await fetch(image.url.replace(/\.bin$/, '.jpg'))).arrayBuffer());
    await deposer(tk, `${base}/vignette.jpg`, img, 'image/jpeg');
  }
  await ecrire(tk, `formations/${ID}/lecons/${id}`, {
    titre: l.titre, ordre, moduleNom: l.module, module: modules.indexOf(l.module) + 1, texte: l.texte || '',
    type: 'video', chemin: `${base}/video.mp4`, fichiers: [`${base}/video.mp4`], vignette: image ? `${base}/vignette.jpg` : '',
    dureeSecondes: duree, wistiaHash: l.wistia, mediaPret: true, creeLe: new Date(),
  });
}
if (!A_BLANC) {
  await ecrire(tk, `formations/${ID}`, {
    titre: 'Rituels vivants : une introduction à l’Ayurveda',
    description: 'Dix capsules vidéo courtes pour apaiser le système nerveux, mieux respirer, libérer les tensions des mains et des pieds, et revenir à un cap clair, en moins de 5 minutes par jour.',
    statut: 'masque', paywall: true, prix: 27, categorie: 'cours', evergreen: true, kajabiId: '2148356971',
    imageUrl: '', creeLe: new Date(), maj: new Date(),
  });
}
console.log(A_BLANC ? '[à blanc] rien n’a été écrit.' : `Fait : ${LECONS.length} leçons et la formation « ${ID} » (masquée).`);
