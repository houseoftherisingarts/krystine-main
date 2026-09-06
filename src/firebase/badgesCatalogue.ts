import { doc, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Le catalogue des badges honorifiques (les ids posés par functions/badges.ts
// et functions/parrainage.ts). La vitrine du profil les affiche par nom.

export interface BadgeInfo { nom: string; icone: string; }

export const CATALOGUE_BADGES: Record<string, BadgeInfo> = {
  'premiere-flamme':     { nom: 'Première flamme',      icone: 'fa-fire' },
  'bibliotheque-vivante': { nom: 'Bibliothèque vivante', icone: 'fa-book-open' },
  'oeuvre-complete':     { nom: 'L\'Œuvre complète',    icone: 'fa-crown' },
  'premiere-etincelle':  { nom: 'Première étincelle',   icone: 'fa-bolt' },
  'main-tendue':         { nom: 'Main tendue',          icone: 'fa-handshake' },
  'ambassadrice':        { nom: 'Ambassadrice',         icone: 'fa-seedling' },
  'porteuse-flambeau':   { nom: 'Porteuse de flambeau', icone: 'fa-fire-flame-simple' },
  'gardienne-cercle':    { nom: 'Gardienne du cercle',  icone: 'fa-circle-dot' },
  'fondatrice-feu':      { nom: 'Fondatrice d\'un feu', icone: 'fa-sun' },
  // Les badges d'interaction (6 sept. 2026) : ils se gagnent à la parole, au
  // partage et à la présence, comme les badges des groupes Facebook. Les
  // compteurs et les seuils vivent dans functions/src/interactions.ts.
  'voix-du-cercle':      { nom: 'Voix du cercle',       icone: 'fa-comment-dots' },
  'etoile-du-cercle':    { nom: 'Étoile du cercle',     icone: 'fa-star' },
  'plume-du-feu':        { nom: 'Plume du feu',         icone: 'fa-feather-pointed' },
  'coeur-genereux':      { nom: 'Cœur généreux',        icone: 'fa-heart' },
  'oreille-fidele':      { nom: 'Oreille fidèle',       icone: 'fa-headphones' },
  'fidele-au-poste':     { nom: 'Fidèle au poste',      icone: 'fa-calendar-check' },
};

// Comment chaque badge d'interaction se gagne (miroir des seuils serveur).
export const COMMENT_GAGNER_BADGES: Record<string, { fr: string; en: string }> = {
  'voix-du-cercle':   { fr: '25 messages ou commentaires dans les clavardages et le fil', en: '25 messages or comments in chats and the feed' },
  'etoile-du-cercle': { fr: '150 prises de parole et 30 votes donnés', en: '150 contributions and 30 votes given' },
  'plume-du-feu':     { fr: '10 billets publiés sur le fil', en: '10 posts published on the feed' },
  'coeur-genereux':   { fr: '50 votes donnés aux billets et commentaires des autres', en: '50 votes given to others’ posts and comments' },
  'oreille-fidele':   { fr: '20 rediffusions, vidéos ou épisodes écoutés jusqu’au bout', en: '20 replays, videos or episodes listened to the end' },
  'fidele-au-poste':  { fr: '30 journées de retour dans votre espace', en: '30 days back in your space' },
};

export interface MesBadges { obtenus: Record<string, Timestamp>; exposes?: string[]; vedette?: string; }

export async function getBadgesDe(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'badges', uid));
  if (!snap.exists()) return [];
  const data = snap.data() as MesBadges;
  return Object.keys(data.obtenus || {}).filter(id => CATALOGUE_BADGES[id]);
}

/** Le badge que la membre a choisi d'afficher à côté de son nom (sinon le plus récent). */
export async function getBadgeVedetteDe(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'badges', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as MesBadges;
  if (data.vedette && data.obtenus?.[data.vedette] && CATALOGUE_BADGES[data.vedette]) return data.vedette;
  const ids = Object.entries(data.obtenus || {}).filter(([id]) => CATALOGUE_BADGES[id]).sort((a, b) => (b[1]?.toMillis?.() || 0) - (a[1]?.toMillis?.() || 0));
  return ids[0]?.[0] || null;
}

export async function choisirBadgeVedette(uid: string, badgeId: string): Promise<void> {
  await updateDoc(doc(db, 'badges', uid), { vedette: badgeId });
}

// Un seul aller-retour par membre et par session : les clavardages affichent
// des dizaines de noms, le cache évite une lecture par message.
const cacheVedette = new Map<string, Promise<string | null>>();
export function badgeVedetteEnCache(uid: string): Promise<string | null> {
  let p = cacheVedette.get(uid);
  if (!p) { p = getBadgeVedetteDe(uid).catch(() => null); cacheVedette.set(uid, p); }
  return p;
}
export const oublierVedette = (uid: string) => { cacheVedette.delete(uid); };
