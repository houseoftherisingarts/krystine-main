// La pastille « Un commentaire ? Écrivez-nous » (ex « Un pépin ? », 6 oct. 2026) des pages statiques (accueil,
// communauté). Les autres pages du site la portent déjà (React, AidePepin.tsx);
// ici elle mène à /aide, où le même panneau s'ouvre, avec la page d'origine.
(function () {
  if (document.getElementById('aide-pepin')) return;
  var en = false;
  try { en = localStorage.getItem('krystine-lang') === 'en'; } catch (e) {}
  var a = document.createElement('a');
  a.id = 'aide-pepin';
  a.href = '/aide?de=' + encodeURIComponent(location.pathname);
  a.textContent = en ? 'Any feedback? Write to us' : 'Un commentaire ? Écrivez-nous';
  a.title = en ? 'Any feedback on your browsing experience? Write to us' : 'Un commentaire sur votre expérience de navigation ? Écrivez-nous';
  a.setAttribute('data-bug-ignore', '');
  a.style.cssText = 'position:fixed;left:12px;bottom:calc(var(--bande-temoins,0px) + 12px);z-index:55;display:inline-flex;align-items:center;min-height:40px;padding:0 14px;' +
    'background:#f4efe6;color:#1c1712;border:1px solid rgba(156,122,68,.6);font:400 .62rem/1 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.14em;text-decoration:none;';
  var st = document.createElement('style');
  st.textContent = '@media (min-width:640px){#aide-pepin{left:20px!important;bottom:calc(var(--bande-temoins,0px) + 72px)!important;width:96px;padding:8px 10px!important;line-height:1.5!important;letter-spacing:.1em!important;display:block!important;white-space:normal}}';
  document.head.appendChild(st);
  document.body.appendChild(a);
})();
