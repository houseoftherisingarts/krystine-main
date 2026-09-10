/**
 * Le crayon de Krystine, pour les quatre pages servies en HTML statique
 * (accueil, communauté, speaking, liste-attente-origine), en dehors de
 * l'application React.
 *
 * Deux couches, complètement indépendantes l'une de l'autre :
 *
 * 1) L'application des surcharges, pour TOUTE VISITEUSE. Au chargement, le
 *    script lit une seule fois siteOverrides/singleton, puis parcourt les
 *    nœuds de texte feuilles et les <img> (ou fonds posés en style en ligne)
 *    de la page et applique ce que Krystine a déjà réglé. Sans surcharge, la
 *    page reste pixel pour pixel celle qu'elle était avant ce script.
 *
 * 2) Le crayon lui-même, réservé à une administratrice reconnue par
 *    Firebase Auth (la même liste que firestore.rules et
 *    src/firebase/auth.ts). Tant que personne d'admin n'est identifié, rien
 *    ne s'affiche et aucun écouteur de clic n'est posé.
 *
 * Le contrat de clés est le même que pour l'application React
 * (src/lib/edition.tsx) : la clé d'un texte est la phrase française telle
 * qu'écrite dans la page, normalisée (espaces réduits, extrémités élaguées);
 * la clé d'une photo est l'adresse écrite dans le code. Tout vit dans le même
 * document Firestore, siteOverrides/singleton, champs libre / libreEN /
 * photos / cadres.
 *
 * La difficulté propre aux pages statiques : /i18n/static.js traduit déjà le
 * texte français en anglais de façon asynchrone (après avoir récupéré
 * /i18n/en.json). Pour ne jamais perdre la clé française derrière une
 * traduction déjà posée, ce script mémorise la clé de CHAQUE nœud de texte et
 * de CHAQUE image dès la toute première fois qu'il les voit, avant même que
 * les surcharges soient arrivées de Firestore. Cette première vue arrive
 * toujours avant la traduction de static.js, puisque les deux scripts
 * s'exécutent en module différé, dans l'ordre du document, et qu'aucune
 * traduction ne peut se produire avant qu'une requête réseau asynchrone ait
 * eu le temps de revenir.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteField, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk',
  authDomain: 'krystinestlaurent-87566.firebaseapp.com',
  projectId: 'krystinestlaurent-87566',
  storageBucket: 'krystinestlaurent-87566.firebasestorage.app',
  messagingSenderId: '908806491352',
  appId: '1:908806491352:web:a11a9f39bdcc5183851bad',
};

// Doit rester identique à la fonction isAdmin() de firestore.rules et à
// ADMIN_EMAILS de src/firebase/auth.ts.
const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];

const ZOOM_MAX = 3;
const CADRE_NEUTRE = { x: 50, y: 50, z: 1 };
const CRAYON_SEL = '[data-crayon]';
const IGNORE_TEXTE_SEL = 'script,style,svg,noscript,textarea,code,' + CRAYON_SEL;

const app = initializeApp(FIREBASE_CONFIG, 'crayonStatique');
const auth = getAuth(app);
const db = getFirestore(app);
const REF_OVERRIDES = doc(db, 'siteOverrides', 'singleton');

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const lang = () => { try { return localStorage.getItem('krystine-lang') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; } };

// ── État ─────────────────────────────────────────────────────────────────
let publie = { libre: {}, libreEN: {}, photos: {}, cadres: {} };
let brouillonTexte = {}; // source → { fr?, en? } | null (null = retour au texte d'origine)
let brouillonPhoto = {}; // clé → { cadre? } | null
let dictEN = null; // dictionnaire fr→en, chargé une seule fois si la langue est l'anglais
let edition = false;

const origTexte = new WeakMap(); // Text → source française mémorisée à la première vue
const origPhoto = new WeakMap(); // Element → adresse d'origine mémorisée à la première vue

// ── Mémorisation de l'adresse d'origine ─────────────────────────────────────
function sourceDeNoeud(n) {
  let s = origTexte.get(n);
  if (s === undefined) {
    const v = norm(n.nodeValue || '');
    s = v && v.length <= 2000 ? v : '';
    origTexte.set(n, s);
  }
  return s;
}

function cleDeImg(img) {
  let c = origPhoto.get(img);
  if (c === undefined) { c = img.getAttribute('src') || ''; origPhoto.set(img, c); }
  return c;
}

function cleDeFond(el) {
  let c = origPhoto.get(el);
  if (c === undefined) {
    const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(el.getAttribute('style') || '');
    c = m ? m[1] : '';
    origPhoto.set(el, c);
  }
  return c;
}

// ── Base (sans surcharge) et valeur effective, pour le texte ────────────────
async function assurerDict() {
  if (lang() !== 'en' || dictEN) return;
  try {
    const r = await fetch('/i18n/en.json', { cache: 'force-cache' });
    dictEN = await r.json();
  } catch { dictEN = {}; }
}

function texteDeBase(source, langue) {
  if (langue === 'en' && dictEN && dictEN[source] !== undefined) return dictEN[source];
  return source;
}

/** Ce que la zone de texte doit montrer : le brouillon, sinon la surcharge publiée, sinon le texte de base. */
function valeurPourZone(source, langue) {
  const b = brouillonTexte[source];
  if (b === null) return texteDeBase(source, langue);
  if (b && b[langue] !== undefined) return b[langue];
  const pub = publie[langue === 'en' ? 'libreEN' : 'libre'][source];
  return pub !== undefined ? pub : texteDeBase(source, langue);
}

