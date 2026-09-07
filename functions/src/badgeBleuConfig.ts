// Miroir exact, ligne pour ligne, de src/lib/badgeBleu.ts : le Badge Bleu et
// la couche Foyer de la roue du jour. Une valeur change ici ET là-bas. Les
// fonctions (functions/src/verification.ts, niskas.ts) importent d'ici.
// Le plan complet du chantier : docs/badge-bleu-plan.md.

// ─── Le Badge Bleu ───────────────────────────────────────────────────────────
/** Nombre de programmes payants suivis (achatsFormations ∩ formations.paywall) pour avoir le droit de demander. */
export const SEUIL_PROGRAMMES = 2;
/** Les niskas versés à l'approbation, une seule fois par personne. */
export const NISKAS_BADGE_BLEU = 200;
/** La clé du skin dans SKINS, et l'article dans boutique/{uid}.possede. */
export const ID_SKIN = 'verifie';
export const ARTICLE_SKIN = `skin-${ID_SKIN}`;
/** L'identifiant du badge dans badges/{uid}.obtenus et CATALOGUE_BADGES. */
export const ID_BADGE = 'badge-bleu';
/** Le journal des niskas : kind et clé de déduplication du crédit d'approbation. */
export const KIND_BADGE_BLEU = 'badge-bleu';
export const cleBadgeBleu = (uid: string) => `${KIND_BADGE_BLEU}:${uid}`;

/** La pièce d'identité : image ou PDF, 8 Mo au plus, dans Storage sous verifications/{uid}/piece.<ext>.
 *  Elle est supprimée du Storage à la décision, approuvée ou refusée (Loi 25). */
export const TAILLE_PIECE_MAX = 8 * 1024 * 1024;
export const EXTENSIONS_PIECE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf',
};
export const cheminPiece = (uid: string, ext: string) => `verifications/${uid}/piece.${ext}`;
/** Le serveur n'accepte que ce chemin exact pour l'uid appelant. */
export const cheminPieceValide = (uid: string, chemin: string) =>
  new RegExp(`^verifications/${uid}/piece\\.(${Object.values(EXTENSIONS_PIECE).join('|')})$`).test(chemin);

/** verifications/{uid}.statut */
export type StatutVerification = 'en_attente' | 'approuvee' | 'refusee';

// ─── La couche Foyer de la roue du jour ──────────────────────────────────────
// Une membre du Foyer d'Origine (achatsFormations/{uid}/formations/foyer ou
// members.accesVie, jugé par le serveur) gagne le double à la roue, un cadeau à
// chaque semaine complète de présence et un plus gros à chaque mois complet.
// La base est memberPoints.serie, le compteur de jours consécutifs existant.
export const FOYER_MULTIPLICATEUR = 2;
export const FOYER_HEBDO_JOURS = 7;
export const FOYER_MOIS_JOURS = 30;
/** Le cadeau hebdomadaire : la musique d'Origine si elle manque, sinon ces niskas. */
export const FOYER_NISKAS_HEBDO_SI_MUSIQUE = 25;
export const KIND_FOYER_HEBDO = 'foyer-hebdo';
export const KIND_FOYER_MOIS = 'foyer-mois';
export const cleFoyerHebdo = (uid: string, jour: string) => `${KIND_FOYER_HEBDO}:${uid}:${jour}`;
export const cleFoyerMois = (uid: string, jour: string) => `${KIND_FOYER_MOIS}:${uid}:${jour}`;
export const LIBELLE_FOYER = { fr: '×2 Foyer d’Origine', en: '×2 Foyer d’Origine' } as const;

export type CadeauFoyerMois = 'musique' | 'skin-rare' | 'rabais-huile';
export interface EtapeCycleFoyer { id: CadeauFoyerMois; niskasSiDeja: number | null; fr: string; en: string }
/** Le cycle des mois complets : 30 j → musique, 60 j → skin rare, 90 j → rabais, puis il repart à la musique. */
export const CYCLE_FOYER_MOIS: EtapeCycleFoyer[] = [
  { id: 'musique', niskasSiDeja: 50,
    fr: 'La musique d’Origine, ou 50 niskas si elle est déjà à vous',
    en: 'The Origin music, or 50 niskas if it is already yours' },
  { id: 'skin-rare', niskasSiDeja: 100,
    fr: 'Un skin rare que vous n’avez pas encore, ou 100 niskas si vous les avez tous',
    en: 'A rare skin you do not have yet, or 100 niskas if you own them all' },
  { id: 'rabais-huile', niskasSiDeja: null,
    fr: '30 % sur une huile corporelle, une seule, honoré par Krystine avec un code',
    en: '30% off one body oil, a single one, honoured by Krystine with a code' },
];

/** Le rabais du troisième mois : plafond dur de 30 %, un seul article, jamais plus. */
export const RABAIS_HUILE_FOYER = {
  rewardId: 'reb-huile-foyer-30',
  pourcent: 30,
  plafondPourcent: 30,
  articles: 1,
  labelFR: '30 % sur une huile corporelle (Foyer d’Origine, un seul article)',
  labelEN: '30% off one body oil (Foyer d’Origine, a single item)',
} as const;

export const estJourHebdoFoyer = (serie: number) => serie > 0 && serie % FOYER_HEBDO_JOURS === 0;
export const estJourMoisFoyer = (serie: number) => serie > 0 && serie % FOYER_MOIS_JOURS === 0;

/** Le cadeau du mois pour une suite de `serie` jours, `serie` étant un multiple de 30 (30 → musique, 60 → skin, 90 → rabais, 120 → musique…). */
export function cadeauFoyerDuMois(serie: number): EtapeCycleFoyer {
  const mois = Math.max(1, Math.floor(serie / FOYER_MOIS_JOURS));
  return CYCLE_FOYER_MOIS[(mois - 1) % CYCLE_FOYER_MOIS.length];
}

/** Ce que le client affiche : dans combien de jours tombe le prochain cadeau hebdo et le prochain mensuel, et lequel. */
export function prochainsCadeauxFoyer(serie: number): { hebdoDans: number; moisDans: number; prochainMois: EtapeCycleFoyer } {
  const s = Math.max(0, serie);
  const hebdoDans = FOYER_HEBDO_JOURS - (s % FOYER_HEBDO_JOURS);
  const moisDans = FOYER_MOIS_JOURS - (s % FOYER_MOIS_JOURS);
  return { hebdoDans, moisDans, prochainMois: cadeauFoyerDuMois(s + moisDans) };
}

/** Auto-test du cycle (appelé une fois au chargement du module serveur). */
export function verifierCycleFoyer(): void {
  if (cadeauFoyerDuMois(30).id !== 'musique' || cadeauFoyerDuMois(60).id !== 'skin-rare' || cadeauFoyerDuMois(90).id !== 'rabais-huile' || cadeauFoyerDuMois(120).id !== 'musique') throw new Error('Le cycle des mois du Foyer ne suit pas 30/60/90.');
  if (!estJourHebdoFoyer(7) || estJourHebdoFoyer(8) || !estJourMoisFoyer(30) || estJourMoisFoyer(29)) throw new Error('Les jours de cadeau du Foyer ne tombent pas au bon multiple.');
  const p = prochainsCadeauxFoyer(6);
  if (p.hebdoDans !== 1 || p.moisDans !== 24 || p.prochainMois.id !== 'musique') throw new Error('La progression vers le prochain cadeau du Foyer est fausse.');
  if (RABAIS_HUILE_FOYER.pourcent > RABAIS_HUILE_FOYER.plafondPourcent) throw new Error('Le rabais du Foyer dépasse son plafond.');
}
