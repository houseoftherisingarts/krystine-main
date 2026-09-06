import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { crediterNiskas, recalculerSolde } from './niskas';

// ─── Les coffres ─────────────────────────────────────────────────────────────
// Trois coffres (bronze, argent, or) et leurs clés. Un coffre s'achète en
// niskas, se reçoit de Krystine ou se gagne (jour 7 de la roue). La clé
// s'achète en niskas. Ouvrir un coffre consomme un coffre et une clé et
// donne toujours quelque chose; les chances de chaque lot sont publiées mot
// pour mot dans l'espace client (src/lib/coffresConfig.ts est le miroir de
// la table ci-dessous : ne changer l'une sans l'autre).
//
// Honnêteté avant tout (Alex, 6 septembre 2026) : tirage au sort côté
// serveur (crypto), table des chances affichée avant l'achat, pas de
// « presque gagné », au plus cinq ouvertures par jour et par membre, et le
// grand lot (le Foyer d'Origine offert, 497 $) se réclame après une question
// d'habileté, comme tout concours canadien où le hasard entre en jeu
// (Code criminel, art. 206; Loi sur la concurrence, art. 74.06).

export type TypeCoffre = 'bronze' | 'argent' | 'or';
export const PRIX_COFFRES: Record<TypeCoffre, { boite: number; cle: number; nom: string }> = {
  bronze: { boite: 60, cle: 10, nom: 'Coffre de bronze' },
  argent: { boite: 160, cle: 20, nom: 'Coffre d’argent' },
  or:     { boite: 420, cle: 30, nom: 'Coffre d’or' },
};

export type Lot =
  | { genre: 'niskas'; montant: number; poids: number; nom: string }
  | { genre: 'cosmetique'; poids: number; nom: string }                 // un skin ou une bannière qu'on n'a pas encore (sinon 30 niskas)
  | { genre: 'recompense'; rewardId: string; poids: number; nom: string } // un rabais de la boutique, honoré par Krystine comme une récompense
  | { genre: 'grand'; poids: number; nom: string };                      // le Foyer d'Origine, offert

// Les poids sont des pour cent : chaque table fait cent.
export const TABLES: Record<TypeCoffre, Lot[]> = {
  bronze: [
    { genre: 'niskas', montant: 20, poids: 50, nom: '20 niskas' },
    { genre: 'niskas', montant: 40, poids: 30, nom: '40 niskas' },
    { genre: 'cosmetique', poids: 12, nom: 'Un skin ou une bannière' },
    { genre: 'niskas', montant: 100, poids: 7, nom: '100 niskas' },
    { genre: 'recompense', rewardId: 'reb-10-boutique', poids: 1, nom: '10 % sur la boutique' },
  ],
  argent: [
    { genre: 'niskas', montant: 60, poids: 45, nom: '60 niskas' },
    { genre: 'niskas', montant: 120, poids: 30, nom: '120 niskas' },
    { genre: 'recompense', rewardId: 'reb-huiles', poids: 15, nom: '15 % sur les Huiles Corporelles' },
    { genre: 'niskas', montant: 300, poids: 9, nom: '300 niskas' },
    { genre: 'recompense', rewardId: 'reb-10-boutique', poids: 1, nom: '10 % sur la boutique' },
  ],
  or: [
    { genre: 'niskas', montant: 150, poids: 40, nom: '150 niskas' },
    { genre: 'niskas', montant: 300, poids: 30, nom: '300 niskas' },
    { genre: 'recompense', rewardId: 'reb-formation', poids: 18, nom: '50 $ sur une formation' },
    { genre: 'niskas', montant: 750, poids: 10, nom: '750 niskas' },
    { genre: 'grand', poids: 2, nom: 'Le Foyer d’Origine, offert' },
  ],
};

const COSMETIQUES = ['skin-medzo', 'skin-nuit', 'skin-coffee', 'banniere-nature'];
const NOMS_COSMETIQUES: Record<string, string> = { 'skin-medzo': 'Skin Medzo Café', 'skin-nuit': 'Skin Nuit', 'skin-coffee': 'Skin Dark Coffee', 'banniere-nature': 'Bannière Nature & Ayurveda' };
const OUVERTURES_PAR_JOUR = 5;
const FOYER_ID = 'foyer';
const FUSEAU = 'America/Toronto';
const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca', 'krystine@inspiratanature.com', 'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com', 'houseoftherisingarts@gmail.com', 'krystinestterredhysope@gmail.com',
];

