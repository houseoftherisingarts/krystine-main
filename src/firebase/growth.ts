// Le Growth module : recherche de clientes potentielles en francophonie et en
// anglophonie pour le marché des femmes de 45 à 64 ans. Les presets et le
// catalogue vivent dans Firestore (admin seulement); chaque recherche est un
// document growthRuns/{id} que la fonction growthTravailler remplit.
// Plan : Onyx › 10_projects/krystine/growth-module-plan-2026-09-20.md
import app, { db } from '../firebase';
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type Espace = 'fr' | 'en';
export type TypePreset = 'audience' | 'format';
export type Intention = 'segments' | 'pitchs' | 'offres' | 'campagne';
export type Registre = 'educatif' | 'inspirant' | 'personnel' | 'preuve';

// Les quatre registres qui font grandir une audience. Une audience fidèle se
// construit avec les quatre; n'en publier qu'un seul fait plafonner.
export const REGISTRES: Record<Registre, { label: string; definition: string }> = {
  educatif: { label: 'Éducatif', definition: 'Elle apprend quelque chose d\'utile et d\'applicable.' },
  inspirant: { label: 'Inspirant', definition: 'Vous partagez une vision, une vérité, un changement de perspective.' },
  personnel: { label: 'Personnel', definition: 'Vous révélez votre parcours, vos erreurs, vos apprentissages.' },
  preuve: { label: 'Preuve', definition: 'Vous montrez des résultats, des témoignages, des transformations.' },
};

export const ESPACES: Record<Espace, { label: string; pays: string; langue: string }> = {
  fr: { label: 'Francophonie', pays: 'Québec, France, Belgique, Suisse romande', langue: 'français' },
  en: { label: 'Anglophonie', pays: 'Canada anglais, États-Unis, Royaume-Uni, Australie', langue: 'anglais' },
};

export const INTENTIONS: Record<Intention, { label: string; aide: string }> = {
  segments: { label: 'Trouver des segments', aide: 'Dresser le portrait des femmes à rejoindre, avec leurs mots et leur taille estimée.' },
  pitchs: { label: 'Écrire les pitchs', aide: 'Un brouillon par segment, dans la voix de Krystine, prêt pour un gabarit.' },
  offres: { label: 'Imaginer des offres', aide: 'Des pistes classées par colonne A ou B, reliées aux jalons du plan.' },
  campagne: { label: 'Préparer une campagne YouTube', aide: 'Audiences, formats, budget indicatif, accroches et scripts.' },
};

export interface PresetAudience {
  id?: string;
  espace: Espace;
  type: 'audience';
  nom: string;
  description: string;
  pays: string;
  ages: string;
  affinites: string;
  contextes: string;
  motsCles: string;
  remarketing?: boolean;
  defaut?: boolean;
  ordre?: number;
}

export interface PresetFormat {
  id?: string;
  espace: Espace;
  type: 'format';
  nom: string;
  description: string;
  duree: string;
  budgetJour: string;
  cout: string;
  accroche: string;
  defaut?: boolean;
  ordre?: number;
}

export type Preset = PresetAudience | PresetFormat;

export interface ProduitCatalogue {
  id: string;
  nom: string;
  adresse: string;
  description: string;
  colonne: 'entree' | 'A' | 'B' | 'suite';
  prix?: number | null;
  actif: boolean;
  ordre?: number;
}

export interface Segment { nom: string; portrait: string; dejaEssaye: string; ceQuiFaitDireOui: string; taille: string; motsTapes: string[]; affinite: string }
export interface Association { segment: string; entree: string; coeur: string; suite: string; raison: string }
export interface Pitch { segment: string; titre: string; accroches: string[]; texte: string; script15s: string }
export interface Offre { nom: string; colonne: 'A' | 'B'; marche: string; description: string; prixObserves: string; jalon: string }
export interface Campagne { audiences: string[]; formats: string[]; budgetIndicatif: string; accroches: string[]; scripts: { duree: string; texte: string }[]; interdits: string[]; modeEmploi: string[] }
export interface Source { titre: string; url: string; note?: string }
export interface IdeeContenu { titre: string; angle: string; format: string; appel: string }
export interface ContenuRegistre { registre: string; idees: IdeeContenu[] }
export interface JourMix { jour: string; registre: string; quoi: string }

