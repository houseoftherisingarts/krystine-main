import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// ─── La garde : alias jetables et cadence par adresse IP ─────────────────────
// Le 21 septembre 2026, deux inscriptions sont entrées coup sur coup depuis un
// alias Proton Pass (…@passmail.com), avec un prénom plausible et le
// consentement coché. Rien ne les distinguait d'une vraie personne, sauf le
// domaine. Un alias jetable n'est pas une preuve de robot (quelqu'un de
// prudent en utilise un), donc on ne bloque rien et on n'efface rien : la
// fiche entre en `suspect`, elle ne reçoit aucun envoi, et Krystine tranche
// d'un bouton dans Admin › Infolettre › Abonnés.
//
// Ce fichier est doublé côté navigateur dans `src/lib/robots.ts`, parce que
// les formulaires publics écrivent encore dans Firestore depuis le client
// (voir le rapport). Les deux listes doivent rester identiques :
// `src/lib/robots.test.mjs` casse dès qu'elles divergent.

// Chaque domaine a été vérifié sur le site du service avant d'entrer ici.
// Les boîtes normales n'y sont PAS : proton.me et protonmail.com sont des
// adresses de tous les jours, seuls les domaines d'alias de Proton Pass
// figurent ci-dessous.
export const DOMAINES_ALIAS: Record<string, string> = {
  // Proton Pass — alias masqués
  'passmail.com':      'Proton Pass',
  'passmail.net':      'Proton Pass',
  'passinbox.com':     'Proton Pass',
  'passfwd.com':       'Proton Pass',
  // SimpleLogin (Proton) — domaines d'alias
  'simplelogin.com':   'SimpleLogin',
  'simplelogin.co':    'SimpleLogin',
  'simplelogin.fr':    'SimpleLogin',
  'slmail.me':         'SimpleLogin',
  'aleeas.com':        'SimpleLogin',
  'silomails.com':     'SimpleLogin',
  // DuckDuckGo Email Protection
  'duck.com':          'DuckDuckGo Email Protection',
  // Mozilla Firefox Relay
  'mozmail.com':       'Firefox Relay',
  'relay.firefox.com': 'Firefox Relay',
  // addy.io (ex-AnonAddy)
  'anonaddy.com':      'addy.io',
  'anonaddy.me':       'addy.io',
  'addy.io':           'addy.io',
  'anonaddy.dev':      'addy.io',
  // Boîtes publiques jetables
  'guerrillamail.com': 'boîte jetable',
  'mailinator.com':    'boîte jetable',
  'yopmail.com':       'boîte jetable',
  'temp-mail.org':     'boîte jetable',
  '10minutemail.com':  'boîte jetable',
  'mailderive.com':    'boîte jetable',
  'trashmail.com':     'boîte jetable',
};

/** Le domaine d'alias d'une adresse, ou null si l'adresse est ordinaire. */
export function domaineAlias(email: string): string | null {
  const at = String(email || '').trim().toLowerCase().lastIndexOf('@');
  if (at < 0) return null;
  const hote = String(email).trim().toLowerCase().slice(at + 1);
  if (DOMAINES_ALIAS[hote]) return hote;
  // Firefox Relay sert ses alias sur des sous-domaines de mozmail.com
  // (xxx.mozmail.com), donc on remonte les étiquettes une à une.
  const parts = hote.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (DOMAINES_ALIAS[parent]) return parent;
  }
  return null;
}

/**
 * Les champs à fusionner dans une fiche `newsletter` au moment de sa création.
 * Une adresse ordinaire ne reçoit rien ({}), un alias reçoit le statut
 * `suspect`, l'étiquette `robot-potentiel` et le motif. Le modèle reprend au
 * champ près les trois fiches posées à la main par Alex le 21 septembre 2026.
 */
export function champsRobot(email: string, tags: string[] = [], statusAvant = 'active'): Record<string, unknown> {
  const domaine = domaineAlias(email);
  if (!domaine) return {};
  return {
    status: 'suspect',
    statusAvant,
    tags: Array.from(new Set([...tags, 'robot-potentiel'])),
    robotPotentiel: {
      raison: `alias jetable ${domaine} (${DOMAINES_ALIAS[domaine]})`,
      poseLe: FieldValue.serverTimestamp(),
      par: 'garde automatique',
    },
  };
}

// ─── Cadence par adresse IP ──────────────────────────────────────────────────
// Cinq créations de compte ou inscriptions par heure et par adresse. Le
// compteur vit dans `garde/ip/{hash}` (l'IP n'est jamais écrite en clair) et
// s'efface de lui-même : `expire` porte une date que la politique TTL de
// Firestore ramasse, et une fenêtre périmée repart à zéro de toute façon.
const FENETRE_MS = 60 * 60 * 1000;

function hacher(ip: string): string {
  // ponytail: FNV-1a, pas de crypto — on veut une clé de document courte et
  // stable, pas un secret. Remonter à SHA-256 si l'IP devient sensible.
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Compte une tentative et dit si la limite est franchie. `true` = laisser
 * passer. Une IP absente (appel interne, émulateur) passe toujours : on ne
 * ferme jamais la porte sur une donnée qu'on n'a pas.
 */
export async function limiterParIp(ip: string | undefined, cle: string, max = 5): Promise<boolean> {
  const brute = String(ip || '').trim();
  if (!brute) return true;
  const ref = getFirestore().doc(`garde/ip/${cle}/${hacher(brute)}`);
  const maintenant = Date.now();
  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.data() as { n?: number; depuis?: Timestamp } | undefined;
      const depuis = d?.depuis?.toMillis() ?? 0;
      const neuve = !d || maintenant - depuis > FENETRE_MS;
      const n = neuve ? 1 : (d?.n ?? 0) + 1;
      if (n > max) return false;
      tx.set(ref, {
        n,
        depuis: neuve ? Timestamp.fromMillis(maintenant) : d!.depuis,
        expire: Timestamp.fromMillis((neuve ? maintenant : depuis) + 2 * FENETRE_MS),
      });
      return true;
    });
  } catch (err) {
    // Un compteur en panne ne doit pas fermer le formulaire à tout le monde.
    console.error('[garde] compteur IP indisponible', cle, err);
    return true;
  }
}

export const MESSAGE_CADENCE =
  'Trop de tentatives depuis cette connexion. Réessayez dans une heure, ou écrivez à teamksl@inspiratanature.com.';
