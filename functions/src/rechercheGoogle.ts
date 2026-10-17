import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

// ─── Ce que l'on cherche sur Krystine dans Google (17 oct. 2026) ─────────────
// Krystine : « continue à voir quelles questions sont demandées pour moi, et
// comment indexer ». Chaque matin, pour le Bilan :
// 1. les suggestions de Google pour « krystine st laurent » (+ a à z), comparées
//    à celles de la veille (sante/rechercheGoogle) : une suggestion nouvelle
//    devient une page à créer ou à renforcer;
// 2. si le compte de service des fonctions a été ajouté dans Search Console
//    (Utilisateurs et autorisations), les vraies recherches qui ont montré le
//    site les 7 derniers jours, et le plan du site renvoyé à Google.

const SITE = 'https://www.krystinestlaurent.ca/';
const PROPRIETES = ['sc-domain:krystinestlaurent.ca', SITE];
const RACINES = ['krystine st laurent', 'krystine st-laurent'];

/** La page du site qui répond déjà à une suggestion, si elle existe. */
const PAGES: [RegExp, string][] = [
  [/nouveau livre|tome|prochain livre/, '/nouveau-livre'],
  [/livre|livres|nature|f[ée]minit[ée]/, '/medias'],
  [/podcast|balado/, '/podcast'],
  [/youtube|t[ée]l[ée]|sant[ée] la vie/, '/medias/tv'],
  [/huile|boutique|inspirata|produit/, '/boutique'],
  [/origine/, '/origine'],
  [/quiz|dosha/, '/quiz'],
  [/vata/, '/vata'],
  [/conf[ée]renc/, '/conferenciere'],
  [/formation|cours/, '/formations'],
  [/ayurveda/, '/krystine'],
];
const pageDe = (s: string) => PAGES.find(([re]) => re.test(s))?.[1] ?? null;

async function suggestions(q: string): Promise<string[]> {
  const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&gl=ca&q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  const j = (await r.json()) as [string, string[]];
  return Array.isArray(j?.[1]) ? j[1] : [];
}

async function searchConsole() {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/webmasters'] });
  const client = await auth.getClient();
  const fin = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const debut = new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10);
  let derniere = '';
  for (const prop of PROPRIETES) {
    const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(prop)}`;
    try {
      const r = await client.request<{ rows?: { keys: string[]; clicks: number; impressions: number; position: number }[] }>({
        url: `${base}/searchAnalytics/query`, method: 'POST',
        data: { startDate: debut, endDate: fin, dimensions: ['query'], rowLimit: 25 },
      });
      // Le plan du site renvoyé chaque matin : Google revient voir les pages nouvelles.
      let sitemap = 'renvoyé';
      try { await client.request({ url: `${base}/sitemaps/${encodeURIComponent(SITE + 'sitemap.xml')}`, method: 'PUT' }); } catch { sitemap = 'non renvoyé (lecture seule)'; }
      return {
        propriete: prop, periode: `${debut} au ${fin}`, sitemap,
        requetes: (r.data.rows || []).map((x) => ({ q: x.keys[0], clics: x.clicks, vues: x.impressions, position: Math.round(x.position * 10) / 10 })),
      };
    } catch (e) { derniere = (e as Error).message.slice(0, 160); }
  }
  return { erreur: derniere || 'accès refusé' };
}

export async function lireRechercheGoogle() {
  const lettres = ['', ...'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => ` ${l}`)];
  const toutes = new Set<string>();
  for (const racine of RACINES) {
    for (const suffixe of lettres) {
      for (const s of await suggestions(racine + suffixe).catch(() => [])) {
        const t = s.toLowerCase().replace('st-laurent', 'st laurent').trim();
        if (t.startsWith('krystine st laurent') && t !== 'krystine st laurent') toutes.add(t);
      }
    }
  }
  const db = getFirestore();
  const ref = db.doc('sante/rechercheGoogle');
  const avant = new Set<string>(((await ref.get()).data()?.suggestions as string[] | undefined) ?? []);
  const liste = [...toutes].sort();
  const nouvelles = avant.size ? liste.filter((s) => !avant.has(s)) : [];
  const sc = await searchConsole().catch((e) => ({ erreur: (e as Error).message.slice(0, 160) }));
  await ref.set({ suggestions: liste, nouvelles, sc, rangeLe: FieldValue.serverTimestamp() });
  return {
    suggestions: liste.map((s) => ({ s, page: pageDe(s.replace('krystine st laurent', '')) })),
    nouvelles,
    sc,
  };
}
