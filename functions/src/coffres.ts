import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { crediterNiskas, recalculerSolde, MUSIQUE_ORIGINE_ID } from './niskas';

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
export const PRIX_COFFRES: Record<TypeCoffre, { boite: number; nom: string }> = {
  bronze: { boite: 60, nom: 'Coffre de bronze' },
  argent: { boite: 160, nom: 'Coffre d’argent' },
  or:     { boite: 420, nom: 'Coffre d’or' },
};
// La clé est unique (Alex, 6 septembre 2026) : un seul prix, elle ouvre
// n'importe quel coffre. Le stock se compte à plat (`coffres/{uid}.cles`),
// plus par couleur.
export const PRIX_CLE = 10;

// ─── Le contenu d'un coffre (Alex, 6 septembre 2026, soirée) ─────────────────
// Chaque coffre donne plusieurs choses à la fois, tirées indépendamment :
//  1. toujours un cosmétique (skin ou bannière). Une part de ces tirages tombe
//     sur un skin légendaire (Vata, Pitta, Kapha) : 50 % au bronze, 65 % à
//     l'argent, 80 % à l'or; le reste va aux skins rares du coffre, puis aux
//     communs. Quand tout est déjà possédé, des niskas à la place;
//  2. toujours la musique d'Origine; si elle est déjà à vous, dix niskas de bonus;
//  3. des niskas (parfois plus que le coffre a coûté, quelles que soient les chances);
//  4. des rabais de la boutique, chacun à sa propre chance (bronze : 10 % à 1
//     sur 50, 20 % à 1 sur 100, 50 % à 1 sur 500; plus prononcé à l'argent et à l'or);
//  5. le grand lot, le Foyer d'Origine offert : 1 sur 89 au coffre d'or.
// Les nombres ci-dessous sont recopiés mot pour mot dans src/lib/coffresConfig.ts.
export interface Chance { unSur: number; nom: string }
export interface Contenu {
  legendaire: number;                       // pour cent des cosmétiques qui sont un skin légendaire
  rares: string[];                          // les skins rares propres à ce coffre
  niskas: Array<{ montant: number; poids: number }>; // toujours un montant, poids en pour cent (total 100)
  rabais: Array<Chance & { rewardId: string }>;
  grandLot: Chance | null;
}
export const CONTENUS: Record<TypeCoffre, Contenu> = {
  bronze: {
    legendaire: 50, rares: [],
    niskas: [{ montant: 10, poids: 55 }, { montant: 25, poids: 30 }, { montant: 60, poids: 12 }, { montant: 120, poids: 3 }],
    rabais: [
      { rewardId: 'reb-10-boutique', unSur: 50, nom: '10 % sur la boutique' },
      { rewardId: 'reb-20-boutique', unSur: 100, nom: '20 % sur la boutique' },
      { rewardId: 'reb-50-boutique', unSur: 500, nom: '50 % sur la boutique' },
    ],
    grandLot: null,
  },
  argent: {
    legendaire: 65, rares: ['skin-lotus', 'skin-feminite', 'skin-nature'],
    niskas: [{ montant: 30, poids: 50 }, { montant: 70, poids: 30 }, { montant: 150, poids: 15 }, { montant: 300, poids: 5 }],
    rabais: [
      { rewardId: 'reb-10-boutique', unSur: 20, nom: '10 % sur la boutique' },
      { rewardId: 'reb-20-boutique', unSur: 40, nom: '20 % sur la boutique' },
      { rewardId: 'reb-50-boutique', unSur: 200, nom: '50 % sur la boutique' },
      { rewardId: 'reb-huiles', unSur: 25, nom: '15 % sur les Huiles Corporelles' },
    ],
    grandLot: { unSur: 400, nom: 'Le Foyer d’Origine, offert' },
  },
  or: {
    legendaire: 80, rares: ['skin-aurore', 'skin-or-pur'],
    niskas: [{ montant: 80, poids: 45 }, { montant: 180, poids: 30 }, { montant: 400, poids: 18 }, { montant: 800, poids: 7 }],
    rabais: [
      { rewardId: 'reb-10-boutique', unSur: 8, nom: '10 % sur la boutique' },
      { rewardId: 'reb-20-boutique', unSur: 15, nom: '20 % sur la boutique' },
      { rewardId: 'reb-50-boutique', unSur: 60, nom: '50 % sur la boutique' },
      { rewardId: 'reb-formation', unSur: 12, nom: '50 $ sur une formation' },
    ],
    grandLot: { unSur: 89, nom: 'Le Foyer d’Origine, offert' },
  },
};
const LEGENDAIRES = ['skin-vata', 'skin-pitta', 'skin-kapha'];
const COMMUNS = ['skin-medzo', 'skin-nuit', 'skin-coffee', 'skin-aube', 'skin-terre', 'skin-foret', 'skin-ocean', 'skin-encre', 'banniere-nature', 'banniere-iris', 'banniere-pivoine', 'banniere-huiles', 'banniere-jardin', 'banniere-soir'];
const NISKAS_MUSIQUE_DEJA = 10;

