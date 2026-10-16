// La pastille d'aide des pages statiques (accueil, communauté). Depuis le 16 oct. 2026
// (décision de Krystine sur le rapport de la Ronde), une seule petite pastille ronde
// « ? » à droite, comme sur les pages React (AidePepin.tsx) : un clic ouvre un petit
// choix, « Un commentaire » ou « Un problème ou une question », et chaque choix mène à
// /aide, où le même formulaire s'ouvre, avec la page d'origine.
// Elle ne se pose jamais sur du texte ni sur un bouton (56 px de marge), se retire
// pendant le défilement, et sur l'accueil elle laisse la place aux autres pastilles
// (avis épinglé, fleur des offres) : une seule pastille flottante à la fois.
// Un lien « Un commentaire ? Écrivez-nous » s'ajoute au pied de page, pour que la
// porte reste toujours atteignable.
(function () {
  if (document.getElementById('aide-pepin')) return;
  var en = false;
  try { en = localStorage.getItem('krystine-lang') === 'en'; } catch (e) {}
  var de = encodeURIComponent(location.pathname);
  var lien = function (sujet) { return '/aide?de=' + de + '&sujet=' + sujet; };
  var L = en
    ? { info: 'Feedback, a problem or a question? Write to us', c: 'Some feedback', p: 'A problem or a question', pied: 'Feedback? Write to us' }
    : { info: 'Un commentaire, un problème ou une question ? Écrivez-nous', c: 'Un commentaire', p: 'Un problème ou une question', pied: 'Un commentaire ? Écrivez-nous' };

  var st = document.createElement('style');
  st.textContent =
    '#aide-pepin{position:fixed;right:12px;bottom:calc(var(--bande-temoins,0px) + 14px);z-index:55;font:400 14px/1.4 Inter,system-ui,sans-serif;transition:opacity .3s}' +
    '@media(min-width:640px){#aide-pepin{right:16px}}' +
    '#aide-pepin.ap-cache{opacity:0;pointer-events:none}' +
    '#aide-pepin .ap-rond{width:40px;height:40px;border-radius:50%;border:1px solid rgba(156,122,68,.6);background:#f4efe6;color:#1c1712;font:300 17px/1 Fraunces,Georgia,serif;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px -12px rgba(28,23,18,.6)}' +
    '#aide-pepin .ap-rond:hover{background:#fff}' +
    '#aide-pepin .ap-menu{position:absolute;right:0;bottom:calc(100% + 10px);width:min(15.5rem,calc(100vw - 24px));background:#f4efe6;border:1px solid rgba(156,122,68,.6);box-shadow:0 18px 40px -20px rgba(28,23,18,.55);display:none}' +
    '#aide-pepin.ap-ouvert .ap-menu{display:block}' +
    '#aide-pepin .ap-menu a{display:flex;align-items:center;min-height:48px;padding:0 16px;color:#1c1712;text-decoration:none;font-size:.9rem}' +
    '#aide-pepin .ap-menu a+a{border-top:1px solid rgba(156,122,68,.33)}' +
    '#aide-pepin .ap-menu a:hover{background:#fff}';
  document.head.appendChild(st);

  var boite = document.createElement('div');
  boite.id = 'aide-pepin';
  boite.className = 'ap-cache';
  boite.setAttribute('data-bug-ignore', '');
  boite.innerHTML = '<div class="ap-menu" role="menu"><a role="menuitem" href="' + lien('commentaire') + '">' + L.c + '</a><a role="menuitem" href="' + lien('probleme') + '">' + L.p + '</a></div>' +
    '<button type="button" class="ap-rond" aria-haspopup="menu" aria-expanded="false" aria-label="' + L.info + '" title="' + L.info + '"><span aria-hidden="true">?</span></button>';
  document.body.appendChild(boite);
  var rond = boite.querySelector('.ap-rond');
  var basculer = function (ouvrir) {
    boite.classList.toggle('ap-ouvert', ouvrir);
    rond.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    if (ouvrir) boite.classList.remove('ap-cache');
  };
  rond.addEventListener('click', function () { basculer(!boite.classList.contains('ap-ouvert')); });
  document.addEventListener('pointerdown', function (e) { if (!boite.contains(e.target)) basculer(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') basculer(false); });

  // Le lien du pied de page.
  var bas = document.querySelector('footer .bottom');
  if (bas) {
    var a = document.createElement('a');
    a.href = lien('commentaire');
    a.textContent = L.pied;
    bas.appendChild(a);
  }

  // Une autre pastille de la page (avis épinglé, fleur des offres) est-elle à l'écran ?
  var autrePastille = function () {
    var sel = ['.ab-bouton:not(.ab-parti)', '.fo-fleur'];
    for (var i = 0; i < sel.length; i++) {
      var el = document.querySelector(sel[i]);
      if (!el) continue;
      var s = getComputedStyle(el);
      if (s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05) return true;
    }
    return false;
  };
  // Du texte ou un bouton sous la pastille, marge de 8 px comprise ?
  var dessous = function () {
    var r = rond.getBoundingClientRect(), m = 8;
    var g = r.left - m, d = r.right + m, h = r.top - m, b = r.bottom + m;
    var croise = function (q) { return q.width > 0 && q.height > 0 && q.left < d && q.right > g && q.top < b && q.bottom > h; };
    var avant = boite.style.pointerEvents;
    boite.style.pointerEvents = 'none';
    try {
      for (var i = 0; i <= 4; i++) for (var j = 0; j <= 4; j++) {
        var x = Math.min(Math.max(g + (d - g) * i / 4, 0), innerWidth - 1);
        var y = Math.min(Math.max(h + (b - h) * j / 4, 0), innerHeight - 1);
        var el = document.elementFromPoint(x, y);
        if (!el || boite.contains(el)) continue;
        var proche = el.closest('a,button,input,textarea,select,label,iframe,summary');
        if (proche && croise(proche.getBoundingClientRect())) return true;
        for (var k = 0; k < el.childNodes.length; k++) {
          var n = el.childNodes[k];
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          var rg = document.createRange(); rg.selectNodeContents(n);
          var rs = rg.getClientRects();
          for (var z = 0; z < rs.length; z++) if (croise(rs[z])) return true;
        }
      }
    } finally { boite.style.pointerEvents = avant; }
    return false;
  };
  var verifier = function () {
    if (boite.classList.contains('ap-ouvert')) return;
    boite.classList.toggle('ap-cache', autrePastille() || dessous());
  };
  var minuterie = null, dernier = 0;
  var surDefilement = function () {
    dernier = Date.now();
    basculer(false);
    boite.classList.add('ap-cache');
    clearTimeout(minuterie);
    minuterie = setTimeout(verifier, 450);
  };
  window.addEventListener('scroll', surDefilement, { passive: true });
  window.addEventListener('resize', surDefilement);
  setTimeout(verifier, 1200);
  // Les autres pastilles arrivent et partent (avis lu, fleur ouverte) : on revérifie au repos.
  setInterval(function () { if (Date.now() - dernier > 1000) verifier(); }, 2000);
})();