export interface ResultatRun {
  segments: Segment[];
  associations: Association[];
  pitchs: Pitch[];
  offres: Offre[];
  campagne: Campagne | null;
  sources: Source[];
  contenus?: ContenuRegistre[];
  mixSemaine?: JourMix[];
  avertissements?: string[];
}

export interface GrowthRun {
  id: string;
  espace: Espace;
  intention: Intention;
  audience: Omit<PresetAudience, 'id'>;
  produits: ProduitCatalogue[];
  format: Omit<PresetFormat, 'id'> | null;
  statut: 'en_attente' | 'en_cours' | 'termine' | 'erreur';
  progression?: string;
  erreur?: string;
  creeLe?: Timestamp;
  termineLe?: Timestamp;
  cout?: { entree: number; sortie: number; recherches: number; dollars: number; modele: string };
  resultat?: ResultatRun;
}

export const PLAFOND_JOUR = 20;

// ─── Presets de départ (plan, section 3) ─────────────────────────────────────
export const AUDIENCES_DEPART: Omit<PresetAudience, 'id'>[] = [
  {
    espace: 'fr', type: 'audience', defaut: true, ordre: 1,
    nom: 'Femmes de 45 à 64 ans au Québec, bien-être et lecture',
    description: 'Elles cherchent des repères pour la seconde moitié de leur vie : plus d\'énergie, un meilleur sommeil, un rituel du matin qui tient, et une voix en qui avoir confiance.',
    pays: 'Québec (Canada), français', ages: '45 à 64 ans, femmes',
    affinites: 'Santé et forme physique; Beauté et bien-être; Lecteurs avides',
    contextes: 'Chaînes de yoga doux et de méditation; entrevues d\'autrices; cuisine de saison',
    motsCles: 'énergie, sommeil, repères, rituel du matin, seconde moitié de vie, ayurveda au quotidien',
  },
  {
    espace: 'fr', type: 'audience', defaut: true, ordre: 2,
    nom: 'Femmes de 45 à 64 ans en France et en Belgique, naturel et médecines douces',
    description: 'Elles lisent sur la naturopathie et la phytothérapie, écoutent des podcasts de santé au naturel et se méfient des promesses trop rapides.',
    pays: 'France, Belgique, Suisse romande, français', ages: '45 à 64 ans, femmes',
    affinites: 'Santé et forme physique; Beauté et bien-être; Lecteurs avides',
    contextes: 'Naturopathie; phytothérapie; podcasts de santé au naturel; slow living',
    motsCles: 'naturel, plantes, saison, équilibre, rituel, énergie, sommeil',
  },
  {
    espace: 'fr', type: 'audience', defaut: true, ordre: 3, remarketing: true,
    nom: 'Déjà proches : visiteuses du site et abonnées',
    description: 'Elles connaissent déjà Krystine. Le message peut aller droit au Foyer d\'Origine et à l\'Expérience Origine.',
    pays: 'Toute la francophonie', ages: 'Toutes, femmes et hommes',
    affinites: 'Liste des visiteuses du site; liste des abonnées à l\'infolettre (listes autorisées, le site n\'est pas une page de santé)',
    contextes: 'Remarketing seulement', motsCles: '',
  },
  {
    espace: 'en', type: 'audience', defaut: true, ordre: 1,
    nom: 'Women 45 to 64, Canada and US, natural wellness and books',
    description: 'They read, they listen to author podcasts, and they want a steady morning ritual and more energy for the second half of life.',
    pays: 'Canada (English), United States, English', ages: '45 to 64, women',
    affinites: 'Health & Fitness; Beauty & Wellness; Avid Readers',
    contextes: 'Gentle yoga and everyday ayurveda channels; author podcasts; seasonal cooking',
    motsCles: 'energy, sleep, second half of life, morning ritual, seasonal living, ayurveda',
  },
  {
    espace: 'en', type: 'audience', defaut: true, ordre: 2,
    nom: 'Women 45 to 64, UK and Australia, retreats and slow living',
    description: 'Drawn to retreats, slow living and seasonal food; they trust a published author with a body of work more than an app.',
    pays: 'United Kingdom, Australia, English', ages: '45 to 64, women',
    affinites: 'Health & Fitness; Beauty & Wellness; Avid Readers',
    contextes: 'Retreats; slow living; seasonal cooking; nature and walking channels',
    motsCles: 'retreat, slow living, seasonal, energy, sleep, ritual',
  },
];

