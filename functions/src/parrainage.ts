import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { crediterFanams } from './fanams';

// Le parrainage à paliers (porté du FMM). Deux compteurs, posés côté serveur
// seulement :
//  - les INVITATIONS (chaque compte créé par le lien) donnent des badges
//    honorifiques à 1, 5, 10 et 20;
//  - les filleules qui ACHÈTENT une formation donnent des cadeaux réels
//    (règle d'Alex du 2026-08-29 : jamais de cadeau pour une invitation
//    qui n'achète rien).

const PALIERS: Array<[number, string]> = [
  [1, 'ambassadrice'],
  [5, 'porteuse-flambeau'],
  [10, 'gardienne-cercle'],
  [20, 'fondatrice-feu'],
];

// Cadeaux par filleules acheteuses. `formationId` = accès offert à ce cours;
// `accesVie` = toutes les formations, pour toujours. Miroir côté client :
// src/firebase/parrainage.ts (CADEAUX_PARRAINAGE).
const CADEAUX: Array<{ seuil: number; formationId?: string; accesVie?: boolean }> = [
  { seuil: 1, formationId: 'kajabi-2149362766' },   // la musique de l'Expérience Origine
  { seuil: 3, formationId: 'kajabi-2148698908' },   // Pitta, 3 jours de découverte
  { seuil: 5, formationId: 'kajabi-2149362090' },   // Santé Parfaite, la masterclass
  { seuil: 10, formationId: 'kajabi-2148932239' },  // Vitalité et Clarté, 30 jours
  { seuil: 20, accesVie: true },
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
    await crediterFanams(parrainUid, 'parrainage', 20, `parrainage:${event.params.filleulUid}`, { filleulUid: event.params.filleulUid });

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

// Premier achat d'une filleule : la marraine gagne une filleule acheteuse et
// les cadeaux dont elle atteint le seuil. Un cadeau offert n'est jamais
// compté comme un achat (source 'parrainage').
export const parrainageAchat = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{formationId}', region: 'us-central1' },
  async (event) => {
    const achat = event.data?.data() as { source?: string } | undefined;
    if (achat?.source === 'parrainage' || achat?.source === 'fanams') return;
    const filleulUid = event.params.uid;

    const db = getFirestore();
    const pRef = db.doc(`parrainages/${filleulUid}`);
    const pSnap = await pRef.get();
    const p = pSnap.data() as { parrainUid?: string; achatCompte?: boolean } | undefined;
    if (!pSnap.exists || !p?.parrainUid || p.achatCompte) return;
    await pRef.update({ achatCompte: true, achatCompteLe: FieldValue.serverTimestamp() });

    const parrainUid = p.parrainUid;
    const acheteuses = await db.collection('parrainages')
      .where('parrainUid', '==', parrainUid)
      .where('achatCompte', '==', true)
      .count().get();
    const n = acheteuses.data().count;
    await db.doc(`members/${parrainUid}`).set({ filleulesAcheteuses: n }, { merge: true });

    for (const c of CADEAUX) {
      if (n < c.seuil) continue;
      if (c.formationId) {
        const ref = db.doc(`achatsFormations/${parrainUid}/formations/${c.formationId}`);
        if (!(await ref.get()).exists) {
          await ref.set({ source: 'parrainage', palier: c.seuil, offertLe: FieldValue.serverTimestamp() });
        }
      }
      if (c.accesVie) await db.doc(`members/${parrainUid}`).set({ accesVie: true }, { merge: true });
    }
    console.log(`[parrainage] ${parrainUid} compte ${n} filleule(s) acheteuse(s)`);
  },
);
