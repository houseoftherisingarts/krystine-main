import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { NewsletterBlock } from './renderer';

// ─── Un brouillon d'infolettre à chaque nouvel épisode (27 sept. 2026) ───────
// Toutes les deux heures, le flux du podcast (HelloAudio, le même que la page
// /podcast) est relu. Chaque épisode jamais vu devient UN brouillon dans
// `newsletters` : l'en-tête, le bandeau, le fond et la couverture de la lettre
// de référence du 27 sept. 2026, l'image de l'épisode, sa description tirée du
// flux, puis les deux grilles de carrés et le paragraphe de fin de cette même
// lettre, tels quels. Le brouillon n'est jamais envoyé ni planifié : Krystine
// l'ouvre, écrit sa voix, et décide. Les épisodes déjà vus vivent dans
// siteSettings/brouillonsPodcast (champ vus). Au tout premier passage, tous
// les épisodes existants sont marqués vus sans brouillon (la lettre de
// l'épisode 4 est déjà partie).

const RSS_URL = 'https://podcasts.helloaudio.fm/podcast/8b5de66f-dd99-4ccd-be0a-088c2553719e/Gx891ivJLp';
const LETTRE_REFERENCE = 'GSfTiwLsTF49RTU0hh8A';
const PAGE_PODCAST = 'https://www.krystinestlaurent.ca/podcast';

interface Episode { guid: string; titre: string; description: string; image: string | null }

const sansCdata = (s: string) => s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
function entites(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
const balise = (item: string, nom: string) => {
  const m = new RegExp(`<${nom}[^>]*>([\\s\\S]*?)</${nom}>`).exec(item);
  return m ? sansCdata(m[1]) : '';
};

// La description du flux, en texte simple : le texte caché en blanc (des
// restes de copier-coller), les adresses, « PAR ici pour se rejoindre… », la
// ligne 🎧 du nom de l'émission et les bribes de moins de quatre mots partent.
export function nettoyerDescription(html: string): string {
  const sansCache = html.replace(/<(span|strong|em|b)\b[^>]*color:\s*rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)[^>]*>[\s\S]*?<\/\1>/gi, '');
  return sansCache
    .split(/<\/p>|<br\s*\/?>|\n/i)
    // Décoder d'abord, puis retirer toute balise : « &lt;a href…&gt; » ne doit
    // jamais redevenir une vraie balise dans la lettre.
    .map(l => entites(l).replace(/<[^>]*>?/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim())
    .filter(l => l
      && !/https?:\/\/|www\.|\.(ca|com|fm)\b/i.test(l)
      && !/^par ici/i.test(l)
      && !l.startsWith('🎧')
      && l.split(' ').length >= 4)
    .join('\n\n');
}

export function lireFlux(xml: string): Episode[] {
  const imageEmission = /<itunes:image\s+href="([^"]+)"/.exec(xml.split('<item>')[0])?.[1] || null;
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map(item => ({
    guid: entites(balise(item, 'guid')).trim(),
    titre: entites(balise(item, 'title')).replace(/\s+/g, ' ').trim(),
    description: nettoyerDescription(balise(item, 'description') || balise(item, 'content:encoded')),
    image: /<itunes:image\s+href="([^"]+)"/.exec(item)?.[1] || imageEmission,
  })).filter(e => e.guid && e.titre);
}

export async function creerBrouillonsPodcast(): Promise<{ nouveaux: number; premierPassage: boolean }> {
  const db = getFirestore();
  const reglage = db.doc('siteSettings/brouillonsPodcast');
  const rep = await fetch(RSS_URL, { headers: { 'User-Agent': 'krystinestlaurent.ca' } });
  if (!rep.ok) throw new Error(`flux du podcast : ${rep.status}`);
  const episodes = lireFlux(await rep.text());
  if (!episodes.length) throw new Error('flux du podcast vide ou illisible');

  const etat = await reglage.get();
  if (!etat.exists) {
    await reglage.set({ vus: episodes.map(e => e.guid), initialiseLe: FieldValue.serverTimestamp() });
    return { nouveaux: 0, premierPassage: true };
  }
  const vus = new Set<string>((etat.get('vus') || []) as string[]);
  // Du plus ancien au plus récent, pour que la liste des lettres suive l'ordre des épisodes.
  const nouveaux = episodes.filter(e => !vus.has(e.guid)).reverse();
  if (!nouveaux.length) return { nouveaux: 0, premierPassage: false };

  const ref = (await db.doc(`newsletters/${LETTRE_REFERENCE}`).get()).data() || {};
  const blocs = (ref.blocks || []) as NewsletterBlock[];
  const dernierChoix = blocs.map(b => b.type).lastIndexOf('choix');
  const choix = blocs.filter(b => b.type === 'choix');
  const fin = dernierChoix >= 0 && blocs[dernierChoix + 1]?.type === 'paragraph' ? [blocs[dernierChoix + 1]] : [];

  for (const e of nouveaux) {
    const blocks: NewsletterBlock[] = [
      ...(e.image ? [{ type: 'image', content: { url: e.image, alt: e.titre, href: PAGE_PODCAST } } as NewsletterBlock] : []),
      ...(e.description ? [{ type: 'paragraph', content: { text: e.description, align: 'left' } } as NewsletterBlock] : []),
      ...choix,
      ...fin,
    ];
    // Un identifiant tiré du guid : relancé, le passage ne crée jamais deux
    // brouillons pour le même épisode.
    const id = `podcast-${e.guid.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 55)}`;
    try {
      await db.doc(`newsletters/${id}`).create({
        title: `Brouillon automatique · ${e.titre}`,
        subject: e.titre,
        preheader: '',
        fromName: ref.fromName || 'Krystine St-Laurent',
        blocks,
        status: 'draft',
        audience: { mode: 'all' },
        couverture: ref.couverture ?? null,
        couvertureUrl: ref.couvertureUrl ?? null,
        entete: ref.entete ?? null,
        bandeau: ref.bandeau ?? null,
        fond: ref.fond ?? null,
        signature: ref.signature ?? true,
        tailleLecture: ref.tailleLecture ?? null,
        lang: 'fr',
        episodeGuid: e.guid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 6) throw err;   // 6 : déjà là
    }
    await reglage.update({ vus: FieldValue.arrayUnion(e.guid) });
    console.log('[brouillonsPodcast] brouillon créé', id, e.titre);
  }
  return { nouveaux: nouveaux.length, premierPassage: false };
}

export const brouillonsPodcast = onSchedule(
  { schedule: 'every 2 hours', timeZone: 'America/Toronto', region: 'us-central1', timeoutSeconds: 120 },
  async () => {
    const r = await creerBrouillonsPodcast();
    if (r.nouveaux || r.premierPassage) console.log('[brouillonsPodcast]', r);
  },
);