function peutRemettreTexte(source) {
  const b = brouillonTexte[source];
  return publie.libre[source] !== undefined || publie.libreEN[source] !== undefined || (b !== undefined && b !== null);
}

// ── Couche d'application : pour toute visiteuse ─────────────────────────────
function appliquerTextes() {
  const langue = lang();
  // En anglais, tant que le dictionnaire n'est pas arrivé, on ne sait pas
  // encore quel est le texte de base : mieux vaut attendre une passe de plus
  // que de réécrire par-dessus une traduction déjà juste posée par static.js.
  if (langue === 'en' && !dictEN) return;
  const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = marche.nextNode())) {
    if (n.parentElement && n.parentElement.closest(IGNORE_TEXTE_SEL)) continue;
    const source = sourceDeNoeud(n);
    if (!source) continue;
    // Toujours recalculer la valeur voulue (brouillon, sinon surcharge
    // publiée, sinon texte de base) et ne réécrire que si elle diffère :
    // c'est ce qui permet de revenir au texte d'origine quand un brouillon
    // est abandonné, sans jamais toucher un nœud qui n'a jamais changé.
    const valeur = valeurPourZone(source, langue);
    const v = n.nodeValue || '';
    const m = /^(\s*)[\s\S]*?(\s*)$/.exec(v) || ['', '', ''];
    const nouveau = m[1] + valeur + m[2];
    if (n.nodeValue !== nouveau) n.nodeValue = nouveau;
  }
}

function appliquerImages() {
  document.querySelectorAll('img').forEach((img) => {
    if (img.closest(CRAYON_SEL)) return;
    const cle = cleDeImg(img);
    if (!cle) return;
    const b = brouillonPhoto[cle];
    const cadre = (b && b.cadre) || publie.cadres[cle];
    if (!cadre) return;
    img.style.objectPosition = `${cadre.x}% ${cadre.y}%`;
    if (cadre.z !== 1) { img.style.transformOrigin = `${cadre.x}% ${cadre.y}%`; img.style.scale = String(cadre.z); }
  });
}

function appliquerFonds() {
  document.querySelectorAll('[style]').forEach((el) => {
    if (el.tagName === 'IMG' || el.closest(CRAYON_SEL)) return;
    const cle = cleDeFond(el);
    if (!cle) return;
    const b = brouillonPhoto[cle];
    const cadre = (b && b.cadre) || publie.cadres[cle];
    if (!cadre) return;
    el.style.backgroundPosition = `${cadre.x}% ${cadre.y}%`;
    if (cadre.z !== 1) el.style.backgroundSize = `${Math.round(cadre.z * 100)}%`;
  });
}

