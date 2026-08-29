import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Les badges honorifiques se posent côté serveur seulement (anti-triche),
// sur le patron du FMM : badges/{uid}.obtenus.{badgeId} = date.
// Le catalogue complet (20 badges) vit dans la stratégie; les déclencheurs
// automatiques arrivent ici au fur et à mesure que leurs sources existent.

async function poserBadge(uid: string, badgeId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`badges/${uid}`);
  const snap = await ref.get();
  if (snap.exists && (snap.data() as { obtenus?: Record<string, unknown> }).obtenus?.[badgeId]) return;
  await ref.set({ obtenus: { [badgeId]: FieldValue.serverTimestamp() } }, { merge: true });
  console.log(`[badges] ${badgeId} -> ${uid}`);
}

// Première flamme : le premier cours acheté.
// L'Œuvre complète : toutes les formations payantes possédées.
export const badgeAchatFormation = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{fid}', region: 'us-central1' },
  async (event) => {
    const { uid } = event.params;
    const db = getFirestore();
    await poserBadge(uid, 'premiere-flamme');

    const [achats, payantes] = await Promise.all([
      db.collection(`achatsFormations/${uid}/formations`).count().get(),
      db.collection('formations').where('paywall', '==', true).where('statut', '==', 'publie').count().get(),
    ]);
    const nbPayantes = payantes.data().count;
    if (nbPayantes > 0 && achats.data().count >= nbPayantes) {
      await poserBadge(uid, 'oeuvre-complete');
    }
    if (achats.data().count >= 5) await poserBadge(uid, 'bibliotheque-vivante');
  },
);

// Première étincelle : le premier billet publié sur le fil de la communauté.
export const badgePremierBillet = onDocumentCreated(
  { document: 'mur/{postId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data() as { uid?: string; fil?: string } | undefined;
    if (!data?.uid || data.fil !== 'communaute') return;
    await poserBadge(data.uid, 'premiere-etincelle');
  },
);

// Main tendue : la première amitié acceptée.
export const badgeAmitieAcceptee = onDocumentUpdated(
  { document: 'amities/{id}', region: 'us-central1' },
  async (event) => {
    const avant = event.data?.before.data() as { statut?: string } | undefined;
    const apres = event.data?.after.data() as { statut?: string; uids?: string[] } | undefined;
    if (avant?.statut === 'acceptee' || apres?.statut !== 'acceptee' || !apres.uids) return;
    for (const uid of apres.uids) await poserBadge(uid, 'main-tendue');
  },
);
