// ─── VexelHotjar, côté navigateur ───────────────────────────────────────────
// Le petit script qui regarde ce que font les visiteuses : les pages vues,
// où elles cliquent (et sur quoi, avec la position dans l'élément pour que la
// carte de chaleur retombe au bon endroit même quand la mise en page bouge),
// jusqu'où elles descendent, les clics de rage et les clics morts, les
// erreurs JavaScript, les formulaires commencés puis laissés, et les
// objectifs (`data-vh-objectif="nom"` sur un bouton).
//
// Il ne démarre qu'après le consentement aux témoins, ne pose aucun témoin,
// garde l'identifiant de session dans sessionStorage et celui de visiteuse
// dans localStorage (un nombre aléatoire, rien d'autre). Les lots partent par
// sendBeacon vers /api/vh toutes les huit secondes ou quand la page se ferme.
// Aucune dépendance : le fichier s'emporte tel quel sur un autre site.

export interface ConfigVexelHotjar {
  site: string;
  /** L'adresse de la fonction de collecte, /api/vh par défaut (réécriture Hosting). */
  endpoint?: string;
  /** Chemins ignorés (préfixes) : l'admin, par exemple. */
  exclure?: string[];
  /** Part des sessions enregistrées (0 à 1), 0 pour ne rien enregistrer. */
  echantillonReplay?: number;
  /** Le module d'enregistrement, chargé à part pour ne pas alourdir le site. */
  chargerReplay?: () => Promise<{ demarrer: (envoyer: (seq: number, events: unknown[]) => void) => () => void }>;
}

type Ev = Record<string, unknown> & { t: string; ts: number; path: string; pv: string };

const CLE_SID = 'vh.sid';
const CLE_SID_T = 'vh.sid.t';
const CLE_VID = 'vh.vid';
const CLE_REPLAY = 'vh.replay';
const INACTIVITE_MS = 30 * 60_000;
const CADENCE_ENVOI_MS = 8_000;
const RAGE_FENETRE_MS = 700;
const RAGE_RAYON_PX = 30;
const MORT_DELAI_MS = 700;
const MOUV_PAS_MS = 250;
const MOUV_MAX_PAR_PAGE = 400;

let actif = false;
let config: Required<Pick<ConfigVexelHotjar, 'site' | 'endpoint' | 'exclure' | 'echantillonReplay'>> & ConfigVexelHotjar;
let sid = '';
let vid = '';
let nouveau = false;
let file: Ev[] = [];
let parcours: string[] = [];
let minuterie: number | undefined;
let arreterReplay: (() => void) | null = null;

// L'état de la page en cours.
let pv = '';
let pathCourant = '';
let debutPage = 0;
let scrollMax = 0;
let mouvements: number[] = [];
let dernierMouv = 0;
let clicsRecents: { x: number; y: number; t: number }[] = [];
let mutationDepuis = 0;
let formsCommences = new Map<string, string>();   // sélecteur du formulaire → dernier champ touché
let formsSoumis = new Set<string>();

const id = (): string => {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
};
const lire = (s: Storage, k: string): string => { try { return s.getItem(k) || ''; } catch { return ''; } };
const ecrire = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* navigation privée */ } };

function chemin(): string {
  return location.pathname.replace(/\/+$/, '') || '/';
}

function exclu(path: string): boolean {
  return config.exclure.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));
}

// ─── Identités ──────────────────────────────────────────────────────────────

function ouvrirSession() {
  const dernier = Number(lire(sessionStorage, CLE_SID_T)) || 0;
  sid = lire(sessionStorage, CLE_SID);
  if (!sid || Date.now() - dernier > INACTIVITE_MS) {
    sid = id();
    ecrire(sessionStorage, CLE_SID, sid);
    parcours = [];
  }
  toucherSession();
  vid = lire(localStorage, CLE_VID);
  if (!vid) { vid = id(); nouveau = true; ecrire(localStorage, CLE_VID, vid); }
}

function toucherSession() { ecrire(sessionStorage, CLE_SID_T, String(Date.now())); }

// ─── Sélecteurs ─────────────────────────────────────────────────────────────

const INTERACTIFS = 'a,button,input,select,textarea,label,summary,[role="button"],[role="link"],[data-vh-objectif]';