function appliquerSurcharges() { appliquerTextes(); appliquerImages(); appliquerFonds(); }

// Après chaque changement du document (traduction, bannière, contenu chargé
// plus tard), on repasse avec un léger délai pour ne pas boucler.
let minuterie;
new MutationObserver(() => {
  window.clearTimeout(minuterie);
  minuterie = window.setTimeout(() => { appliquerSurcharges(); if (edition) etiqueter(); }, 150);
}).observe(document.body, { childList: true, subtree: true, characterData: true });

async function chargerSurcharges() {
  try {
    const snap = await getDoc(REF_OVERRIDES);
    const data = snap.exists() ? snap.data() : {};
    publie = {
      libre: objetTextes(data.libre),
      libreEN: objetTextes(data.libreEN),
      photos: objetTextes(data.photos),
      cadres: objetCadres(data.cadres),
    };
  } catch {
    return; // hors ligne ou règles fermées : le code fait le travail, la page reste intacte
  }
  appliquerSurcharges();
  if (edition) etiqueter();
}

function objetTextes(v) {
  const out = {};
  if (v && typeof v === 'object') for (const [k, val] of Object.entries(v)) if (typeof val === 'string') out[k] = val;
  return out;
}
function borne(v, min, max, defaut) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
}
function objetCadres(v) {
  const out = {};
  if (v && typeof v === 'object') for (const [k, c] of Object.entries(v)) {
    if (c && typeof c === 'object') out[k] = { x: borne(c.x, 0, 100, 50), y: borne(c.y, 0, 100, 50), z: borne(c.z, 1, ZOOM_MAX, 1) };
  }
  return out;
}

function demarrer() {
  appliquerSurcharges(); // capture d'abord chaque clé d'origine, avant toute traduction
  assurerDict();
  chargerSurcharges();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();

// ── Le crayon : réservé à une administratrice reconnue ──────────────────────
let uiPresente = false;
let root, boutonCrayon, barreEdition, compteurEl, boutonEnregistrer, boutonQuitter, avisEl, hintEl;
let panneauTexte, ongletFr, ongletEn, zoneTexte, boutonAppliquer, boutonResetTexte;
let panneauPhoto, apercuBox, apercuImg, pointEl, zoomInput, zoomVal;

let cibleTexteIdx = null; // index dans textIndex
let textIndex = [];
let cleCadreCourant = null;
let langEdit = 'fr';
let busy = false;

function nbModifs() { return Object.keys(brouillonTexte).length + Object.keys(brouillonPhoto).length; }

function majCompteur() {
  const n = nbModifs();
  compteurEl.textContent = n === 0 ? 'Aucun changement' : n === 1 ? '1 changement' : `${n} changements`;
  boutonEnregistrer.disabled = busy || n === 0;
}

function majHint() { hintEl.hidden = !(edition && panneauTexte.hidden && panneauPhoto.hidden); }

function fermerPanneaux() {
  panneauTexte.hidden = true;
  panneauPhoto.hidden = true;
  cibleTexteIdx = null;
  cleCadreCourant = null;
  majHint();
}

// La bordure d'un élément déjà en place s'agrandirait au premier pixel : le
// repérage en édition passe donc par `outline`, jamais par `border`.
function etiqueter() {
  document.querySelectorAll('[data-tx]').forEach((el) => el.removeAttribute('data-tx'));
  document.querySelectorAll('[data-cadre]').forEach((el) => el.removeAttribute('data-cadre'));
  textIndex = [];
  if (!edition) return;
  const dejaMarques = new Set();
  const marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = marche.nextNode())) {
    const parent = n.parentElement;
    if (!parent || parent.closest(IGNORE_TEXTE_SEL)) continue;
    const source = sourceDeNoeud(n);
    // ponytail: un paragraphe formé de plusieurs segments de texte (mots en
    // gras au milieu d'une phrase, par exemple) ne rend éditable que son
    // premier segment plutôt que d'introduire un balisage supplémentaire
    // qui déplacerait des pixels. Cas rare sur ces pages, à revoir si un
    // vrai besoin apparaît.
    if (!source || dejaMarques.has(parent)) continue;
    dejaMarques.add(parent);
    const idx = textIndex.length;
    textIndex.push(source);
    parent.setAttribute('data-tx', String(idx));
  }
  document.querySelectorAll('img').forEach((img) => {
    if (img.closest(CRAYON_SEL)) return;
    const cle = cleDeImg(img);
    if (cle) img.setAttribute('data-cadre', cle);
  });
  document.querySelectorAll('[style]').forEach((el) => {
    if (el.tagName === 'IMG' || el.closest(CRAYON_SEL)) return;
    const cle = cleDeFond(el);
    if (cle) el.setAttribute('data-cadre', cle);
  });
}