export const FORMATS_DEPART: Omit<PresetFormat, 'id'>[] = [
  { espace: 'fr', type: 'format', defaut: true, ordre: 1, nom: 'YouTube Shorts', description: 'Une prise de parole courte, verticale, qui montre Krystine et une idée claire.', duree: '15 à 30 secondes', budgetJour: '10 à 20 $ par jour pendant quatorze jours (estimation)', cout: 'CPM de 2 à 5 $ (indicatif 2026)', accroche: 'Une phrase qui nomme ce que la femme vit à ce moment de sa vie, puis une image de saison.' },
  { espace: 'fr', type: 'format', defaut: true, ordre: 2, nom: 'InStream désactivable', description: 'L\'annonce avant une vidéo, que la personne peut passer après cinq secondes : les cinq premières secondes portent tout.', duree: '30 à 60 secondes', budgetJour: '10 à 20 $ par jour pendant quatorze jours (estimation)', cout: 'CPV de 0,03 à 0,12 $ (indicatif 2026)', accroche: 'Le visage et la voix de Krystine dès la première seconde, une question de vie, pas un symptôme.' },
  { espace: 'fr', type: 'format', defaut: true, ordre: 3, nom: 'Demand Gen (In-feed)', description: 'Une vignette et un titre dans le fil, la page d\'accueil YouTube et Gmail : le format de la découverte.', duree: 'Vignette + vidéo de 1 à 3 minutes', budgetJour: '10 à 20 $ par jour pendant quatorze jours (estimation)', cout: 'CPM de 5 à 10 $, 10 à 25 $ sur intentions d\'achat (indicatif 2026)', accroche: 'Un titre qui promet un repère concret (un rituel, une lecture du corps), jamais un traitement.' },
  { espace: 'en', type: 'format', defaut: true, ordre: 1, nom: 'YouTube Shorts', description: 'A short vertical take: Krystine on camera, one clear idea.', duree: '15 to 30 seconds', budgetJour: '$10 to $20 a day for fourteen days (estimate)', cout: 'CPM $2 to $5 (indicative 2026)', accroche: 'One line that names what she is living right now, then a seasonal image.' },
  { espace: 'en', type: 'format', defaut: true, ordre: 2, nom: 'Skippable in-stream', description: 'The ad before a video, skippable after five seconds: those five seconds carry everything.', duree: '30 to 60 seconds', budgetJour: '$10 to $20 a day for fourteen days (estimate)', cout: 'CPV $0.03 to $0.12 (indicative 2026)', accroche: 'Krystine\'s face and voice from the first second, a life question, never a symptom.' },
  { espace: 'en', type: 'format', defaut: true, ordre: 3, nom: 'Demand Gen (in-feed)', description: 'A thumbnail and a title in the feed, the YouTube home and Gmail: the discovery format.', duree: 'Thumbnail + 1 to 3 minute video', budgetJour: '$10 to $20 a day for fourteen days (estimate)', cout: 'CPM $5 to $10, $10 to $25 on in-market audiences (indicative 2026)', accroche: 'A title that promises a concrete anchor (a ritual, a way to read the body), never a treatment.' },
];

