/**
 * Le flux RSS du podcast (HelloAudio) et la mise au propre de ses titres.
 * Les titres arrivent en désordre (« S2 EP.5 », « S 2 EP 4: », « S.2 E3: »,
 * « ÉPISODE 35: », tout en capitales...) : la page n'affiche que la version
 * nettoyée, avec la saison et le numéro rangés à part.
 */

const RSS_URL = 'https://podcasts.helloaudio.fm/podcast/8b5de66f-dd99-4ccd-be0a-088c2553719e/Gx891ivJLp';

// Flux direct d'abord : helloaudio sert access-control-allow-origin: *,
// aucun proxy requis. allorigins reste en secours.
const PROXIES: ((u: string) => string)[] = [
  (u) => u,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

export type Episode = {
  id: string;
  /** Le titre brut du flux, gardé pour les statistiques d'écoute. */
  titreBrut: string;
  /** Le titre nettoyé, sans préfixe de saison ni de numéro. */
  titre: string;
  numero: number | null;
  saison: 1 | 2;
  date: string;
  duree: string;
  /** Deux ou trois phrases tirées de la description, sans liens ni mots-clics. */
  resume: string;
  audio: string;
  image: string;
};

// La saison 2 commence le 25 août 2026 (épisode 0, « Quand le vide crée le
// plein »). Un épisode sans « S1 »/« S2 » dans le titre est classé par date.
const DEBUT_SAISON_2 = Date.parse('2026-08-25T00:00:00-04:00');

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// « S2 EP.5 », « S 2 EP 4: », « S.2 E3: », « S2 E 1 », « S1 EP.36 »
const PREFIXE_SAISON = /^\s*S\.?\s*(\d+)\s*(?:EP|E)\.?\s*(\d+)\s*[:.\-–]?\s*/i;
// « ÉPISODE 35: », « EPISODE 29 », « Épisode #2 : », « EP 4 - »
const PREFIXE_EPISODE = /^\s*(?:EPISODE|EP)\.?\s*#?\s*(\d+)\s*[:.\-–]?\s*/i;

// Les noms propres qui gardent leur majuscule quand un titre en capitales
// est remis en minuscules.
const NOMS_PROPRES: [RegExp, string][] = [
  [/\bexpérience origine\b/gi, 'Expérience Origine'],
  [/\borigine\b/gi, 'Origine'],
  [/\bparacelse\b/gi, 'Paracelse'],
  [/\bayurveda\b/gi, 'Ayurveda'],
  [/\bvata\b/gi, 'Vata'],
  [/\btiktok\b/gi, 'TikTok'],
  [/\bcheval de feu\b/gi, 'Cheval de Feu'],
];

function enMinuscules(t: string): string {
  const lettres = t.replace(/[^\p{L}]/gu, '');
  const majuscules = t.replace(/[^\p{Lu}]/gu, '');
  if (lettres.length < 4 || majuscules.length / lettres.length < 0.6) return t;
  let s = t.toLocaleLowerCase('fr-CA');
  for (const [re, nom] of NOMS_PROPRES) s = s.replace(re, nom);
  return s.charAt(0).toLocaleUpperCase('fr-CA') + s.slice(1);
}

/** Saison, numéro et titre propre d'un titre brut du flux. */
export function normaliserTitre(brut: string, date = ''): { saison: 1 | 2; numero: number | null; titre: string } {
  let t = brut.normalize('NFC').replace(/\.mp3\s*$/i, '').replace(/\s+/g, ' ').trim();
  let saison: 1 | 2 | null = null;
  let numero: number | null = null;

  const s = PREFIXE_SAISON.exec(sansAccents(t));
  if (s) {
    saison = s[1] === '1' ? 1 : 2;
    numero = Number(s[2]);
    t = t.slice(s[0].length);
  } else {
    const e = PREFIXE_EPISODE.exec(sansAccents(t));
    if (e) { numero = Number(e[1]); t = t.slice(e[0].length); }
  }

  t = enMinuscules(t.trim());
  // Un sous-titre après « : » ne reste que si le tout demeure court.
  const deuxPoints = t.indexOf(':');
  if (t.length > 50 && deuxPoints >= 15 && !/rediffusion|remix|live|spécial/i.test(t.slice(0, deuxPoints))) {
    t = t.slice(0, deuxPoints);
  }
  t = t.replace(/\s*([?!])/g,' $1').replace(/\s*\.\.\.\s*$/, '…').trim();

  if (!saison) {
    const u = sansAccents(brut).toUpperCase();
    const quand = Date.parse(date);
    saison = u.includes('REDIFFUSION') || u.includes('VIDE CREE LE PLEIN') || /SAISON 2/.test(u)
      || (!Number.isNaN(quand) && quand >= DEBUT_SAISON_2) ? 2 : 1;
  }
  return { saison, numero, titre: t || brut };
}

/** Le libellé complet : « Épisode 5 · Même saison, effets opposés ». */
export const libelleEpisode = (e: Episode) => (e.numero !== null ? `Épisode ${e.numero} · ${e.titre}` : e.titre);

/** La clé du fichier videos.ts : « S2-5 ». */
export const cleVideo = (e: Episode) => (e.numero !== null ? `S${e.saison}-${e.numero}` : '');

function resumer(html: string, max = 260): string {
  const paragraphes = html
    .split(/<\/p>|<br\s*\/?>|\n/i)
    .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p && !/#\w|https?:\/\/|www\.|par ici|quiz|écosystème/i.test(p));
  let texte = '';
  for (const p of paragraphes) {
    if (texte && (texte + ' ' + p).length > max) break;
    texte = texte ? `${texte} ${p}` : p;
    if (texte.length >= max * 0.7) break;
  }
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

/** Durée du flux (« 33:12 », « 1:02:00 » ou secondes) en secondes. */
export function enSecondes(d: string): number {
  if (!d) return 0;
  if (d.includes(':')) return d.split(':').map(Number).reduce((acc, n) => acc * 60 + (n || 0), 0);
  const s = Number(d);
  return Number.isNaN(s) ? 0 : s;
}

export const fmtMinutes = (d: string) => {
  const s = enSecondes(d);
  return s ? `${Math.max(1, Math.round(s / 60))} min` : '';
};

export async function chargerFlux(): Promise<Episode[]> {
  let xml = '';
  for (const mk of PROXIES) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(mk(RSS_URL), { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<item')) { xml = text; break; }
    } catch {
      /* relais suivant */
    }
  }
  if (!xml) throw new Error('Flux injoignable');

  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const channel = doc.querySelector('channel');
  const pochette =
    channel?.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
    channel?.querySelector('image > url')?.textContent ||
    '';
  return [...doc.querySelectorAll('item')].map((it, i) => {
    const titreBrut = it.querySelector('title')?.textContent?.trim() || `Épisode ${i + 1}`;
    const date = it.querySelector('pubDate')?.textContent || '';
    return {
      id: it.querySelector('guid')?.textContent || String(i),
      titreBrut,
      ...normaliserTitre(titreBrut, date),
      date,
      duree: it.getElementsByTagName('itunes:duration')[0]?.textContent?.trim() || '',
      resume: resumer(it.querySelector('description')?.textContent || ''),
      audio: it.querySelector('enclosure')?.getAttribute('url') || '',
      image: it.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || pochette,
    };
  });
}
