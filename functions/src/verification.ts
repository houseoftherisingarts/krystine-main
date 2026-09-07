import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { assertAdmin } from './newsletter/send';
import { crediterNiskas } from './niskas';
import { ecrireMessageKrystine, uidKrystine } from './coffres';
import { lireGamification } from './gamification';
import {
  SEUIL_PROGRAMMES, NISKAS_BADGE_BLEU, ARTICLE_SKIN, ID_BADGE, KIND_BADGE_BLEU,
  cleBadgeBleu, cheminPieceValide, verifierCycleFoyer, StatutVerification,
} from './badgeBleuConfig';

// Le Badge Bleu (docs/badge-bleu-plan.md, 2.1 et 2.2). Une membre qui a suivi
// SEUIL_PROGRAMMES programmes payants avec Krystine dépose une pièce d'identité
// dans Storage (verifications/{uid}/piece.<ext>) et fait sa demande ici; l'admin
// décide. La pièce est supprimée du Storage à la décision, approuvée ou refusée,
// et aussi quand la demande est refusée d'office faute de programmes : nous ne
// gardons jamais une pièce d'identité (Loi 25).

verifierCycleFoyer();

const REGION = { region: 'us-central1' };
const MOT_APPROUVEE = 'Votre Badge Bleu est posé. Deux cents niskas viennent d’entrer dans votre bourse, et le Skin Vérifié vous attend dans la petite boutique de votre espace, section « Les skins », où il s’active d’un clic. Votre pièce d’identité a été supprimée de nos serveurs au moment même où j’ai pris cette décision.';
const motRefusee = (motif: string) =>
  `Je n’ai pas pu poser votre Badge Bleu cette fois-ci. ${motif} Votre pièce d’identité a été supprimée de nos serveurs. Vous pourrez refaire une demande depuis l’onglet Profil de votre espace quand vous le souhaiterez.`;

/** Tout ce que la membre a déposé dans son dossier de vérification disparaît, la pièce demandée comme un éventuel orphelin. */
const supprimerPieces = (uid: string) => getStorage().bucket().deleteFiles({ prefix: `verifications/${uid}/` });

/** Les programmes suivis : les achats de la membre croisés avec les formations payantes hors musique, quel que soit leur statut. */
async function compterProgrammes(db: Firestore, uid: string): Promise<number> {
  const [achats, formations] = await Promise.all([
    db.collection(`achatsFormations/${uid}/formations`).select().get(),
    db.collection('formations').where('paywall', '==', true).select('categorie').get(),
  ]);
  const programmes = new Set(formations.docs.filter((d) => d.get('categorie') !== 'musique').map((d) => d.id));
  return achats.docs.filter((d) => programmes.has(d.id)).length;
}

export const demanderBadgeBleu = onCall(REGION, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour demander votre Badge Bleu.');
  const uid = req.auth.uid;
  const pieceChemin = String(req.data?.pieceChemin || '');
  if (!cheminPieceValide(uid, pieceChemin)) throw new HttpsError('invalid-argument', 'Le chemin de la pièce est invalide.');
  const db = getFirestore();
  const ref = db.doc(`verifications/${uid}`);
  const statut = ((await ref.get()).data() as { statut?: StatutVerification } | undefined)?.statut;
  if (statut === 'en_attente') throw new HttpsError('failed-precondition', 'Votre demande est déjà chez Krystine.');
  if (statut === 'approuvee') throw new HttpsError('failed-precondition', 'Votre Badge Bleu est déjà posé.');

  const programmes = await compterProgrammes(db, uid);
  if (programmes < SEUIL_PROGRAMMES) {
    await supprimerPieces(uid);
    throw new HttpsError('failed-precondition', `Il vous faut ${SEUIL_PROGRAMMES} programmes suivis avec Krystine et nous en comptons ${programmes}.`, { programmes });
  }
  const [existe] = await getStorage().bucket().file(pieceChemin).exists();
  if (!existe) throw new HttpsError('invalid-argument', 'La pièce n’est pas arrivée.');

  await ref.set({ uid, statut: 'en_attente', programmes, pieceChemin, demandeLe: FieldValue.serverTimestamp(), decideLe: null, decidePar: null, motif: null });
  console.log(`[badge-bleu] ${uid} demande (${programmes} programmes)`);
  return { ok: true, programmes };
});

/** Le corps de la décision, sans le contrôle d'accès : l'onCall l'enveloppe et la QA l'appelle avec l'Admin SDK. */
export async function deciderBadgeBleuPour(uid: string, decision: 'approuvee' | 'refusee', motif: string, decidePar: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`verifications/${uid}`);
  const v = (await ref.get()).data() as { statut?: StatutVerification } | undefined;
  if (v?.statut !== 'en_attente') throw new HttpsError('failed-precondition', 'Aucune demande en attente pour cette membre.');

  // D'abord la pièce : si la suite échoue, la demande reste en attente sans
  // pièce et l'admin redécide (approuver n'en a plus besoin).
  await supprimerPieces(uid);
  await ref.set({ pieceChemin: null }, { merge: true });

  const krystine = await uidKrystine(db);
  if (decision === 'approuvee') {
    await db.doc(`members/${uid}`).set({ verifie: true }, { merge: true });
    await crediterNiskas(uid, KIND_BADGE_BLEU, NISKAS_BADGE_BLEU, cleBadgeBleu(uid), { decidePar });
    await db.doc(`boutique/${uid}`).set({ possede: { [ARTICLE_SKIN]: FieldValue.serverTimestamp() } }, { merge: true });
    await db.doc(`badges/${uid}`).set({ obtenus: { [ID_BADGE]: FieldValue.serverTimestamp() } }, { merge: true });
    await ref.set({ statut: 'approuvee', motif: null, decideLe: FieldValue.serverTimestamp(), decidePar, pieceChemin: null }, { merge: true });
    if (krystine) await ecrireMessageKrystine(db, krystine, uid, MOT_APPROUVEE);
  } else {
    await ref.set({ statut: 'refusee', motif, decideLe: FieldValue.serverTimestamp(), decidePar, pieceChemin: null }, { merge: true });
    if (krystine) await ecrireMessageKrystine(db, krystine, uid, motRefusee(motif));
  }
  console.log(`[badge-bleu] ${uid} ${decision} par ${decidePar}`);
}

export const deciderBadgeBleu = onCall(REGION, async (req) => {
  const decidePar = assertAdmin(req);
  const uid = String(req.data?.uid || '');
  const decision = req.data?.decision;
  const motif = String(req.data?.motif || '').slice(0, 600).trim();
  if (!/^[\w-]{1,128}$/.test(uid) || (decision !== 'approuvee' && decision !== 'refusee')) throw new HttpsError('invalid-argument', 'Membre et décision requis.');
  if (decision === 'refusee' && !motif) throw new HttpsError('invalid-argument', 'Un motif est nécessaire pour refuser : la membre le lira.');
  await deciderBadgeBleuPour(uid, decision, motif, decidePar);
  return { ok: true };
});
