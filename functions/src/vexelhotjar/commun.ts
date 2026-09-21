import { createHash } from 'crypto';


// ─── VexelHotjar : la mesure du comportement des visiteurs ──────────────────
// Le module maison qui remplace Hotjar : le petit script du site
// (src/vexelhotjar/tracker.ts) envoie ses lots d'événements ici, à l'adresse
// /api/vh que l'hébergement réécrit vers cette fonction. Rien ne part du
// navigateur avant le consentement aux témoins, aucune adresse IP n'est
// gardée, et les enregistrements de session masquent tout ce qui se tape.
//
// Trois portes et deux horloges :
//   vhCollecter          reçoit les lots (clics, vues, défilement, erreurs,
//                        formulaires) et les morceaux d'enregistrement rrweb
//   vhAgreger            toutes les 15 minutes, fond les lots dans les
//                        journées (vh_jours) et les cartes (vh_cartes)
//   vhAgregerMaintenant  le bouton « Rafraîchir » de l'admin, même travail
//   vhEffacerSession     l'admin retire une session et son enregistrement
//   vhPurger             chaque nuit, jette ce qui a dépassé sa durée de vie
//
// Collections : vh_lots (brut, quelques jours), vh_sessions (une fiche par
// visite, 90 jours), vh_jours (une fiche par jour et par site, 400 jours),
// vh_cartes (les points des cartes de chaleur par page, appareil et jour).
// Les enregistrements vivent dans Storage sous vh/replays/<session>/<n>.json.gz.
//
// Ce dossier se lit en trois fichiers : commun.ts (constantes et petites
// mains), collecte.ts (la porte d'entrée) et agregation.ts (les horloges et
// les portes d'administration). index.ts rassemble les exports.

export const SITES_PERMIS = ['krystine'];
export const ORIGINES_DEV = ['http://localhost:5173', 'http://localhost:5199', 'http://127.0.0.1:5173'];
export const TAILLE_MAX_LOT = 1_000_000;         // un lot d'événements ne dépasse jamais 1 Mo
export const TAILLE_MAX_REPLAY = 6_000_000;      // un morceau d'enregistrement, gzippé ou non
export const EVENEMENTS_MAX = 600;
export const POINTS_CLICS_MAX = 4000;            // par carte (page × appareil × jour)
export const POINTS_MOUV_MAX = 3000;
export const RETENTION_LOTS_JOURS = 3;
export const RETENTION_SESSIONS_JOURS = 90;
export const RETENTION_JOURS_JOURS = 400;


export type Device = 'mobile' | 'tablette' | 'ordinateur';

// ─── Petites mains ──────────────────────────────────────────────────────────

export const texte = (v: unknown, max: number): string => String(v ?? '').slice(0, max);
// Un chemin de page vient du navigateur du visiteur, donc de n'importe qui :
// on ne garde qu'un chemin relatif propre (une seule barre au début, lettres,
// chiffres, tirets, points et barres), sans requête ni hôte, pour que l'admin
// puisse l'ouvrir en cadre sans jamais pointer ailleurs que sur le site.
export function cheminSur(v: unknown): string {
  const brut = String(v ?? '').split(/[?#]/)[0].replace(/\\/g, '/');
  if (!brut.startsWith('/') || brut.startsWith('//')) return '/';
  const propre = brut.replace(/[^a-zA-Z0-9\-._~/%]/g, '').replace(/\/{2,}/g, '/').replace(/\/+$/, '').slice(0, 200);
  return propre || '/';
}
export const nombre = (v: unknown, min: number, max: number, defaut = 0): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
};
// Hexadécimal seulement : la clé sert de segment de chemin dans un update() pointé.
export const hash = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 10);

/** Une clé de champ Firestore sûre pour un chemin de page : /formations/vata → formations_vata. */
export function clePage(path: string): string {
  const c = path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return c || 'accueil';
}

export function jourDe(ms: number): string {
  // Le jour se compte à l'heure de Montréal, comme le reste de l'admin.
  return new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' });
}

const FORMAT_HEURE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', hour: '2-digit', hourCycle: 'h23' });
export function heureDe(ms: number): number {
  return Number(FORMAT_HEURE.format(new Date(ms))) || 0;
}
export const TAGS_INTERACTIFS = new Set(['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'video', 'audio']);

export function deviceDe(vw: number): Device {
  if (vw < 768) return 'mobile';
  if (vw < 1100) return 'tablette';
  return 'ordinateur';
}

export function hoteDe(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// Une cadence par adresse (hachée avec un sel du jour, jamais gardée) :
// 240 requêtes par minute et par instance, largement au-dessus d'une vraie
// visite, assez bas pour qu'un script qui boucle ne remplisse pas la base.