const estType = (t: unknown): t is TypeCoffre => t === 'bronze' || t === 'argent' || t === 'or';
const journee = (ms = Date.now()) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
};
const threadId = (a: string, b: string) => [a, b].sort().join('__');

/** Le tirage : un entier de 0 à 99 (crypto), puis la table cumulée. */
export function tirer(table: Lot[], de = randomInt(0, 100)): Lot {
  let cumul = 0;
  for (const lot of table) { cumul += lot.poids; if (de < cumul) return lot; }
  return table[table.length - 1];
}

/** Auto-test : chaque table fait cent, et le tirage tombe sur le bon lot. */
export function verifierTables(): void {
  for (const t of Object.keys(TABLES) as TypeCoffre[]) {
    const somme = TABLES[t].reduce((s, l) => s + l.poids, 0);
    if (somme !== 100) throw new Error(`La table ${t} fait ${somme}, pas 100.`);
  }
  if (tirer(TABLES.or, 0).nom !== '150 niskas' || tirer(TABLES.or, 99).genre !== 'grand') throw new Error('Le tirage ne suit pas la table.');
}

async function ecrireMessageKrystine(db: FirebaseFirestore.Firestore, deUid: string, uid: string, corps: string, extra: Record<string, unknown> = {}) {
  const [membre, admin] = await Promise.all([db.doc(`members/${uid}`).get(), db.doc(`members/${deUid}`).get()]);
  const m = (membre.data() || {}) as { displayName?: string; photoURL?: string };
  const a = (admin.data() || {}) as { photoURL?: string };
  const id = threadId(deUid, uid);
  const photos: Record<string, string> = {};
  if (a.photoURL) photos[deUid] = a.photoURL;
  if (m.photoURL) photos[uid] = m.photoURL;
  await db.doc(`dms/${id}`).set({
    participantUids: [deUid, uid].sort(),
    participantNames: { [deUid]: 'Krystine', [uid]: m.displayName || 'Membre' },
    ...(Object.keys(photos).length ? { participantPhotos: photos } : {}),
    lastMessage: corps.slice(0, 140), lastMessageAt: FieldValue.serverTimestamp(), lastSenderUid: deUid,
    unread: { [uid]: FieldValue.increment(1) },
  }, { merge: true });
  await db.collection(`dms/${id}/messages`).add({ senderUid: deUid, senderName: 'Krystine', body: corps, ...extra, createdAt: FieldValue.serverTimestamp() });
}

