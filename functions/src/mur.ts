import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

// Les compteurs du mur social (portés du FMM). Le navigateur n'écrit jamais
// pour/contre/score/chaleur/nbCommentaires : chaque vote ou commentaire
// déclenche un recomptage serveur avec l'Admin SDK.

// La formule de chaleur du FMM (hot à la Reddit, figée sur la date de création).
function chaleur(score: number, creeLeMs: number): number {
  const ordre = Math.log10(Math.max(Math.abs(score), 1));
  const signe = score > 0 ? 1 : score < 0 ? -1 : 0;
  return signe * ordre + creeLeMs / 45000000;
}

async function recompterVotes(colVotes: FirebaseFirestore.CollectionReference, cible: FirebaseFirestore.DocumentReference) {
  const votes = await colVotes.get();
  let pour = 0; let contre = 0;
  votes.forEach(v => {
    const val = (v.data() as { valeur?: number }).valeur || 0;
    if (val > 0) pour++;
    else if (val < 0) contre++;
  });
  const score = pour - contre;
  const doc = await cible.get();
  if (!doc.exists) return;
  const creeLe = (doc.data() as { creeLe?: { toMillis?: () => number } }).creeLe;
  const creeLeMs = creeLe?.toMillis ? creeLe.toMillis() : Date.now();
  await cible.update({ pour, contre, score, chaleur: chaleur(score, creeLeMs) });
}

export const murVoteBillet = onDocumentWritten(
  { document: 'mur/{postId}/votes/{voterUid}', region: 'us-central1' },
  async (event) => {
    const db = getFirestore();
    const { postId } = event.params;
    await recompterVotes(db.collection(`mur/${postId}/votes`), db.doc(`mur/${postId}`));
  },
);

export const murVoteCommentaire = onDocumentWritten(
  { document: 'mur/{postId}/commentaires/{cid}/votes/{voterUid}', region: 'us-central1' },
  async (event) => {
    const db = getFirestore();
    const { postId, cid } = event.params;
    await recompterVotes(
      db.collection(`mur/${postId}/commentaires/${cid}/votes`),
      db.doc(`mur/${postId}/commentaires/${cid}`),
    );
  },
);

export const murCommentaireCompte = onDocumentWritten(
  { document: 'mur/{postId}/commentaires/{cid}', region: 'us-central1' },
  async (event) => {
    const db = getFirestore();
    const { postId } = event.params;
    const commentaires = await db.collection(`mur/${postId}/commentaires`).count().get();
    const post = db.doc(`mur/${postId}`);
    if ((await post.get()).exists) {
      await post.update({ nbCommentaires: commentaires.data().count });
    }
  },
);