function positionnerFenetre(panel, rect) {
  const largeur = Math.min(440, window.innerWidth - 24);
  panel.style.width = `${largeur}px`;
  const plancher = 132; // jamais sous la barre du haut
  let top = rect ? rect.bottom + 10 : plancher;
  let left = rect ? Math.min(Math.max(12, rect.left), window.innerWidth - largeur - 12) : 12;
  if (top < plancher) top = plancher;
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
  requestAnimationFrame(() => {
    const h = panel.offsetHeight;
    if (rect && top + h > window.innerHeight - 12) {
      panel.style.top = `${Math.max(plancher, rect.top - 10 - h)}px`;
    }
  });
}

function ouvrirTexte(el, idx) {
  fermerPanneaux();
  cibleTexteIdx = idx;
  langEdit = lang();
  const source = textIndex[idx];
  ongletFr.setAttribute('aria-selected', String(langEdit === 'fr'));
  ongletEn.setAttribute('aria-selected', String(langEdit === 'en'));
  zoneTexte.value = valeurPourZone(source, langEdit);
  boutonResetTexte.hidden = !peutRemettreTexte(source);
  panneauPhoto.hidden = true;
  panneauTexte.hidden = false;
  majHint();
  positionnerFenetre(panneauTexte, el.getBoundingClientRect());
  zoneTexte.focus();
}

function urlAffichee(el) {
  if (el.tagName === 'IMG') return el.currentSrc || el.src;
  const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(getComputedStyle(el).backgroundImage || '');
  return m ? m[1] : '';
}

function poserPoint(cadre) {
  apercuImg.style.objectPosition = `${cadre.x}% ${cadre.y}%`;
  apercuImg.style.transformOrigin = `${cadre.x}% ${cadre.y}%`;
  apercuImg.style.scale = String(cadre.z);
  pointEl.style.left = `${cadre.x}%`;
  pointEl.style.top = `${cadre.y}%`;
  zoomInput.value = String(cadre.z);
  zoomVal.textContent = `${cadre.z.toFixed(2)}×`;
}

function ouvrirPhoto(el) {
  fermerPanneaux();
  const cle = el.getAttribute('data-cadre') || '';
  cleCadreCourant = cle;
  const cadre = (brouillonPhoto[cle] && brouillonPhoto[cle].cadre) || publie.cadres[cle] || CADRE_NEUTRE;
  apercuImg.src = urlAffichee(el) || cle;
  const ratio = Math.max(0.4, Math.min(2.4, el.clientWidth / Math.max(1, el.clientHeight)));
  apercuBox.style.aspectRatio = String(ratio);
  poserPoint(cadre);
  panneauTexte.hidden = true;
  panneauPhoto.hidden = false;
  majHint();
  positionnerFenetre(panneauPhoto, el.getBoundingClientRect());
}

