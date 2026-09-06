import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Les badges d'interaction (Alex, 6 sept. 2026) : comme dans les groupes
// Facebook, ils récompensent la parole, le partage et la présence. Chaque
// geste incrémente un compteur dans badges/{uid}.compteurs, puis les seuils
// se relisent et posent le badge. Tout se passe ici, jamais dans le navigateur.
type Compteurs = { paroles?: number; billets?: number; votes?: number; ecoutes?: number; jours?: number };

const SEUILS: Array<{ id: string; ok: (c: Compteurs) => boolean }> = [
  { id: 'voix-du-cercle',   ok: (c) => (c.paroles || 0) >= 25 },
  { id: 'etoile-du-cercle', ok: (c) => (c.paroles || 0) >= 150 && (c.votes || 0) >= 30 },
  { id: 'plume-du-feu',     ok: (c) => (c.billets || 0) >= 10 },
  { id: 'coeur-genereux',   ok: (c) => (c.votes || 0) >= 50 },
  { id: 'oreille-fidele',   ok: (c) => (c.ecoutes || 0) >= 20 },
  { id: 'fidele-au-poste',  ok: (c) => (c.jours || 0) >= 30 },
];

async function compter(uid: string, champ: keyof Compteurs): Promise<void> {
  if (!uid) return;
  const db = getFirestore();
  const ref = db.doc(`badges/${uid}`);
  await ref.set({ compteurs: { [champ]: FieldValue.increment(1) } }, { merge: true });
  const snap = await ref.get();
  const data = (snap.data() || {}) as { compteurs?: Compteurs; obtenus?: Record<string, unknown> };
  const nouveaux: Record<string, FieldValue> = {};
  for (const s of SEUILS) {
    if (!data.obtenus?.[s.id] && s.ok(data.compteurs || {})) nouveaux[s.id] = FieldValue.serverTimestamp();
  }
  if (Object.keys(nouveaux).length) {
    await ref.set({ obtenus: nouveaux }, { merge: true });
    console.log(`[interactions] ${Object.keys(nouveaux).join(', ')} -> ${uid}`);
  }
}

// Un message dans le clavardage d'un direct = une parole.
export const interactionMessageDirect = onDocumentCreated(
  { document: 'directs/{directId}/messages/{mid}', region: 'us-central1' },
  async (event) => { const d = event.data?.data() as { uid?: string } | undefined; if (d?.uid) await compter(d.uid, 'paroles'); },
);

// Un billet sur le fil = un billet; un commentaire = une parole.
export const interactionBillet = onDocumentCreated(
  { document: 'mur/{postId}', region: 'us-central1' },
  async (event) => { const d = event.data?.data() as { uid?: string } | undefined; if (d?.uid) await compter(d.uid, 'billets'); },
);
export const interactionCommentaire = onDocumentCreated(
  { document: 'mur/{postId}/commentaires/{cid}', region: 'us-central1' },
  async (event) => { const d = event.data?.data() as { uid?: string } | undefined; if (d?.uid) await compter(d.uid, 'paroles'); },
);

// Un vote donné à un billet ou à un commentaire = un cœur généreux.
export const interactionVoteBillet = onDocumentCreated(
  { document: 'mur/{postId}/votes/{voterUid}', region: 'us-central1' },
  async (event) => { await compter(event.params.voterUid, 'votes'); },
);
export const interactionVoteCommentaire = onDocumentCreated(
  { document: 'mur/{postId}/commentaires/{cid}/votes/{voterUid}', region: 'us-central1' },
  async (event) => { await compter(event.params.voterUid, 'votes'); },
);

// Les événements de niskas disent le reste : une écoute complète
// (rediffusion, vidéo, podcast crédités à 80 %), une question posée en direct,
// une journée de retour (la roue quotidienne).
export const interactionPoints = onDocumentCreated(
  { document: 'pointsEvents/{id}', region: 'us-central1' },
  async (event) => {
    const d = event.data?.data() as { uid?: string; kind?: string } | undefined;
    if (!d?.uid || !d.kind) return;
    if (d.kind === 'rediffusion' || d.kind === 'video' || d.kind === 'podcast') await compter(d.uid, 'ecoutes');
    else if (d.kind === 'question') await compter(d.uid, 'paroles');
    else if (d.kind === 'quotidien') await compter(d.uid, 'jours');
  },
);
