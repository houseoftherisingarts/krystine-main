import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Les choix envoyés depuis /mes-choix (27 sept. 2026) ──────────────────────
// La lettre mène chaque lectrice à /mes-choix?s=<sa fiche>. Elle y coche ses
// motifs et sa façon d'avancer; ici, chaque case devient une étiquette sur sa
// fiche (interet-…, preference-…). Une préférence ne devient jamais un intérêt
// pour une offre. Seules les clés connues passent, et seulement sur une fiche
// qui existe : l'identifiant de fiche, aléatoire, vient de sa propre lettre.
const PERMIS: Record<string, string[]> = {
  interet: ['choisir', 'rythme', 'rester-entiere', 'relier'],
  preference: ['autonomie', 'accompagnement'],
};
const ID = /^[A-Za-z0-9_-]{10,64}$/;

export const enregistrerChoix = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const d = (req.data || {}) as { s?: unknown; choix?: unknown };
  const s = String(d.s || '');
  if (!ID.test(s)) throw new HttpsError('invalid-argument', 'Lien incomplet.');
  const choix = Array.isArray(d.choix) ? d.choix.map(String) : [];
  const etiquettes = choix
    .map(c => c.split(':'))
    .filter(([g, k]) => PERMIS[g]?.includes(k))
    .map(([g, k]) => `${g}-${k}`);
  if (!etiquettes.length) throw new HttpsError('invalid-argument', 'Aucun choix.');
  const ref = getFirestore().doc(`newsletter/${s}`);
  const fiche = await ref.get();
  if (!fiche.exists) throw new HttpsError('not-found', 'Lien introuvable.');
  await ref.update({ tags: FieldValue.arrayUnion(...etiquettes), choixLe: FieldValue.serverTimestamp() });
  return { ok: true, etiquettes };
});