function ecrireCadre(partiel) {
  if (!cleCadreCourant) return;
  const actuel = (brouillonPhoto[cleCadreCourant] && brouillonPhoto[cleCadreCourant].cadre) || publie.cadres[cleCadreCourant] || CADRE_NEUTRE;
  const cadre = { ...actuel, ...partiel };
  brouillonPhoto[cleCadreCourant] = { cadre };
  poserPoint(cadre);
  majCompteur();
  appliquerImages();
  appliquerFonds();
}

function appliquerTexteCourant() {
  if (cibleTexteIdx === null) return;
  const source = textIndex[cibleTexteIdx];
  const courant = brouillonTexte[source];
  brouillonTexte[source] = { ...(courant && courant !== null ? courant : {}), [langEdit]: zoneTexte.value };
  boutonResetTexte.hidden = !peutRemettreTexte(source);
  majCompteur();
  appliquerTextes();
}

function remettreTexteCourant() {
  if (cibleTexteIdx === null) return;
  const source = textIndex[cibleTexteIdx];
  brouillonTexte[source] = null;
  zoneTexte.value = valeurPourZone(source, langEdit);
  boutonResetTexte.hidden = true;
  majCompteur();
  appliquerTextes();
}

function afficherAvis(msg) {
  avisEl.textContent = msg;
  avisEl.hidden = false;
  window.setTimeout(() => { avisEl.hidden = true; }, 2600);
}

async function enregistrer() {
  if (busy) return;
  busy = true;
  boutonEnregistrer.disabled = true;
  boutonEnregistrer.textContent = 'Enregistrement…';
  try {
    const patch = { _maj: serverTimestamp() };
    const parClef = { libre: {}, libreEN: {}, photos: {}, cadres: {} };
    let utilise = false;
    for (const [source, val] of Object.entries(brouillonTexte)) {
      if (val === null) { parClef.libre[source] = deleteField(); parClef.libreEN[source] = deleteField(); utilise = true; continue; }
      if (val.fr !== undefined) { parClef.libre[source] = val.fr; utilise = true; }
      if (val.en !== undefined) { parClef.libreEN[source] = val.en; utilise = true; }
    }
    for (const [cle, val] of Object.entries(brouillonPhoto)) {
      if (val && val.cadre !== undefined) { parClef.cadres[cle] = val.cadre; utilise = true; }
    }
    if (utilise) {
      for (const champ of Object.keys(parClef)) if (Object.keys(parClef[champ]).length) patch[champ] = parClef[champ];
      // setDoc en merge, jamais updateDoc : une clé contient des points et des
      // barres obliques, elle passe donc par son objet parent entier, où
      // deleteField() reste compris; updateDoc sur « libre » remplacerait la
      // carte entière et effacerait ce que Krystine a écrit ailleurs.
      await setDoc(REF_OVERRIDES, patch, { merge: true });
    }
    brouillonTexte = {};
    brouillonPhoto = {};
    fermerPanneaux();
    basculerEdition(false);
    afficherAvis('Changements enregistrés.');
  } catch (e) {
    console.error('Enregistrement du crayon statique', e);
    afficherAvis("L'enregistrement n'a pas fonctionné. Réessayez.");
  } finally {
    busy = false;
    boutonEnregistrer.textContent = 'Enregistrer';
    majCompteur();
  }
}

function annuler() {
  brouillonTexte = {};
  brouillonPhoto = {};
  fermerPanneaux();
  basculerEdition(false);
  appliquerSurcharges();
}

function onDocClick(e) {
  if (!edition) return;
  const target = e.target;
  if (!target || target.closest(CRAYON_SEL)) return;
  const points = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [];
  const image = target.closest('[data-cadre]') || points.find((el) => el.matches && el.matches('[data-cadre]'));
  if (image) {
    e.preventDefault();
    e.stopPropagation();
    ouvrirPhoto(image);
    return;
  }
  const el = target.closest('[data-tx]');
  if (!el) return;
  const idx = Number(el.getAttribute('data-tx'));
  if (!textIndex[idx]) return;
  e.preventDefault();
  e.stopPropagation();
  ouvrirTexte(el, idx);
}

