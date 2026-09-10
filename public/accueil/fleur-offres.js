// La fleur des offres (Alex, 9 septembre 2026). Un petit bouton vivant en bas
// à droite, qui sautille comme une notification jusqu'à ce qu'on l'ouvre.
// Le clic ouvre le panneau en effet génie et montre l'offre faite à cette
// personne : sans compte, le coffre de bienvenue; avec compte, l'offre que le
// moteur (src/lib/offres.ts, calculée côté application et écrite dans
// habitudes/{uid}.offre) a retenue pour elle. Fermer le panneau fait
// disparaître la fleur jusqu'au prochain chargement de la page. Rien n'est
// mémorisé ici : la page ne fait que LIRE l'identifiant déjà calculé, jamais
// le calcul lui-même, pour rester légère.
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const CONFIG = {
  apiKey: 'AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk',
  authDomain: 'krystinestlaurent-87566.firebaseapp.com',
  projectId: 'krystinestlaurent-87566',
  storageBucket: 'krystinestlaurent-87566.firebasestorage.app',
  messagingSenderId: '908806491352',
  appId: '1:908806491352:web:a11a9f39bdcc5183851bad',
};
const FIN_COFFRE_BETA = new Date(2026, 9, 2); // le coffre de 50 niskas jusqu'au 1er octobre inclus

// Le texte de chaque offre, à l'identique du moteur (src/lib/offres.ts) pour
// les identifiants qu'il peut écrire. Une entrée manquante (un dosha encore
// sans formation publiée, par exemple) retombe sur le repli 'origine2' :
// le moteur ne pose jamais un identifiant que cette table ne couvre pas,
// sauf pour dosha-pitta/dosha-kapha dont le titre exact vient de Krystine et
// n'est pas encore figé; ceux-là aussi retombent sur le repli en attendant.
const OFFRES = {
  coffre: {
    eyebrow: 'Une offre pour vous',
    titre: 'Un coffre de 50 niskas vous attend',
    texte: 'Créez votre compte avant le 1er octobre et le coffre s’ouvre à votre première visite. Les niskas sont la monnaie du site : elles paient les rediffusions, les saisons de « Santé ! La Vie ! » et les petits cadeaux de Krystine.',
    cta: 'Créer mon compte', href: '/compte',
  },
  compte: {
    eyebrow: 'Une offre pour vous',
    titre: 'Votre espace vous attend',
    texte: 'Créez votre compte et retrouvez vos formations, la communauté et les cadeaux de Krystine au même endroit.',
    cta: 'Créer mon compte', href: '/compte',
  },
  'dosha-vata': {
    eyebrow: 'Ce qui vous ressemble',
    titre: 'Le Programme Vata, pensé pour vous',
    texte: "Votre quiz vous place du côté de Vata, le dosha du mouvement et de l'air. Ce programme reprend les rituels qui ancrent et réchauffent ce tempérament, avec les leçons audio et les guides de Krystine pour les suivre à votre rythme.",
    cta: 'Découvrir le Programme Vata', href: '/vata',
  },
  origine: {
    eyebrow: 'Ce qui vous ramène ici',
    titre: "L'Expérience Origine vous attend",
    texte: "Vous revenez souvent du côté d'Origine. Ce parcours de douze semaines reprend, avec Krystine, ce que vous êtes déjà venue chercher : lire, trier et retrouver ses propres repères.",
    cta: "Découvrir l'Expérience Origine", href: '/origine',
  },
  boutique: {
    eyebrow: 'Ce qui vous ramène ici',
    titre: "Un coup d'œil sur la boutique",
    texte: "La boutique vous a déjà arrêtée plus d'une fois. Les huiles et les rituels de Krystine s'y trouvent, prêts à commander quand le moment sera le vôtre.",
    cta: 'Aller à la boutique', href: '/boutique',
  },
  podcast: {
    eyebrow: 'Ce qui vous ramène ici',
    titre: 'Les rediffusions vous attendent',
    texte: 'Vous revenez souvent écouter Krystine. Les rediffusions de « Santé ! La Vie ! » et les saisons complètes se retrouvent au même endroit, pour continuer où vous en étiez.',
    cta: 'Écouter les rediffusions', href: '/podcast',
  },
  bienvenue: {
    eyebrow: 'Bienvenue chez vous',
    titre: 'Votre coffre de bienvenue vous attend',
    texte: "Votre compte vient tout juste de s'ouvrir. Le coffre de bienvenue et les premiers repères du site se trouvent dans votre espace, prêts à être découverts à votre rythme.",
    cta: 'Ouvrir mon espace', href: '/compte',
  },
  origine2: {
    eyebrow: 'Ce qui se prépare pour vous',
    titre: 'L’Expérience Origine 2 ouvre en janvier',
    texte: 'Douze semaines avec Krystine pour retrouver vos propres repères. Inscrivez-vous à la liste d’attente et vous recevrez l’invitation avant toute annonce publique.',
    cta: 'Découvrir l’Expérience', href: '/origine-2',
  },
};

