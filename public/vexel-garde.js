/* Garde du collant Vexel. Si le collant « Site créé par Vexel Webstudio »
   disparaît de la page (pied de page détruit, élément retiré ou caché), il
   revient de lui-même, posé en bas à droite. Ce fichier est chargé par
   index.html et par accueil/index.html; il ne se retire pas d'un site Vexel. */
(function () {
  var ID = 'vexel-garde-collant';
  var MARQUE = 'vexel-garde:v1';

  function cache(el) {
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return true;
    var r = el.getBoundingClientRect();
    return r.width < 8 && r.height < 8 && s.overflow !== 'visible';
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 24) return false;
    for (var p = el; p && p !== document.documentElement; p = p.parentElement) {
      if (cache(p)) return false;
    }
    return true;
  }

  function collantEnPlace() {
    var liens = document.querySelectorAll('a.cv-foil');
    for (var i = 0; i < liens.length; i++) {
      if (liens[i].id !== ID && visible(liens[i])) return true;
    }
    return false;
  }

  var CSS = [
    '#' + ID + '{position:fixed;right:16px;bottom:16px;z-index:899;display:inline-flex;align-items:center;gap:.75rem;',
    'padding:.7rem 1.1rem;border-radius:15px;border:2px solid #fff;color:#fff;text-decoration:none;overflow:hidden;isolation:isolate;',
    'font-family:Inter,ui-sans-serif,system-ui,sans-serif;',
    'background:radial-gradient(120% 120% at 30% 30%,rgb(255 236 200 / .22),transparent 55%),linear-gradient(135deg,#22180d 0%,#0b0805 60%,#1c130a 100%);',
    'box-shadow:0 0 0 1px rgb(0 0 0 / .35),0 10px 24px -10px rgb(0 0 0 / .55),inset 0 1px 0 rgb(255 255 255 / .25)}',
    '#' + ID + ' .vg-sheen{position:absolute;inset:-40%;pointer-events:none;z-index:0;',
    'background:repeating-conic-gradient(from 200deg at 30% 30%,#fff3d6 0deg,#ecc978 24deg,#c98f45 48deg,#a5642c 72deg,#f2d48f 96deg,#fff3d6 120deg);',
    'opacity:.24;mix-blend-mode:color-dodge;filter:saturate(.9) blur(2px)}',
    '#' + ID + ' img{position:relative;z-index:1;height:1.75rem;width:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}',
    '#' + ID + ' .vg-texte{position:relative;z-index:1;display:flex;flex-direction:column;line-height:1.15}',
    '#' + ID + ' .vg-kicker{font-size:.625rem;font-weight:600;text-transform:uppercase;letter-spacing:.22em;color:rgba(255,255,255,.7)}',
    '#' + ID + ' .vg-nom{margin-top:.25rem;font-family:ui-serif,Georgia,Cambria,"Times New Roman",Times,serif;font-size:1.05rem}',
  ].join('');

  function poser() {
    if (document.getElementById(ID)) return;
    var style = document.createElement('style');
    style.setAttribute('data-vexel-garde', MARQUE);
    style.textContent = CSS;
    document.head.appendChild(style);
    var a = document.createElement('a');
    a.id = ID;
    a.className = 'cv-foil';
    a.href = 'https://vexelwebstudio.com';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Site créé par Vexel Webstudio');
    a.innerHTML = '<span class="vg-sheen" aria-hidden="true"></span>'
      + '<img src="/vexel-logo.png" alt="" width="329" height="320">'
      + '<span class="vg-texte"><span class="vg-kicker">Site créé par</span><span class="vg-nom">Vexel Webstudio</span></span>';
    document.body.appendChild(a);
  }

  function retirer() {
    var el = document.getElementById(ID);
    if (el) el.remove();
  }

  function verifier() {
    if (collantEnPlace()) retirer(); else poser();
  }

  var minuterie = null;
  function planifier() {
    clearTimeout(minuterie);
    minuterie = setTimeout(verifier, 500);
  }

  function demarrer() {
    verifier();
    new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true });
    setInterval(verifier, 3000);
  }

  // L'admin et la salle du direct n'ont jamais eu de pied de page : le garde s'y tait.
  function horsChamp() { return /^\/(admin|direct)(\/|$)/.test(location.pathname); }
  var actif = false;
  function pret() { setTimeout(function () { if (!horsChamp()) { actif = true; demarrer(); } }, 1500); }
  setInterval(function () { if (!actif && !horsChamp()) { actif = true; demarrer(); } else if (actif && horsChamp()) retirer(); }, 3000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pret);
  else pret();
})();
