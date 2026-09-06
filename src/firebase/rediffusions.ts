import { db } from '../firebase';
import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore';

// ─── Rediffusions des directs ────────────────────────────────────────────────
// Une archive par vidéo YouTube, écrite par scripts/rediffusions/archiver.mjs :
// la fiche dans rediffusions/{videoId}; le clavardage du direct et les
// commentaires dans la sous-collection pages (documents clavardage-n et
// commentaires-n, par paquets de 400). Les membres connectés lisent, l'admin
// écrit (règles Firestore).

export interface Rediffusion {
  id: string;
  videoId: string;
  url: string;
  titre: string;
  titreYouTube?: string;
  description?: string;
  chaine?: string;
  vignette?: string;
  duree: number;                // secondes
  publieLe?: Timestamp;
  vues?: number;
  jaimes?: number;
  nbCommentaires: number;
  nbMessages: number;
  liveEventId?: string;
}

/** Un message du clavardage pendant le direct. */
export interface MessageDirect {
  id: string;
  auteur: string;
  photo?: string;
  texte: string;
  decalage: number;             // secondes depuis le début de la vidéo
  role?: 'hote' | 'moderation' | 'membre';
  montant?: string;             // Super Chat
}

/** Un commentaire publié sous la vidéo, après le direct. */
export interface Commentaire {
  id: string;
  parent?: string;              // identifiant du commentaire auquel il répond
  auteur: string;
  photo?: string;
  texte: string;
  publieLe: number;             // secondes Unix, à la journée près
  jaimes: number;
  hote?: boolean;
}

export interface ArchivesRediffusion { clavardage: MessageDirect[]; commentaires: Commentaire[] }

export async function getRediffusions(): Promise<Rediffusion[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'rediffusions'), orderBy('publieLe', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Rediffusion));
}

export async function getArchivesRediffusion(id: string): Promise<ArchivesRediffusion> {
  const out: ArchivesRediffusion = { clavardage: [], commentaires: [] };
  if (!db) return out;
  const snap = await getDocs(query(collection(db, 'rediffusions', id, 'pages'), orderBy('index')));
  for (const d of snap.docs) {
    const p = d.data() as { type: string; items: unknown[] };
    if (p.type === 'clavardage') out.clavardage.push(...(p.items as MessageDirect[]));
    else if (p.type === 'commentaires') out.commentaires.push(...(p.items as Commentaire[]));
  }
  return out;
}
