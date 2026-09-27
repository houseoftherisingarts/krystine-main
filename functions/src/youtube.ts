import { onRequest } from 'firebase-functions/v2/https';

// ─── Les vidéos de la chaîne YouTube, lues par le serveur (27 sept. 2026) ────
// Le flux public de YouTube refuse le navigateur, et le relais allorigins qui
// servait d'intermédiaire répond maintenant 500. Le site lit donc la chaîne
// ici, sur /api/youtube : la page podcast et les pages médias se mettent à jour
// seules dès qu'une vidéo paraît. Le CDN garde la réponse quinze minutes.
const CHAINE = 'UCjFhOsr-qy8tERbRW2XUScA';
const FLUX = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHAINE}`;

const decode = (s: string) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export const youtubeVideos = onRequest(
  { region: 'us-central1', maxInstances: 5 },
  async (_req, res) => {
    try {
      const r = await fetch(FLUX);
      if (!r.ok) throw new Error(`YouTube ${r.status}`);
      const xml = await r.text();
      const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
        const champ = (re: RegExp) => decode(re.exec(e)?.[1]?.trim() || '');
        const id = champ(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        return {
          id,
          title: champ(/<title>([\s\S]*?)<\/title>/),
          published: champ(/<published>([^<]+)<\/published>/),
          thumbnail: champ(/<media:thumbnail url="([^"]+)"/) || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
          description: champ(/<media:description>([\s\S]*?)<\/media:description>/),
        };
      }).filter(v => v.id);
      res.set('Cache-Control', 'public, max-age=300, s-maxage=900');
      res.json({ videos });
    } catch (e) {
      console.warn('[youtubeVideos]', e);
      res.set('Cache-Control', 'no-store');
      res.status(502).json({ videos: [] });
    }
  },
);
