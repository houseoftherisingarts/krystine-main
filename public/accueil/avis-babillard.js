// Le babillard de l'accueil (Alex, 11 septembre 2026). Un avis épinglé par
// Krystine dans l'admin (collection `avis`) paraît ici en bulle au-dessus de
// la fleur des offres, derrière une icône d'avis à point d'exclamation qui
// n'est jamais la fleur. Le bouton « Lu » range l'avis dans l'onglet Lettres
// de l'espace client (collection `avisAcceptes`, clé uid__avisId) et la bulle
// passe au suivant; sans compte, la lecture se retient dans ce navigateur.
// Cette page est un bundle statique séparé de l'application React : elle
// parle à Firebase par le SDK web, comme fleur-offres.js.
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CONFIG = {
  apiKey: 'AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk',
  authDomain: 'krystinestlaurent-87566.firebaseapp.com',
  projectId: 'krystinestlaurent-87566',
  storageBucket: 'krystinestlaurent-87566.firebasestorage.app',
  messagingSenderId: '908806491352',
  appId: '1:908806491352:web:a11a9f39bdcc5183851bad',
};
const CLE_LOCAL = 'krystine-avis-lus';
const CLE_BULLE = 'krystine-avis-bulle';

// L'icône de l'avis : une feuille épinglée qui porte un point d'exclamation.
const ICONE = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/>
  <path d="M15 3.5v4h4"/>
  <path d="M12 9.5v4.2"/>
  <circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none"/>