function onKeyDown(e) {
  if (e.key === 'Escape' && (!panneauTexte.hidden || !panneauPhoto.hidden)) fermerPanneaux();
}

function basculerEdition(on) {
  edition = on;
  document.body.classList.toggle('crayon-edition', on);
  boutonCrayon.hidden = on;
  barreEdition.hidden = !on;
  if (on) { document.addEventListener('click', onDocClick, true); document.addEventListener('keydown', onKeyDown); }
  else { document.removeEventListener('click', onDocClick, true); document.removeEventListener('keydown', onKeyDown); fermerPanneaux(); }
  etiqueter();
  majHint();
}

const STYLE_CRAYON = `
[data-crayon],[data-crayon] *{box-sizing:border-box;font-family:Inter,system-ui,-apple-system,sans-serif}
[data-crayon] [hidden]{display:none!important}
.cs-bar{position:fixed;z-index:2147483000;top:76px;right:max(1rem,env(safe-area-inset-right));display:flex;align-items:center;gap:8px}
.cs-pencil{width:44px;height:44px;border-radius:999px;border:0;background:#bb9a5e;color:#1d1604;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 30px -8px rgba(0,0,0,.45)}
.cs-pencil:hover{background:#dcb874}
.cs-editbar{display:flex;align-items:center;gap:6px;border:1px solid rgba(187,154,94,.4);background:rgba(246,243,238,.97);backdrop-filter:blur(6px);border-radius:999px;padding:6px 8px;box-shadow:0 10px 30px -8px rgba(0,0,0,.35)}
.cs-editbar-label{font-size:12px;color:#1d1604;padding:0 6px;white-space:nowrap}
@media (max-width:640px){.cs-editbar-label{display:none}}
.cs-count{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(42,32,21,.7);padding:0 4px;white-space:nowrap}
.cs-save{min-height:36px;padding:0 16px;border-radius:999px;border:0;background:#bb9a5e;color:#1d1604;font-size:13px;font-weight:500;cursor:pointer}
.cs-save:hover{background:#dcb874}
.cs-save:disabled{opacity:.4;cursor:default}
.cs-quit{width:36px;height:36px;border-radius:999px;border:1px solid rgba(187,154,94,.5);background:transparent;color:#1d1604;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cs-quit:hover{border-color:#1d1604}
.cs-avis{border-radius:999px;border:1px solid rgba(187,154,94,.4);background:#f6f3ee;color:#1d1604;font-size:12px;padding:8px 14px;box-shadow:0 10px 30px -8px rgba(0,0,0,.35)}
.cs-hint{position:fixed;z-index:2147483000;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(187,154,94,.95);color:#1d1604;font-size:12px;padding:8px 16px;border-radius:999px;box-shadow:0 10px 30px -8px rgba(0,0,0,.4);pointer-events:none}
.cs-modal{position:fixed;z-index:2147483000;background:#f6f3ee;border:1px solid rgba(187,154,94,.4);border-radius:15px;box-shadow:0 25px 60px -15px rgba(0,0,0,.5);padding:16px;display:flex;flex-direction:column;gap:12px;color:#1d1604}
.cs-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cs-tabs{display:flex;gap:4px}
.cs-tabs button{min-height:32px;padding:0 12px;border-radius:999px;border:0;background:transparent;color:rgba(42,32,21,.7);font-size:11px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.cs-tabs button[aria-selected="true"]{background:#bb9a5e;color:#1d1604}
.cs-close{width:32px;height:32px;border-radius:999px;border:0;background:transparent;color:rgba(42,32,21,.7);cursor:pointer;display:flex;align-items:center;justify-content:center}
.cs-close:hover{color:#1d1604}
.cs-textarea{width:100%;resize:none;border-radius:15px;border:1px solid rgba(187,154,94,.4);background:#f1ebe0;padding:10px 12px;color:#1d1604;font:14px/1.5 Inter,system-ui,sans-serif;outline:none}
.cs-textarea:focus{border-color:#7d6330}
.cs-modal-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cs-apply{min-height:40px;padding:0 16px;border-radius:999px;border:0;background:#bb9a5e;color:#1d1604;font-size:14px;font-weight:500;cursor:pointer}
.cs-apply:hover{background:#dcb874}
.cs-reset{min-height:40px;padding:0 12px;border-radius:999px;border:1px solid rgba(187,154,94,.5);background:transparent;color:#7d6330;font-size:13px;cursor:pointer}
.cs-reset:hover{border-color:#7d6330}
.cs-hintkey{margin-left:auto;font-size:11px;color:rgba(42,32,21,.7)}
.cs-modal-title{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#7d6330}
.cs-modal-hint{font-size:12px;color:rgba(42,32,21,.8);margin:0}
.cs-apercu{position:relative;margin:0 auto;overflow:hidden;border-radius:15px;background:#ede5d7;touch-action:none;cursor:crosshair;user-select:none;width:100%}
.cs-apercu-img{width:100%;height:100%;object-fit:cover;display:block}
.cs-point{position:absolute;width:20px;height:20px;margin-left:-10px;margin-top:-10px;border-radius:999px;border:2px solid #f6f3ee;background:#bb9a5e;box-shadow:0 6px 16px rgba(0,0,0,.35);pointer-events:none}
.cs-zoom-row{display:flex;align-items:center;gap:10px;font-size:12px}
.cs-zoom-label{width:44px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(42,32,21,.7)}
.cs-zoom-row input[type=range]{flex:1;accent-color:#bb9a5e}
.cs-zoom-val{width:48px;text-align:right;font-variant-numeric:tabular-nums}
body.crayon-edition [data-tx],body.crayon-edition [data-cadre]{outline:1.5px dashed rgba(187,154,94,.65);outline-offset:2px;cursor:pointer}
body.crayon-edition [data-tx]:hover,body.crayon-edition [data-cadre]:hover{outline-style:solid}
`;

