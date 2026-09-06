// Le catalogue des vidéos de la chaîne YouTube de Krystine, pour la petite
// boutique. Crawle avec yt-dlp (vidéos, courts, directs, listes de lecture)
// et écrit public/compte/videos-krystine.json : chaque vidéo avec son titre,
// sa durée, sa date, ses vues, sa vignette et les listes où elle figure.
// Relancer quand la chaîne bouge : node scripts/youtube-catalogue.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHAINE = 'UCjFhOsr-qy8tERbRW2XUScA';
const ici = path.dirname(fileURLToPath(import.meta.url));
const sortie = path.join(ici, '..', 'public', 'compte', 'videos-krystine.json');

function plat(url) {
  try {
    const json = execFileSync('yt-dlp', ['--flat-playlist', '-J', url], { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(String(json)) || { entries: [] };
  } catch {
    return { entries: [] };
  }
}

const videos = new Map();
for (const onglet of ['videos', 'shorts', 'streams']) {
  const d = plat(`https://www.youtube.com/channel/${CHAINE}/${onglet}`);
  for (const e of d.entries || []) {
    if (!e?.id || videos.has(e.id)) continue;
    videos.set(e.id, {
      id: e.id,
      titre: (e.title || '').trim(),
      duree: Math.round(e.duration || 0),
      publieLe: e.timestamp ? new Date(e.timestamp * 1000).toISOString().slice(0, 10) : '',
      vues: e.view_count || 0,
      onglet,
      listes: [],
    });
  }
  console.log(onglet, d.entries?.length || 0);
}

const listes = [];
const dl = plat(`https://www.youtube.com/channel/${CHAINE}/playlists`);
for (const l of dl.entries || []) {
  if (!l?.id) continue;
  const d = plat(`https://www.youtube.com/playlist?list=${l.id}`);
  const ids = (d.entries || []).map((e) => e?.id).filter(Boolean);
  listes.push({ id: l.id, titre: (l.title || '').trim(), nb: ids.length });
  for (const id of ids) {
    const v = videos.get(id);
    if (v) v.listes.push(l.id);
    else if (d.entries) {
      const e = d.entries.find((x) => x?.id === id);
      videos.set(id, {
        id, titre: (e?.title || '').trim(), duree: Math.round(e?.duration || 0), publieLe: '', vues: e?.view_count || 0, onglet: 'liste', listes: [l.id],
      });
    }
  }
  console.log('liste', l.title, ids.length);
}

const tri = [...videos.values()].sort((a, b) => (b.publieLe || '').localeCompare(a.publieLe || ''));
writeFileSync(sortie, JSON.stringify({ chaine: CHAINE, genereLe: new Date().toISOString().slice(0, 10), listes, videos: tri }));
console.log('catalogue', tri.length, 'vidéos,', listes.length, 'listes ->', sortie);
