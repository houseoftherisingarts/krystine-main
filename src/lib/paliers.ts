// Paliers de la liste d'abonnées (étiquette `palier-N` posée sur chaque fiche
// par ~/.claude/scripts/krystine_paliers.py). Les paliers 1 à 4 reçoivent les
// infolettres, dans cet ordre de priorité; 5 à 7 ne reçoivent rien.
export interface Palier { n: number; tag: string; nom: string; detail: string; couleur: string; envoi: boolean }

export const PALIERS: Palier[] = [
  { n: 1, tag: 'palier-1', nom: 'Fidèles',             detail: '2 commandes et plus, ou achat récent',          couleur: '#BA7B39', envoi: true },
  { n: 2, tag: 'palier-2', nom: 'Clientes',            detail: 'une commande, il y a plus d’un an',             couleur: '#8B4A2F', envoi: true },
  { n: 3, tag: 'palier-3', nom: 'Engagées',            detail: 'direct, quiz, liste d’attente ou compte',       couleur: '#28352F', envoi: true },
  { n: 4, tag: 'palier-4', nom: 'Curieuses',           detail: 'abonnées, jamais acheté',                       couleur: '#788071', envoi: true },
  { n: 5, tag: 'palier-5', nom: 'Consentement tacite', detail: 'clientes récentes, sans oui explicite',        couleur: '#52646A', envoi: false },
  { n: 6, tag: 'palier-6', nom: 'Dormantes',           detail: 'sans consentement, rien de récent',             couleur: '#9AA5A8', envoi: false },
  { n: 7, tag: 'palier-7', nom: 'Sorties',             detail: 'désabonnées ou rebondies',                      couleur: '#B9A9AF', envoi: false },
];

export const STATUTS: { key: string; nom: string; detail: string }[] = [
  { key: 'active',       nom: 'Actives',      detail: 'reçoivent les infolettres' },
  { key: 'pending',      nom: 'En attente',   detail: 'sans consentement, jamais d’envoi' },
  { key: 'unsubscribed', nom: 'Désabonnées',  detail: 'ont demandé à ne plus recevoir' },
  { key: 'bounced',      nom: 'Rebondies',    detail: 'adresses qui n’existent plus' },
];

export interface CommunauteStats { statuts: Record<string, number>; paliers: Record<string, number>; total: number }

export function statsDepuisFiches(fiches: { status?: string; tags?: string[] }[]): CommunauteStats {
  const statuts: Record<string, number> = {}; const paliers: Record<string, number> = {};
  for (const f of fiches) {
    const s = f.status || 'active'; statuts[s] = (statuts[s] || 0) + 1;
    for (const t of f.tags || []) if (t.startsWith('palier-')) paliers[t] = (paliers[t] || 0) + 1;
  }
  return { statuts, paliers, total: fiches.length };
}

// Libellé lisible d'une étiquette technique, pour que Krystine comprenne ce
// qu'une liste veut dire sans connaître les noms internes.
const LIBELLES: Record<string, string> = {
  'shopify-import': 'Import Shopify',
  'shopify-abonne': 'Shopify · abonnées',
  'shopify-sans-consentement': 'Shopify · sans consentement',
  'shopify-desinscrit': 'Shopify · désinscrites',
  'shopify-invalide': 'Shopify · adresses invalides',
  'kajabi-abonne': 'Kajabi · abonnées',
  'kajabi-sans-consentement': 'Kajabi · sans consentement',
  'kajabi-desinscrit': 'Kajabi · désinscrites',
  'podcast': 'Podcast',
  'podcast-live': 'Direct du podcast',
  'quiz': 'Quiz dosha',
  'formations': 'Formations',
  'origine': 'Expérience Origine',
  'foyer-origine': 'Foyer d’Origine',
  'accueil-loeuvre': 'Accueil · L’Œuvre',
  'accueil-pulsation': 'Accueil · Pulsation',
  'medias': 'Médias',
  'conferenciere': 'Conférencière',
};
export function libelleTag(tag: string): string {
  const p = PALIERS.find(x => x.tag === tag);
  if (p) return `Palier ${p.n} · ${p.nom}`;
  const sp = /^shopify-palier-(\d)$/.exec(tag);
  if (sp) { const q = PALIERS.find(x => x.n === Number(sp[1])); return `Shopify · palier ${sp[1]}${q ? ' · ' + q.nom : ''}`; }
  if (tag.startsWith('waitlist-')) return `Liste d’attente · ${tag.slice(9).replace(/-/g, ' ')}`;
  if (tag.startsWith('podcast-live-')) return `Direct du ${tag.slice(13)}`;
  return LIBELLES[tag] || tag;
}
// Explication courte (infobulle) : le détail du palier, sinon rien.
export function explicationTag(tag: string): string | undefined {
  const p = PALIERS.find(x => x.tag === tag);
  return p ? `${p.detail}${p.envoi ? '' : ' · ne reçoit pas les infolettres'}` : undefined;
}