</svg>`;

const CSS = `
.ab-bouton{position:fixed;right:1.15rem;bottom:calc(5.1rem + 78px);z-index:1900;width:56px;height:56px;border-radius:50%;border:1px solid rgba(187,154,94,.55);background:rgba(246,243,238,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px -10px rgba(163,130,63,.7),0 0 0 6px rgba(187,154,94,.12);cursor:pointer;color:#7d6330;display:flex;align-items:center;justify-content:center;padding:14px;transition:box-shadow .3s,transform .3s cubic-bezier(.2,.7,.2,1),opacity .4s}
.ab-bouton svg{width:100%;height:100%;display:block}
.ab-bouton:hover{transform:translateY(-2px);box-shadow:0 14px 34px -10px rgba(163,130,63,.85),0 0 0 9px rgba(187,154,94,.16)}
.ab-bouton:focus-visible{outline:2px solid #bb9a5e;outline-offset:4px}
.ab-bouton.ab-parti{opacity:0;pointer-events:none;transform:translateY(8px) scale(.9)}
.ab-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#b06a3f;color:#f6f3ee;font:700 11px/20px Inter,system-ui,sans-serif;letter-spacing:.04em;border:2px solid #f6f3ee}
@keyframes ab-onde{0%{box-shadow:0 10px 30px -10px rgba(163,130,63,.7),0 0 0 6px rgba(187,154,94,.12)}60%{box-shadow:0 10px 30px -10px rgba(163,130,63,.7),0 0 0 14px rgba(176,106,63,0)}100%{box-shadow:0 10px 30px -10px rgba(163,130,63,.7),0 0 0 6px rgba(187,154,94,.12)}}
@media(prefers-reduced-motion:no-preference){.ab-bouton.ab-vivant{animation:ab-onde 2.8s ease-out infinite}}
.ab-bulle{position:fixed;right:1.15rem;bottom:calc(5.1rem + 78px + 68px);z-index:1903;width:min(340px,calc(100vw - 2.3rem));border-radius:15px;background:rgba(250,247,240,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(187,154,94,.5);box-shadow:0 30px 70px -24px rgba(22,31,26,.5),0 0 0 1px rgba(255,255,255,.5) inset;padding:1.3rem 1.3rem 1.2rem;color:#3a3126;transform-origin:calc(100% - 28px) calc(100% + 20px)}
.ab-bulle::after{content:"";position:absolute;right:20px;bottom:-9px;width:16px;height:16px;background:rgba(250,247,240,.96);border-right:1px solid rgba(187,154,94,.5);border-bottom:1px solid rgba(187,154,94,.5);transform:rotate(45deg)}
@keyframes ab-in{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:none}}
@keyframes ab-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(10px) scale(.94)}}
.ab-bulle.ab-entre{animation:ab-in .55s cubic-bezier(.22,1,.36,1) both}
.ab-bulle.ab-sort{animation:ab-out .3s ease both}
@media(prefers-reduced-motion:reduce){.ab-bulle.ab-entre,.ab-bulle.ab-sort{animation-duration:.01s}}
.ab-eyebrow{font:700 10px/1 Inter,system-ui,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#7d6330;display:flex;align-items:center;gap:.5rem}
.ab-eyebrow svg{width:14px;height:14px}
.ab-titre{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:1.45rem;line-height:1.14;color:#2a2015;margin:.7rem 0 .5rem;text-wrap:balance}
.ab-texte{font:400 14px/1.6 Inter,system-ui,sans-serif;color:#665746;margin:0 0 1rem}
.ab-lien{display:inline-block;font:600 12px/1.4 Inter,system-ui,sans-serif;color:#7d6330;text-decoration:underline;text-underline-offset:3px;margin:-.4rem 0 1rem}
.ab-gestes{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.ab-lu{display:inline-flex;align-items:center;gap:.5rem;background:#bb9a5e;color:#1d1604;border:0;border-radius:999px;padding:.75rem 1.2rem;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;box-shadow:0 12px 28px -12px rgba(163,130,63,.9);transition:background .25s,transform .25s}
.ab-lu:hover{background:#dcb874;transform:translateY(-1px)}
.ab-lu svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.ab-tard{background:none;border:0;color:#7d6330;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;padding:.75rem .4rem}
.ab-tard:hover{text-decoration:underline;text-underline-offset:3px}
.ab-compte{margin-left:auto;font:500 11px/1 Inter,system-ui,sans-serif;color:#665746}
@media(max-width:640px){.ab-bouton{right:.9rem;bottom:calc(4.4rem + 70px);width:50px;height:50px;padding:12px}.ab-bulle{right:.75rem;bottom:calc(4.4rem + 70px + 62px);padding:1.15rem 1.1rem 1.05rem}}
`;

const lireLocal = () => { try { return new Set(JSON.parse(localStorage.getItem(CLE_LOCAL) || '[]')); } catch { return new Set(); } };
const ecrireLocal = (s) => { try { localStorage.setItem(CLE_LOCAL, JSON.stringify([...s])); } catch { /* navigation privée */ } };
const quand = (a) => (a.creeLe && typeof a.creeLe.toMillis === 'function') ? a.creeLe.toMillis() : 0;

function monter() {
  if (document.querySelector('.ab-bouton')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  let db = null;
  let user = null;
  let actifs = [];
  let lusServeur = new Set();
  const lusLocal = lireLocal();
  let arretLus = null;
  let bulle = null;
  let bulleOuverteAuto = false;

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'ab-bouton ab-parti';
  bouton.setAttribute('aria-label', 'Avis épinglés');
  bouton.innerHTML = ICONE + '<span class="ab-badge" aria-hidden="true">1</span>';
  document.body.appendChild(bouton);

  const nonLus = () => actifs.filter((a) => !lusServeur.has(a.id) && !lusLocal.has(a.id)).sort((a, b) => quand(b) - quand(a));

  const rendre = () => {
    const liste = nonLus();
    const badge = bouton.querySelector('.ab-badge');
    if (liste.length === 0) {
      bouton.classList.add('ab-parti');
      bouton.classList.remove('ab-vivant');
      if (bulle) fermerBulle();
      return;
    }
    bouton.classList.remove('ab-parti');
    bouton.classList.add('ab-vivant');
    if (badge) badge.textContent = String(liste.length);
    // La bulle s'ouvre d'elle-même une fois par visite, un temps après l'arrivée.
    if (!bulleOuverteAuto) {
      bulleOuverteAuto = true;
      let deja = false;
      try { deja = sessionStorage.getItem(CLE_BULLE) === '1'; } catch { /* rien */ }
      if (!deja) setTimeout(() => { if (nonLus().length && !bulle) ouvrirBulle(); try { sessionStorage.setItem(CLE_BULLE, '1'); } catch { /* rien */ } }, 1400);
    } else if (bulle) {
      remplirBulle();
    }
  };

  const fermerBulle = () => {
    if (!bulle) return;
    const b = bulle; bulle = null;
    b.classList.remove('ab-entre'); b.classList.add('ab-sort');
    b.addEventListener('animationend', () => b.remove(), { once: true });
    setTimeout(() => b.remove(), 400);
    document.removeEventListener('keydown', surTouche);
  };
  const surTouche = (e) => { if (e.key === 'Escape') fermerBulle(); };

  const marquerLu = (avis) => {
    lusLocal.add(avis.id); ecrireLocal(lusLocal);
    if (db && user) {
      setDoc(doc(db, 'avisAcceptes', `${user.uid}__${avis.id}`), { uid: user.uid, avisId: avis.id, luLe: serverTimestamp() }, { merge: true })
        .catch(() => { /* la lecture locale tient quand même */ });
    }
    rendre();
  };

  const remplirBulle = () => {
    if (!bulle) return;
    const liste = nonLus();
    if (!liste.length) { fermerBulle(); return; }
    const avis = liste[0];
    const reste = liste.length - 1;
    const echapper = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    bulle.innerHTML = `
      <p class="ab-eyebrow">${ICONE} Avis épinglé</p>
      <h2 class="ab-titre" id="ab-titre">${echapper(avis.titre)}</h2>
      <p class="ab-texte">${echapper(avis.texte)}</p>
      ${avis.lienHref ? `<a class="ab-lien" href="${echapper(avis.lienHref)}">${echapper(avis.lienLibelle || 'En savoir plus')}</a>` : ''}
      <div class="ab-gestes">
        <button type="button" class="ab-lu">Lu<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></button>
        <button type="button" class="ab-tard">Plus tard</button>
        ${reste > 0 ? `<span class="ab-compte">${reste} autre${reste > 1 ? 's' : ''}</span>` : ''}
      </div>`;
    bulle.querySelector('.ab-lu').addEventListener('click', () => marquerLu(avis));
    bulle.querySelector('.ab-tard').addEventListener('click', fermerBulle);
  };

  const ouvrirBulle = () => {
    if (bulle) { fermerBulle(); return; }
    bulle = document.createElement('section');
    bulle.className = 'ab-bulle ab-entre';
    bulle.setAttribute('role', 'dialog');
    bulle.setAttribute('aria-labelledby', 'ab-titre');
    document.body.appendChild(bulle);
    remplirBulle();
    document.addEventListener('keydown', surTouche);
  };

  bouton.addEventListener('click', ouvrirBulle);

  try {
    const app = getApps().length ? getApp() : initializeApp(CONFIG);
    db = getFirestore(app);
    onSnapshot(query(collection(db, 'avis'), where('actif', '==', true)), (snap) => {
      actifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rendre();
    }, () => { actifs = []; rendre(); });
    onAuthStateChanged(getAuth(app), (u) => {
      user = u;
      if (arretLus) { arretLus(); arretLus = null; }
      lusServeur = new Set();
      if (u) {
        arretLus = onSnapshot(query(collection(db, 'avisAcceptes'), where('uid', '==', u.uid)), (snap) => {
          lusServeur = new Set(snap.docs.map((d) => d.data().avisId));
          rendre();
        }, () => { /* les règles refusent : la lecture locale tient */ });
      }
      rendre();
    });
  } catch { /* sans Firebase, aucun avis : le bouton reste parti */ }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter();
