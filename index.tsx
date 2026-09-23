import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadDictionary } from './src/lib/i18n/lang';

// L'aperçu des cartes de chaleur (?vh=apercu) montre la version sans mouvement
// du site : rien ne défile dans ce cadre, et une section révélée au défilement
// y resterait vide. Les requêtes prefers-reduced-motion se récrivent avant le
// premier rendu, comme le cadre le fait pour les feuilles de style.
if (new URLSearchParams(location.search).get('vh') === 'apercu') {
  const lire = window.matchMedia.bind(window);
  window.matchMedia = (q: string) =>
    lire(q.replace(/\(prefers-reduced-motion:\s*no-preference\)/g, '(min-width: 100000px)').replace(/\(prefers-reduced-motion(:\s*reduce)?\)/g, '(min-width: 0px)'));
}

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