function construireUI() {
  if (uiPresente) return;
  uiPresente = true;

  const style = document.createElement('style');
  style.textContent = STYLE_CRAYON;
  document.head.appendChild(style);

  root = document.createElement('div');
  root.setAttribute('data-crayon', '');
  root.innerHTML = `
    <div class="cs-bar">
      <button type="button" class="cs-pencil" title="Modifier les textes et les photos du site" aria-label="Modifier les textes et les photos du site">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
      <div class="cs-editbar" hidden>
        <span class="cs-editbar-label">Modification du site</span>
        <span class="cs-count">Aucun changement</span>
        <button type="button" class="cs-save">Enregistrer</button>
        <button type="button" class="cs-quit" title="Quitter la modification" aria-label="Quitter la modification">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <span class="cs-avis" role="status" hidden></span>
    </div>
    <p class="cs-hint" role="status" hidden>Cliquez sur un texte pour le récrire, ou sur une photo pour la changer.</p>
    <div class="cs-modal" role="dialog" aria-label="Récrire le texte" hidden>
      <div class="cs-modal-head">
        <div class="cs-tabs" role="tablist">
          <button type="button" data-lang="fr" role="tab" aria-selected="true">FR</button>
          <button type="button" data-lang="en" role="tab" aria-selected="false">EN</button>
        </div>
        <button type="button" class="cs-close" aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <textarea class="cs-textarea" rows="2"></textarea>
      <div class="cs-modal-actions">
        <button type="button" class="cs-apply">Appliquer</button>
        <button type="button" class="cs-reset" hidden>Texte d'origine</button>
        <span class="cs-hintkey">Ctrl + Entrée pour appliquer</span>
      </div>
    </div>
    <div class="cs-modal" role="dialog" aria-label="Changer la photo" hidden>
      <div class="cs-modal-head">
        <span class="cs-modal-title">Changer la photo</span>
        <button type="button" class="cs-close" aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <p class="cs-modal-hint">Glissez le point sur ce qui doit rester au centre, puis réglez le zoom.</p>
      <div class="cs-apercu">
        <img class="cs-apercu-img" alt="" draggable="false" />
        <span class="cs-point" aria-hidden="true"></span>
      </div>
      <label class="cs-zoom-row">
        <span class="cs-zoom-label">Zoom</span>
        <input type="range" min="1" max="${ZOOM_MAX}" step="0.01" />
        <span class="cs-zoom-val">1.00×</span>
      </label>
    </div>
  `;
  document.body.appendChild(root);

  boutonCrayon = root.querySelector('.cs-pencil');
  barreEdition = root.querySelector('.cs-editbar');
  compteurEl = root.querySelector('.cs-count');
  boutonEnregistrer = root.querySelector('.cs-save');
  boutonQuitter = root.querySelector('.cs-quit');
  avisEl = root.querySelector('.cs-avis');
  hintEl = root.querySelector('.cs-hint');
  const modales = root.querySelectorAll('.cs-modal');
  panneauTexte = modales[0];
  panneauPhoto = modales[1];
  ongletFr = panneauTexte.querySelector('[data-lang="fr"]');
  ongletEn = panneauTexte.querySelector('[data-lang="en"]');
  zoneTexte = panneauTexte.querySelector('.cs-textarea');
  boutonAppliquer = panneauTexte.querySelector('.cs-apply');
  boutonResetTexte = panneauTexte.querySelector('.cs-reset');
  apercuBox = panneauPhoto.querySelector('.cs-apercu');
  apercuImg = panneauPhoto.querySelector('.cs-apercu-img');
  pointEl = panneauPhoto.querySelector('.cs-point');
  zoomInput = panneauPhoto.querySelector('input[type="range"]');
  zoomVal = panneauPhoto.querySelector('.cs-zoom-val');

  boutonCrayon.addEventListener('click', () => basculerEdition(true));
  boutonQuitter.addEventListener('click', annuler);
  boutonEnregistrer.addEventListener('click', enregistrer);
  panneauTexte.querySelector('.cs-close').addEventListener('click', fermerPanneaux);
  panneauPhoto.querySelector('.cs-close').addEventListener('click', fermerPanneaux);
  boutonAppliquer.addEventListener('click', appliquerTexteCourant);
  boutonResetTexte.addEventListener('click', remettreTexteCourant);
  zoneTexte.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); appliquerTexteCourant(); } });
  [ongletFr, ongletEn].forEach((btn) => btn.addEventListener('click', () => {
    langEdit = btn.getAttribute('data-lang');
    ongletFr.setAttribute('aria-selected', String(langEdit === 'fr'));
    ongletEn.setAttribute('aria-selected', String(langEdit === 'en'));
    if (cibleTexteIdx !== null) {
      const source = textIndex[cibleTexteIdx];
      const b = brouillonTexte[source];
      zoneTexte.value = (b === null) ? texteDeBase(source, langEdit) : (b && b[langEdit] !== undefined ? b[langEdit] : valeurPourZone(source, langEdit));
    }
  }));
  zoomInput.addEventListener('input', () => ecrireCadre({ z: Number(zoomInput.value) }));
  apercuBox.addEventListener('pointerdown', (e) => { apercuBox.setPointerCapture(e.pointerId); pointerVersCadre(e); });
  apercuBox.addEventListener('pointermove', (e) => { if (e.buttons & 1) pointerVersCadre(e); });
}

function pointerVersCadre(e) {
  const r = apercuBox.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
  ecrireCadre({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
}

function detruireUI() {
  basculerEdition(false);
  if (root && root.parentNode) root.parentNode.removeChild(root);
  uiPresente = false;
  root = null;
}

onAuthStateChanged(auth, (user) => {
  const admin = !!user && ADMIN_EMAILS.includes(user.email || '');
  if (admin) construireUI(); else if (uiPresente) detruireUI();
});
