// ─── Les douze semaines de l'Expérience Origine 2 ───────────────────────────
// Le pendant des douze portes du Foyer : une semaine s'ouvre à la fois, à
// partir de la date de départ posée dans l'admin (formation.dateSortie).
// Krystine dépose ses modules au fil des semaines; ce qui n'est pas encore
// ouvert reste barré pour les membres. Données partagées entre la page de
// vente (/origine-2) et l'espace du cours (/cours/origine2).

export interface Semaine {
  n: string;        // la valeur gardée sur la leçon (champ `mois`)
  rang: number;     // 1 à 12
  label: string;    // « Semaine 1 »
  pilier: 1 | 2 | 3;
}

export const PILIERS_ORIGINE2 = [
  { rang: 1 as const, roman: 'Pilier I', semaines: 'Semaines 1 à 4', titre: 'Ce que le corps essaie de dire' },
  { rang: 2 as const, roman: 'Pilier II', semaines: 'Semaines 5 à 8', titre: 'Ce qui vous appartient vraiment' },
  { rang: 3 as const, roman: 'Pilier III', semaines: 'Semaines 9 à 12', titre: 'Le retour au point d’origine' },
];

export const SEMAINES: Semaine[] = Array.from({ length: 12 }, (_, i) => ({
  n: `semaine-${i + 1}`,
  rang: i + 1,
  label: `Semaine ${i + 1}`,
  pilier: (i < 4 ? 1 : i < 8 ? 2 : 3) as 1 | 2 | 3,
}));

// La cohorte ouvre en janvier 2027 (page /origine). Tant que l'admin n'a pas
// posé de date exacte, le 10 janvier 2027 sert de repère.
export const DEBUT_ORIGINE2_DEFAUT = '2027-01-10';

export function dateDebut(dateSortie?: string | null): Date {
  const [a, m, j] = (dateSortie || DEBUT_ORIGINE2_DEFAUT).split('-').map(Number);
  return new Date(a, (m || 1) - 1, j || 1);
}

/** Le rang (0 à 11) de la semaine en cours, -1 avant le départ, 11 après la douzième. */
export function semaineOuverteRang(dateSortie?: string | null, date = new Date()): number {
  const debut = dateDebut(dateSortie);
  if (date < debut) return -1;
  const jours = Math.floor((date.getTime() - debut.getTime()) / 86400000);
  return Math.min(11, Math.floor(jours / 7));
}

export const rangSemaine = (n?: string) => (n ? SEMAINES.findIndex(s => s.n === n) : -1);

export function labelDebut(dateSortie?: string | null): string {
  if (!dateSortie) return 'Début en janvier 2027';
  const d = dateDebut(dateSortie);
  return `Début le ${d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}