/** Un chemin CSS court et stable : un id s'il y en a un, sinon la lignée avec nth-of-type, six niveaux au plus. */
export function selecteur(el: Element): string {
  const parts: string[] = [];
  let e: Element | null = el;
  while (e && e !== document.body && parts.length < 6) {
    if (e.id && !/\d{3,}/.test(e.id)) { parts.unshift(`#${CSS.escape(e.id)}`); break; }
    const tag = e.tagName.toLowerCase();
    const parent: Element | null = e.parentElement;
    let part = tag;
    if (parent) {
      const freres = Array.from(parent.children).filter(c => c.tagName === e!.tagName);
      if (freres.length > 1) part += `:nth-of-type(${freres.indexOf(e) + 1})`;
    }
    parts.unshift(part);
    e = parent;
  }
  return parts.join('>');
}

function texteDe(el: Element): string {
  const aria = el.getAttribute('aria-label');
  const t = (aria || (el as HTMLElement).innerText || el.getAttribute('title') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
  return t.slice(0, 60);
}

// ─── La file et l'envoi ─────────────────────────────────────────────────────

function pousser(e: Omit<Ev, 'ts' | 'path' | 'pv'> & Partial<Ev>) {
  if (!actif) return;
  file.push({ ts: Date.now(), path: pathCourant, pv, ...e } as Ev);
  toucherSession();
  if (file.length >= 40) envoyer();
  else if (minuterie === undefined) minuterie = window.setTimeout(envoyer, CADENCE_ENVOI_MS);
}

function envoyer() {
  if (minuterie !== undefined) { clearTimeout(minuterie); minuterie = undefined; }
  if (!file.length) return;
  const lot = file;
  file = [];
  const corps = JSON.stringify({ v: 1, t: 'lot', site: config.site, sid, vid, nouveau, parcours: parcours.slice(-60), ev: lot });
  nouveau = false;
  livrer(corps);
}

function livrer(corps: string | Blob) {
  const blob = corps instanceof Blob ? corps : new Blob([corps], { type: 'text/plain' });
  try {
    if (blob.size < 60_000 && navigator.sendBeacon && navigator.sendBeacon(config.endpoint, blob)) return;
  } catch { /* on passe par fetch */ }
  fetch(config.endpoint, { method: 'POST', body: blob, keepalive: blob.size < 60_000, credentials: 'omit' }).catch(() => {});
}

// ─── Pages ──────────────────────────────────────────────────────────────────

function utmDe(): Record<string, string> | undefined {
  const q = new URLSearchParams(location.search);
  const u: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = q.get(k); if (v) u[k] = v.slice(0, 80);
  }
  return Object.keys(u).length ? u : undefined;
}

function hauteurDoc(): number {
  return Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, 1);
}

function mesurerScroll() {
  const y = window.scrollY + window.innerHeight;
  const p = Math.min(100, Math.round((y / hauteurDoc()) * 100));
  if (p > scrollMax) scrollMax = p;
}

function ouvrirPage(premier: boolean) {
  const path = chemin();
  if (exclu(path)) { pv = ''; pathCourant = path; return; }
  pv = id();
  pathCourant = path;
  debutPage = Date.now();
  scrollMax = 0;
  mouvements = [];
  clicsRecents = [];
  formsCommences = new Map();
  formsSoumis = new Set();
  if (parcours[parcours.length - 1] !== path) parcours.push(path);
  window.setTimeout(mesurerScroll, 400);
  pousser({
    t: 'vue', titre: document.title.slice(0, 120),
    ref: premier ? document.referrer.slice(0, 300) : '',
    vw: window.innerWidth, vh: window.innerHeight, lang: document.documentElement.lang || navigator.language,
    premier: premier && parcours.length === 1, utm: utmDe(),
  });
}

function fermerPage(fin: boolean) {
  if (!pv) return;
  mesurerScroll();
  viderMouvements();
  for (const [s, champ] of formsCommences) {
    if (!formsSoumis.has(s)) pousser({ t: 'form', s, etat: 'abandon', champ });
  }
  formsCommences.clear();
  pousser({ t: 'sortie', duree: Date.now() - debutPage, scrollMax, pages: parcours.length, fin });
  envoyer();
  if (fin) pv = '';
}

