import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, AggregateField, Firestore, Transaction } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { donnerCoffreDuJour7, ecrireMessageKrystine, uidKrystine, SKINS_RARES_COFFRES, NOMS_COSMETIQUES } from './coffres';
import {
  FOYER_MULTIPLICATEUR, FOYER_NISKAS_HEBDO_SI_MUSIQUE, KIND_FOYER_HEBDO, KIND_FOYER_MOIS, RABAIS_HUILE_FOYER,
  cleFoyerHebdo, cleFoyerMois, estJourHebdoFoyer, estJourMoisFoyer, cadeauFoyerDuMois,
} from './badgeBleuConfig';

// Les niskas : la monnaie de l'espace client (le niska du Rig-Véda : l'ornement d'or
// porté au cou qui servait déjà à compter la richesse, puis pièce d'or). Le solde vit dans
// `memberPoints/{uid}` avec le journal `pointsEvents/{cle}`, comme les points
// d'avant : seul le nom change. Ce module tient ce qui doit rester côté
// serveur : les achats de la petite boutique (jamais un débit depuis le
// navigateur) et les crédits que le navigateur ne doit pas pouvoir s'offrir.
//
// Catalogue jumeau : src/lib/pointsConfig.ts (BOUTIQUE, COUT_EPISODE).

export const SANTE_LA_VIE_ID = 'kajabi-2148754050';
export const MUSIQUE_ORIGINE_ID = 'kajabi-2149362766';

const COSMETIQUES: Record<string, { cout: number; nom: string }> = {
  'banniere-nature': { cout: 5, nom: 'Bannière Nature & Ayurveda' },
  'banniere-iris': { cout: 8, nom: 'Bannière L’iris du matin' },
  'banniere-pivoine': { cout: 12, nom: 'Bannière La pivoine' },
  'banniere-huiles': { cout: 12, nom: 'Bannière Les huiles' },
  'banniere-jardin': { cout: 15, nom: 'Bannière Le jardin après la pluie' },
  'banniere-soir': { cout: 18, nom: 'Bannière Le soir à la lampe' },
  // La signature de Krystine en bas à droite d'une bannière se retire contre
  // cinq niskas, une fois la bannière à soi (Alex, 6 septembre 2026). La
  // bannière d'origine (defaut) est à tout le monde.
  'sanslogo-defaut': { cout: 5, nom: 'Sans signature · Féminité & Ayurveda' },
  'sanslogo-nature': { cout: 5, nom: 'Sans signature · Nature & Ayurveda' },
  'sanslogo-iris': { cout: 5, nom: 'Sans signature · L’iris du matin' },
  'sanslogo-pivoine': { cout: 5, nom: 'Sans signature · La pivoine' },
  'sanslogo-huiles': { cout: 5, nom: 'Sans signature · Les huiles' },
  'sanslogo-jardin': { cout: 5, nom: 'Sans signature · Le jardin après la pluie' },
  'sanslogo-soir': { cout: 5, nom: 'Sans signature · Le soir à la lampe' },
  'musique-origine': { cout: 5, nom: "La musique d'Origine" },
  'skin-medzo': { cout: 5, nom: 'Skin Medzo Café' },
  'skin-nuit': { cout: 5, nom: 'Skin Nuit' },
  'skin-coffee': { cout: 5, nom: 'Skin Dark Coffee' },
  'skin-aube': { cout: 15, nom: 'Skin Aube rose' },
  'skin-terre': { cout: 20, nom: 'Skin Terre cuite' },
  'skin-foret': { cout: 25, nom: 'Skin Forêt' },
  'skin-ocean': { cout: 35, nom: 'Skin Océan' },
  'skin-encre': { cout: 55, nom: 'Skin Encre & or' },
  // Les skins rares (lotus, feminite, nature, aurore, or-pur) ne s'achètent pas : coffres.ts.
  // Toutes les vidéos de Krystine, débloquées d'un coup : les vidéos sont
  // gratuites, c'est l'ouverture de la section qui coûte dix niskas.
  'acces-videos': { cout: 30, nom: 'Les vidéos publiques de Krystine' },
};
const NISKAS_BIENVENUE = 20;
const COUT_EPISODE = 25;
const COUT_SAISON = 175;
const SAISONS: Record<string, string> = { '1': 'Module 1', '2': 'Module 2' };
const COUT_VIDEO = 10;
const CATALOGUE_VIDEOS = 'https://krystinestlaurent.ca/compte/videos-krystine.json';

