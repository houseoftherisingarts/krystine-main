// ─── Données de démonstration pour VexelHotjar (site de Krystine) ───────────
// Remplace visiteurs/donnees.ts dans le harnais de capture seulement. Mêmes
// fonctions, mêmes types, mais tout est inventé : aucune lecture de
// Firestore, de Storage ni des fonctions, aucun visiteur réel, aucun nom ni
// courriel. Le hasard est semé, donc deux lancements donnent les mêmes images.
// Les petits formats (nb, pct, duree, nomElement, resumer) sont recopiés tels
// quels du vrai module, puisque l'importer ferait démarrer Firebase.

import type { ReglagesVexelHotjar } from '../../../src/vexelhotjar';

export type Device = 'ordinateur' | 'tablette' | 'mobile';

export interface ElementJour { s: string; tx: string; href?: string; n: number; r?: number; m?: number }
export interface PageJour {
  path: string; titre?: string;
  vues?: number; dureeMs?: number; sorties?: number; clics?: number; rage?: number; morts?: number;
  scroll?: Record<string, number>; scrollN?: number;
  elements?: Record<string, ElementJour>;
}
export interface Journee {
  site: string; jour: string;
  vues?: number; sessions?: number; nouveaux?: number; dureeMs?: number; rebonds?: number; fins?: number;
  clics?: number; rage?: number; morts?: number; erreurs?: number;
  heures?: Record<string, number>;
  appareils?: Record<string, number>;
  pages?: Record<string, PageJour>;
  entrees?: Record<string, number>;
  sources?: Record<string, { n: number; nom: string }>;
  campagnes?: Record<string, { n: number; source: string; campagne: string }>;
  objectifs?: Record<string, { n: number; nom: string; niv?: 'gros' | 'petit' }>;
  erreursListe?: Record<string, { n: number; msg: string; src: string; path: string }>;
  formulaires?: Record<string, { s: string; path: string; debuts?: number; soumis?: number; abandons?: number; dernierChamp?: string }>;
  corridors?: Partial<Record<Corridor, CorridorJour>>;
}

/** Découverte : premier passage de ce navigateur. Retour : il est déjà venu. */
export type Corridor = 'decouverte' | 'retour';
export interface CorridorJour {
  sessions?: number; vues?: number; fins?: number; rebonds?: number;
  entrees?: Record<string, number>;
  sources?: Record<string, { n: number; nom: string }>;
  objectifs?: Record<string, { n: number; nom: string }>;
}
export interface CorridorResume {
  sessions: number; vues: number; fins: number; rebonds: number;
  entrees: { path: string; n: number }[];
  sources: { nom: string; n: number }[];
  objectifs: { nom: string; n: number }[];
}

export interface PageResume extends Required<Pick<PageJour, 'path' | 'vues' | 'dureeMs' | 'sorties' | 'clics' | 'rage' | 'morts' | 'scrollN'>> {
  cle: string; titre: string;
  scroll: Record<string, number>;
  elements: Record<string, ElementJour>;
}

export interface Resume {
  jours: { jour: string; vues: number; sessions: number; nouveaux: number }[];
  vues: number; sessions: number; nouveaux: number; dureeMs: number; rebonds: number; fins: number;
  clics: number; rage: number; morts: number; erreurs: number;
  heures: number[];
  appareils: Record<Device, number>;
  pages: PageResume[];
  sources: { nom: string; n: number }[];
  campagnes: { source: string; campagne: string; n: number }[];
  objectifs: { nom: string; n: number; niveau: 'gros' | 'petit' }[];
  /** Les connexions à l'espace client, jour par jour (l'objectif « connexion »). */
  connexions: { jour: string; n: number }[];
  erreursListe: { msg: string; src: string; path: string; n: number }[];
  formulaires: { s: string; path: string; debuts: number; soumis: number; abandons: number; dernierChamp?: string }[];
  corridors: Record<Corridor, CorridorResume>;
}
export interface PointClic { s: string; tx: string; ex: number; ey: number; vx: number; dy: number; hd: number; r?: boolean; m?: boolean }
export interface Carte { clics: PointClic[]; mouv: number[]; vues: number; nClics: number; nRage: number; nMorts: number; scroll: Record<string, number> }
export interface Session {
  sid: string; debut: Date; fin?: Date; jour?: string; device?: Device; vw?: number; pays?: string; lang?: string;
  tz?: string; ref?: string; utm?: Record<string, string>; entree?: string; derniere?: string; parcours?: string[]; nbPages?: number;
  nbClics?: number; rage?: number; mort?: number; erreurs?: number; dureeMs?: number; nouveau?: boolean;
  enregistre?: boolean; chunks?: number; octets?: number;
}

