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
    '#' + ID + '{position:fixed;right:16px;bottom:16px;z-index:899;display:inline-flex;align-items:center;gap:.55rem;',
    'padding:.5rem .85rem;border-radius:2px;border:1px solid rgba(187,154,94,.45);color:#f4efe6;text-decoration:none;',
    'font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#16100a;',
    'box-shadow:0 10px 24px -10px rgb(0 0 0 / .55)}',
    '#' + ID + '{transform-origin:right bottom;transition:transform 260ms cubic-bezier(.16,.8,.24,1),border-color 220ms ease}',
    '#' + ID + ':hover{border-color:#bb9a5e;transform:scale(1.5)}',
    '@media (prefers-reduced-motion: reduce){#' + ID + ':hover{transform:none}}',
    '#' + ID + ' img{height:1.15rem;width:auto;opacity:.85}',
    '#' + ID + ' .vg-texte{display:flex;flex-direction:column;line-height:1.15}',
    '#' + ID + ' .vg-kicker{font-size:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.22em;color:#bb9a5e}',
    '#' + ID + ' .vg-nom{margin-top:.15rem;font-family:ui-serif,Georgia,Cambria,"Times New Roman",Times,serif;font-size:.8rem}',
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
    a.innerHTML = '<img src="/vexel-logo.png" alt="" width="329" height="320">'
      + '<span class="vg-texte"><span class="vg-kicker">Site créé par</span><span class="vg-nom">Vexel Webstudio</span></span>';
    document.body.appendChild(a);
  }

  function retirer() {
    var el = document.getElementById(ID);
    if (el) el.remove();
  }

  // L'admin et la salle du direct n'ont jamais eu de pied de page : le garde s'y tait.
  function horsChamp() { return /^\/(admin|direct)(\/|$)/.test(location.pathname); }

  function verifier() {
    if (horsChamp() || collantEnPlace()) retirer(); else poser();
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

  function pret() { setTimeout(demarrer, 1500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pret);
  else pret();
})();
