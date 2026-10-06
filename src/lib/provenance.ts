// ─── D'où vient une nouvelle personne ────────────────────────────────────────
// Krystine, 28 septembre 2026 : la priorité n° 1 est de faire entrer du monde
// (3 000 nouvelles personnes avant le 15 décembre), et chaque voie (Dream 50,
// média, podcast externe, extrait, partenaire, publicité) doit pouvoir se
// mesurer. Un lien partagé porte donc sa provenance :
//   krystinestlaurent.ca/podcast?utm_source=metamorphose&utm_campaign=entrevue
//   krystinestlaurent.ca/?via=roxane
// La première arrivée se retient ici 60 jours dans le navigateur, et
// `addNewsletterSubscriber` la joint à l'inscription quand la personne choisit
// de laisser son courriel. Rien ne part ailleurs : ni pixel, ni tiers; sans
// inscription, la provenance ne quitte jamais le navigateur.

const CLE = 'ksl.provenance';
const DUREE_MS = 60 * 24 * 60 * 60 * 1000;

export interface Provenance {
  /** utm_source, via, ref ou src; sinon le domaine référent; sinon « direct ». */
  source: string;
  medium?: string;
  campagne?: string;
  contenu?: string;
  /** La page d'arrivée (chemin seulement). */
  page: string;
  /** Le domaine d'où la personne arrive, quand il est extérieur au site. */
  referent?: string;
  /** Première arrivée, en millisecondes. */
  le: number;
}

const propre = (v: string | null | undefined, max = 60) =>
  (v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);

function domaineReferent(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const h = new URL(document.referrer).hostname.replace(/^www\./, '');
    if (!h || h === location.hostname.replace(/^www\./, '') || h.endsWith('krystinestlaurent.ca')) return undefined;
    return h;
  } catch { return undefined; }
}

function lire(): Provenance | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLE) || 'null') as Provenance | null;
    if (!p || typeof p.le !== 'number' || Date.now() - p.le > DUREE_MS) return null;
    return p;
  } catch { return null; }
}

/** À appeler une fois au chargement du site. Garde la PREMIÈRE arrivée; un
 *  nouveau lien marqué (utm, via) la remplace, parce qu'il dit mieux quelle
 *  voie a amené la personne jusqu'à l'inscription. */
export function noterProvenance(): void {
  try {
    const q = new URLSearchParams(location.search);
    const marquee = propre(q.get('utm_source') || q.get('via') || q.get('ref') || q.get('src'));
    const existante = lire();
    if (existante && !marquee) return;
    const referent = domaineReferent();
    const p: Provenance = {
      source: marquee || (referent ? propre(referent) : 'direct'),
      page: location.pathname.slice(0, 120),
      le: Date.now(),
    };
    const medium = propre(q.get('utm_medium'));
    const campagne = propre(q.get('utm_campaign'));
    // « &l=3 » : la lettre d'une suite qui porte le lien (6 oct. 2026).
    const contenu = propre(q.get('utm_content') || (q.get('l') ? `l${q.get('l')}` : ''));
    if (medium) p.medium = medium;
    if (campagne) p.campagne = campagne;
    if (contenu) p.contenu = contenu;
    if (referent) p.referent = referent;
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch { /* stockage bloqué : l'inscription se fait sans provenance */ }
}

/** La provenance à joindre à un paiement (6 oct. 2026) : « suite-vent » et,
 *  si le lien le dit, la lettre (« l3 »). Le serveur la filtre à nouveau. */
export function viaPaiement(): { via?: string; viaLettre?: string } {
  const p = lire();
  if (!p || !p.source || p.source === 'direct' || p.referent) return {};
  return { via: p.source, ...(p.contenu && /^l\d{1,2}$/.test(p.contenu) ? { viaLettre: p.contenu } : {}) };
}

/** La provenance à joindre à une inscription, ou undefined. */
export function lireProvenance(): Provenance | undefined {
  return lire() || undefined;
}
