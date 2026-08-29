import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Le parrainage à paliers (porté du FMM). Le compteur de filleules et les
// badges se posent côté serveur seulement. Paliers par défaut (badges
// honorifiques, en attendant d'autres récompenses si Alex en décide) :
// 1 = ambassadrice · 5 = porteuse-flambeau · 10 = gardienne-cercle ·
// 20 = fondatrice-feu.

const PALIERS: Array<[number, string]> = [
  [1, 'ambassadrice'],
  [5, 'porteuse-flambeau'],
  [10, 'gardienne-cercle'],
  [20, 'fondatrice-feu'],
];

export const parrainageFilleule = onDocumentCreated(
  { document: 'parrainages/{filleulUid}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data() as { parrainUid?: string } | undefined;
    const parrainUid = data?.parrainUid;
    if (!parrainUid || parrainUid === event.params.filleulUid) return;

    const db = getFirestore();
    const filleules = await db.collection('parrainages').where('parrainUid', '==', parrainUid).count().get();
    const n = filleules.data().count;
    await db.doc(`members/${parrainUid}`).set({ filleules: n }, { merge: true });

    for (const [seuil, badgeId] of PALIERS) {
      if (n >= seuil) {
        await db.doc(`badges/${parrainUid}`).set(
          { obtenus: { [badgeId]: FieldValue.serverTimestamp() } },
          { merge: true },
        );
      }
    }
    console.log(`[parrainage] ${parrainUid} compte ${n} filleule(s)`);
  },
);
