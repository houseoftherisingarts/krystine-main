import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { crediterNiskas } from './niskas';
import { SEUIL_ACCES_VIE_CENTS, SEUIL_ACCES_VIE_FILLEULES, filleuleCompte } from './parrainageRegles';

export { SEUIL_ACCES_VIE_CENTS, SEUIL_ACCES_VIE_FILLEULES };

// Le parrainage à paliers (porté du FMM). Deux compteurs, posés côté serveur
// seulement :
//  - les INVITATIONS (chaque compte créé par le lien) donnent des badges
//    honorifiques à 1, 5, 10 et 20;
//  - les filleules qui ACHÈTENT une formation donnent des cadeaux réels
//    (règle d'Alex du 2026-08-29 : jamais de cadeau pour une invitation
//    qui n'achète rien).

// Niskas à l'inscription d'une filleule (Alex, 2026-09-06). Miroir client :
// src/lib/pointsConfig.ts (POINTS.parrainage, POINTS.parrainageBienvenue).
const NISKAS_MARRAINE = 20;
const NISKAS_FILLEULE = 10;
// Un compte plus vieux que ça n'est pas une inscription : le parrainage est
// effacé sans crédit (sinon un vieux compte réclame un code après coup).
const COMPTE_NEUF_MS = 48 * 60 * 60 * 1000;

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
    const filleulUid = event.params.filleulUid;

    const db = getFirestore();
    try {
      const cree = Date.parse((await getAuth().getUser(filleulUid)).metadata.creationTime || '');
      if (cree && Date.now() - cree > COMPTE_NEUF_MS) {
        await db.doc(`parrainages/${filleulUid}`).delete();
        console.log(`[parrainage] ${filleulUid} : compte trop ancien, parrainage refusé`);
        return;
      }
    } catch (e) {
      console.warn('[parrainage] âge du compte indisponible', e);
    }

    const filleules = await db.collection('parrainages').where('parrainUid', '==', parrainUid).count().get();
    const n = filleules.data().count;
    await db.doc(`members/${parrainUid}`).set({ filleules: n }, { merge: true });
    await crediterNiskas(parrainUid, 'parrainage', NISKAS_MARRAINE, `parrainage:${filleulUid}`, { filleulUid });
    await crediterNiskas(filleulUid, 'parrainage-bienvenue', NISKAS_FILLEULE, `parrainage-bienvenue:${filleulUid}`, { parrainUid });

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
// les cadeaux dont elle atteint le seuil (1, 3, 5, 10 : la règle reste « un
// premier achat, peu importe le montant », inchangée). Un cadeau offert
// n'est jamais compté comme un achat (source 'parrainage').
export const parrainageAchat = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{formationId}', region: 'us-central1' },
  async (event) => {
    const achat = event.data?.data() as { source?: string } | undefined;
    if (achat?.source === 'parrainage' || achat?.source === 'niskas') return;
    const filleulUid = event.params.uid;

    const db = getFirestore();
    const pRef = db.doc(`parrainages/${filleulUid}`);
    const pSnap = await pRef.get();
    const p = pSnap.data() as { parrainUid?: string; achatCompte?: boolean } | undefined;
    if (pSnap.exists && p?.parrainUid && !p.achatCompte) {
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
      }
      console.log(`[parrainage] ${parrainUid} compte ${n} filleule(s) acheteuse(s)`);
    }

    // L'accès à vie, lui, a sa propre règle : vingt filleules qui ont chacune
    // dépensé au moins cent dollars, hors taxes (Alex, 7 septembre 2026),
    // jamais un simple premier achat. Compteur séparé, posé en silence.
    await verifierSeuilAccesVie(db, filleulUid);
  },
);

// ─── L'accès à vie : vingt filleules à cent dollars ──────────────────────────
// Règle distincte du cadeau « 20 filleules » ci-dessus (qui, lui, ne
// regardait que le premier achat, peu importe le montant). Ici, une filleule
// ne compte que lorsque la somme de ses VRAIES ventes Stripe (jamais un
// cadeau, jamais un achat en niskas) atteint cent dollars hors taxes. Le
// verrou par personne (`achat100`) évite de recompter le seuil de la
// marraine à chaque nouvel achat une fois la filleule déjà comptée.
/** Additionne les vraies ventes Stripe d'une personne, hors taxes, en cents :
 *  ses formations achetées (jamais un cadeau ni un achat en niskas — reconnus
 *  par l'absence de `sessionId`, comme src/firebase/commandes.ts côté admin)
 *  et ses pourboires du direct. */
export async function totalStripeHT(db: Firestore, uid: string): Promise<number> {
  const [achats, pourboires] = await Promise.all([
    db.collection(`achatsFormations/${uid}/formations`).get(),
    db.collection('pourboires').where('uid', '==', uid).get(),
  ]);
  const enCents = (d: FirebaseFirestore.DocumentData) =>
    typeof d.montantHT === 'number' ? d.montantHT : Math.round((Number(d.montant) || 0) * 100);
  let total = 0;
  for (const d of achats.docs) {
    const data = d.data();
    if (!data.sessionId) continue; // pas une vente : cadeau, octroi manuel, ou achat en niskas
    total += enCents(data);
  }
  for (const d of pourboires.docs) total += enCents(d.data());
  return total;
}

/** Vérifie si UNE filleule franchit cent dollars, puis si SA marraine
 *  atteint vingt filleules qui ont franchi ce seuil. Jamais de retrait :
 *  `accesVie` ne se pose qu'à `true`, jamais remis à `false`. */
export async function verifierSeuilAccesVie(db: Firestore, filleulUid: string): Promise<void> {
  const pRef = db.doc(`parrainages/${filleulUid}`);
  const pSnap = await pRef.get();
  const p = pSnap.data() as { parrainUid?: string; achat100?: boolean } | undefined;
  if (!pSnap.exists || !p?.parrainUid || p.achat100) return;

  const total = await totalStripeHT(db, filleulUid);
  if (total < SEUIL_ACCES_VIE_CENTS) return;
  await pRef.update({ achat100: true, achat100Le: FieldValue.serverTimestamp() });

  const parrainUid = p.parrainUid;
  const n = (await db.collection('parrainages')
    .where('parrainUid', '==', parrainUid)
    .where('achat100', '==', true)
    .count().get()).data().count;
  console.log(`[parrainage] ${parrainUid} compte ${n} filleule(s) à 100 $ et plus`);
  if (n >= SEUIL_ACCES_VIE_FILLEULES) {
    await db.doc(`members/${parrainUid}`).set({ accesVie: true }, { merge: true });
  }
}

// Un pourboire du direct compte aussi dans les cent dollars d'une filleule :
// seul autre document que stripeWebhook écrit pour une vraie vente en argent
// (les paquets de niskas achetés, eux, ne comptent jamais — Alex, 7 sept. 2026).
export const parrainagePourboire = onDocumentCreated(
  { document: 'pourboires/{id}', region: 'us-central1' },
  async (event) => {
    const uid = (event.data?.data() as { uid?: string } | undefined)?.uid;
    if (uid) await verifierSeuilAccesVie(getFirestore(), uid);
  },
);
