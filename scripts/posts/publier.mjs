#!/usr/bin/env node
// ─── Publication automatique des posts préfaits sur la page Facebook ──
//   node scripts/posts/publier.mjs
//
// Porté de vexel-site/scripts/presskit/publier.mjs, avec deux différences
// volontaires : les clés se lisent sous KRYSTINE_META_PAGE_TOKEN et
// KRYSTINE_META_PAGE_ID dans ~/.claude/keys.env, et l'absence de clé
// n'entraîne ni dossier sur le Bureau ni notification, contrairement au
// kit Vexel. Le script se contente alors de noter dans etat.json que la
// prochaine carte attend une clé, puis s'arrête là. Aucun plist launchd
// n'est installé par ce module : voir scripts/posts/LISEZ-MOI.md pour
// l'armer à la main.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FICHIER_DONNEES = path.join(HERE, 'file.json');
const FICHIER_ETAT = path.join(HERE, 'etat.json');
const FICHIER_CLES = path.join(process.env.HOME || '', '.claude', 'keys.env');

const DELAI_MIN_HEURES = 44;
const VERSION_API = 'v19.0';

function lireEnv(chemin) {
  const cles = {};
  if (!fs.existsSync(chemin)) return cles;
  for (const ligne of fs.readFileSync(chemin, 'utf8').split('\n')) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) cles[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return cles;
}

function lireJson(chemin, repli) {
  if (!fs.existsSync(chemin)) return repli;
  return JSON.parse(fs.readFileSync(chemin, 'utf8'));
}

function ecrireEtat(etat) {
  fs.writeFileSync(FICHIER_ETAT, JSON.stringify(etat, null, 2) + '\n', 'utf8');
}

function heuresDepuis(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

async function publierSurFacebook(carte, jeton, idPage) {
  const domaine = new URL(carte.lien).origin;
  const corps = new URLSearchParams({
    url: `${domaine}/pubs/posts/${carte.id}-portrait.png`,
    caption: carte.legende,
    access_token: jeton,
  });
  const reponse = await fetch(`https://graph.facebook.com/${VERSION_API}/${idPage}/photos`, {
    method: 'POST',
    body: corps,
  });
  const corpsReponse = await reponse.json().catch(() => ({}));
  if (!reponse.ok || corpsReponse.error) {
    throw new Error(corpsReponse.error?.message || `Réponse ${reponse.status} de l'API Meta.`);
  }
  return corpsReponse.id || corpsReponse.post_id || null;
}

async function main() {
  const cartes = lireJson(FICHIER_DONNEES, []);
  const etat = lireJson(FICHIER_ETAT, { publiees: [], dernierePublicationLe: null });
  const idsPublies = new Set((etat.publiees || []).map((p) => p.id));
  const prochaine = cartes.find((c) => !idsPublies.has(c.id));

  if (!prochaine) {
    console.log('Toutes les cartes du fichier ont déjà été publiées.');
    return;
  }

  const attente = heuresDepuis(etat.dernierePublicationLe);
  if (attente < DELAI_MIN_HEURES) {
    const reste = Math.ceil(DELAI_MIN_HEURES - attente);
    console.log(`La dernière publication remonte à moins de ${DELAI_MIN_HEURES} h : encore ${reste} h avant la prochaine.`);
    return;
  }

  const cles = lireEnv(FICHIER_CLES);
  const jeton = cles.KRYSTINE_META_PAGE_TOKEN;
  const idPage = cles.KRYSTINE_META_PAGE_ID;

  if (!jeton || !idPage) {
    etat.enAttenteDeCle = { id: prochaine.id, depuisLe: new Date().toISOString() };
    ecrireEtat(etat);
    console.log(`Carte ${prochaine.id} prête, mais aucune clé Meta dans ~/.claude/keys.env (KRYSTINE_META_PAGE_TOKEN, KRYSTINE_META_PAGE_ID). En attente, rien d'autre n'a bougé.`);
    return;
  }

  try {
    const idPost = await publierSurFacebook(prochaine, jeton, idPage);
    const maintenant = new Date().toISOString();
    etat.publiees = [...(etat.publiees || []), { id: prochaine.id, publieeLe: maintenant, idPost }];
    etat.dernierePublicationLe = maintenant;
    delete etat.enAttenteDeCle;
    ecrireEtat(etat);
    console.log(`Carte ${prochaine.id} publiée sur Facebook (${idPost || 'sans identifiant retourné'}).`);
  } catch (err) {
    console.error(`La publication de la carte ${prochaine.id} a échoué : ${err.message}`);
    process.exitCode = 1;
  }
}

main();