/** Le titre d'une vidéo de la chaîne, ou null si elle n'est pas au catalogue. */
let cacheCatalogue: { lu: number; videos: Map<string, string> } | null = null;
async function titreVideo(id: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  if (!cacheCatalogue || Date.now() - cacheCatalogue.lu > 10 * 60 * 1000) {
    const r = await fetch(CATALOGUE_VIDEOS);
    if (!r.ok) throw new HttpsError('unavailable', 'Le catalogue des vidéos ne répond pas.');
    const d = (await r.json()) as { videos?: Array<{ id: string; titre: string }> };
    cacheCatalogue = { lu: Date.now(), videos: new Map((d.videos || []).map((v) => [v.id, v.titre])) };
  }
  return cacheCatalogue.videos.get(id) ?? null;
}
const ROUE_QUOTIDIENNE = [1, 1, 2, 2, 3, 3, 5];
const FUSEAU = 'America/Toronto';

/** La journée civile de Montréal, « AAAA-MM-JJ », jugée par l'horloge du serveur. */
function journee(ms = Date.now()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}
const veilleDe = (j: string): string => journee(new Date(`${j}T12:00:00-04:00`).getTime() - 86_400_000);

/** Le solde et le total gagné se recalculent depuis le journal (append-only) :
 *  après chaque opération serveur, le document redevient la somme exacte. */