export const jourISO = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' });
export const ilYA = (jours: number) => { const d = new Date(); d.setDate(d.getDate() - jours); return d; };

// ─── Le site inventé ────────────────────────────────────────────────────────

// Un générateur semé (mulberry32), et une graine tirée d'un texte.
function hasard(graine: number) {
  let a = graine >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const graineDe = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const autour = (x: number, ecart: number, r: () => number) => x * (1 + (r() * 2 - 1) * ecart);

// Les pages du site, leur part des vues, leur temps moyen et leur pente de lecture.
const PAGES: { path: string; titre: string; part: number; duree: number; pente: number }[] = [
  { path: '/accueil', titre: 'Accueil', part: 0.38, duree: 104_000, pente: 58 },
  { path: '/quiz', titre: 'Quiz des doshas', part: 0.16, duree: 236_000, pente: 95 },
  { path: '/boutique', titre: 'Boutique', part: 0.12, duree: 88_000, pente: 52 },
  { path: '/vata', titre: 'VATA Essentiel', part: 0.09, duree: 131_000, pente: 66 },
  { path: '/podcast', titre: 'Podcast', part: 0.08, duree: 97_000, pente: 45 },
  { path: '/livres', titre: 'Livres', part: 0.06, duree: 71_000, pente: 50 },
  { path: '/formations', titre: 'Formations', part: 0.05, duree: 115_000, pente: 60 },
  { path: '/compte', titre: 'Mon compte', part: 0.04, duree: 64_000, pente: 90 },
  { path: '/espace', titre: 'Espace membre', part: 0.02, duree: 260_000, pente: 85 },
];
const cleDe = (path: string) => path.slice(1).replace(/\//g, '_');

// Les boutons et liens de l'accueil pour la vue d'ensemble, avec leur part des
// clics de la page (libellés indicatifs, comptes inventés). La carte de
// chaleur, elle, sème ses points sur les vrais éléments du cadre.
const ELEMENTS_ACCUEIL: { tx: string; href?: string; part: number; r?: number; m?: number }[] = [
  { tx: 'Faire le quiz', href: '/quiz', part: 0.21 },
  { tx: 'Boutique', href: '/boutique', part: 0.12 },
  { tx: 'Découvrir VATA Essentiel', href: '/vata', part: 0.1 },
  { tx: 'Podcast', href: '/podcast', part: 0.08 },
  { tx: 'Les livres', href: '/livres', part: 0.06 },
  { tx: 'Formations', href: '/formations', part: 0.05, r: 0.004 },
  { tx: 'Mon compte', href: '/compte', part: 0.04 },
  { tx: '', part: 0.015, m: 0.6 },
];

const SOURCES: [string, number][] = [['Facebook', 0.31], ['Accès direct', 0.24], ['Google', 0.21], ['Instagram', 0.13], ['Infolettre', 0.07], ['YouTube', 0.03], ['ChatGPT', 0.01]];
// Le traceur nomme ses objectifs : les noms techniques du quiz restent tels
// quels, parce que la vue du quiz les lit sous ces noms.
const OBJECTIFS: { nom: string; part: number; niv: 'gros' | 'petit' }[] = [
  { nom: 'achat', part: 0.012, niv: 'gros' },
  { nom: 'inscription_infolettre', part: 0.035, niv: 'petit' },
  { nom: 'connexion', part: 0.04, niv: 'petit' },
  { nom: 'quiz_commence', part: 0.15, niv: 'petit' },
  ...Array.from({ length: 10 }, (_, i) => ({ nom: `quiz_question_${i + 1}`, part: 0.15 * Math.pow(0.95, i + 1), niv: 'petit' as const })),
  { nom: 'quiz_resultat_vu', part: 0.085, niv: 'petit' },
  { nom: 'quiz_resultat_vu_vata', part: 0.034, niv: 'petit' },
  { nom: 'quiz_resultat_vu_pitta', part: 0.022, niv: 'petit' },
  { nom: 'quiz_resultat_vu_kapha', part: 0.014, niv: 'petit' },
  { nom: 'quiz_resultat_vu_vata_pitta', part: 0.009, niv: 'petit' },
  { nom: 'quiz_resultat_vu_pitta_kapha', part: 0.006, niv: 'petit' },
  { nom: 'quiz_clic_vata', part: 0.021, niv: 'petit' },
  { nom: 'quiz_clic_huile', part: 0.011, niv: 'petit' },
];
const HEURES = [1, 0.5, 0.3, 0.2, 0.2, 0.4, 1.2, 2.4, 3.6, 4.6, 5.2, 5, 4.4, 4.6, 4.8, 4.5, 4.1, 3.8, 4.2, 5.1, 5.6, 4.7, 3.1, 1.8];

/** La courbe de défilement : la part qui atteint chaque palier de cinq pour cent. */
function defilement(total: number, pente: number): Record<string, number> {
  const s: Record<string, number> = {};
  for (let b = 0; b <= 100; b += 5) s[`b${b}`] = Math.round(total * (b <= 10 ? 1 - b / 200 : 0.95 * Math.exp(-(b - 10) / pente)));
  return s;
}

/** Les deux corridors du jour : sept visites sur dix sont un premier passage. */
function corridorsDuJour(sessions: number, vues: number, fins: number, r: () => number): Partial<Record<Corridor, CorridorJour>> {
  const parts: [Corridor, number, [string, number][], [string, number][]][] = [
    ['decouverte', 0.7, [['/accueil', 0.52], ['/quiz', 0.26], ['/boutique', 0.12], ['/podcast', 0.1]], [['Facebook', 0.4], ['Google', 0.3], ['Instagram', 0.2], ['YouTube', 0.1]]],
    ['retour', 0.3, [['/accueil', 0.34], ['/espace', 0.3], ['/boutique', 0.24], ['/compte', 0.12]], [['Accès direct', 0.55], ['Infolettre', 0.3], ['Facebook', 0.15]]],
  ];
  const out: Partial<Record<Corridor, CorridorJour>> = {};
  for (const [c, part, entrees, sources] of parts) {
    const s = Math.round(sessions * part);
    out[c] = {
      sessions: s, vues: Math.round(vues * part * (c === 'retour' ? 1.3 : 0.87)), fins: Math.round(fins * part),
      rebonds: Math.round(fins * part * (c === 'retour' ? 0.22 : 0.46)),
      entrees: Object.fromEntries(entrees.map(([path, q]) => [cleDe(path), Math.round(s * autour(q, 0.2, r))])),
      sources: Object.fromEntries(sources.map(([nom, q], i) => [`s${i}`, { nom, n: Math.round(s * autour(q, 0.2, r)) }])),
      objectifs: c === 'retour'
        ? { o0: { nom: 'connexion', n: Math.round(s * 0.13) }, o1: { nom: 'achat', n: Math.round(s * autour(0.03, 0.5, r)) } }
        : { o0: { nom: 'quiz_commence', n: Math.round(s * 0.19) }, o1: { nom: 'inscription_infolettre', n: Math.round(s * 0.04) } },
    };
  }
  return out;
}

function journee(jour: string, rang: number): Journee {
  const r = hasard(graineDe(jour));
  const semaine = new Date(jour + 'T12:00:00').getDay();
  const sessions = Math.round(autour((semaine === 0 || semaine === 6 ? 74 : 104) * (1 + rang * 0.006), 0.16, r));
  const vues = Math.round(sessions * autour(2.4, 0.08, r));
  const fins = Math.round(sessions * 0.92);
  const pages: Record<string, PageJour> = {};
  let clics = 0;
  for (const p of PAGES) {
    const v = Math.max(1, Math.round(vues * autour(p.part, 0.15, r)));
    const c = Math.round(v * (p.path === '/accueil' ? 1.9 : 1.1));
    const cle = cleDe(p.path);
    const elements: Record<string, ElementJour> = {};
    let rage = 0, morts = 0;
    if (p.path === '/accueil') {
      ELEMENTS_ACCUEIL.forEach((e, i) => {
        const n = Math.round(c * autour(e.part, 0.2, r));
        const er = Math.round(n * (e.r || 0) * 10 * r()), em = Math.round(n * (e.m || 0));
        rage += er; morts += em;
        elements[`e${i}`] = { s: `main > a:nth-of-type(${i + 1})`, tx: e.tx, href: e.href, n, r: er, m: em };
      });
    } else {
      morts = Math.round(c * 0.02 * r());
      rage = p.path === '/compte' && r() < 0.35 ? 1 : 0;
      if (rage) elements.e0 = { s: 'form > button:nth-of-type(1)', tx: 'Continuer avec Google', n: 3, r: rage };
    }
    clics += c;
    const scrollN = Math.round(v * 0.9);
    pages[cle] = { path: p.path, titre: p.titre, vues: v, dureeMs: v * autour(p.duree, 0.1, r), sorties: Math.round(v * 0.38), clics: c, rage, morts, scroll: defilement(scrollN, p.pente), scrollN, elements };
  }
  const rage = Object.values(pages).reduce((n, p) => n + (p.rage || 0), 0);
  const morts = Object.values(pages).reduce((n, p) => n + (p.morts || 0), 0);
  const sommeH = HEURES.reduce((a, b) => a + b, 0);
  const objectifs: Journee['objectifs'] = {};
  OBJECTIFS.forEach((o, i) => { const n = Math.round(sessions * o.part * autour(1, 0.5, r)); if (n) objectifs[`o${i}`] = { n, nom: o.nom, niv: o.niv }; });
  return {
    site: 'demo', jour, sessions, vues, nouveaux: Math.round(sessions * 0.71), fins,
    dureeMs: sessions * autour(158_000, 0.12, r), rebonds: Math.round(fins * autour(0.39, 0.1, r)),
    clics, rage, morts, erreurs: r() < 0.2 ? 1 : 0,
    heures: Object.fromEntries(HEURES.map((h, i) => [`h${i}`, Math.round((sessions * h) / sommeH)])),
    appareils: { ordinateur: Math.round(sessions * 0.53), mobile: Math.round(sessions * 0.42), tablette: Math.round(sessions * 0.05) },
    pages,
    sources: Object.fromEntries(SOURCES.map(([nom, p], i) => [`s${i}`, { nom, n: Math.round(sessions * autour(p, 0.2, r)) }])),
    campagnes: { c0: { source: 'facebook', campagne: 'rituels-automne', n: Math.round(sessions * 0.08) } },
    objectifs,
    erreursListe: r() < 0.2 ? { x0: { n: 1, msg: 'ResizeObserver loop completed with undelivered notifications.', src: 'navigateur', path: '/boutique' } } : {},
    formulaires: { f0: { s: 'form#infolettre', path: '/quiz', debuts: Math.round(sessions * 0.06), soumis: Math.round(sessions * 0.04), abandons: Math.round(sessions * 0.02), dernierChamp: 'Courriel' } },
    corridors: corridorsDuJour(sessions, vues, fins, r),
  };
}

export async function chargerJournees(de: string, a: string): Promise<Journee[]> {
  const out: Journee[] = [];
  let rang = 0;
  for (let d = new Date(de + 'T12:00:00'); jourISO(d) <= a; d.setDate(d.getDate() + 1)) out.push(journee(jourISO(d), rang++));
  return out;
}

const add = (o: Record<string, number>, k: string, n = 0) => { o[k] = (o[k] || 0) + n; };
const corridorVide = (): CorridorResume => ({ sessions: 0, vues: 0, fins: 0, rebonds: 0, entrees: [], sources: [], objectifs: [] });

/** Fond plusieurs journées en un seul résumé, avec la série par jour pour la courbe. */
export function resumer(journees: Journee[], de: string, a: string): Resume {
  const r: Resume = {
    jours: [], vues: 0, sessions: 0, nouveaux: 0, dureeMs: 0, rebonds: 0, fins: 0, clics: 0, rage: 0, morts: 0, erreurs: 0,
    heures: new Array(24).fill(0),
    appareils: { ordinateur: 0, tablette: 0, mobile: 0 },
    pages: [], sources: [], campagnes: [], objectifs: [], connexions: [], erreursListe: [], formulaires: [],
    corridors: { decouverte: corridorVide(), retour: corridorVide() },
  };
  const cumul = { decouverte: { entrees: {} as Record<string, number>, sources: {} as Record<string, number>, objectifs: {} as Record<string, number> },
    retour: { entrees: {} as Record<string, number>, sources: {} as Record<string, number>, objectifs: {} as Record<string, number> } };
  const pages = new Map<string, PageResume>();
  const sources: Record<string, number> = {};
  const campagnes = new Map<string, { source: string; campagne: string; n: number }>();
  const objectifs = new Map<string, { n: number; niveau: 'gros' | 'petit' }>();
  const erreurs = new Map<string, { msg: string; src: string; path: string; n: number }>();
  const forms = new Map<string, { s: string; path: string; debuts: number; soumis: number; abandons: number; dernierChamp?: string }>();
  const parJour = new Map<string, { vues: number; sessions: number; nouveaux: number }>();
  const connexions = new Map<string, number>();

  for (const j of journees) {
    r.vues += j.vues || 0; r.sessions += j.sessions || 0; r.nouveaux += j.nouveaux || 0; r.dureeMs += j.dureeMs || 0;
    r.rebonds += j.rebonds || 0; r.fins += j.fins || 0; r.clics += j.clics || 0; r.rage += j.rage || 0; r.morts += j.morts || 0; r.erreurs += j.erreurs || 0;
    parJour.set(j.jour, { vues: j.vues || 0, sessions: j.sessions || 0, nouveaux: j.nouveaux || 0 });
    for (let h = 0; h < 24; h += 1) r.heures[h] += j.heures?.[`h${h}`] || 0;
    for (const d of ['ordinateur', 'tablette', 'mobile'] as Device[]) r.appareils[d] += j.appareils?.[d] || 0;
    for (const [cle, p] of Object.entries(j.pages || {})) {
      // Une page se reconnaît à son chemin, et sa clé est celle de la journée
      // la plus récente (les journées arrivent triées), pour que les cartes
      // se lisent sous la clé en vigueur.
      const chemin = p.path || cle;
      let page = pages.get(chemin);
      if (!page) { page = { cle, path: chemin, titre: p.titre || '', vues: 0, dureeMs: 0, sorties: 0, clics: 0, rage: 0, morts: 0, scrollN: 0, scroll: {}, elements: {} }; pages.set(chemin, page); }
      page.cle = cle;
      if (p.titre) page.titre = p.titre;
      page.vues += p.vues || 0; page.dureeMs += p.dureeMs || 0; page.sorties += p.sorties || 0; page.clics += p.clics || 0;
      page.rage += p.rage || 0; page.morts += p.morts || 0; page.scrollN += p.scrollN || 0;
      for (const [b, n] of Object.entries(p.scroll || {})) add(page.scroll, b, n);
      for (const [k, el] of Object.entries(p.elements || {})) {
        const e = page.elements[k] || (page.elements[k] = { s: el.s, tx: el.tx, href: el.href, n: 0, r: 0, m: 0 });
        e.n += el.n || 0; e.r = (e.r || 0) + (el.r || 0); e.m = (e.m || 0) + (el.m || 0);
        if (el.tx) e.tx = el.tx;
      }
    }
    for (const s of Object.values(j.sources || {})) add(sources, s.nom, s.n);
    for (const c of ['decouverte', 'retour'] as Corridor[]) {
      const x = j.corridors?.[c];
      if (!x) continue;
      const R = r.corridors[c];
      R.sessions += x.sessions || 0; R.vues += x.vues || 0; R.fins += x.fins || 0; R.rebonds += x.rebonds || 0;
      // Les entrées sont rangées par clé de page : le chemin se lit dans les pages du jour.
      for (const [k, n] of Object.entries(x.entrees || {})) add(cumul[c].entrees, j.pages?.[k]?.path || k, n);
      for (const s of Object.values(x.sources || {})) add(cumul[c].sources, s.nom, s.n);
      for (const o of Object.values(x.objectifs || {})) add(cumul[c].objectifs, o.nom, o.n);
    }
    for (const c of Object.values(j.campagnes || {})) {
      const k = c.source + '|' + c.campagne;
      const e = campagnes.get(k) || { source: c.source, campagne: c.campagne, n: 0 };
      e.n += c.n || 0; campagnes.set(k, e);
    }
    for (const o of Object.values(j.objectifs || {})) {
      if (o.nom === 'connexion') connexions.set(j.jour, (connexions.get(j.jour) || 0) + (o.n || 0));
      const x = objectifs.get(o.nom) || { n: 0, niveau: o.niv === 'gros' ? 'gros' as const : 'petit' as const };
      x.n += o.n || 0; objectifs.set(o.nom, x);
    }
    for (const [k, e] of Object.entries(j.erreursListe || {})) {
      const x = erreurs.get(k) || { msg: e.msg, src: e.src, path: e.path, n: 0 };
      x.n += e.n || 0; erreurs.set(k, x);
    }
    for (const [k, f] of Object.entries(j.formulaires || {})) {
      const x = forms.get(k) || { s: f.s, path: f.path, debuts: 0, soumis: 0, abandons: 0, dernierChamp: f.dernierChamp };
      x.debuts += f.debuts || 0; x.soumis += f.soumis || 0; x.abandons += f.abandons || 0;
      if (f.dernierChamp) x.dernierChamp = f.dernierChamp;
      forms.set(k, x);
    }
  }

  // La courbe porte chaque jour de la période, même ceux sans visite.
  for (let d = new Date(de + 'T12:00:00'); jourISO(d) <= a; d.setDate(d.getDate() + 1)) {
    const jour = jourISO(d);
    r.jours.push({ jour, ...(parJour.get(jour) || { vues: 0, sessions: 0, nouveaux: 0 }) });
    r.connexions.push({ jour, n: connexions.get(jour) || 0 });
  }
  r.pages = [...pages.values()].sort((x, y) => y.vues - x.vues);
  r.sources = Object.entries(sources).map(([nom, n]) => ({ nom, n })).sort((x, y) => y.n - x.n);
  r.campagnes = [...campagnes.values()].sort((x, y) => y.n - x.n);
  r.objectifs = [...objectifs.entries()].map(([nom, x]) => ({ nom, ...x })).sort((x, y) => y.n - x.n);
  r.erreursListe = [...erreurs.values()].sort((x, y) => y.n - x.n);
  r.formulaires = [...forms.values()].sort((x, y) => y.abandons - x.abandons);
  const trier = (o: Record<string, number>) => Object.entries(o).map(([nom, n]) => ({ nom, n })).sort((x, y) => y.n - x.n);
  for (const c of ['decouverte', 'retour'] as Corridor[]) {
    r.corridors[c].entrees = trier(cumul[c].entrees).map(({ nom, n }) => ({ path: nom, n }));
    r.corridors[c].sources = trier(cumul[c].sources);
    r.corridors[c].objectifs = trier(cumul[c].objectifs);
  }
  return r;
}

// ─── Cartes de chaleur ──────────────────────────────────────────────────────
// Les points se sèment sur les vrais boutons et liens de la page montrée dans
// le cadre : on attend que le cadre ait pris sa hauteur, on relève chaque
// élément cliquable visible, et on lui donne des clics selon sa nature et sa
// hauteur dans la page (le haut est plus cliqué que le bas).

const attendre = (ms: number) => new Promise(r => setTimeout(r, ms));

async function documentDuCadre(): Promise<Document | null> {
  let derniere = 0, stable = 0;
  for (let i = 0; i < 120; i += 1) {
    const cadre = document.querySelector<HTMLIFrameElement>('iframe[title^="Aperçu"]');
    const doc = cadre?.contentDocument;
    const h = parseFloat(cadre?.style.height || '0');
    if (doc?.readyState === 'complete' && doc.querySelectorAll('a,button').length > 3 && h > 1000) {
      stable = h === derniere ? stable + 1 : 0;
      derniere = h;
      if (stable >= 3) return doc;
    }
    await attendre(250);
  }
  return document.querySelector<HTMLIFrameElement>('iframe[title^="Aperçu"]')?.contentDocument || null;
}

/** Un chemin unique de l'élément depuis body, en rangs de même balise. */
function selecteur(el: Element): string {
  const parts: string[] = [];
  for (let n: Element | null = el; n && n.tagName !== 'BODY'; n = n.parentElement) {
    const tag = n.tagName.toLowerCase();
    const rang = [...(n.parentElement?.children || [])].filter(x => x.tagName === n!.tagName).indexOf(n) + 1;
    parts.unshift(`${tag}:nth-of-type(${rang})`);
  }
  return ['body', ...parts].join(' > ');
}

function gauss(r: () => number) { return (r() + r() + r() - 1.5) / 1.5; }

export async function chargerCarte(device: Device, clePage: string, de: string, a: string): Promise<Carte> {
  const r = hasard(graineDe(`${device}|${clePage}|${de}|${a}`));
  const doc = await documentDuCadre();
  const page = PAGES.find(p => cleDe(p.path) === clePage) || PAGES[0];
  const vues = Math.round(2200 * page.part * (device === 'ordinateur' ? 1 : device === 'mobile' ? 0.8 : 0.1));
  const c: Carte = { clics: [], mouv: [], vues, nClics: 0, nRage: 0, nMorts: 0, scroll: defilement(Math.round(vues * 0.9), page.pente) };
  if (!doc) return c;
  const win = doc.defaultView!;
  const hd = Math.max(doc.documentElement.scrollHeight, 1);
  const largeur = doc.documentElement.clientWidth || 1440;
  const cibles = [...doc.querySelectorAll<HTMLElement>('a[href], button, [role="button"], input, select, summary')]
    .map(el => ({ el, b: el.getBoundingClientRect() }))
    .filter(({ el, b }) => b.width > 4 && b.height > 4 && win.getComputedStyle(el).visibility !== 'hidden');
  // Le poids d'un élément : un bouton plein ou un lien d'action vaut plus, le
  // menu fixé en haut reçoit sa part, et l'intérêt s'éteint en descendant.
  const poids = cibles.map(({ el, b }) => {
    const y = b.top + win.scrollY;
    const fixe = win.getComputedStyle(el.closest('header,nav') || el).position;
    const action = /btn|bouton|cta|button/i.test(el.className?.toString() || '') || el.tagName === 'BUTTON' ? 2.6 : 1;
    const haut = fixe === 'fixed' || fixe === 'sticky' ? 0.9 : Math.exp(-y / Math.min(hd * 0.28, 2600));
    // Ce que l'écran montre sans défiler reçoit la plus grosse part, comme sur un vrai site.
    const premierEcran = y < 1100 ? 60 : 1;
    return action * haut * premierEcran * (0.4 + r() * 1.2);
  });
  const somme = poids.reduce((x, y) => x + y, 0) || 1;
  const total = Math.round(vues * 6);
  cibles.forEach(({ el, b }, i) => {
    const n = Math.round((poids[i] / somme) * total);
    const s = selecteur(el);
    const tx = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const rageIci = i > 0 && r() < 0.04;
    for (let k = 0; k < n; k += 1) {
      const ex = Math.min(0.97, Math.max(0.03, 0.5 + gauss(r) * 0.32));
      const ey = Math.min(0.95, Math.max(0.05, 0.5 + gauss(r) * 0.3));
      const y = b.top + win.scrollY + ey * b.height;
      c.clics.push({ s, tx, ex, ey, vx: (b.left + ex * b.width) / largeur, dy: y, hd, r: rageIci && k < 3 });
    }
  });
  // Quelques clics dans le vide, sur des titres et des images qui ne mènent nulle part.
  const vides = [...doc.querySelectorAll<HTMLElement>('h1, h2, img')].filter(el => el.getBoundingClientRect().width > 40).slice(0, 6);
  for (const el of vides) {
    const b = el.getBoundingClientRect();
    const n = Math.round(4 + r() * 10);
    for (let k = 0; k < n; k += 1) {
      const ex = 0.5 + gauss(r) * 0.35, ey = 0.5 + gauss(r) * 0.3;
      c.clics.push({ s: selecteur(el), tx: '', ex, ey, vx: (b.left + ex * b.width) / largeur, dy: b.top + win.scrollY + ey * b.height, hd, m: true });
    }
  }
  // La souris suit les mêmes endroits, plus étalée.
  for (let k = 0; k < 2400; k += 1) {
    const p = c.clics[Math.floor(r() * c.clics.length)];
    if (!p) break;
    c.mouv.push(Math.round(Math.min(999, Math.max(0, (p.vx + gauss(r) * 0.08) * 1000))), Math.round(Math.min(9999, Math.max(0, ((p.dy / hd) + gauss(r) * 0.01) * 10000))));
  }
  c.nClics = c.clics.length;
  c.nRage = c.clics.filter(p => p.r).length;
  c.nMorts = c.clics.filter(p => p.m).length;
  return c;
}

// ─── Sessions, enregistrements et réglages ──────────────────────────────────

// Les fuseaux horaires des visites : surtout le Québec, un peu d'Europe francophone.
const FUSEAUX: [string, number][] = [['America/Toronto', 0.58], ['America/Montreal', 0.17], ['Europe/Paris', 0.09], ['America/Vancouver', 0.05], ['America/Halifax', 0.04], ['Europe/Brussels', 0.03], ['Europe/Zurich', 0.02], ['Africa/Casablanca', 0.02]];
function fuseau(x: number): string {
  for (const [tz, q] of FUSEAUX) { if (x < q) return tz; x -= q; }
  return 'America/Toronto';
}

/** Des visites anonymes dont le parcours suit une chaîne de probabilités. */
export async function chargerSessions(de: Date, max = 2000): Promise<Session[]> {
  const r = hasard(graineDe(jourISO(de)));
  const suite: Record<string, [string, number][]> = {
    '/accueil': [['/quiz', 0.36], ['/boutique', 0.2], ['/podcast', 0.08]],
    '/quiz': [['/vata', 0.38], ['/boutique', 0.12]],
    '/vata': [['/compte', 0.29]],
    '/boutique': [['/compte', 0.18]],
    '/compte': [['/espace', 0.52]],
  };
  const out: Session[] = [];
  for (let i = 0; i < max; i += 1) {
    const parcours = [r() < 0.64 ? '/accueil' : PAGES[1 + Math.floor(r() * 4)].path];
    for (let k = 0; k < 4; k += 1) {
      const options = suite[parcours[parcours.length - 1]] || [];
      let x = r(), prochaine = '';
      for (const [p, q] of options) { if (x < q) { prochaine = p; break; } x -= q; }
      if (!prochaine) break;
      parcours.push(prochaine);
    }
    const debut = new Date(de.getTime() + r() * (Date.now() - de.getTime()));
    out.push({ sid: `demo-${i.toString(36)}`, debut, parcours, entree: parcours[0], derniere: parcours[parcours.length - 1], nbPages: parcours.length, device: r() < 0.38 ? 'ordinateur' : 'mobile', tz: fuseau(r()) });
  }
  return out;
}

export async function chargerEnregistrements(_max = 200): Promise<Session[]> { return []; }
export async function chargerEnregistrement(_sid: string): Promise<unknown[]> { return []; }
export async function effacerSession(_sid: string): Promise<void> {}

export async function chargerReglages(): Promise<ReglagesVexelHotjar> {
  return {
    actif: true, echantillonReplay: 0.25, exclure: ['/admin'],
    entonnoirs: [
      { id: 'demo1', nom: 'Du quiz à l\'espace membre', etapes: ['/accueil', '/quiz', '/vata', '/compte', '/espace'] },
      { id: 'demo2', nom: 'De la boutique au compte', etapes: ['/accueil', '/boutique', '/compte'] },
    ],
  };
}
export async function enregistrerReglages(_r: Partial<ReglagesVexelHotjar>): Promise<void> {}
export async function rafraichirMaintenant(): Promise<{ lots: number; occupe: boolean }> { return { lots: 0, occupe: false }; }

// ─── Ce que le module de Krystine ajoute ────────────────────────────────────

export class EnregistrementIllisible extends Error {
  constructor(readonly total: number) {
    super(`aucun des ${total} morceaux du film n'a pu être téléchargé`);
    this.name = 'EnregistrementIllisible';
  }
}

export interface AdresseExclue { ip: string; note: string; ajoutee: number }
export const EXCLUSIONS_MAX = 40;
export async function chargerExclusions(): Promise<AdresseExclue[]> { return []; }
export async function ajouterExclusion(_e: AdresseExclue): Promise<void> {}
export async function retirerExclusion(_e: AdresseExclue): Promise<void> {}
export async function monAdresse(): Promise<string> { return ''; }

export interface ChiffresQuiz { courriels: number; achatsQuiz: number; achatsTotal: number }
/** Les courriels laissés au quiz et les achats qui en viennent, inventés. */
export async function chargerChiffresQuiz(de: string): Promise<ChiffresQuiz> {
  const jours = Math.max(1, Math.round((Date.now() - new Date(de + 'T00:00:00').getTime()) / 86_400_000));
  return { courriels: Math.round(jours * 4.6), achatsQuiz: Math.round(jours * 0.43), achatsTotal: Math.round(jours * 1.2) };
}

// ─── Petits formats, recopiés du vrai module ────────────────────────────────

export const nb = (n: number) => n.toLocaleString('fr-CA');
export function nomElement(e: { tx?: string; href?: string; s: string }): string {
  if (e.tx) return e.tx.length > 44 ? `${e.tx.slice(0, 42).trim()}…` : e.tx;
  const dernier = e.s.split('>').pop()?.trim() || '';
  const tag = dernier.replace(/[^a-z].*$/, '');
  const rang = dernier.match(/nth-of-type\((\d+)\)/)?.[1];
  const numero = rang ? ` ${rang}` : '';
  if (e.href) { try { return `Lien vers ${new URL(e.href, 'https://x').pathname}`; } catch { return `Lien${numero}`; } }
  const noms: Record<string, string> = { input: 'Champ', textarea: 'Champ', select: 'Menu', button: 'Bouton', a: 'Lien', img: 'Image', video: 'Vidéo', h1: 'Titre', h2: 'Titre', h3: 'Titre', p: 'Texte', label: 'Étiquette', summary: 'Volet', header: 'En-tête', nav: 'Menu', footer: 'Pied de page', section: 'Section' };
  return `${noms[tag] || 'Élément'}${numero}`;
}
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
export function duree(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export const dateCourte = (jour: string) => new Date(jour + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
export const dateLongue = (d: Date) => d.toLocaleString('fr-CA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
