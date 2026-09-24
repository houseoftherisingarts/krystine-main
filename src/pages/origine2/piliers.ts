// L'Expérience Origine, les deux cohortes : la fondatrice (import Kajabi
// kajabi-2149503901) et la prochaine (origine2, que Krystine remplit semaine
// par semaine). Douze semaines en trois piliers de quatre : Lire, Trier,
// Ancrer (Alex, 24 septembre 2026). Les couleurs viennent de la couverture et
// vont du plus dense au plus subtil, olive profond, olive, sable.
import type { Lecon } from '../../firebase/formations';
import { PILIERS_ORIGINE2 } from './semaines';

export const COHORTES: Record<string, { etiquette: { fr: string; en: string } }> = {
  'kajabi-2149348838': { etiquette: { fr: 'Cohorte fondatrice', en: 'Founding cohort' } },
  // Le cours complet de la cohorte fondatrice tel qu'importé de Kajabi (produit « Expérience Origine 2 »),
  // gardé masqué en réserve depuis le reclassement du 24 septembre 2026 (Krystine).
  'kajabi-2149503901': { etiquette: { fr: 'Cohorte fondatrice (réserve)', en: 'Founding cohort (reserve)' } },
  origine2: { etiquette: { fr: 'Prochaine cohorte', en: 'Next cohort' } },
};

export const estOrigine = (id: string): boolean => id in COHORTES;

export const ORIGINE = {
  creme: '#f6e9cf',
  cremeSombre: '#eddcb8',
  sable: '#c2ad7c',
  olive: '#6a6233',
  oliveProfond: '#2b3111',
  encre: '#26290f',
  or: '#b8923a',
  orClair: '#dcbf7a',
};

export interface Pilier {
  rang: 1 | 2 | 3;
  roman: string;
  nom: { fr: string; en: string };
  titre: string;
  semaines: number[];
  /** Le fond du pilier et l'encre qui se lit dessus, du dense au subtil. */
  fond: string;
  encre: string;
  liseret: string;
}

export const PILIERS: Pilier[] = [
  { rang: 1, roman: 'I', nom: { fr: 'Lire', en: 'Read' }, titre: PILIERS_ORIGINE2[0].titre, semaines: [1, 2, 3, 4], fond: ORIGINE.oliveProfond, encre: '#f3ead2', liseret: ORIGINE.orClair },
  { rang: 2, roman: 'II', nom: { fr: 'Trier', en: 'Sort' }, titre: PILIERS_ORIGINE2[1].titre, semaines: [5, 6, 7, 8], fond: ORIGINE.olive, encre: '#f7efd9', liseret: ORIGINE.orClair },
  { rang: 3, roman: 'III', nom: { fr: 'Ancrer', en: 'Anchor' }, titre: PILIERS_ORIGINE2[2].titre, semaines: [9, 10, 11, 12], fond: ORIGINE.sable, encre: ORIGINE.encre, liseret: ORIGINE.oliveProfond },
];

export const pilierDeSemaine = (n: number): Pilier | undefined => PILIERS.find(p => p.semaines.includes(n));

/** Le numéro de semaine d'une leçon : 1 à 12, 0 pour la semaine préparatoire, -1 sans semaine. */
export function semaineDeLecon(l: Pick<Lecon, 'mois' | 'moduleNom'>): number {
  const m = /^semaine-(\d+)$/.exec(l.mois || '');
  if (m) return Number(m[1]);
  const nom = l.moduleNom || '';
  if (/pr[ée]paratoire/i.test(nom)) return 0;
  const s = /(?:semaine|module)\s*(\d+)/i.exec(nom);
  return s ? Number(s[1]) : -1;
}

export type Rayon = 'avant' | 'semaine' | 'bibliotheque';

/** Où une leçon se range : avant le parcours, dans une semaine, ou dans la bibliothèque. */
export function rayonDeLecon(l: Pick<Lecon, 'mois' | 'moduleNom'>): Rayon {
  const n = semaineDeLecon(l);
  if (n >= 1) return 'semaine';
  if (n === 0 || /bienvenue|lien de connexion|acc[èe]s [àa] la plateforme|journal de bord/i.test(l.moduleNom || '')) return 'avant';
  return 'bibliotheque';
}

/** Un nom de module Kajabi rendu lisible : sans « SEMAINE 4- PILLIER 1 », sans majuscules criardes. */
export function titreDeModule(nom: string): string {
  let t = nom.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(?:semaine|module)\s*\d+\s*[:\-–]?\s*/i, '').replace(/[:\-–]?\s*pill?ier\s*\d+\s*[:\-–]?\s*/i, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return adoucir(t).replace(/\s*:\s*/g, ' : ').replace(/\s*-\s*/g, ' - ');
}

/** Un titre Kajabi crié en majuscules revient en phrase; un titre déjà écrit normalement ne bouge pas. */
export function adoucir(t: string): string {
  const lettres = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const maj = lettres.replace(/[^A-ZÀ-Ý]/g, '').length;
  if (!lettres.length || maj / lettres.length < 0.45) return t;
  const bas = t.toLowerCase();
  return bas.charAt(0).toUpperCase() + bas.slice(1);
}

/** Le titre d'une leçon, débarrassé des majuscules Kajabi. */
export function titreDeLecon(titre: string): string {
  return adoucir(titre.replace(/\s+/g, ' ').trim());
}

/** Une leçon « texte » qui annonce un document sans en porter un : le PDF est resté sur Kajabi. */
export function documentManquant(l: Lecon): boolean {
  if (l.type !== 'texte' || l.chemin || (l.docs && l.docs.length)) return false;
  return /pdf|télécharger|telecharger|tableau|outil|résumé|resume|questionnaire|journal de bord|document/i.test(`${l.titre} ${l.moduleNom || ''}`);
}