// ─── Clics, mouvements, erreurs, formulaires ────────────────────────────────

function surClic(ev: MouseEvent) {
  if (!pv || !(ev.target instanceof Element)) return;
  const cible = ev.target;
  const inter = cible.closest(INTERACTIFS) || cible;
  const rect = inter.getBoundingClientRect();
  const ex = rect.width ? (ev.clientX - rect.left) / rect.width : 0.5;
  const ey = rect.height ? (ev.clientY - rect.top) / rect.height : 0.5;
  const now = Date.now();

  // Clic de rage : au moins trois clics en moins de 700 ms dans un rayon de 30 px.
  clicsRecents = clicsRecents.filter(c => now - c.t < RAGE_FENETRE_MS);
  clicsRecents.push({ x: ev.clientX, y: ev.clientY, t: now });
  const rage = clicsRecents.length >= 3 && clicsRecents.every(c => Math.hypot(c.x - ev.clientX, c.y - ev.clientY) < RAGE_RAYON_PX);
  if (rage) clicsRecents = [];

  const e: Ev = {
    t: 'clic', ts: now, path: pathCourant, pv,
    s: selecteur(inter), tx: texteDe(inter), href: (inter as HTMLAnchorElement).href?.slice(0, 300) || '',
    tg: inter.tagName.toLowerCase(),
    ex: +Math.min(1, Math.max(0, ex)).toFixed(3), ey: +Math.min(1, Math.max(0, ey)).toFixed(3),
    vx: +(ev.clientX / window.innerWidth).toFixed(3), dy: Math.round(ev.clientY + window.scrollY), hd: hauteurDoc(),
    vw: window.innerWidth, r: rage, m: false,
    obj: inter.getAttribute('data-vh-objectif') || undefined,
  };
  if (!e.obj) delete e.obj;

  // Clic mort : rien ne bouge dans les 700 ms (ni le DOM, ni l'adresse, ni le
  // défilement) après un clic sur autre chose qu'un champ de saisie.
  const champ = inter.matches('input,select,textarea,label');
  const pathAvant = location.href;
  const scrollAvant = window.scrollY;
  const mutAvant = mutationDepuis;
  const pvAvant = pv;
  if (champ) { pousser(e); return; }
  window.setTimeout(() => {
    const bouge = location.href !== pathAvant || Math.abs(window.scrollY - scrollAvant) > 4 || mutationDepuis !== mutAvant || pv !== pvAvant;
    e.m = !bouge;
    if (pv !== pvAvant) { e.path = e.path; }
    file.push(e); toucherSession();
    if (minuterie === undefined) minuterie = window.setTimeout(envoyer, CADENCE_ENVOI_MS);
  }, MORT_DELAI_MS);
}

function surMouvement(ev: MouseEvent) {
  if (!pv) return;
  const now = Date.now();
  if (now - dernierMouv < MOUV_PAS_MS || mouvements.length >= MOUV_MAX_PAR_PAGE * 2) return;
  dernierMouv = now;
  mouvements.push(Math.round((ev.clientX / window.innerWidth) * 1000), Math.round(ev.clientY + window.scrollY));
  if (mouvements.length >= 200) viderMouvements();
}

function viderMouvements() {
  if (!mouvements.length) return;
  pousser({ t: 'mouv', vw: window.innerWidth, pts: mouvements });
  mouvements = [];
}

function surErreur(ev: ErrorEvent | PromiseRejectionEvent) {
  if (!pv) return;
  const err = 'reason' in ev ? ev.reason : ev.error;
  const msg = ('message' in ev && ev.message) || (err && (err.message || String(err))) || 'Erreur';
  pousser({ t: 'erreur', msg: String(msg).slice(0, 200), src: ('filename' in ev ? ev.filename : '') || '', ligne: ('lineno' in ev ? ev.lineno : 0) || 0 });
}

function surFocus(ev: FocusEvent) {
  if (!pv || !(ev.target instanceof Element) || !ev.target.matches('input,select,textarea')) return;
  const form = ev.target.closest('form');
  if (!form) return;
  const s = selecteur(form);
  const champ = ev.target.getAttribute('name') || ev.target.getAttribute('id') || ev.target.getAttribute('placeholder') || ev.target.tagName.toLowerCase();
  if (!formsCommences.has(s)) pousser({ t: 'form', s, etat: 'debut', champ });
  formsCommences.set(s, champ.slice(0, 80));
}