// La valeur d'un cosmétique déjà possédé, pour le convertir en niskas (× 1,05,
// arrondi au niska supérieur). Les communs et bannières reprennent leur coût
// exact de la petite boutique (COSMETIQUES, functions/src/niskas.ts); les
// skins légendaires et rares, exclusifs aux coffres, n'ont pas de prix boutique
// — valeur publiée ici, choisie par palier de rareté.
const VALEUR_COSMETIQUE: Record<string, number> = {
  'skin-medzo': 5, 'skin-nuit': 5, 'skin-coffee': 5, 'skin-aube': 15, 'skin-terre': 20, 'skin-foret': 25, 'skin-ocean': 35, 'skin-encre': 55,
  'banniere-nature': 5, 'banniere-iris': 8, 'banniere-pivoine': 12, 'banniere-huiles': 12, 'banniere-jardin': 15, 'banniere-soir': 18,
  'skin-vata': 75, 'skin-pitta': 75, 'skin-kapha': 75,
  'skin-lotus': 100, 'skin-feminite': 100, 'skin-nature': 100,
  'skin-aurore': 180, 'skin-or-pur': 180,
};
const NOMS_COSMETIQUES: Record<string, string> = {
  'skin-medzo': 'Skin Medzo Café', 'skin-nuit': 'Skin Nuit', 'skin-coffee': 'Skin Dark Coffee', 'banniere-nature': 'Bannière Nature & Ayurveda',
  'skin-aube': 'Skin Aube rose', 'skin-terre': 'Skin Terre cuite', 'skin-foret': 'Skin Forêt', 'skin-ocean': 'Skin Océan', 'skin-encre': 'Skin Encre & or',
  'skin-lotus': 'Skin Lotus', 'skin-feminite': 'Skin Féminité & Ayurveda', 'skin-nature': 'Skin Nature & Ayurveda', 'skin-aurore': 'Skin Aurore', 'skin-or-pur': 'Skin Or pur',
  'banniere-iris': 'Bannière L’iris du matin', 'banniere-pivoine': 'Bannière La pivoine', 'banniere-huiles': 'Bannière Les huiles', 'banniere-jardin': 'Bannière Le jardin après la pluie', 'banniere-soir': 'Bannière Le soir à la lampe',
};
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

/** Un tirage pondéré : `de` va de 0 à 99 (crypto), la table cumule des pour cent. */
export function tirerPondere<T extends { poids: number }>(table: T[], de = randomInt(0, 100)): T {
  let cumul = 0;
  for (const lot of table) { cumul += lot.poids; if (de < cumul) return lot; }
  return table[table.length - 1];
}
/** « une chance sur n » : vrai quand le dé (0 à n-1) tombe sur zéro. */
export const uneChanceSur = (n: number, de = randomInt(0, Math.max(1, n))): boolean => de === 0;

