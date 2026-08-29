import { doc, getDoc, type Timestamp } from 'firebase/firestore';
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
};

export interface MesBadges { obtenus: Record<string, Timestamp>; exposes?: string[]; }

export async function getBadgesDe(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'badges', uid));
  if (!snap.exists()) return [];
  const data = snap.data() as MesBadges;
  return Object.keys(data.obtenus || {}).filter(id => CATALOGUE_BADGES[id]);
}
