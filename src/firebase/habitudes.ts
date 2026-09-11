// Les habitudes de navigation d'une cliente, pour que le site lui propose ce
// qui lui ressemble et que Krystine voie ce que sa communauté fait vraiment.
//
// TROIS CHOIX QUI NE SE NÉGOCIENT PAS.
//
// 1. Une collection à part, jamais dans members. La règle de members laisse
//    toute personne connectée lire la fiche d'une autre dès qu'elle en connaît
//    l'identifiant, ce qui est voulu pour un nom sur un message. Y ranger les
//    habitudes exposerait la navigation d'une cliente à toutes les autres.
//    Ici, une cliente ne lit que les siennes, et l'administration lit tout.
// 2. Un agrégat, pas un journal. Un document par cliente qui compte, au lieu
//    d'un document par page vue. La lecture reste instantanée pour cent
//    quatre-vingt-cinq comptes, la facture Firestore reste plate, et rien ne
//    conserve l'heure exacte de chaque geste, ce qui est aussi plus sobre.
// 3. Le consentement d'abord. Rien ne s'écrit tant que la personne n'a pas
//    accepté la bannière de la Loi 25, et une cliente peut éteindre la
//    personnalisation depuis ses préférences sans perdre son compte.
import { auth, db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, increment,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';

export const CHEMIN_HABITUDES = 'habitudes';

// Les règles Firestore sont la vraie barrière : une cliente n'écrit que ses
// propres habitudes et un appel sur l'identifiant d'une autre se solde par un
// refus du serveur. Cette garde-ci ne remplace pas les règles, elle évite
// qu'un appel mal branché parte pour rien et rende l'intention explicite à qui
// relira le fichier.
const cestElle = (uid: string): boolean => !!uid && auth?.currentUser?.uid === uid;

export interface Habitudes {
  uid: string;
  /** Nombre total de pages ouvertes depuis le premier jour. */
  visites: number;
  /** Nombre de journées distinctes où la cliente est venue. */
  jours: number;
  /** La dernière journée comptée, au format AAAA-MM-JJ, pour ne compter qu'une fois. */
  dernierJour?: string;
  premiereVisite?: Timestamp;
  derniereVisite?: Timestamp;
  /** Combien de fois chaque page a été ouverte, par son nom lisible. */
  pages: Record<string, number>;
  /** Le même compte, regroupé par grande famille du site. */
  familles: Record<string, number>;
  /** Combien de fois chaque offre a été montrée, puis cliquée. */
  offresVues?: Record<string, number>;
  offresCliquees?: Record<string, number>;
  /** L'offre retenue pour cette personne, écrite par le moteur d'offres. */
  offre?: { id: string; calculeeLe?: Timestamp };
  /** Vrai quand la cliente a éteint la personnalisation dans ses préférences. */
  suiviRefuse?: boolean;
  maj?: Timestamp;
}

export const HABITUDES_VIDES: Habitudes = { uid: '', visites: 0, jours: 0, pages: {}, familles: {} };

// Les familles du site, telles que Krystine les nomme. Une page inconnue tombe
// dans « Ailleurs » plutôt que de polluer le tableau avec une adresse brute.
const FAMILLES: Array<{ famille: string; prefixes: string[] }> = [
  { famille: 'Origine', prefixes: ['/origine', '/origine-2', '/foyer'] },
  { famille: 'Formations', prefixes: ['/formations', '/cours'] },
  { famille: 'Boutique', prefixes: ['/boutique'] },
  { famille: 'Podcast et médias', prefixes: ['/podcast', '/medias', '/tv'] },
  { famille: 'Livres', prefixes: ['/livres'] },
  { famille: 'Événements', prefixes: ['/evenements', '/evenement'] },
  { famille: 'Quiz et guide', prefixes: ['/quiz', '/guide', '/dosha'] },
  { famille: 'Communauté', prefixes: ['/communaute', '/membres', '/messages'] },
  { famille: 'Son compte', prefixes: ['/compte'] },
  { famille: 'Krystine', prefixes: ['/krystine', '/a-propos', '/conferenciere', '/speaking'] },
  { famille: 'Accueil', prefixes: ['/accueil'] },
];

const NOMS: Record<string, string> = {
  '/accueil': 'Accueil',
  '/origine': 'Expérience Origine',
  '/origine-2': 'Expérience Origine 2',
  '/foyer': "Le Foyer d'Origine",
  '/formations': 'Formations',
  '/boutique': 'Boutique',
  '/podcast': 'Podcast',
  '/medias': 'Médias et livres',
  '/livres': 'Livres',
  '/evenements': 'Événements',
  '/quiz': 'Quiz dosha',
  '/guide': 'Guide',
  '/communaute': 'Communauté',
  '/compte': 'Son compte',
  '/conferenciere': 'Conférencière',
  '/vata': 'Programme Vata',
};

/** Le nom lisible d'une page, à partir de son adresse. */
export function libellePage(chemin: string): string {
  const propre = (chemin.split('?')[0] || '/').replace(/\/+$/, '') || '/accueil';
  if (NOMS[propre]) return NOMS[propre];
  const segments = propre.split('/').filter(Boolean);
  if (segments[0] === 'cours' && segments[1]) return `Une leçon de formation`;
  if (segments[0] === 'evenement' && segments[1]) return `Une page d'événement`;
  const racine = `/${segments[0] || 'accueil'}`;
  return NOMS[racine] || (segments[0] ? segments[0].replace(/-/g, ' ') : 'Accueil');
}

/** La grande famille d'une page. */
export function famillePage(chemin: string): string {
  const propre = (chemin.split('?')[0] || '/').replace(/\/+$/, '') || '/accueil';
  for (const { famille, prefixes } of FAMILLES) {
    if (prefixes.some((p) => propre === p || propre.startsWith(`${p}/`))) return famille;
  }
  return 'Ailleurs';
}

/** La journée courante au format AAAA-MM-JJ, dans le fuseau de la personne. */
export const jourCourant = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Compte une page ouverte. Le compteur des journées distinctes ne monte que
 * lorsque la date change, ce qui évite de gonfler le chiffre d'une visite qui
 * dure. L'écriture est un merge, donc le document naît tout seul.
 */
// Les comptes de l'équipe (Krystine, Alex, les comptes de test) ne comptent
// pas : ils essaient des choses et fausseraient les données (Alex, 11
// septembre 2026). Identifiants Auth des six adresses admin.
export const COMPTES_EQUIPE = new Set([
  'CdPuIve5Y4NhdW6UsAZ4V88BtWG2', // krystine@inspiratanature.com
  'Pvi24MyDg6ZXZSsTpy4g7E5rxTf1', // krystinestlaurent@gmail.com
  'kYorHEdND9bfk5A4I3oxVJJSquR2', // krystinestterredhysope@gmail.com (test)
  'O7BWcCj8BVSTrqBKYqcMZxPy0hc2', // alex@lesalondesinconnus.com
  'IzH35eAu5JTMAXjaGjRmaZSaQlu2', // houseoftherisingarts@gmail.com
]);
export const estCompteEquipe = (uid?: string | null): boolean => !!uid && COMPTES_EQUIPE.has(uid);

export async function noterPage(uid: string, chemin: string, dernierJourConnu?: string): Promise<void> {
  if (!db || !uid || estCompteEquipe(uid)) return;
  if (!cestElle(uid)) return;
  const jour = jourCourant();
  const patch: Record<string, unknown> = {
    uid,
    visites: increment(1),
    derniereVisite: serverTimestamp(),
    maj: serverTimestamp(),
    pages: { [libellePage(chemin)]: increment(1) },
    familles: { [famillePage(chemin)]: increment(1) },
  };
  if (dernierJourConnu !== jour) {
    patch.jours = increment(1);
    patch.dernierJour = jour;
  }
  await setDoc(doc(db, CHEMIN_HABITUDES, uid), patch, { merge: true });
}

/** Compte une offre montrée, puis une offre cliquée. */
export async function noterOffre(uid: string, offreId: string, geste: 'vue' | 'clic'): Promise<void> {
  if (estCompteEquipe(uid)) return;
  if (!db || !uid || !offreId) return;
  if (!cestElle(uid)) return;
  const champ = geste === 'clic' ? 'offresCliquees' : 'offresVues';
  await setDoc(doc(db, CHEMIN_HABITUDES, uid), { [champ]: { [offreId]: increment(1) }, maj: serverTimestamp() }, { merge: true });
}

export async function getHabitudes(uid: string): Promise<Habitudes | null> {
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, CHEMIN_HABITUDES, uid));
  return snap.exists() ? ({ ...HABITUDES_VIDES, ...(snap.data() as Habitudes), uid } as Habitudes) : null;
}