/** Auto-test : chaque table de niskas fait cent et les tirages suivent la table. */
export function verifierTables(): void {
  for (const t of Object.keys(CONTENUS) as TypeCoffre[]) {
    const somme = CONTENUS[t].niskas.reduce((a, l) => a + l.poids, 0);
    if (somme !== 100) throw new Error(`La table des niskas du coffre ${t} fait ${somme}, pas 100.`);
  }
  if (tirerPondere(CONTENUS.or.niskas, 0).montant !== 80 || tirerPondere(CONTENUS.or.niskas, 99).montant !== 800) throw new Error('Le tirage ne suit pas la table.');
  if (!uneChanceSur(89, 0) || uneChanceSur(89, 1)) throw new Error('uneChanceSur ne suit pas le dé.');
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
  const type = req.data?.type; const quoi = req.data?.quoi as 'boite' | 'cle';
  if ((quoi !== 'boite' && quoi !== 'cle') || (quoi === 'boite' && !estType(type))) throw new HttpsError('invalid-argument', 'Coffre inconnu.');
  // Le garde ci-dessus assure que `type` est un TypeCoffre valide quand quoi==='boite'.
  const cout = quoi === 'boite' ? PRIX_COFFRES[type as TypeCoffre].boite : PRIX_CLE;
  const nom = quoi === 'boite' ? PRIX_COFFRES[type as TypeCoffre].nom : 'Clé';
  const db = getFirestore();
  const balRef = db.doc(`memberPoints/${uid}`);
  const cle = `coffre:${quoi}:${quoi === 'boite' ? type : 'unique'}:${uid}:${Date.now()}`;
  await db.runTransaction(async (tx) => {
    const bal = await tx.get(balRef);
    const solde = Number((bal.data() as { balance?: number } | undefined)?.balance || 0);
    if (solde < cout) throw new HttpsError('failed-precondition', `Il vous manque ${cout - solde} niska${cout - solde > 1 ? 's' : ''}.`);
    tx.set(db.doc(`pointsEvents/${cle}`), { uid, kind: 'coffre', amount: -cout, dedupKey: cle, meta: { type: type || null, quoi, nom }, at: FieldValue.serverTimestamp() });
    tx.set(balRef, { balance: FieldValue.increment(-cout), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    // La clé est plate (un seul compteur, elle ouvre n'importe quel coffre);
    // le coffre reste par couleur.
    tx.set(db.doc(`coffres/${uid}`), quoi === 'boite' ? { boites: { [type]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() } : { cles: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
  const dejaAujourdhui = await db.collection('coffresOuvertures').where('uid', '==', uid).where('jour', '==', aujourdhui).count().get();
  if (dejaAujourdhui.data().count >= OUVERTURES_PAR_JOUR) throw new HttpsError('resource-exhausted', `Cinq coffres par jour, c’est le maximum. À demain.`);

  const contenu = CONTENUS[type];
  const ouverture = db.collection('coffresOuvertures').doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = (snap.data() || {}) as { boites?: Record<string, number>; cles?: number };
    if ((d.boites?.[type] || 0) < 1) throw new HttpsError('failed-precondition', 'Vous n’avez pas ce coffre.');
    if ((d.cles || 0) < 1) throw new HttpsError('failed-precondition', 'Achetez une clé : la même ouvre n’importe quel coffre.');
    tx.set(ref, { boites: { [type]: FieldValue.increment(-1) }, cles: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(ouverture, { uid, type, jour: aujourdhui, at: FieldValue.serverTimestamp() });
  });

  const lots: Array<Record<string, unknown>> = [];
  let niskasGagnes = 0;

  // 1. Le cosmétique, toujours. Légendaire selon la part du coffre, puis rare,
  //    puis commun. Un tirage qui tombe sur un article déjà possédé se change
  //    en niskas : la valeur de cet article, majorée de 5 % (Alex, 6 septembre
  //    2026 : « un lot déjà à vous devient sa valeur en niskas, plus 5 % »).
  const b = await db.doc(`boutique/${uid}`).get();
  const possede = ((b.data() || {}) as { possede?: Record<string, unknown> }).possede || {};
  let bassin: string[]; let rarete: 'legendaire' | 'rare' | 'commun';
  if (randomInt(0, 100) < contenu.legendaire) { bassin = LEGENDAIRES; rarete = 'legendaire'; }
  else if (contenu.rares.length) { bassin = contenu.rares; rarete = 'rare'; }
  else { bassin = COMMUNS; rarete = 'commun'; }
  const article = bassin[randomInt(0, bassin.length)];
  if (!possede[article]) {
    await db.doc(`boutique/${uid}`).set({ possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true });
    lots.push({ genre: 'cosmetique', rarete, article, nom: NOMS_COSMETIQUES[article] || article });
  } else {
    const montant = Math.ceil((VALEUR_COSMETIQUE[article] || 5) * 1.05);
    niskasGagnes += montant;
    lots.push({ genre: 'niskas', montant, article, nom: `${montant} niskas`, note: `Vous aviez déjà ${NOMS_COSMETIQUES[article] || article}.` });
  }

  // 2. La musique d'Origine, toujours; dix niskas si elle est déjà à vous.
  const musique = await db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`).get();
  if (musique.exists || possede['musique-origine']) {
    niskasGagnes += NISKAS_MUSIQUE_DEJA;
    lots.push({ genre: 'niskas', montant: NISKAS_MUSIQUE_DEJA, nom: `${NISKAS_MUSIQUE_DEJA} niskas`, note: 'La musique d’Origine est déjà à vous.' });
  } else {
    const f = (await db.doc(`formations/${MUSIQUE_ORIGINE_ID}`).get()).data() as { titre?: string; imageUrl?: string } | undefined;
    await db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`).set({ titre: f?.titre || 'Expérience Origine · La musique', imageUrl: f?.imageUrl || '', categorie: 'musique', source: 'coffre', accordeLe: FieldValue.serverTimestamp() }, { merge: true });
    await db.doc(`boutique/${uid}`).set({ possede: { 'musique-origine': FieldValue.serverTimestamp() } }, { merge: true });
    lots.push({ genre: 'musique', nom: 'La musique d’Origine' });
  }

  // 3. Les niskas du coffre.
  const n = tirerPondere(contenu.niskas);
  niskasGagnes += n.montant;
  lots.push({ genre: 'niskas', montant: n.montant, nom: `${n.montant} niskas` });

  // 4. Les rabais, chacun à sa chance.
  for (const r of contenu.rabais) {
    if (uneChanceSur(r.unSur)) {
      await db.collection('rewardRedemptions').add({ uid, email: req.auth.token.email || null, rewardId: r.rewardId, rewardLabel: `${r.nom} (coffre ${type})`, cost: 0, status: 'pending', source: 'coffre', createdAt: FieldValue.serverTimestamp() });
      lots.push({ genre: 'recompense', rewardId: r.rewardId, nom: r.nom });
    }
  }

  // 5. Le grand lot, qui se réclame avec la question d'habileté.
  if (contenu.grandLot && uneChanceSur(contenu.grandLot.unSur)) {
    const a = randomInt(11, 40), bb = randomInt(2, 9), c = randomInt(3, 12), dd = randomInt(2, 6);
    await ouverture.set({ grandLot: { enAttente: true, a, b: bb, c, d: dd, reponse: (a * bb + c) - dd } }, { merge: true });
    lots.push({ genre: 'grand', nom: contenu.grandLot.nom, ouvertureId: ouverture.id, question: `(${a} × ${bb} + ${c}) − ${dd}` });
  }

  await crediterNiskas(uid, 'coffre-gain', niskasGagnes, `coffre-gain:${ouverture.id}`, { type, lots: lots.map((l) => l.nom) });
  const { balance } = await recalculerSolde(uid);
  await ouverture.set({ lots: lots.map((l) => ({ genre: l.genre, nom: l.nom })), niskas: niskasGagnes }, { merge: true });
  console.log(`[coffres] ${uid} ouvre ${type} : ${lots.map((l) => l.nom).join(', ')}`);
  return { ouvertureId: ouverture.id, type, lots, solde: balance };
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
  await db.doc(`coffres/${uid}`).set({ boites: { [type]: FieldValue.increment(1) }, ...(avecCle ? { cles: FieldValue.increment(1) } : {}), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
    tx.set(db.doc(`coffres/${uid}`), { boites: { bronze: FieldValue.increment(1) }, cles: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