// Le catalogue de départ, tiré du site. Les prix absents du site restent vides :
// le module n'en invente aucun.
export const CATALOGUE_DEPART: ProduitCatalogue[] = [
  { id: 'extrait-5-elements', nom: 'Extrait « Les 5 éléments et leurs qualités »', adresse: '/5elements', description: 'Extrait gratuit du livre Nature & Ayurveda, contre un courriel.', colonne: 'entree', prix: 0, actif: true, ordre: 1 },
  { id: 'podcast', nom: 'Podcast Au-delà des tendances et ses directs', adresse: '/podcast', description: 'La voix de Krystine en continu, avec les directs YouTube et leurs rediffusions.', colonne: 'entree', prix: 0, actif: true, ordre: 2 },
  { id: 'quiz-dosha', nom: 'Quiz des doshas', adresse: '/quiz', description: 'Une première lecture de soi par les qualités.', colonne: 'entree', prix: 0, actif: true, ordre: 3 },
  { id: 'origine2', nom: 'Expérience Origine 2', adresse: '/origine-2', description: 'Douze semaines pour sortir du pilotage extérieur et retrouver ses propres repères. Lancement à l\'automne 2026.', colonne: 'A', prix: null, actif: true, ordre: 4 },
  { id: 'conferences', nom: 'Conférences (entreprises, associations, événements)', adresse: '/conferenciere', description: 'Krystine sur scène, au Québec, en France, en Belgique et à l\'international.', colonne: 'A', prix: null, actif: true, ordre: 5 },
  { id: 'foyer', nom: 'Le Foyer d\'Origine', adresse: '/foyer', description: 'Le calendrier vivant des douze portes, la communauté et les rendez-vous de l\'année.', colonne: 'B', prix: 497, actif: true, ordre: 6 },
  { id: 'trilogie', nom: 'La trilogie Nature & Ayurveda', adresse: '/medias', description: 'Nature & Ayurveda (2018), Féminité (2021), le tome 3 attendu à l\'automne 2026. Éditions de l\'Homme.', colonne: 'B', prix: null, actif: true, ordre: 7 },
  { id: 'kajabi-2148687644', nom: 'Expérience Ayurveda : saison Vata', adresse: '/cours', description: 'Sept semaines pour apaiser le mental par les cinq sens.', colonne: 'B', prix: 397, actif: true, ordre: 8 },
  { id: 'kajabi-2149362090', nom: 'Parcours Santé Parfaite : Énergie et Clarté', adresse: '/cours', description: 'Masterclass structurée pour recharger l\'énergie et retrouver la clarté.', colonne: 'B', prix: 197, actif: true, ordre: 9 },
  { id: 'masterclass-gestion-stress', nom: 'Gestion du stress par l\'aromathérapie et l\'Ayurveda', adresse: '/cours', description: 'Le nez comme porte directe vers le système nerveux.', colonne: 'B', prix: 197, actif: true, ordre: 10 },
  { id: 'inspirata', nom: 'Inspirata Nature (huiles et sérums)', adresse: '/boutique', description: 'La matière qui accompagne : huiles et sérums, sur la boutique.', colonne: 'suite', prix: null, actif: true, ordre: 11 },
  { id: 'livre-anglais', nom: 'Le livre anglais (horizon 2027)', adresse: '', description: 'L\'entrée en anglophonie par le livre et les droits étrangers, prévue au plan pour 2027.', colonne: 'suite', prix: null, actif: false, ordre: 12 },
];

// Les jalons du plan KSL Automne 2026 (infographie du 15 septembre), tels quels.
export const JALONS_PLAN = [
  'Phase 1 (15 au 27 septembre) : architecture et cash immédiat, offre, prix, parcours, page de vente.',
  'Phase 2 (28 septembre au 11 octobre) : réactivation des audiences, anciennes EO, liste courriel, premières ventes.',
  'Phase 3 (12 au 25 octobre) : nurture organisé, podcast, lettre, clips, page, FAQ, témoignages.',
  'Phase 4 (26 octobre au 8 novembre) : découverte et acquisition, événement live ou série, attirer de nouvelles clientes.',
  'Phase 5 (9 au 22 novembre) : pré-lancement, séquence, preuves et histoires, questions et objections.',
  'Phase 6 (23 au 27 novembre) : Tallinn, pilote automatique, courriels programmés.',
  'Phase 7 (28 novembre au 1er décembre) : ouverture principale, lancement EO2, lives si besoin.',
  'Tournée de conférences 2026-2027 : Québec (TEDxQuébec, entreprises, associations), France, Belgique, international (TCCHE), Dream 50/60.',
  'Parké pour plus tard : nouveau programme, refonte du positionnement, expansion Pure Human, livre anglais 2027.',
];