function surSoumission(ev: Event) {
  if (!pv || !(ev.target instanceof HTMLFormElement)) return;
  const s = selecteur(ev.target);
  formsSoumis.add(s);
  pousser({ t: 'form', s, etat: 'soumis', champ: '' });
}

// ─── Navigation d'application (React Router) ────────────────────────────────

function brancherNavigation() {
  const changer = () => {
    if (chemin() === pathCourant) return;
    fermerPage(false);
    ouvrirPage(false);
  };
  for (const m of ['pushState', 'replaceState'] as const) {
    const orig = history[m];
    history[m] = function (this: History, ...args: Parameters<History['pushState']>) {
      const r = orig.apply(this, args);
      window.setTimeout(changer, 0);
      return r;
    } as History['pushState'];
  }
  window.addEventListener('popstate', () => window.setTimeout(changer, 0));
}

// ─── Enregistrement (rrweb), à part et échantillonné ───────────────────────

function peutEtreEnregistrer() {
  if (!config.chargerReplay || config.echantillonReplay <= 0) return;
  let choix = lire(sessionStorage, CLE_REPLAY);
  if (!choix) { choix = Math.random() < config.echantillonReplay ? 'oui' : 'non'; ecrire(sessionStorage, CLE_REPLAY, choix); }
  if (choix !== 'oui') return;
  config.chargerReplay().then(mod => {
    if (!actif) return;
    arreterReplay = mod.demarrer((seq, events) => {
      const corps = JSON.stringify({ v: 1, t: 'replay', site: config.site, sid, seq, events });
      compresser(corps).then(livrer);
    });
  }).catch(() => {});
}

async function compresser(texte: string): Promise<Blob> {
  const brut = new Blob([texte], { type: 'text/plain' });
  if (typeof CompressionStream === 'undefined' || brut.size < 4_000) return brut;
  try {
    const flux = brut.stream().pipeThrough(new CompressionStream('gzip'));
    return new Blob([await new Response(flux).arrayBuffer()], { type: 'application/octet-stream' });
  } catch { return brut; }
}

// ─── Démarrage et arrêt ─────────────────────────────────────────────────────

let observateur: MutationObserver | null = null;

export function demarrerVexelHotjar(c: ConfigVexelHotjar) {
  if (actif || typeof window === 'undefined') return;
  if (new URLSearchParams(location.search).get('vh') === 'apercu') return;   // l'aperçu de l'admin ne se compte pas
  config = { endpoint: '/api/vh', exclure: ['/admin'], echantillonReplay: 0, ...c };
  actif = true;
  ouvrirSession();
  brancherNavigation();
  observateur = new MutationObserver(() => { mutationDepuis += 1; });
  observateur.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  document.addEventListener('click', surClic, true);
  document.addEventListener('mousemove', surMouvement, { passive: true });
  document.addEventListener('scroll', mesurerScroll, { passive: true });
  document.addEventListener('focusin', surFocus, true);
  document.addEventListener('submit', surSoumission, true);
  window.addEventListener('error', surErreur);
  window.addEventListener('unhandledrejection', surErreur);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') fermerPage(true); else if (!pv && !exclu(chemin())) ouvrirPage(false); });
  window.addEventListener('pagehide', () => fermerPage(true));
  ouvrirPage(true);
  peutEtreEnregistrer();
}

export function arreterVexelHotjar() {
  if (!actif) return;
  fermerPage(true);
  actif = false;
  observateur?.disconnect();
  arreterReplay?.();
  arreterReplay = null;
}

/** Un objectif atteint hors clic (un achat confirmé, une inscription) : `window.vexelhotjar.objectif('achat')`. */
export function objectif(nom: string) {
  pousser({ t: 'objectif', nom: String(nom).slice(0, 40) });
}

declare global {
  interface Window { vexelhotjar?: { objectif: (nom: string) => void } }
}
if (typeof window !== 'undefined') window.vexelhotjar = { objectif };
