import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Le miroir des Rituels (Krystine, 15 oct. 2026) ──────────────────────────
// Le courriel du jour 7 de la suite des Rituels essentiels demande « Où en
// êtes-vous avec vos Rituels ? ». Chaque réponse mène à /rituels-reponse, qui
// l'envoie ici : elle se pose sur la fiche (rituels.reponse + une étiquette
// rituels-…) et dans reponsesRituels/{fiche}, lu par l'admin. Une nouvelle
// réponse remplace la précédente; l'historique garde les deux.
const REPONSES = ['quotidien', 'commence', 'pas-encore'] as const;
const ID = /^[A-Za-z0-9_-]{10,64}$/;

export const enregistrerRituels = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const d = (req.data || {}) as { s?: unknown; r?: unknown };
  const s = String(d.s || '');
  const r = String(d.r || '');
  if (!ID.test(s)) throw new HttpsError('invalid-argument', 'Lien incomplet.');
  if (!(REPONSES as readonly string[]).includes(r)) throw new HttpsError('invalid-argument', 'Réponse inconnue.');
  const db = getFirestore();
  const ref = db.doc(`newsletter/${s}`);
  const fiche = await ref.get();
  if (!fiche.exists) throw new HttpsError('not-found', 'Lien introuvable.');
  const f = fiche.data() as { email?: string; firstName?: string };
  const autres = REPONSES.filter(x => x !== r).map(x => `rituels-${x}`);
  await ref.update({ tags: FieldValue.arrayRemove(...autres), rituels: { reponse: r, le: FieldValue.serverTimestamp() } });
  await ref.update({ tags: FieldValue.arrayUnion(`rituels-${r}`) });
  await db.doc(`reponsesRituels/${s}`).set({
    email: f.email || '',
    firstName: f.firstName || '',
    reponse: r,
    le: FieldValue.serverTimestamp(),
    historique: FieldValue.arrayUnion({ reponse: r, le: new Date().toISOString() }),
  }, { merge: true });
  return { ok: true };
});
