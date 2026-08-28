// Écoutes du podcast sur la page.
//
// Deux collections Firestore, écrites par la page publique et lues par l'admin :
//   podcastListens/{auto}       une trace permanente par lecture démarrée
//   podcastPresence/{session}   un battement pendant l'écoute (30 s), la
//                               présence « en direct » = battements < 75 s
import { db } from '../firebase';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

const HEARTBEAT_MS = 30_000;
const LIVE_WINDOW_MS = 75_000;

function sessionId(): string {
  try {
    const k = 'krystine-podcast-session';
    let v = sessionStorage.getItem(k);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/** À appeler quand une lecture démarre : trace permanente + présence. */
export function trackListenStart(episodeId: string, episodeTitle: string): void {
  if (!db) return;
  addDoc(collection(db, 'podcastListens'), {
    episodeId: episodeId.slice(0, 280),
    episodeTitle: episodeTitle.slice(0, 280),
    sessionId: sessionId(),
    startedAt: serverTimestamp(),
  }).catch(() => {});
}

let beat: ReturnType<typeof setInterval> | null = null;
let unloadHooked = false;

/** Battement de présence tant que la lecture roule. */
export function startPresence(episodeId: string, episodeTitle: string): void {
  if (!db) return;
  stopPresenceTimer();
  const write = () =>
    setDoc(doc(db!, 'podcastPresence', sessionId()), {
      episodeId: episodeId.slice(0, 280),
      episodeTitle: episodeTitle.slice(0, 280),
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  write();
  beat = setInterval(write, HEARTBEAT_MS);
  if (!unloadHooked) {
    unloadHooked = true;
    // L'onglet qui se ferme en pleine écoute libère sa place sans attendre
    // les 75 s de la fenêtre de présence.
    window.addEventListener('pagehide', stopPresence);
  }
}

function stopPresenceTimer(): void {
  if (beat) { clearInterval(beat); beat = null; }
}

/** À l'arrêt de la lecture : le battement cesse et la session s'efface. */
export function stopPresence(): void {
  stopPresenceTimer();
  if (!db) return;
  deleteDoc(doc(db, 'podcastPresence', sessionId())).catch(() => {});
}

// ── Côté admin ──

export interface PresenceRow { episodeId: string; episodeTitle: string; lastSeenMs: number; }

/** Suit en direct les sessions à l'écoute (battement plus jeune que 75 s). */
export function subscribeLiveListeners(cb: (rows: PresenceRow[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, 'podcastPresence'),
    snap => {
      const now = Date.now();
      const rows: PresenceRow[] = [];
      snap.forEach(d => {
        const v = d.data() as { episodeId?: string; episodeTitle?: string; lastSeen?: { toMillis(): number } };
        const ms = v.lastSeen?.toMillis?.() ?? 0;
        if (now - ms < LIVE_WINDOW_MS) {
          rows.push({ episodeId: v.episodeId || '', episodeTitle: v.episodeTitle || '', lastSeenMs: ms });
        }
      });
      cb(rows);
    },
    () => cb([]),
  );
}

/** Suit la trace permanente : total et répartition par épisode. */
export function subscribeListenTotals(
  cb: (r: { total: number; parEpisode: { episodeId: string; episodeTitle: string; n: number }[] }) => void,
): Unsubscribe {
  if (!db) { cb({ total: 0, parEpisode: [] }); return () => {}; }
  return onSnapshot(
    collection(db, 'podcastListens'),
    snap => {
      const par = new Map<string, { episodeId: string; episodeTitle: string; n: number }>();
      snap.forEach(d => {
        const v = d.data() as { episodeId?: string; episodeTitle?: string };
        const id = v.episodeId || '?';
        const cur = par.get(id) || { episodeId: id, episodeTitle: v.episodeTitle || '', n: 0 };
        cur.n += 1;
        par.set(id, cur);
      });
      cb({ total: snap.size, parEpisode: [...par.values()].sort((a, b) => b.n - a.n) });
    },
    () => cb({ total: 0, parEpisode: [] }),
  );
}