/** Toutes les habitudes. Réservé à l'administration par les règles. */
export async function getToutesHabitudes(): Promise<Habitudes[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, CHEMIN_HABITUDES));
  return snap.docs
    .filter((d) => !estCompteEquipe(d.id))
    .map((d) => ({ ...HABITUDES_VIDES, ...(d.data() as Habitudes), uid: d.id }));
}

/** Éteindre ou rallumer la personnalisation, depuis les préférences de la cliente. */
export async function poserSuiviRefuse(uid: string, refuse: boolean): Promise<void> {
  if (!db || !uid) return;
  if (!cestElle(uid)) return;
  await setDoc(doc(db, CHEMIN_HABITUDES, uid), { uid, suiviRefuse: refuse, maj: serverTimestamp() }, { merge: true });
}

/** Le droit à l'effacement : la cliente jette ses propres habitudes. */
export async function effacerHabitudes(uid: string): Promise<void> {
  if (!db || !uid) return;
  if (!cestElle(uid)) return;
  await deleteDoc(doc(db, CHEMIN_HABITUDES, uid));
}

/** La page la plus ouverte, et son compte. */
export function pageFavorite(h: Habitudes): { page: string; n: number } | null {
  const entrees = Object.entries(h.pages || {});
  if (!entrees.length) return null;
  const [page, n] = entrees.sort((a, b) => b[1] - a[1])[0];
  return { page, n };
}
