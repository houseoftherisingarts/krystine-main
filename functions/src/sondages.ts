import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Les sondages de l'onglet « Aider » : Krystine en ajoute de temps en temps
// dans l'admin (settings côté sondages/{id}), une réponse complétée retire
// le sondage de l'espace de la personne pour toujours et verse dix niskas.
// Même patron de transaction que echangerRecompense (functions/src/recompenses.ts) :
// un dedupKey dans pointsEvents, un balRef incrémenté, tout dans une seule
// transaction pour qu'une même personne ne puisse jamais répondre deux fois.

type TypeQuestion = 'choix' | 'multi' | 'echelle' | 'texte';

interface Question {
  id: string;
  type: TypeQuestion;
  texte: string;
  options?: string[];
  min?: number;
  max?: number;
  etiquettes?: [string, string];
  obligatoire: boolean;
}

interface Sondage {
  titre: string;
  actif: boolean;
  recompense?: number;
  questions: Question[];
}

const MAX_TEXTE = 1000;

/** Valide une réponse brute contre sa question; lève une HttpsError si elle
 *  ne convient pas. Rend `null` pour une question facultative laissée vide
 *  (elle ne s'écrit alors pas dans la réponse). */
function validerReponse(q: Question, valeur: unknown): string | string[] | number | null {
  const absente = valeur === undefined || valeur === null || valeur === ''
    || (Array.isArray(valeur) && valeur.length === 0);
  if (absente) {
    if (q.obligatoire) throw new HttpsError('invalid-argument', `La question « ${q.texte} » est obligatoire.`);
    return null;
  }
  switch (q.type) {
    case 'choix': {
      const v = String(valeur);
      if (!q.options?.includes(v)) throw new HttpsError('invalid-argument', `Réponse invalide pour « ${q.texte} ».`);
      return v;
    }
    case 'multi': {
      if (!Array.isArray(valeur)) throw new HttpsError('invalid-argument', `Réponse invalide pour « ${q.texte} ».`);
      const vs = valeur.map(String);
      if (vs.length === 0 || vs.some((v) => !q.options?.includes(v))) {
        throw new HttpsError('invalid-argument', `Réponse invalide pour « ${q.texte} ».`);
      }
      return vs;
    }
    case 'echelle': {
      const n = Number(valeur);
      const min = q.min ?? 1;
      const max = q.max ?? 5;
      if (!Number.isFinite(n) || n < min || n > max) throw new HttpsError('invalid-argument', `Réponse invalide pour « ${q.texte} ».`);
      return n;
    }
    case 'texte': {
      const s = String(valeur);
      if (s.length > MAX_TEXTE) throw new HttpsError('invalid-argument', `La réponse à « ${q.texte} » dépasse ${MAX_TEXTE} caractères.`);
      return s;
    }
    default:
      throw new HttpsError('invalid-argument', `Type de question inconnu pour « ${q.texte} ».`);
  }
}

export const repondreSondage = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour répondre à ce sondage.');
    const uid = req.auth.uid;
    const sondageId = String(req.data?.sondageId || '');
    if (!sondageId) throw new HttpsError('invalid-argument', 'Sondage manquant.');
    const brut = (req.data?.reponses && typeof req.data.reponses === 'object' ? req.data.reponses : {}) as Record<string, unknown>;

    const db = getFirestore();
    const sondageRef = db.doc(`sondages/${sondageId}`);
    const sondageSnap = await sondageRef.get();
    if (!sondageSnap.exists) throw new HttpsError('not-found', 'Ce sondage n’existe plus.');
    const sondage = sondageSnap.data() as Sondage;
    if (!sondage.actif) throw new HttpsError('failed-precondition', 'Ce sondage n’est plus actif.');

    const faitRef = db.doc(`members/${uid}/sondagesFaits/${sondageId}`);
    if ((await faitRef.get()).exists) throw new HttpsError('already-exists', 'Vous avez déjà répondu à ce sondage.');

    // La validation de chaque réponse contre sa question, avant toute écriture.
    const reponses: Record<string, string | string[] | number> = {};
    for (const q of sondage.questions || []) {
      const v = validerReponse(q, brut[q.id]);
      if (v !== null) reponses[q.id] = v;
    }

    const montant = sondage.recompense || 10;
    const reponseRef = db.doc(`sondages/${sondageId}/reponses/${uid}`);
    const balRef = db.doc(`memberPoints/${uid}`);
    const dedupKey = `sondage:${uid}:${sondageId}`;
    const evt = db.doc(`pointsEvents/${dedupKey}`);

    await db.runTransaction(async (tx) => {
      const [fait, deja] = await Promise.all([tx.get(faitRef), tx.get(evt)]);
      if (fait.exists || deja.exists) throw new HttpsError('already-exists', 'Vous avez déjà répondu à ce sondage.');
      tx.set(reponseRef, { uid, email: req.auth!.token.email || null, reponses, at: FieldValue.serverTimestamp() });
      tx.set(faitRef, { at: FieldValue.serverTimestamp(), niskas: montant });
      tx.set(evt, { uid, kind: 'sondage', amount: montant, dedupKey, meta: { sondageId }, at: FieldValue.serverTimestamp() });
      tx.set(balRef, { balance: FieldValue.increment(montant), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    console.log(`[sondages] ${uid} répond à ${sondageId}, +${montant} niskas`);
    return { ok: true, niskas: montant };
  },
);
