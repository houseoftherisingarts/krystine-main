import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadDictionary } from './src/lib/i18n/lang';
import { noterProvenance } from './src/lib/provenance';

// La voie d'arrivée (utm_source, via…) se note avant tout : voir src/lib/provenance.ts.
noterProvenance();

// L'aperçu des cartes de chaleur (?vh=apercu) montre la version sans mouvement
// du site : rien ne défile dans ce cadre, et une section révélée au défilement
// y resterait vide. Les requêtes prefers-reduced-motion se récrivent avant le
// premier rendu, comme le cadre le fait pour les feuilles de style.
if (new URLSearchParams(location.search).get('vh') === 'apercu') {
  const lire = window.matchMedia.bind(window);
  window.matchMedia = (q: string) =>
    lire(q.replace(/\(prefers-reduced-motion:\s*no-preference\)/g, '(min-width: 100000px)').replace(/\(prefers-reduced-motion(:\s*reduce)?\)/g, '(min-width: 0px)'));
}

// Une page ouverte pendant une mise en ligne réclame un ancien morceau de code
// qui n'existe plus (l'hébergeur répond alors par index.html). La page se
// recharge une seule fois (garde-fou d'une minute) pour prendre la nouvelle version.
function rechargerUneFois() {
  try {
    const dernier = Number(sessionStorage.getItem('rechargement-module') || 0);
    if (Date.now() - dernier < 60000) return;
    sessionStorage.setItem('rechargement-module', String(Date.now()));
  } catch { return; }
  window.location.reload();
}
window.addEventListener('vite:preloadError', (ev) => { ev.preventDefault(); rechargerUneFois(); });
window.addEventListener('unhandledrejection', (ev) => {
  const msg = String((ev.reason && (ev.reason.message || ev.reason)) || '');
  if (/not a valid JavaScript MIME type|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg)) rechargerUneFois();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
loadDictionary().finally(() => root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
));