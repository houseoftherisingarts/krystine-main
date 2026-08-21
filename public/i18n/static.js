/* Bilingual layer for the static bundles (/accueil, /liste-attente-origine).
   Same dictionary as the React app (/i18n/en.json), same localStorage key. */
(function () {
  var KEY = 'krystine-lang', lang = 'fr';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'fr') { localStorage.setItem(KEY, q); lang = q; }
    else { var s = localStorage.getItem(KEY); if (s === 'en') lang = 'en'; }
  } catch (e) {}

  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (e) {}
    var u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString());
  }

  /* Toggle pill: crème glass, laiton text, mirrors the ambient-music button. */
  function pill() {
    var css = '.lang-pill{position:fixed;left:1.3rem;bottom:1.3rem;z-index:60;display:flex;align-items:center;height:44px;padding:0 6px;border-radius:999px;border:1px solid rgba(187,154,94,.6);background:rgba(29,22,4,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font:600 10px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}'
      + '.lang-pill button{appearance:none;border:0;background:transparent;color:rgba(244,239,230,.6);padding:0 12px;height:32px;border-radius:999px;cursor:pointer;font:inherit;letter-spacing:inherit;transition:color .25s,background .25s}'
      + '.lang-pill button[aria-current="true"]{color:#1c1712;background:#bb9a5e}'
      + '.lang-pill button:hover:not([aria-current="true"]){color:#e8d9b8}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div'); el.className = 'lang-pill'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', lang === 'en' ? 'Language' : 'Langue');
    ['fr', 'en'].forEach(function (l) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = l.toUpperCase();
      b.setAttribute('aria-current', String(l === lang)); b.setAttribute('lang', l);
      b.addEventListener('click', function () { if (l !== lang) setLang(l); });
      el.appendChild(b);
    });
    document.body.appendChild(el);
  }

  var ATTRS = ['placeholder', 'alt', 'title', 'aria-label'];
  function translate(dict, root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, nodes = [];
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var p = t.parentElement; if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName) || p.closest('.lang-pill')) return;
      var v = t.nodeValue, m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v);
      if (m[2] && dict[m[2]] !== undefined) t.nodeValue = m[1] + dict[m[2]] + m[3];
    });
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[alt],[title],[aria-label]') : [];
    Array.prototype.forEach.call(els, function (el) {
      ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && dict[v.trim()] !== undefined) el.setAttribute(a, dict[v.trim()]); });
    });
  }

  function boot() {
    pill();
    if (lang !== 'en') return;
    document.documentElement.lang = 'en';
    fetch('/i18n/en.json').then(function (r) { return r.json(); }).then(function (dict) {
      translate(dict, document.body);
      if (dict[document.title]) document.title = dict[document.title];
      var d = document.querySelector('meta[name="description"]'); if (d && dict[d.content]) d.content = dict[d.content];
      new MutationObserver(function (muts) {
        muts.forEach(function (mu) {
          if (mu.type === 'characterData') { var v = mu.target.nodeValue.trim(); if (dict[v] !== undefined && mu.target.nodeValue.trim() !== dict[v]) mu.target.nodeValue = dict[v]; }
          mu.addedNodes.forEach(function (nd) { if (nd.nodeType === 1) translate(dict, nd); else if (nd.nodeType === 3) { var t = nd.nodeValue.trim(); if (dict[t] !== undefined) nd.nodeValue = dict[t]; } });
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
