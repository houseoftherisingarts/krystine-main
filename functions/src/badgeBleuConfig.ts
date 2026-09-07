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

// ─── La deuxième roue, celle du Foyer ────────────────────────────────────────
// Le module « Le Foyer double vos jours » est retiré (Alex, 7 septembre 2026).
// À sa place : au même geste quotidien, une membre du Foyer d'Origine
// (achatsFormations/{uid}/formations/foyer ou members.accesVie, jugé par le
// serveur) tourne une SECONDE roue de sept jours, avec des cadeaux qui
// n'existent que là. Le jour est celui de la roue du site (memberPoints.serie,
// le compteur de jours consécutifs), les cadeaux sont autres. Un mois complet
// de présence garde son grand cadeau, plus bas.
export const FOYER_MOIS_JOURS = 30;
export const KIND_FOYER_ROUE = 'foyer-roue';
export const KIND_FOYER_MOIS = 'foyer-mois';
export const cleFoyerRoue = (uid: string, jour: string) => `${KIND_FOYER_ROUE}:${uid}:${jour}`;
export const cleFoyerMois = (uid: string, jour: string) => `${KIND_FOYER_MOIS}:${uid}:${jour}`;
export const LIBELLE_FOYER = { fr: 'Foyer d’Origine', en: 'Origine Hearth' } as const;

/** Ce que donne une case de la roue du Foyer. Tout existe déjà ailleurs sur le site. */
export type CadeauRoueFoyer =
  | { genre: 'niskas'; montant: number }
  | { genre: 'cle' }
  | { genre: 'coffre'; coffre: 'bronze' | 'argent'; avecCle: boolean }
  | { genre: 'musique'; niskasSiDeja: number };

/** `fr`/`en` : la phrase entière (survol, message). `court` : ce qui tient dans
 *  une case de la roue à 390 px, où sept cases se partagent la largeur. */
export interface JourRoueFoyer { cadeau: CadeauRoueFoyer; fr: string; en: string; court: string; courtEn: string }

/** Les sept jours de la roue du Foyer, du plus petit au plus gros. */
export const ROUE_FOYER: JourRoueFoyer[] = [
  { cadeau: { genre: 'niskas', montant: 8 },  fr: '8 niskas', en: '8 niskas', court: '+8', courtEn: '+8' },
  { cadeau: { genre: 'cle' },                 fr: 'Une clé de coffre', en: 'A chest key', court: 'Clé', courtEn: 'Key' },
  { cadeau: { genre: 'niskas', montant: 15 }, fr: '15 niskas', en: '15 niskas', court: '+15', courtEn: '+15' },
  { cadeau: { genre: 'coffre', coffre: 'bronze', avecCle: false }, fr: 'Un coffre de bronze', en: 'A bronze chest', court: 'Coffre', courtEn: 'Chest' },
  { cadeau: { genre: 'niskas', montant: 25 }, fr: '25 niskas', en: '25 niskas', court: '+25', courtEn: '+25' },
  { cadeau: { genre: 'musique', niskasSiDeja: 40 }, fr: 'La musique d’Origine', en: 'The Origin music', court: 'Musique', courtEn: 'Music' },
  { cadeau: { genre: 'coffre', coffre: 'argent', avecCle: true }, fr: 'Un coffre d’argent et sa clé', en: 'A silver chest and its key', court: 'Grand coffre', courtEn: 'Big chest' },
];

/** Le jour de la roue (1 à 7) pour une suite de `serie` jours consécutifs. */
export const jourDeRoue = (serie: number) => ((Math.max(1, serie) - 1) % ROUE_FOYER.length) + 1;

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

export const estJourMoisFoyer = (serie: number) => serie > 0 && serie % FOYER_MOIS_JOURS === 0;

/** Le cadeau du mois pour une suite de `serie` jours, `serie` étant un multiple de 30 (30 → musique, 60 → skin, 90 → rabais, 120 → musique…). */
export function cadeauFoyerDuMois(serie: number): EtapeCycleFoyer {
  const mois = Math.max(1, Math.floor(serie / FOYER_MOIS_JOURS));
  return CYCLE_FOYER_MOIS[(mois - 1) % CYCLE_FOYER_MOIS.length];
}

/** Ce que le client affiche : dans combien de jours tombe le prochain cadeau du mois, et lequel. */
export function prochainsCadeauxFoyer(serie: number): { moisDans: number; prochainMois: EtapeCycleFoyer } {
  const s = Math.max(0, serie);
  const moisDans = FOYER_MOIS_JOURS - (s % FOYER_MOIS_JOURS);
  return { moisDans, prochainMois: cadeauFoyerDuMois(s + moisDans) };
}

/** Auto-test du cycle (appelé une fois au chargement du module serveur). */
export function verifierCycleFoyer(): void {
  if (cadeauFoyerDuMois(30).id !== 'musique' || cadeauFoyerDuMois(60).id !== 'skin-rare' || cadeauFoyerDuMois(90).id !== 'rabais-huile' || cadeauFoyerDuMois(120).id !== 'musique') throw new Error('Le cycle des mois du Foyer ne suit pas 30/60/90.');
  if (!estJourMoisFoyer(30) || estJourMoisFoyer(29)) throw new Error('Les jours de cadeau du Foyer ne tombent pas au bon multiple.');
  const p = prochainsCadeauxFoyer(6);
  if (p.moisDans !== 24 || p.prochainMois.id !== 'musique') throw new Error('La progression vers le prochain cadeau du Foyer est fausse.');
  if (ROUE_FOYER.length !== 7) throw new Error('La roue du Foyer ne compte pas sept jours.');
  if (jourDeRoue(1) !== 1 || jourDeRoue(7) !== 7 || jourDeRoue(8) !== 1 || jourDeRoue(0) !== 1) throw new Error('Le jour de la roue du Foyer ne tourne pas sur sept.');
  if (RABAIS_HUILE_FOYER.pourcent > RABAIS_HUILE_FOYER.plafondPourcent) throw new Error('Le rabais du Foyer dépasse son plafond.');
}
