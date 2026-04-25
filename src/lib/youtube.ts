import { useEffect, useState } from 'react';

// ─── YouTube channel sync ────────────────────────────────────────────────
// Fetch + parse Krystine's YouTube channel Atom feed so any surface of the
// site (MediasPage, TVPage) can render her videos without hardcoding a
// list. No API key needed — we use the public feed over a CORS proxy.
//
// Le flux Atom YouTube refuse les requêtes directes du navigateur, alors
// on passe par allorigins — proxy public, gratuit, fiable. Si ça tombe,
// la page consommatrice peut afficher un embed de la playlist « uploads »
// en fallback (voir UPLOADS_PLAYLIST).

export const CHANNEL_ID       = 'UCjFhOsr-qy8tERbRW2XUScA';
export const UPLOADS_PLAYLIST = 'UU' + CHANNEL_ID.slice(2);
export const CHANNEL_URL      = 'https://www.youtube.com/@KrystineStLaurent';

const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const PROXY   = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(RSS_URL);

export interface YTVideo {
  id: string;
  title: string;
  published: string;  // ISO
  thumbnail: string;
  description: string;
}

// Parse the YouTube Atom feed — tolerant of namespace prefixes by using
// getElementsByTagName throughout (not querySelector which is fussy with
// colons in tag names).
export const parseYouTubeFeed = (xml: string): YTVideo[] => {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const entries = Array.from(doc.getElementsByTagName('entry'));
  return entries.map(e => {
    const id        = e.getElementsByTagName('yt:videoId')[0]?.textContent?.trim() || '';
    const title     = e.getElementsByTagName('title')[0]?.textContent?.trim() || '';
    const published = e.getElementsByTagName('published')[0]?.textContent?.trim() || '';
    const thumb     = e.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') || '';
    // Canonical maxres thumbnail is a safe fallback (always exists).
    const thumbnail = thumb || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
    const description = e.getElementsByTagName('media:description')[0]?.textContent?.trim() || '';
    return { id, title, published, thumbnail, description };
  }).filter(v => v.id);
};

// Small in-memory cache so navigating between MediasPage and TVPage in
// the same session reuses the fetched feed instead of hammering the proxy.
let cache: { videos: YTVideo[]; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchYouTubeVideos(): Promise<YTVideo[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.videos;
  const res = await fetch(PROXY);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = parseYouTubeFeed(xml);
  if (!parsed.length) throw new Error('empty feed');
  cache = { videos: parsed, at: Date.now() };
  return parsed;
}

// Hook — mounts and fetches; exposes a tiny state machine for the consumer.
export function useYouTubeVideos() {
  const [videos, setVideos]   = useState<YTVideo[]>(() => cache?.videos || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (cache && Date.now() - cache.at < CACHE_MS) return;
    (async () => {
      try {
        const list = await fetchYouTubeVideos();
        if (cancelled) return;
        setVideos(list);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'fetch failed');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { videos, loading, error };
}

// ─── TV playlists — curated shelves ─────────────────────────────────────
// Five playlists Krystine surfaces on /medias#tv and /medias/tv. Each one
// gets a dedicated card (thumbnail + title). Click plays the playlist
// embed starting at the lead video.

export interface TVPlaylist {
  videoId: string;
  listId:  string;
  /** Enriched via oEmbed when available; falls back to "Playlist · N". */
  title?:     string;
  thumbnail?: string;
}

// Titles below are the playlist names on Krystine's YouTube channel
// (verified against @KrystineStLaurent on 2026-04-24). Set them explicitly
// so cards don't fall back to the lead video's title — that fallback was
// producing truncated / off-topic strings via oEmbed.
export const TV_PLAYLISTS: TVPlaylist[] = [
  { videoId: 'MAvCIvTtOQs', listId: 'PLzbRvvQ1955XLIoLlgVvvVF5m_bQrIf9M', title: "Dimanches d'Origine" },
  { videoId: 'SCL2b2fj9Ec', listId: 'PLzbRvvQ1955WHyL9pw2GxI-LfVUEH3uML', title: 'Au-delà des tendances · Le Podcast' },
  { videoId: 'PLNCcYoMREE', listId: 'PLzbRvvQ1955WFXyDmDJlRh5RvXe4YqgUs', title: "8 minutes pour s'inspirer à l'infini" },
  { videoId: '2mzipwJcREU', listId: 'PLzbRvvQ1955V897g9jJbpBpyyRwFt8Cs7', title: 'Féminité et Ayurveda (pour elle et lui)' },
  { videoId: 'T-0l6i9wJtk', listId: 'PLzbRvvQ1955XkI7PKCg0BAcUF_fcN97aH', title: 'Apaiser le mental et le stress' },
];

// Fetch a video's title via YouTube's public oEmbed endpoint. Routed
// through the same CORS proxy as the channel feed — returns JSON.
interface VideoMeta { title: string; author: string; thumbnail: string }
const metaCache = new Map<string, VideoMeta>();

export async function fetchVideoMeta(videoId: string): Promise<VideoMeta> {
  const cached = metaCache.get(videoId);
  if (cached) return cached;
  const oembed = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${videoId}&format=json`;
  const proxied = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(oembed);
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const meta: VideoMeta = {
    title: data.title || '',
    author: data.author_name || '',
    thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
  metaCache.set(videoId, meta);
  return meta;
}

// Hook — enriches the static TV_PLAYLISTS array with titles + hi-res
// thumbnails. Always returns a usable array immediately (with hqdefault
// thumbnails as the default); titles trickle in as oEmbed resolves.
export function useTVPlaylists(): TVPlaylist[] {
  const [playlists, setPlaylists] = useState<TVPlaylist[]>(
    () => TV_PLAYLISTS.map(p => ({
      ...p,
      thumbnail: p.thumbnail || `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg`,
    }))
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enriched = await Promise.all(
        TV_PLAYLISTS.map(async (p) => {
          try {
            const meta = await fetchVideoMeta(p.videoId);
            // Preserve the static playlist title when one is set —
            // oEmbed returns the lead VIDEO's title, which doesn't match
            // the playlist's name and was producing the broken-text
            // titles Krystine flagged on 2026-04-24.
            return { ...p, title: p.title || meta.title, thumbnail: meta.thumbnail };
          } catch {
            return { ...p, thumbnail: `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg` };
          }
        })
      );
      if (!cancelled) setPlaylists(enriched);
    })();
    return () => { cancelled = true; };
  }, []);

  return playlists;
}
