import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import {
  limiterParIp, MESSAGE_CADENCE, champsRehabilitation, type FicheRobot,
} from './newsletter/robots';

export const RECAPTCHA_SECRET = defineSecret('RECAPTCHA_SECRET');

// Les hôtes d'où un jeton peut légitimement venir. Google renvoie le `hostname`
// de la page qui a résolu le défi : un jeton obtenu sur le site d'un tiers (ou
// sur une copie du formulaire posée ailleurs) ne passe plus.
const HOTES = new Set(['krystinestlaurent.ca', 'www.krystinestlaurent.ca', 'localhost']);

// Deux minutes entre le moment où la case est cochée et l'arrivée du jeton
// ici. Google accepte un jeton deux minutes, mais ne le dit qu'en refusant :
// on le vérifie nous-mêmes pour refuser un jeton mis de côté et rejoué.
const AGE_MAX_MS = 2 * 60 * 1000;

interface ReponseGoogle {
  success: boolean;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

/**
 * Vérifie un jeton reCAPTCHA v2 auprès de Google, puis contrôle l'hôte et
 * l'âge du défi. Lève une HttpsError si quoi que ce soit cloche, et journalise
 * chaque refus avec son motif (jamais le jeton lui-même : il vaut une session).
 *
 * `ou` nomme le formulaire, pour lire les refus dans les journaux.
 */
export async function verifierJeton(token: string, ou: string): Promise<void> {
  if (!token) {
    console.warn(`[captcha] refus ${ou} : jeton manquant`);
    throw new HttpsError('invalid-argument', 'Jeton captcha manquant.');
  }

  let data: ReponseGoogle;
  try {
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET.value(), response: token }),
    });
    data = (await r.json()) as ReponseGoogle;
  } catch (err) {
    // Google injoignable : on refuse plutôt que d'ouvrir la porte en grand.
    console.error(`[captcha] refus ${ou} : siteverify injoignable`, err);
    throw new HttpsError('unavailable', 'La vérification anti-robot est indisponible. Réessayez dans un instant.');
  }

  if (!data.success) {
    console.warn(`[captcha] refus ${ou} : google dit non`, (data['error-codes'] || []).join(','));
    throw new HttpsError('permission-denied', 'Vérification captcha refusée.');
  }

  const hote = String(data.hostname || '').toLowerCase();
  if (!HOTES.has(hote)) {
    console.warn(`[captcha] refus ${ou} : hôte inattendu "${hote}"`);
    throw new HttpsError('permission-denied', 'Vérification captcha refusée.');
  }

  const pose = Date.parse(String(data.challenge_ts || ''));
  if (!Number.isFinite(pose)) {
    console.warn(`[captcha] refus ${ou} : horodatage du défi illisible "${data.challenge_ts}"`);
    throw new HttpsError('permission-denied', 'Vérification captcha refusée.');
  }
  const age = Date.now() - pose;
  if (age > AGE_MAX_MS) {
    console.warn(`[captcha] refus ${ou} : défi trop vieux (${Math.round(age / 1000)} s)`);
    throw new HttpsError('deadline-exceeded', 'La vérification a expiré. Cochez la case de nouveau.');
  }

  console.log(`[captcha] accepté ${ou} · ${hote} · ${Math.round(age / 1000)} s`);
}

/**
 * Le garde complet d'un formulaire public : la cadence par adresse IP d'abord
 * (elle ne coûte qu'une lecture), le jeton ensuite. `cle` range le compteur
 * par formulaire, pour qu'une inscription à l'infolettre ne ferme pas la porte
 * du téléchargement d'un extrait.
 */
export async function garderFormulaire(token: string, cle: string, ip: string | undefined, max = 5): Promise<void> {
  if (!(await limiterParIp(ip, cle, max))) {
    console.warn(`[garde] cadence dépassée sur ${cle}`);
    throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
  }
  await verifierJeton(token, cle);
}

// Appelée par la fenêtre de création de compte (SignInModal.tsx) avant
// `signUpWithEmail`. ponytail: la barrière vit au formulaire; un appel direct
// à Firebase Auth la contourne. L'étape au-dessus est Identity Platform +
// blocking function beforeUserCreated, à brancher si le spam de comptes
// devient réel.
export const verifierCaptcha = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET] },
  async (req) => {
    await garderFormulaire(String(req.data?.token || ''), 'compte', req.rawRequest?.ip);
    return { ok: true };
  },
);
