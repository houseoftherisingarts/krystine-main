import {
  collection, query, where, orderBy, limit as fbLimit, startAfter, getDocs, Timestamp,
  type Query, type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { bornesDuJour } from './rapportDuJour';
import type { NewsletterSubscriber, MemberDoc } from './firestore';

// Le détail « qui se cache derrière ce nombre » des compteurs du tableau de
// bord (Krystine, 7 septembre 2026) : chaque requête est bornée par
// `where` + `orderBy` + `limit`, jamais une lecture complète de `newsletter`
// (33 000 fiches) ou de `members`. Le survol lit cinq fiches, le panneau en
// lit cent à la fois, « Charger plus » reprend après la dernière avec
// `startAfter`. Le regroupement (regrouperPar) ne porte que sur ce qui est
// déjà chargé : un axe se précise à mesure que la page se remplit, il ne
// ment jamais sur ce qu'il montre.

const PAGE = 100;
const APERCU = 5;

export interface PersonneLigne {
  id: string;
  genre: 'abonnee' | 'membre';
  prenom?: string;
  nom?: string;
  email?: string;
  /** subscribedAt (abonnée) ou joinedAt (membre). */
  dateInscription?: Timestamp;
  source?: string;
  lang?: string;
  statut?: string;
  unsubscribedAt?: Timestamp;
  /** Le premier tag `palier-N` trouvé sur la fiche, brut (ex. « palier-3 »). */
  palier?: string;
  /** Le champ `province` d'une abonnée (qui porte en réalité un pays, voir
   *  src/lib/regions.ts) ou le champ `pays` d'un membre. */
  pays?: string;
  region?: string;
  anneeNaissance?: number;
  uid?: string;
}

export type RequeteCompteur =
  | { genre: 'newsletter-statut'; statut: string }
  | { genre: 'newsletter-palier'; tag: string }
  | { genre: 'newsletter-date'; champ: 'subscribedAt' | 'unsubscribedAt'; jour: string }
  | { genre: 'membres-date'; jour: string };

function palierDeTags(tags?: string[]): string | undefined {
  return (tags || []).find(t => /^palier-\d$/.test(t));
}

function depuisAbonne(d: QueryDocumentSnapshot<DocumentData>): PersonneLigne {
  const v = d.data() as NewsletterSubscriber;
  return {
    id: d.id, genre: 'abonnee', prenom: v.firstName, nom: v.lastName, email: v.email,
    dateInscription: v.subscribedAt, source: v.source, lang: v.lang, statut: v.status,
    unsubscribedAt: v.unsubscribedAt, palier: palierDeTags(v.tags), pays: v.province, region: v.region,
    uid: v.uid,
  };
}

function depuisMembre(d: QueryDocumentSnapshot<DocumentData>): PersonneLigne {
  const v = d.data() as MemberDoc;
  return {
    id: d.id, genre: 'membre', prenom: v.displayName, email: v.email, dateInscription: v.joinedAt,
    lang: v.lang, pays: v.pays, region: v.region, anneeNaissance: v.anneeNaissance, uid: v.uid,
  };
}

function construireRequete(
  requete: RequeteCompteur, taille: number, curseur: QueryDocumentSnapshot<DocumentData> | null,
): Query<DocumentData> {
  let q: Query<DocumentData>;
  if (requete.genre === 'newsletter-statut') {
    q = query(collection(db!, 'newsletter'), where('status', '==', requete.statut), orderBy('subscribedAt', 'desc'), fbLimit(taille));
  } else if (requete.genre === 'newsletter-palier') {
    q = query(collection(db!, 'newsletter'), where('tags', 'array-contains', requete.tag), orderBy('subscribedAt', 'desc'), fbLimit(taille));
  } else if (requete.genre === 'newsletter-date') {
    const [debut, fin] = bornesDuJour(requete.jour);
    q = query(
      collection(db!, 'newsletter'),
      where(requete.champ, '>=', Timestamp.fromDate(debut)), where(requete.champ, '<', Timestamp.fromDate(fin)),
      orderBy(requete.champ, 'desc'), fbLimit(taille),
    );
  } else {
    const [debut, fin] = bornesDuJour(requete.jour);
    q = query(
      collection(db!, 'members'),
      where('joinedAt', '>=', Timestamp.fromDate(debut)), where('joinedAt', '<', Timestamp.fromDate(fin)),
      orderBy('joinedAt', 'desc'), fbLimit(taille),
    );
  }
  return curseur ? query(q, startAfter(curseur)) : q;
}

function versLignes(requete: RequeteCompteur, docs: QueryDocumentSnapshot<DocumentData>[]): PersonneLigne[] {
  return docs.map(requete.genre === 'membres-date' ? depuisMembre : depuisAbonne);
}

/** Les cinq plus récentes, pour l'infobulle au survol. */
export async function chargerApercu(requete: RequeteCompteur): Promise<PersonneLigne[]> {
  if (!db) return [];
  const snap = await getDocs(construireRequete(requete, APERCU, null));
  return versLignes(requete, snap.docs);
}

/** Une page de cent, triée par date décroissante. `curseur` (le dernier
 *  document déjà reçu) reprend la suite pour « Charger plus »; une fiche
 *  sans le champ de tri (subscribedAt, unsubscribedAt ou joinedAt) manque à
 *  l'appel, comme partout ailleurs dans l'admin où on trie par date. */
export async function chargerPage(
  requete: RequeteCompteur,
  curseur: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{ lignes: PersonneLigne[]; dernier: QueryDocumentSnapshot<DocumentData> | null; fin: boolean }> {
  if (!db) return { lignes: [], dernier: null, fin: true };
  const snap = await getDocs(construireRequete(requete, PAGE, curseur));
  return { lignes: versLignes(requete, snap.docs), dernier: snap.docs[snap.docs.length - 1] || null, fin: snap.docs.length < PAGE };
}

// ─── Regroupement (« Regrouper par », demande de Krystine) ──────────────────

export type AxeRegroupement = 'aucun' | 'langue' | 'palier' | 'source' | 'statut' | 'pays' | 'age' | 'mois';

export const AXES: { valeur: AxeRegroupement; libelle: string }[] = [
  { valeur: 'aucun', libelle: 'Aucun' },
  { valeur: 'langue', libelle: 'Langue' },
  { valeur: 'palier', libelle: 'Palier' },
  { valeur: 'source', libelle: 'Source d’inscription' },
  { valeur: 'statut', libelle: 'Statut' },
  { valeur: 'pays', libelle: 'Pays' },
  { valeur: 'age', libelle: 'Tranche d’âge' },
  { valeur: 'mois', libelle: 'Mois d’inscription' },
];

/** La tranche d'âge à partir de l'année de naissance, par dizaines à partir
 *  de trente ans. Absente = pas devinée : rien ne remplace un « inconnu ». */
export function trancheAge(anneeNaissance?: number): string {
  if (!anneeNaissance) return '';
  const age = new Date().getFullYear() - anneeNaissance;
  if (age < 30) return 'Moins de 30 ans';
  if (age < 40) return '30 à 39 ans';
  if (age < 50) return '40 à 49 ans';
  if (age < 60) return '50 à 59 ans';
  if (age < 70) return '60 à 69 ans';
  return '70 ans et plus';
}

function moisDe(ts?: Timestamp): string {
  if (!ts) return '';
  const l = ts.toDate().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

/** La clé brute du groupe d'une fiche pour un axe donné — chaîne vide =
 *  inconnu, uniformément, quel que soit l'axe. La traduction en libellé
 *  lisible (libelleTag, sourceLabel…) reste du ressort de l'affichage. */
function cleDe(l: PersonneLigne, axe: AxeRegroupement): string {
  switch (axe) {
    case 'langue': return l.lang || '';
    case 'palier': return l.palier || '';
    case 'source': return l.source || '';
    case 'statut': return l.statut || '';
    case 'pays':   return l.pays || '';
    case 'age':    return trancheAge(l.anneeNaissance);
    case 'mois':   return moisDe(l.dateInscription);
    default:       return '';
  }
}

export interface Groupe { cle: string; lignes: PersonneLigne[] }

/** Regroupe les lignes déjà chargées par l'axe choisi, du plus grand groupe
 *  au plus petit. Porte seulement sur ce qui est chargé en mémoire : lire
 *  toute la population pour un seul regroupement redeviendrait la lecture
 *  de onze mille fiches que ce panneau existe justement pour éviter. */
export function regrouperPar(lignes: PersonneLigne[], axe: AxeRegroupement): Groupe[] {
  if (axe === 'aucun') return [{ cle: '', lignes }];
  const m = new Map<string, PersonneLigne[]>();
  for (const l of lignes) {
    const cle = cleDe(l, axe);
    const g = m.get(cle);
    if (g) g.push(l); else m.set(cle, [l]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length).map(([cle, lignes]) => ({ cle, lignes }));
}
