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

// ─── « Je ne suis pas un robot », côté membre ────────────────────────────────
// Une personne connectée dont la fiche est en quarantaine coche la case depuis
// son espace (CarteRobotPotentiel.tsx) et se rétablit elle-même. Un alias
// jetable n'est pas une faute : c'est souvent quelqu'un de prudent, et cette
// porte lui évite d'écrire à l'équipe pour rien.
//
// Krystine garde le dernier mot : une fiche qu'elle a remise en quarantaine
// (`robotPotentiel.decisionKrystine === 'quarantaine'`) ne se rouvre plus
// toute seule.
// Deux modes, une seule fonction. `{ sonder: true }` dit seulement à la
// personne si une de ses fiches est en quarantaine : c'est ce qui décide
// d'afficher la carte ou non. Les règles Firestore ne laissent pas un membre
// lire la collection `newsletter` (réservée à l'admin), et ce n'est pas une
// règle qu'on veut desserrer pour une pastille : la question passe donc par
// ici, où le serveur ne répond que sur les fiches de l'appelante.
export const confirmerHumain = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour confirmer.');
    const sonder = req.data?.sonder === true;
    if (!sonder) await garderFormulaire(String(req.data?.token || ''), 'confirmer-humain', req.rawRequest?.ip);

    const db = getFirestore();
    const uid = req.auth.uid;
    // Le rapprochement par courriel n'a lieu que si Firebase a vérifié
    // l'adresse. Sinon, n'importe qui pourrait créer un compte en tapant
    // l'adresse d'une autre personne et rouvrir SES fiches : dans ce cas, seul
    // le `uid` compte, donc uniquement les fiches nées de ce compte-là.
    const verifie = req.auth.token?.email_verified === true;
    const email = verifie ? String(req.auth.token?.email || '').trim().toLowerCase() : '';

    // Par `uid` d'abord, par courriel ensuite : une même personne peut avoir
    // plusieurs fiches (formulaire, import, compte), on les rouvre toutes.
    const [parUid, parEmail] = await Promise.all([
      db.collection('newsletter').where('uid', '==', uid).get(),
      email ? db.collection('newsletter').where('email', '==', email).get() : Promise.resolve(null),
    ]);
    const fiches = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const d of parUid.docs) fiches.set(d.id, d);
    for (const d of parEmail?.docs || []) fiches.set(d.id, d);

    const enQuarantaine = [...fiches.values()].filter(d => (d.data() as FicheRobot).status === 'suspect');
    if (!enQuarantaine.length) {
      // Rien à faire : déjà rétablie, ou jamais mise en quarantaine.
      return { ok: true, retablies: 0 };
    }

    const bloquee = enQuarantaine.find(d => (d.data() as FicheRobot).robotPotentiel?.decisionKrystine === 'quarantaine');
    if (bloquee) {
      console.warn('[confirmerHumain] refus : quarantaine posée par Krystine', uid, email);
      throw new HttpsError('permission-denied', "Écrivez à l'équipe de Krystine pour être rétablie.");
    }

    const lot = db.batch();
    for (const d of enQuarantaine) lot.update(d.ref, champsRehabilitation(d.data() as FicheRobot, 'personne'));
    await lot.commit();
    console.log(`[confirmerHumain] ${enQuarantaine.length} fiche(s) rétablie(s)`, uid, email || '(courriel non vérifié : uid seulement)');
    return { ok: true, retablies: enQuarantaine.length };
  },
);