// ─── Acheter un coffre ou une clé, en niskas ─────────────────────────────────
export const acheterCoffre = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
  const uid = req.auth.uid;
  const type = req.data?.type; const quoi = req.data?.quoi;
  if (!estType(type) || (quoi !== 'boite' && quoi !== 'cle')) throw new HttpsError('invalid-argument', 'Coffre inconnu.');
  const cout = PRIX_COFFRES[type][quoi];
  const nom = quoi === 'boite' ? PRIX_COFFRES[type].nom : `Clé ${type === 'or' ? 'd’or' : type === 'argent' ? 'd’argent' : 'de bronze'}`;
  const db = getFirestore();
  const balRef = db.doc(`memberPoints/${uid}`);
  const cle = `coffre:${quoi}:${type}:${uid}:${Date.now()}`;
  await db.runTransaction(async (tx) => {
    const bal = await tx.get(balRef);
    const solde = Number((bal.data() as { balance?: number } | undefined)?.balance || 0);
    if (solde < cout) throw new HttpsError('failed-precondition', `Il vous manque ${cout - solde} niska${cout - solde > 1 ? 's' : ''}.`);
    tx.set(db.doc(`pointsEvents/${cle}`), { uid, kind: 'coffre', amount: -cout, dedupKey: cle, meta: { type, quoi, nom }, at: FieldValue.serverTimestamp() });
    tx.set(balRef, { balance: FieldValue.increment(-cout), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(db.doc(`coffres/${uid}`), { [quoi === 'boite' ? 'boites' : 'cles']: { [type]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  const { balance } = await recalculerSolde(uid);
  return { solde: balance, nom };
});

// ─── Ouvrir un coffre ────────────────────────────────────────────────────────
export const ouvrirCoffre = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour ouvrir un coffre.');
  const uid = req.auth.uid;
  const type = req.data?.type;
  if (!estType(type)) throw new HttpsError('invalid-argument', 'Coffre inconnu.');
  const db = getFirestore();
  const ref = db.doc(`coffres/${uid}`);
  const aujourdhui = journee();

  // Au plus cinq ouvertures par jour : le jeu reste un jeu.
  const jour = await db.collection('coffresOuvertures').where('uid', '==', uid).where('jour', '==', aujourdhui).count().get();
  if (jour.data().count >= OUVERTURES_PAR_JOUR) throw new HttpsError('resource-exhausted', `Cinq coffres par jour, c’est le maximum. À demain.`);

  const lot = tirer(TABLES[type]);
  const ouverture = db.collection('coffresOuvertures').doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = (snap.data() || {}) as { boites?: Record<string, number>; cles?: Record<string, number> };
    if ((d.boites?.[type] || 0) < 1) throw new HttpsError('failed-precondition', 'Vous n’avez pas ce coffre.');
    if ((d.cles?.[type] || 0) < 1) throw new HttpsError('failed-precondition', 'Il vous manque la clé de ce coffre.');
    tx.set(ref, { boites: { [type]: FieldValue.increment(-1) }, cles: { [type]: FieldValue.increment(-1) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(ouverture, { uid, type, jour, lot: { genre: lot.genre, nom: lot.nom }, at: FieldValue.serverTimestamp() });
  });

  // Le lot, pour vrai.
  let resultat: Record<string, unknown> = { genre: lot.genre, nom: lot.nom };
  if (lot.genre === 'niskas') {
    await crediterNiskas(uid, 'coffre-gain', lot.montant, `coffre-gain:${ouverture.id}`, { type, nom: lot.nom });
    const { balance } = await recalculerSolde(uid);
    resultat = { ...resultat, montant: lot.montant, solde: balance };
  } else if (lot.genre === 'cosmetique') {
    const b = await db.doc(`boutique/${uid}`).get();
    const possede = ((b.data() || {}) as { possede?: Record<string, unknown> }).possede || {};
    const libres = COSMETIQUES.filter((c) => !possede[c]);
    if (libres.length === 0) {
      await crediterNiskas(uid, 'coffre-gain', 30, `coffre-gain:${ouverture.id}`, { type, nom: '30 niskas (tous les skins sont déjà à vous)' });
      const { balance } = await recalculerSolde(uid);
      resultat = { genre: 'niskas', nom: '30 niskas', montant: 30, solde: balance, note: 'Tous les skins et bannières sont déjà à vous : trente niskas à la place.' };
    } else {
      const article = libres[randomInt(0, libres.length)];
      await db.doc(`boutique/${uid}`).set({ possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true });
      resultat = { genre: 'cosmetique', nom: NOMS_COSMETIQUES[article], article };
    }
    await ouverture.set({ lot: { genre: resultat.genre, nom: resultat.nom } }, { merge: true });
  } else if (lot.genre === 'recompense') {
    // Comme une récompense échangée, mais sans coût : Krystine l'honore depuis
    // l'admin (onglet Récompenses en attente) avec un code de la boutique.
    const email = req.auth.token.email || null;
    await db.collection('rewardRedemptions').add({ uid, email, rewardId: lot.rewardId, rewardLabel: `${lot.nom} (coffre ${type})`, cost: 0, status: 'pending', source: 'coffre', createdAt: FieldValue.serverTimestamp() });
  } else if (lot.genre === 'grand') {
    // Le grand lot se réclame avec la question d'habileté : le cadeau n'existe
    // qu'après la bonne réponse (reclamerGrandLot).
    const a = randomInt(11, 40), b = randomInt(2, 9), c = randomInt(3, 12), d = randomInt(2, 6);
    await ouverture.set({ grandLot: { enAttente: true, a, b, c, d, reponse: (a * b + c) - d } }, { merge: true });
    resultat = { ...resultat, ouvertureId: ouverture.id, question: `(${a} × ${b} + ${c}) − ${d}` };
  }
  console.log(`[coffres] ${uid} ouvre ${type} : ${lot.nom}`);
  return { ouvertureId: ouverture.id, type, lot: resultat };
});

// ─── Le grand lot : la question d'habileté, puis le Foyer offert ─────────────
export const reclamerGrandLot = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous.');
  const uid = req.auth.uid;
  const ouvertureId = String(req.data?.ouvertureId || '');
  const reponse = Math.round(Number(req.data?.reponse));
  const db = getFirestore();
  const ref = db.doc(`coffresOuvertures/${ouvertureId}`);
  const snap = await ref.get();
  const o = snap.data() as { uid: string; grandLot?: { enAttente: boolean; reponse: number; essais?: number } } | undefined;
  if (!o || o.uid !== uid || !o.grandLot) throw new HttpsError('not-found', 'Aucun grand lot à réclamer ici.');
  if (!o.grandLot.enAttente) throw new HttpsError('failed-precondition', 'Ce lot a déjà été réclamé.');
  if ((o.grandLot.essais || 0) >= 3) throw new HttpsError('failed-precondition', 'Trois essais, c’est le maximum. Écrivez à l’équipe.');
  if (reponse !== o.grandLot.reponse) {
    await ref.set({ grandLot: { essais: FieldValue.increment(1) } }, { merge: true });
    return { bon: false, essais: (o.grandLot.essais || 0) + 1 };
  }
  const f = (await db.doc(`formations/${FOYER_ID}`).get()).data() as { titre?: string; imageUrl?: string; prix?: number | string } | undefined;
  const cadeau = await db.collection('cadeaux').add({
    uid, formationId: FOYER_ID, formationTitre: f?.titre || 'Le Foyer d’Origine', formationImage: f?.imageUrl || '',
    prix: Number(f?.prix || 0), pourcent: 100, message: 'Le coffre d’or vous a ouvert la porte du Foyer.', deUid: 'coffre', deNom: 'Krystine',
    statut: 'offert', source: 'coffre', ouvertureId, creeLe: FieldValue.serverTimestamp(),
  });
  await ref.set({ grandLot: { enAttente: false, reclameLe: FieldValue.serverTimestamp(), cadeauId: cadeau.id } }, { merge: true });
  // Le mot de Krystine dans la messagerie, avec le cadeau à cliquer.
  const admin = await db.collection('members').where('email', '==', 'krystine@inspiratanature.com').limit(1).get();
  const deUid = admin.docs[0]?.id || 'coffre';
  if (admin.docs[0]) {
    await ecrireMessageKrystine(db, deUid, uid,
      `🎁 Le coffre d’or vous a réservé le grand lot : « ${f?.titre || 'Le Foyer d’Origine'} », offert. Le cadeau vous attend ici, un clic et il est à vous.`,
      { cadeauId: cadeau.id });
  }
  return { bon: true, cadeauId: cadeau.id };
});

// ─── Admin : offrir un coffre (et sa clé) à une membre ───────────────────────
export const offrirCoffre = onCall({ region: 'us-central1' }, async (req) => {
  const email = String(req.auth?.token?.email || '').toLowerCase();
  if (!req.auth || !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Réservé à l’admin.');
  const uid = String(req.data?.uid || ''); const type = req.data?.type;
  const avecCle = req.data?.avecCle !== false;
  const message = String(req.data?.message || '').slice(0, 600).trim();
  if (!uid || !estType(type)) throw new HttpsError('invalid-argument', 'Membre et coffre requis.');
  const db = getFirestore();
  if (!(await db.doc(`members/${uid}`).get()).exists) throw new HttpsError('not-found', 'Cette membre n’existe pas.');
  await db.doc(`coffres/${uid}`).set({ boites: { [type]: FieldValue.increment(1) }, ...(avecCle ? { cles: { [type]: FieldValue.increment(1) } } : {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('coffresDons').add({ uid, type, avecCle, deUid: req.auth.uid, at: FieldValue.serverTimestamp() });
  const corps = `${message ? message + '\n\n' : ''}🎁 Je vous offre un ${PRIX_COFFRES[type].nom.toLowerCase()}${avecCle ? ' et sa clé' : ''}. Il vous attend dans la petite boutique de votre espace, section « Les coffres ».`;
  await ecrireMessageKrystine(db, req.auth.uid, uid, corps);
  return { ok: true };
});

/** Jour 7 de la roue : un coffre de bronze et sa clé (appelé par reclamerQuotidien). */
export async function donnerCoffreDuJour7(uid: string, jour: string): Promise<void> {
  const db = getFirestore();
  const don = db.doc(`coffresDons/roue:${uid}:${jour}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(don)).exists) return;
    tx.set(don, { uid, type: 'bronze', avecCle: true, deUid: 'roue', jour, at: FieldValue.serverTimestamp() });
    tx.set(db.doc(`coffres/${uid}`), { boites: { bronze: FieldValue.increment(1) }, cles: { bronze: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