const FLEUR_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="fo-petale" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6c98a"/><stop offset="1" stop-color="#bb9a5e"/>
    </linearGradient>
    <radialGradient id="fo-coeur" cx=".4" cy=".4" r=".7">
      <stop offset="0" stop-color="#f3dfae"/><stop offset="1" stop-color="#c79a52"/>
    </radialGradient>
  </defs>
  <g class="fo-feuilles" fill="#8A8F72">
    <path d="M30 46c-9 1-15 8-16 15 8 0 15-5 16-15z" opacity=".9"/>
    <path d="M34 46c9 1 15 8 16 15-8 0-15-5-16-15z" opacity=".75"/>
  </g>
  <path d="M32 44v12" stroke="#7d6330" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <g class="fo-petales" fill="url(#fo-petale)" stroke="#a3823f" stroke-width=".6">
    <ellipse cx="32" cy="14" rx="6.5" ry="11"/>
    <ellipse cx="32" cy="14" rx="6.5" ry="11" transform="rotate(72 32 30)"/>
    <ellipse cx="32" cy="14" rx="6.5" ry="11" transform="rotate(144 32 30)"/>
    <ellipse cx="32" cy="14" rx="6.5" ry="11" transform="rotate(216 32 30)"/>
    <ellipse cx="32" cy="14" rx="6.5" ry="11" transform="rotate(288 32 30)"/>
  </g>
  <circle cx="32" cy="30" r="7.2" fill="url(#fo-coeur)" stroke="#a3823f" stroke-width=".6"/>
  <g fill="#7d6330" opacity=".55"><circle cx="30" cy="28.5" r=".9"/><circle cx="34" cy="29" r=".9"/><circle cx="32" cy="32" r=".9"/></g>