// ─── Firestore ───────────────────────────────────────────────────────────────
const noDb = () => { throw new Error('Firestore n\'est pas configuré.'); };

export async function getPresets(espace: Espace): Promise<Preset[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'growthPresets'), where('espace', '==', espace)));
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Preset, 'id'>) })) as Preset[];
  return items.sort((a, b) => (a.ordre || 99) - (b.ordre || 99) || a.nom.localeCompare(b.nom));
}

export async function savePreset(p: Preset): Promise<string> {
  if (!db) noDb();
  const { id, ...data } = p;
  if (id) { await updateDoc(doc(db!, 'growthPresets', id), { ...data, updatedAt: serverTimestamp() } as any); return id; }
  const ref = await addDoc(collection(db!, 'growthPresets'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export const deletePreset = (id: string) => { if (!db) noDb(); return deleteDoc(doc(db!, 'growthPresets', id)); };

export async function getCatalogue(): Promise<ProduitCatalogue[]> {
  if (!db) return [];
  const snap = await getDocs(collection(db, 'growthCatalogue'));
  return snap.docs.map(d => ({ ...(d.data() as ProduitCatalogue), id: d.id })).sort((a, b) => (a.ordre || 99) - (b.ordre || 99));
}

export async function saveProduit(p: ProduitCatalogue) {
  if (!db) noDb();
  const { id, ...data } = p;
  return setDoc(doc(db!, 'growthCatalogue', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Pose les presets et le catalogue de départ quand les collections sont vides. */
export async function semerDepart(): Promise<{ presets: number; produits: number }> {
  if (!db) noDb();
  let presets = 0, produits = 0;
  const p = await getDocs(collection(db!, 'growthPresets'));
  if (p.empty) {
    for (const a of [...AUDIENCES_DEPART, ...FORMATS_DEPART]) { await addDoc(collection(db!, 'growthPresets'), { ...a, createdAt: serverTimestamp() }); presets++; }
  }
  const c = await getDocs(collection(db!, 'growthCatalogue'));
  if (c.empty) {
    for (const pr of CATALOGUE_DEPART) { const { id, ...data } = pr; await setDoc(doc(db!, 'growthCatalogue', id), { ...data, createdAt: serverTimestamp() }); produits++; }
  }
  return { presets, produits };
}

export function ecouterRuns(espace: Espace, cb: (runs: GrowthRun[]) => void) {
  if (!db) return () => {};
  // Un seul filtre dans la requête : « espace » plus « creeLe » trié demanderait un index composé. Le tri se fait ici.
  const q = query(collection(db, 'growthRuns'), where('espace', '==', espace));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<GrowthRun, 'id'>) })).sort((a, b) => (b.creeLe?.toMillis() || 0) - (a.creeLe?.toMillis() || 0))), () => cb([]));
}

export const supprimerRun = (id: string) => { if (!db) noDb(); return deleteDoc(doc(db!, 'growthRuns', id)); };

export async function compterAujourdhui(): Promise<number> {
  if (!db) return 0;
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  const snap = await getDocs(query(collection(db, 'growthRuns'), where('creeLe', '>=', debut)));
  return snap.size;
}

// ─── Fonctions ───────────────────────────────────────────────────────────────
export async function lancerRecherche(payload: { espace: Espace; intention: Intention; audienceId: string; produitIds: string[]; formatId: string | null }): Promise<string> {
  const call = httpsCallable<typeof payload, { runId: string }>(getFunctions(app, 'us-central1'), 'growthLancer');
  const r = await call(payload);
  return r.data.runId;
}

export async function envoyerVersGabarit(runId: string, index: number): Promise<string> {
  const call = httpsCallable<{ runId: string; index: number }, { gabaritId: string }>(getFunctions(app, 'us-central1'), 'growthVersGabarit');
  const r = await call({ runId, index });
  return r.data.gabaritId;
}
