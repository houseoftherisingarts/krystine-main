// Les acheteuses venues de Kajabi, celles que Krystine connaît déjà et qui
// sont les plus proches d'un deuxième oui.
//
// POURQUOI CE FICHIER EXISTE. Les gens qui ont acheté L'Expérience Origine sur
// Kajabi ne sont nulle part dans cette base : ni dans achatsFormations, qui ne
// porte que les achats faits ici, ni dans les contacts de l'infolettre, qui
// viennent tous d'un import Shopify. Leur liste vit encore dans Kajabi, et
// c'est Krystine qui l'en sort. Ce fichier reçoit cette liste, la range, et la
// relie aux comptes du site quand la personne en a déjà un.
//
// Rien ici n'invente une acheteuse : une ligne n'existe que parce qu'un export
// de Kajabi l'a nommée.
import { db } from '../firebase';
import {
  collection, doc, getDocs, query, where, writeBatch, serverTimestamp, Timestamp, updateDoc,
} from 'firebase/firestore';

export const CHEMIN_ACHETEUSES = 'acheteusesKajabi';

export interface AcheteuseKajabi {
  /** Le courriel en minuscules, qui sert aussi d'identifiant du document. */
  email: string;
  prenom?: string;
  nom?: string;
  /** Le produit acheté chez Kajabi, par exemple « origine-1 ». */
  offre: string;
  /** Ce que l'export de Kajabi disait de la date d'achat, tel quel. */
  acheteLe?: string;
  /** L'identifiant du compte du site quand la personne en a déjà un. */
  uid?: string;
  /** La dernière fois que Krystine lui a écrit depuis cette page. */
  contacteeLe?: Timestamp;
  importeLe?: Timestamp;
}

/** Un courriel réduit à sa forme comparable, qui sert de clé. */
export const cleCourriel = (email: string): string =>
  email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, '');

/**
 * Lit un export CSV de Kajabi et en tire les acheteuses. Les entêtes varient
 * d'un export à l'autre, alors la colonne du courriel se reconnaît à son nom
 * autant qu'à son contenu, et une ligne sans courriel valable est ignorée
 * plutôt que devinée.
 */
export function lireCsvKajabi(texte: string, offre: string): AcheteuseKajabi[] {
  const lignes = decouperCsv(texte);
  if (lignes.length < 2) return [];
  const entetes = lignes[0].map((h) => h.trim().toLowerCase());
  const trouver = (...mots: string[]) =>
    entetes.findIndex((h) => mots.some((m) => h.includes(m)));
  let iMail = trouver('email', 'courriel', 'e-mail');
  const iPrenom = trouver('first name', 'prénom', 'prenom');
  const iNom = trouver('last name', 'nom de famille');
  const iDate = trouver('purchase', 'achat', 'created', 'date');

  const sorties: AcheteuseKajabi[] = [];
  const vus = new Set<string>();
  for (const l of lignes.slice(1)) {
    // Si l'entête ne nomme aucune colonne de courriel, la première cellule qui
    // ressemble à une adresse fait l'affaire.
    const brut = iMail >= 0 ? l[iMail] : l.find((c) => c.includes('@')) || '';
    const email = cleCourriel(brut || '');
    if (!email.includes('@') || vus.has(email)) continue;
    vus.add(email);
    sorties.push({
      email,
      prenom: (iPrenom >= 0 ? l[iPrenom] : '')?.trim() || undefined,
      nom: (iNom >= 0 ? l[iNom] : '')?.trim() || undefined,
      acheteLe: (iDate >= 0 ? l[iDate] : '')?.trim() || undefined,
      offre,
    });
  }
  return sorties;
}

/** Un découpage de CSV qui tient debout devant les guillemets et les virgules. */
function decouperCsv(texte: string): string[][] {
  const out: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let entreGuillemets = false;
  const t = texte.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreGuillemets) {
      if (c === '"' && t[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') entreGuillemets = false;
      else cellule += c;
      continue;
    }
    if (c === '"') entreGuillemets = true;
    else if (c === ',' || c === ';') { ligne.push(cellule); cellule = ''; }
    else if (c === '\n') { ligne.push(cellule); out.push(ligne); ligne = []; cellule = ''; }
    else cellule += c;
  }
  if (cellule || ligne.length) { ligne.push(cellule); out.push(ligne); }
  return out.filter((l) => l.some((c) => c.trim()));
}

/**
 * Range les acheteuses et les relie aux comptes du site. Le rapprochement se
 * fait sur le courriel, seul lien fiable entre Kajabi et le site, et une
 * personne sans compte reste dans la liste, parce que c'est justement elle
 * qu'il faut ramener.
 */
export async function importerAcheteuses(liste: AcheteuseKajabi[]): Promise<{ importees: number; avecCompte: number }> {
  if (!db || !liste.length) return { importees: 0, avecCompte: 0 };
  const comptes = await getDocs(collection(db, 'members'));
  const parCourriel = new Map<string, string>();
  comptes.forEach((m) => {
    const e = cleCourriel(String((m.data() as { email?: string }).email || ''));
    if (e) parCourriel.set(e, m.id);
  });

  let avecCompte = 0;
  // Firestore accepte cinq cents écritures par lot; l'import se découpe donc.
  for (let i = 0; i < liste.length; i += 400) {
    const lot = writeBatch(db);
    for (const a of liste.slice(i, i + 400)) {
      const uid = parCourriel.get(a.email);
      if (uid) avecCompte++;
      lot.set(doc(db, CHEMIN_ACHETEUSES, a.email), {
        ...a,
        ...(uid ? { uid } : {}),
        importeLe: serverTimestamp(),
      }, { merge: true });
    }
    await lot.commit();
  }
  return { importees: liste.length, avecCompte };
}

export async function getAcheteuses(offre?: string): Promise<AcheteuseKajabi[]> {
  if (!db) return [];
  const base = collection(db, CHEMIN_ACHETEUSES);
  const snap = await getDocs(offre ? query(base, where('offre', '==', offre)) : base);
  return snap.docs.map((d) => ({ ...(d.data() as AcheteuseKajabi), email: d.id }));
}

/** Note qu'un mot lui a été écrit, pour que Krystine ne la relance pas deux fois. */
export async function marquerContactee(email: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, CHEMIN_ACHETEUSES, cleCourriel(email)), { contacteeLe: serverTimestamp() });
}

/**
 * Le message de Krystine, avec le prénom de la personne posé à la place du
 * jeton {prenom}. Quand le prénom manque, la phrase se referme proprement
 * plutôt que d'afficher un trou ou un « Bonjour , ».
 */
export function personnaliser(modele: string, a: AcheteuseKajabi): string {
  const prenom = (a.prenom || '').trim();
  if (prenom) return modele.replace(/\{prenom\}/g, prenom);
  return modele
    .replace(/Bonjour \{prenom\}\s*,/gi, 'Bonjour,')
    .replace(/\s*\{prenom\}/g, '')
    .replace(/\{prenom\}/g, '');
}