export async function recalculerSolde(uid: string): Promise<{ balance: number; lifetime: number }> {
  const db = getFirestore();
  const evts = await db.collection('pointsEvents').where('uid', '==', uid).select('amount').get();
  let balance = 0; let lifetime = 0;
  for (const d of evts.docs) {
    const a = Number((d.data() as { amount?: number }).amount || 0);
    balance += a; if (a > 0) lifetime += a;
  }
  await db.doc(`memberPoints/${uid}`).set({ balance, lifetime, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { balance, lifetime };
}


/** Crédite des niskas une seule fois par clé (journal + solde), avec l'Admin SDK. */
export async function crediterNiskas(
  uid: string,
  kind: string,
  amount: number,
  cle: string,
  meta: Record<string, unknown> = {},
): Promise<boolean> {
  const db = getFirestore();
  const evt = db.doc(`pointsEvents/${cle}`);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(evt)).exists) return false;
    tx.set(evt, { uid, kind, amount, dedupKey: cle, meta, at: FieldValue.serverTimestamp() });
    tx.set(db.doc(`memberPoints/${uid}`), {
      balance: FieldValue.increment(amount),
      lifetime: FieldValue.increment(Math.max(0, amount)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

/** Le solde qu'on croit : le document, plafonné par la somme du journal
 *  (le journal ne se réécrit jamais, le document se corrige au besoin). */
async function soldeVerifie(uid: string, balanceDoc: number): Promise<number> {
  try {
    const agg = await getFirestore().collection('pointsEvents').where('uid', '==', uid)
      .aggregate({ total: AggregateField.sum('amount') }).get();
    const total = Number(agg.data().total || 0);
    return Math.min(balanceDoc, total);
  } catch (e) {
    console.warn('[niskas] somme du journal indisponible', e);
    return balanceDoc;
  }
}

export const acheterAvecNiskas = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
    const uid = req.auth.uid;
    const article = String(req.data?.article || '').slice(0, 60);
    const db = getFirestore();

    let cout: number;
    let nom: string;
    let leconId = '';
    let saison = '';
    if (COSMETIQUES[article]) {
      ({ cout, nom } = COSMETIQUES[article]);
      if (article.startsWith('sanslogo-') && article !== 'sanslogo-defaut') {
        const possede = ((await db.doc(`boutique/${uid}`).get()).data() as { possede?: Record<string, unknown> } | undefined)?.possede || {};
        if (!possede[`banniere-${article.slice('sanslogo-'.length)}`]) throw new HttpsError('failed-precondition', 'Cette bannière n\'est pas encore à vous.');
      }
    } else if (article.startsWith('video:')) {
      const t = await titreVideo(article.slice('video:'.length));
      if (!t) throw new HttpsError('not-found', 'Cette vidéo n\'est pas au catalogue.');
      cout = COUT_VIDEO;
      nom = t;
    } else if (article.startsWith('saison:')) {
      saison = article.slice('saison:'.length);
      if (!SAISONS[saison]) throw new HttpsError('not-found', 'Cette saison est introuvable.');
      cout = COUT_SAISON;
      nom = `Santé la vie · saison ${saison} complète`;
    } else if (article.startsWith('episode:')) {
      leconId = article.slice('episode:'.length);
      const lecon = await db.doc(`formations/${SANTE_LA_VIE_ID}/lecons/${leconId}`).get();
      if (!lecon.exists) throw new HttpsError('not-found', 'Cet épisode est introuvable.');
      cout = COUT_EPISODE;
      nom = String((lecon.data() as { titre?: string }).titre || `Épisode ${leconId}`);
    } else {
      throw new HttpsError('invalid-argument', 'Cet article n\'existe pas.');
    }

    const cle = `boutique:${article}:${uid}`;
    const evt = db.doc(`pointsEvents/${cle}`);
    const balRef = db.doc(`memberPoints/${uid}`);
    const balDoc = Number(((await balRef.get()).data() as { balance?: number } | undefined)?.balance || 0);
    const solde = await soldeVerifie(uid, balDoc);
    if (solde < cout) {
      throw new HttpsError('failed-precondition', `Il vous manque ${cout - solde} niska${cout - solde > 1 ? 's' : ''}.`);
    }

    const [emission, formation] = (leconId || saison)
      ? await Promise.all([
          db.doc(`formations/${SANTE_LA_VIE_ID}`).get(),
          Promise.resolve(null),
        ])
      : [null, article === 'musique-origine' ? await db.doc(`formations/${MUSIQUE_ORIGINE_ID}`).get() : null];
    // Une saison = toutes les leçons de son module, d'un coup.
    const episodesSaison: string[] = saison
      ? (await db.collection(`formations/${SANTE_LA_VIE_ID}/lecons`).where('moduleNom', '==', SAISONS[saison]).get()).docs.map((d) => d.id)
      : [];
    if (saison && episodesSaison.length === 0) throw new HttpsError('not-found', 'Cette saison est vide.');

    await db.runTransaction(async (tx) => {
      if ((await tx.get(evt)).exists) throw new HttpsError('already-exists', 'Cet article est déjà à vous.');
      tx.set(evt, { uid, kind: 'boutique', amount: -cout, dedupKey: cle, meta: { article, nom }, at: FieldValue.serverTimestamp() });
      tx.set(balRef, { balance: FieldValue.increment(-cout), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(db.doc(`boutique/${uid}`), { possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true });

      if ((leconId || saison) && emission) {
        const f = (emission.data() || {}) as { titre?: string; imageUrl?: string };
        const episodes: Record<string, FieldValue> = {};
        for (const id of (leconId ? [leconId] : episodesSaison)) episodes[id] = FieldValue.serverTimestamp();
        tx.set(db.doc(`achatsFormations/${uid}/formations/${SANTE_LA_VIE_ID}`), {
          titre: f.titre || 'Émission Santé! La Vie!',
          imageUrl: f.imageUrl || '',
          categorie: 'video',
          source: 'niskas',
          episodes,
          accordeLe: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      if (article === 'musique-origine' && formation) {
        const f = (formation.data() || {}) as { titre?: string; imageUrl?: string };
        tx.set(db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`), {
          titre: f.titre || 'Expérience Origine · La musique',
          imageUrl: f.imageUrl || '',
          categorie: 'musique',
          source: 'niskas',
          accordeLe: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    const { balance } = await recalculerSolde(uid);
    console.log(`[niskas] ${uid} achète ${article} pour ${cout}, solde ${balance}`);
    return { solde: balance, article, nom };
  },
);

// ─── Le cadeau de bienvenue ─────────────────────────────────────────────────
// Vingt niskas, une seule fois par compte. Le navigateur les demande à la
// création du compte (auth.ts) et le bouton de l'onglet Points sert de
// rattrapage; les deux passent ici avec la même clé, donc jamais deux fois.
export const reclamerBienvenue = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour votre cadeau de bienvenue.');
    const uid = req.auth.uid;
    const db = getFirestore();
    const evt = db.doc(`pointsEvents/welcome-claim:${uid}`);
    const ancien = db.doc(`pointsEvents/welcome:${uid}`);
    const deja = await db.runTransaction(async (tx) => {
      const [e, a] = await Promise.all([tx.get(evt), tx.get(ancien)]);
      if (e.exists || a.exists) return true;
      tx.set(evt, { uid, kind: 'welcome-claim', amount: NISKAS_BIENVENUE, dedupKey: `welcome-claim:${uid}`, meta: null, at: FieldValue.serverTimestamp() });
      return false;
    });
    const { balance } = await recalculerSolde(uid);
    return { deja, montant: NISKAS_BIENVENUE, balance };
  },
);

// ─── La couche Foyer de la roue (docs/badge-bleu-plan.md, 2.3) ──────────────
// Une membre du Foyer d'Origine gagne le double à la roue, un cadeau à chaque
// semaine complète de présence (la musique d'Origine, puis des niskas) et un
// plus gros à chaque mois complet (musique, skin rare, rabais sur une huile).
// Le verrou de chaque cadeau est son entrée du journal (crediterNiskas).

/** Membre du Foyer d'Origine : l'achat `foyer` ou l'accès à vie, le même jugement que notifs.ts. */
export async function estDuFoyer(lecteur: Transaction | Firestore, uid: string): Promise<boolean> {
  const db = getFirestore();
  const lire = (chemin: string) => { const ref = db.doc(chemin); return lecteur instanceof Transaction ? lecteur.get(ref) : ref.get(); };
  const [achat, membre] = await Promise.all([lire(`achatsFormations/${uid}/formations/foyer`), lire(`members/${uid}`)]);
  return achat.exists || (membre.data() as { accesVie?: boolean } | undefined)?.accesVie === true;
}

type CadeauHebdo = { genre: 'musique' | 'niskas'; montant?: number };
type CadeauMois = { genre: 'musique' | 'skin-rare' | 'rabais-huile' | 'niskas'; nom?: string; montant?: number };
const MOT_MUSIQUE = 'La musique d’Origine est à vous : vous la trouverez dans l’onglet Téléchargements, et vous pourrez en faire la musique de tout le site.';

const possedeDe = async (db: Firestore, uid: string) =>
  (((await db.doc(`boutique/${uid}`).get()).data() || {}) as { possede?: Record<string, unknown> }).possede || {};
const aLaMusique = async (db: Firestore, uid: string, possede: Record<string, unknown>) =>
  (await db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`).get()).exists || !!possede['musique-origine'];

/** Offre la musique d'Origine : les deux écritures des coffres, avec la source du cadeau. */
async function offrirMusique(db: Firestore, uid: string, source: string): Promise<void> {
  const f = (await db.doc(`formations/${MUSIQUE_ORIGINE_ID}`).get()).data() as { titre?: string; imageUrl?: string } | undefined;
  await db.doc(`achatsFormations/${uid}/formations/${MUSIQUE_ORIGINE_ID}`).set({ titre: f?.titre || 'Expérience Origine · La musique', imageUrl: f?.imageUrl || '', categorie: 'musique', source, accordeLe: FieldValue.serverTimestamp() }, { merge: true });
  await db.doc(`boutique/${uid}`).set({ possede: { 'musique-origine': FieldValue.serverTimestamp() } }, { merge: true });
}

async function motDuFoyer(db: Firestore, uid: string, serie: number, phrase: string): Promise<void> {
  const krystine = await uidKrystine(db);
  if (krystine) await ecrireMessageKrystine(db, krystine, uid, `${serie} jours d’affilée au Foyer. ${phrase}`);
}

/** Semaine complète : la musique d'Origine si elle manque, sinon FOYER_NISKAS_HEBDO_SI_MUSIQUE. Null si le cadeau du jour est déjà tombé. */
async function cadeauHebdoFoyer(db: Firestore, uid: string, serie: number, jour: string): Promise<CadeauHebdo | null> {
  const cadeau: CadeauHebdo = (await aLaMusique(db, uid, await possedeDe(db, uid)))
    ? { genre: 'niskas', montant: FOYER_NISKAS_HEBDO_SI_MUSIQUE } : { genre: 'musique' };
  if (!(await crediterNiskas(uid, KIND_FOYER_HEBDO, cadeau.montant || 0, cleFoyerHebdo(uid, jour), { serie, cadeau: cadeau.genre }))) return null;
  if (cadeau.genre === 'musique') await offrirMusique(db, uid, KIND_FOYER_HEBDO);
  await motDuFoyer(db, uid, serie, cadeau.genre === 'musique' ? MOT_MUSIQUE
    : `${cadeau.montant} niskas viennent d’entrer dans votre bourse, puisque la musique d’Origine est déjà à vous.`);
  return cadeau;
}

/** Mois complet : l'étape du cycle (musique, skin rare, rabais huile), ou ses niskas de remplacement. Null si déjà tombé. */
async function cadeauMoisFoyer(db: Firestore, uid: string, serie: number, jour: string, email: string | null): Promise<CadeauMois | null> {
  const etape = cadeauFoyerDuMois(serie);
  const possede = await possedeDe(db, uid);
  let cadeau: CadeauMois; let article = '';
  if (etape.id === 'musique') {
    cadeau = (await aLaMusique(db, uid, possede)) ? { genre: 'niskas', montant: etape.niskasSiDeja ?? 0 } : { genre: 'musique' };
  } else if (etape.id === 'skin-rare') {
    const bassin = SKINS_RARES_COFFRES.filter((a) => !possede[a]);
    if (bassin.length) { article = bassin[randomInt(0, bassin.length)]; cadeau = { genre: 'skin-rare', nom: NOMS_COSMETIQUES[article] || article }; }
    else cadeau = { genre: 'niskas', montant: etape.niskasSiDeja ?? 0 };
  } else {
    cadeau = { genre: 'rabais-huile', nom: RABAIS_HUILE_FOYER.labelFR };
  }
  if (!(await crediterNiskas(uid, KIND_FOYER_MOIS, cadeau.montant || 0, cleFoyerMois(uid, jour), { serie, etape: etape.id, cadeau: cadeau.genre, ...(article ? { article } : {}) }))) return null;
  let phrase: string;
  if (cadeau.genre === 'musique') {
    await offrirMusique(db, uid, KIND_FOYER_MOIS);
    phrase = MOT_MUSIQUE;
  } else if (cadeau.genre === 'skin-rare') {
    await db.doc(`boutique/${uid}`).set({ possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true });
    phrase = `Le ${cadeau.nom} est à vous : il vous attend dans la petite boutique, section « Les skins ».`;
  } else if (cadeau.genre === 'rabais-huile') {
    // Le plafond (30 %) et le nombre d'articles (1) sont écrits dans le document : l'admin n'a aucun champ pour les monter.
    await db.collection('rewardRedemptions').add({
      uid, email, rewardId: RABAIS_HUILE_FOYER.rewardId, rewardLabel: RABAIS_HUILE_FOYER.labelFR, cost: 0, status: 'pending', source: KIND_FOYER_MOIS,
      plafondPourcent: RABAIS_HUILE_FOYER.plafondPourcent, articles: RABAIS_HUILE_FOYER.articles, createdAt: FieldValue.serverTimestamp(),
    });
    phrase = `Je vous offre ${RABAIS_HUILE_FOYER.pourcent} % sur une huile corporelle de votre choix, une seule. Je vous envoie le code par courriel sous peu, et la demande est notée dans votre onglet Niskas, section « Mes récompenses ».`;
  } else {
    phrase = `${cadeau.montant} niskas viennent d’entrer dans votre bourse, puisque ${etape.id === 'musique' ? 'la musique d’Origine est déjà à vous' : 'tous les skins rares sont déjà à vous'}.`;
  }
  await motDuFoyer(db, uid, serie, phrase);
  return cadeau;
}

// ─── La roue des sept jours ──────────────────────────────────────────────────
// Une réclamation par journée civile de Montréal, jugée ici et non dans le
// navigateur. La suite avance si la dernière réclamation date d'hier, repart
// à un sinon; le jour de la roue est la suite modulo sept. Au Foyer d'Origine,
// le montant double (un seul événement `quotidien` par jour, jamais deux : le
// compteur de journées des badges compte ces événements).
export const reclamerQuotidien = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour votre récompense du jour.');
    const uid = req.auth.uid;
    const db = getFirestore();
    const aujourdhui = journee();
    const balRef = db.doc(`memberPoints/${uid}`);
    const evt = db.doc(`pointsEvents/quotidien:${uid}:${aujourdhui}`);

    const r = await db.runTransaction(async (tx) => {
      const [bal, e, foyer] = await Promise.all([tx.get(balRef), tx.get(evt), estDuFoyer(tx, uid)]);
      const mult = foyer ? FOYER_MULTIPLICATEUR : 1;
      const prev = (bal.data() || {}) as { balance?: number; serie?: number; dernierJour?: string };
      const serieAvant = Number(prev.serie || 0);
      if (e.exists || prev.dernierJour === aujourdhui) {
        const jour = ((Math.max(1, serieAvant) - 1) % ROUE_QUOTIDIENNE.length) + 1;
        return { deja: true, jour, montant: ROUE_QUOTIDIENNE[jour - 1] * mult, serie: serieAvant, foyer };
      }
      const serie = prev.dernierJour === veilleDe(aujourdhui) ? serieAvant + 1 : 1;
      const jour = ((serie - 1) % ROUE_QUOTIDIENNE.length) + 1;
      const montant = ROUE_QUOTIDIENNE[jour - 1] * mult;
      tx.set(evt, { uid, kind: 'quotidien', amount: montant, dedupKey: `quotidien:${uid}:${aujourdhui}`, meta: { jour, serie, foyer }, at: FieldValue.serverTimestamp() });
      tx.set(balRef, { dernierJour: aujourdhui, serie, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { deja: false, jour, montant, serie, foyer };
    });
    // Le septième jour ouvre aussi un coffre de bronze, avec sa clé.
    let coffre = false;
    if (!r.deja && r.jour === ROUE_QUOTIDIENNE.length) {
      await donnerCoffreDuJour7(uid, aujourdhui).catch((e) => console.warn('[niskas] coffre du jour 7', e));
      coffre = true;
    }
    // Au Foyer : le cadeau de la semaine complète (7, 14, 21…) et celui du mois complet (30, 60, 90…).
    let cadeauHebdo: CadeauHebdo | null = null;
    let cadeauMois: CadeauMois | null = null;
    if (!r.deja && r.foyer) {
      if (estJourHebdoFoyer(r.serie)) cadeauHebdo = await cadeauHebdoFoyer(db, uid, r.serie, aujourdhui).catch((e) => { console.warn('[niskas] cadeau hebdo du Foyer', e); return null; });
      if (estJourMoisFoyer(r.serie)) cadeauMois = await cadeauMoisFoyer(db, uid, r.serie, aujourdhui, req.auth.token.email || null).catch((e) => { console.warn('[niskas] cadeau du mois du Foyer', e); return null; });
    }
    const { balance } = await recalculerSolde(uid);
    return { ...r, balance, coffre, cadeauHebdo, cadeauMois };
  },
);
