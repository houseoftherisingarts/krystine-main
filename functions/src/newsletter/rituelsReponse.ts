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

// ─── Le miroir de fin du cours (Krystine, 15 oct. 2026) ─────────────────────
// Sous le bonus et le guide : « Comment vous sentez-vous après ces gestes ? ».
// L'acheteuse est connectée : sa réponse se pose dans vecuRituels/{uid}, lu
// par l'admin (carte « Le miroir des Rituels »), et la suite qu'on lui montre
// en dépend (VATA en prolongement, VATA en réponse, ou un seul geste, sans vente).
const VECUS = ['calme', 'agite', 'rythme'] as const;

export const enregistrerVecu = onCall({ region: 'us-central1' }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connexion requise.');
  const r = String((req.data as { r?: unknown } | undefined)?.r || '');
  if (!(VECUS as readonly string[]).includes(r)) throw new HttpsError('invalid-argument', 'Réponse inconnue.');
  const t = req.auth?.token as { email?: string; name?: string } | undefined;
  await getFirestore().doc(`vecuRituels/${uid}`).set({
    email: t?.email || '',
    prenom: String(t?.name || '').trim().split(/\s+/)[0] || '',
    reponse: r,
    le: FieldValue.serverTimestamp(),
    historique: FieldValue.arrayUnion({ reponse: r, le: new Date().toISOString() }),
  }, { merge: true });
  return { ok: true };
});