</svg>`;

const CSS = `
.fo-fleur{position:fixed;right:1.15rem;bottom:5.1rem;z-index:1900;width:64px;height:64px;border-radius:50%;border:1px solid rgba(187,154,94,.55);background:rgba(246,243,238,.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 10px 30px -10px rgba(163,130,63,.7),0 0 0 6px rgba(187,154,94,.12);cursor:pointer;padding:9px;display:flex;align-items:center;justify-content:center;transform-origin:50% 100%;transition:box-shadow .3s,transform .3s cubic-bezier(.2,.7,.2,1)}
.fo-fleur svg{width:100%;height:100%;display:block;overflow:visible}
.fo-fleur:hover{box-shadow:0 14px 34px -10px rgba(163,130,63,.85),0 0 0 9px rgba(187,154,94,.16)}
.fo-fleur:focus-visible{outline:2px solid #bb9a5e;outline-offset:4px}
.fo-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#b06a3f;color:#f6f3ee;font:700 11px/20px Inter,system-ui,sans-serif;letter-spacing:.04em;border:2px solid #f6f3ee;box-shadow:0 0 0 0 rgba(176,106,63,.55)}
@keyframes fo-saut{0%,58%,100%{transform:translateY(0) scale(1,1)}62%{transform:translateY(0) scale(1.08,.9)}70%{transform:translateY(-14px) scale(.96,1.06)}80%{transform:translateY(0) scale(1.05,.94)}88%{transform:translateY(-5px) scale(1)}94%{transform:translateY(0) scale(1.02,.98)}}
@keyframes fo-respire{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes fo-onde{0%{box-shadow:0 0 0 0 rgba(176,106,63,.55)}70%{box-shadow:0 0 0 10px rgba(176,106,63,0)}100%{box-shadow:0 0 0 0 rgba(176,106,63,0)}}
@media(prefers-reduced-motion:no-preference){
  .fo-fleur.fo-vivante{animation:fo-saut 2.6s cubic-bezier(.34,1.56,.64,1) infinite}
  .fo-fleur.fo-vivante .fo-petales{transform-origin:32px 30px;animation:fo-respire 3.4s ease-in-out infinite}
  .fo-fleur.fo-vivante .fo-badge{animation:fo-onde 1.8s ease-out infinite}
}
.fo-voile{position:fixed;inset:0;z-index:1901;background:rgba(22,31,26,.18);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;transition:opacity .35s}
.fo-voile.fo-ouvert{opacity:1}
.fo-panneau{position:fixed;right:1.15rem;bottom:5.1rem;z-index:1902;width:min(360px,calc(100vw - 2.3rem));border-radius:15px;background:rgba(250,247,240,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(187,154,94,.45);box-shadow:0 30px 70px -24px rgba(22,31,26,.55),0 0 0 1px rgba(255,255,255,.5) inset;padding:1.6rem 1.5rem 1.5rem;color:#3a3126;transform-origin:calc(100% - 32px) calc(100% + 40px);overflow:hidden}
.fo-panneau::before{content:"";position:absolute;right:-30px;top:-30px;width:150px;height:150px;background:radial-gradient(circle,rgba(220,184,116,.35),rgba(220,184,116,0) 70%);pointer-events:none}
.fo-panneau .fo-orn{position:absolute;left:-12px;top:-10px;width:92px;height:92px;opacity:.16;pointer-events:none}
@keyframes fo-genie-in{0%{opacity:0;transform:translate(24%,46%) scale(.06,.02) skewX(-24deg);border-radius:60px}45%{opacity:1;transform:translate(3%,7%) scale(.72,1.12) skewX(-8deg)}72%{transform:translate(-1%,-2%) scale(1.03,.96) skewX(2deg)}100%{opacity:1;transform:none;border-radius:15px}}
@keyframes fo-genie-out{0%{opacity:1;transform:none}40%{opacity:1;transform:translate(2%,4%) scale(.8,1.08) skewX(-6deg)}100%{opacity:0;transform:translate(24%,46%) scale(.06,.02) skewX(-24deg)}}
@keyframes fo-fondu-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes fo-fondu-out{from{opacity:1}to{opacity:0}}
.fo-panneau.fo-entre{animation:fo-genie-in .78s cubic-bezier(.22,1,.36,1) both}
.fo-panneau.fo-sort{animation:fo-genie-out .5s cubic-bezier(.4,0,.8,.2) both}
@media(prefers-reduced-motion:reduce){.fo-panneau.fo-entre{animation:fo-fondu-in .3s ease both}.fo-panneau.fo-sort{animation:fo-fondu-out .25s ease both}}
.fo-eyebrow{font:700 10px/1 Inter,system-ui,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#7d6330;display:flex;align-items:center;gap:.7rem}
.fo-eyebrow::before{content:"";width:28px;height:1px;background:#bb9a5e}
.fo-titre{font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:1.7rem;line-height:1.12;letter-spacing:.005em;color:#2a2015;margin:.85rem 0 .6rem;text-wrap:balance}
.fo-texte{font:400 14.5px/1.55 Inter,system-ui,sans-serif;color:#665746;margin:0 0 1.2rem}
.fo-cta{display:inline-flex;align-items:center;gap:.6rem;background:#bb9a5e;color:#1d1604;text-decoration:none;border-radius:999px;padding:.85rem 1.4rem;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;box-shadow:0 12px 28px -12px rgba(163,130,63,.9);transition:background .25s,transform .25s}
.fo-cta:hover{background:#dcb874;transform:translateY(-1px)}
.fo-cta svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fo-fermer{position:absolute;top:.7rem;right:.7rem;width:34px;height:34px;border-radius:50%;border:1px solid rgba(187,154,94,.35);background:rgba(246,243,238,.8);color:#7d6330;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.fo-fermer:hover{background:#fff}
.fo-fermer svg{width:14px;height:14px;stroke:currentColor;stroke-width:2;stroke-linecap:round;fill:none}
@media(max-width:640px){.fo-fleur{right:.9rem;bottom:4.4rem;width:58px;height:58px}.fo-panneau{right:.75rem;bottom:4.6rem;padding:1.4rem 1.25rem 1.3rem}.fo-titre{font-size:1.5rem}}
`;

// offreId vient de habitudes/{uid}.offre.id (écrit par le moteur React,
// src/lib/offres.ts). Sans compte, ou tant que rien n'a encore été calculé,
// la fleur retombe sur l'offre de bienvenue existante.
function choisirOffre(user, offreId) {
  if (user) return OFFRES[offreId] || OFFRES.origine2;
  return new Date() < FIN_COFFRE_BETA ? OFFRES.coffre : OFFRES.compte;
}

function monter() {
  if (document.querySelector('.fo-fleur')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const fleur = document.createElement('button');
  fleur.type = 'button';
  fleur.className = 'fo-fleur fo-vivante';
  fleur.setAttribute('aria-label', 'Une offre pour vous');
  fleur.innerHTML = FLEUR_SVG + '<span class="fo-badge" aria-hidden="true">1</span>';
  document.body.appendChild(fleur);

  let user = null;
  let offreId = null;
  let db = null;
  try {
    const app = getApps().length ? getApp() : initializeApp(CONFIG);
    db = getFirestore(app);
    onAuthStateChanged(getAuth(app), u => {
      user = u;
      if (!u || !db) return;
      // La fleur ne fait que LIRE l'offre déjà calculée par l'application :
      // aucun calcul, aucune écriture de contenu ici.
      getDoc(doc(db, 'habitudes', u.uid))
        .then(snap => { offreId = snap.exists() ? snap.data()?.offre?.id ?? null : null; })
        .catch(() => { /* pas grave, le repli tient */ });
    });
  } catch { /* sans Firebase, l'offre sans compte reste juste */ }

  // Compte une offre montrée, puis cliquée, par les mêmes chemins que
  // noterOffre() (src/firebase/habitudes.ts) : un incrément fusionné sur le
  // document habitudes de la personne.
  const noterOffreVue = (geste) => {
    if (!db || !user || !offreId) return;
    const champ = geste === 'clic' ? 'offresCliquees' : 'offresVues';
    setDoc(doc(db, 'habitudes', user.uid), { [champ]: { [offreId]: increment(1) }, maj: serverTimestamp() }, { merge: true })
      .catch(() => { /* un compteur raté n'empêche jamais l'offre de s'afficher */ });
  };

  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let panneau = null;
  let voile = null;

  const disparaitre = () => {
    if (!panneau) return;
    panneau.classList.remove('fo-entre');
    panneau.classList.add('fo-sort');
    voile.classList.remove('fo-ouvert');
    const fin = () => { panneau.remove(); voile.remove(); fleur.remove(); panneau = null; voile = null; };
    if (reduit) setTimeout(fin, 260); else panneau.addEventListener('animationend', fin, { once: true });
    document.removeEventListener('keydown', surTouche);
  };
  const surTouche = e => { if (e.key === 'Escape') disparaitre(); };

  fleur.addEventListener('click', () => {
    // La fleur s'arrête dès qu'on l'ouvre : c'est la seule façon de l'apaiser.
    fleur.classList.remove('fo-vivante');
    fleur.querySelector('.fo-badge')?.remove();
    fleur.style.visibility = 'hidden';
    const offre = choisirOffre(user, offreId);
    noterOffreVue('vue');

    voile = document.createElement('div');
    voile.className = 'fo-voile';
    voile.addEventListener('click', disparaitre);
    panneau = document.createElement('section');
    panneau.className = 'fo-panneau fo-entre';
    panneau.setAttribute('role', 'dialog');
    panneau.setAttribute('aria-labelledby', 'fo-titre');
    panneau.innerHTML = `
      <div class="fo-orn">${FLEUR_SVG}</div>
      <button type="button" class="fo-fermer" aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <p class="fo-eyebrow">${offre.eyebrow}</p>
      <h2 class="fo-titre" id="fo-titre">${offre.titre}</h2>
      <p class="fo-texte">${offre.texte}</p>
      <a class="fo-cta" href="${offre.href}">${offre.cta}<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
    panneau.querySelector('.fo-fermer').addEventListener('click', disparaitre);
    panneau.querySelector('.fo-cta').addEventListener('click', () => noterOffreVue('clic'));
    document.body.appendChild(voile);
    document.body.appendChild(panneau);
    requestAnimationFrame(() => voile.classList.add('fo-ouvert'));
    document.addEventListener('keydown', surTouche);
    panneau.querySelector('.fo-fermer').focus({ preventScroll: true });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter();
