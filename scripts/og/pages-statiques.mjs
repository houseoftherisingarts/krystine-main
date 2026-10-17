// Après le build : une copie de dist/index.html par route de src/lib/pageMeta.ts,
// avec le titre, la description, l'adresse canonique et la vignette de partage
// de CETTE page déjà écrits dans le HTML. Messenger, Facebook, iMessage et
// WhatsApp n'exécutent pas le JavaScript : sans ces copies, un lien vers
// /5elements affichait la vignette de l'accueil. firebase.json envoie chaque
// route vers dist/og/<route>.html; le reste de la page est le même bundle.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SITE = 'Krystine St-Laurent';
const ORIGIN = 'https://www.krystinestlaurent.ca';
const src = readFileSync(resolve(racine, 'src/lib/pageMeta.ts'), 'utf8');
const gabarit = readFileSync(resolve(racine, 'dist/index.html'), 'utf8');

const champ = (bloc, nom) => {
  const m = bloc.match(new RegExp(`\\b${nom}:\\s*(\`([^\`]*)\`|'((?:[^'\\\\]|\\\\.)*)')`));
  if (!m) return undefined;
  return (m[2] ?? m[3]).replace(/\$\{SITE\}/g, SITE).replace(/\\'/g, "'");
};
const html = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const meta = (page, cle, valeur) => {
  const re = new RegExp(`(<meta (?:property|name)="${cle}" content=")[^"]*(")`);
  if (!re.test(page)) throw new Error(`balise ${cle} absente de dist/index.html`);
  return page.replace(re, `$1${html(valeur)}$2`);
};

// Les étiquettes cachées propres à chaque page (16 oct. 2026, pour Google et les IA) :
// ce qu'est la page, dans le langage de schema.org. Jamais de prix qui change bientôt
// (VATA passe de 397 $ à 497 $ le 1er novembre) : seul le prix stable des Rituels est écrit.
const PERSONNE = { '@id': `${ORIGIN}/#person` };
const DONNEES = {
  '/krystine': { '@type': 'ProfilePage', mainEntity: PERSONNE },
  '/quiz': {
    '@type': 'WebPage', name: 'De quoi ai-je besoin en ce moment ? Le quiz de Krystine St-Laurent', inLanguage: 'fr',
    about: { '@type': 'Thing', name: 'Ayurveda' }, author: PERSONNE,
    mainEntity: { '@type': 'Quiz', name: 'De quoi ai-je besoin en ce moment ?', educationalUse: 'auto-évaluation', timeRequired: 'PT3M', inLanguage: 'fr',
      about: ['Vata (Vent et Espace)', 'Pitta (Feu et Eau)', 'Kapha (Eau et Terre)'], provider: PERSONNE },
  },
  '/vata': {
    '@type': 'Course', name: 'VATA Essentiel', inLanguage: 'fr', provider: PERSONNE,
    description: "Une expérience audio de sept semaines, plus une semaine d'introduction, pour apaiser le mental, un sens à la fois : 16 capsules, 7 méditations, un guide de 204 pages.",
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'P8W' },
  },
  '/rituels-essentiels': {
    '@type': 'Course', name: "Rituels essentiels inspirés de l'Ayurveda", inLanguage: 'fr', provider: PERSONNE,
    description: "10 capsules vidéo et un guide à télécharger : des gestes de moins de 5 minutes par jour (automassage, soins du nez, de la bouche, des mains et des pieds).",
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
    offers: { '@type': 'Offer', price: '27', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: `${ORIGIN}/rituels-essentiels`, category: 'Paid' },
  },
  '/origine': {
    '@type': 'Course', name: 'EXPÉRIENCE ORIGINE', inLanguage: 'fr', provider: PERSONNE,
    description: 'Le parcours signature de douze semaines avec Krystine St-Laurent, en direct. Une seule ouverture par année.',
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'P12W' },
  },
  '/podcast': { '@type': 'PodcastSeries', name: 'Au-delà des tendances', inLanguage: 'fr', author: PERSONNE, url: `${ORIGIN}/podcast` },
  '/medias': { '@type': 'CollectionPage', name: 'Médias et livres de Krystine St-Laurent', about: PERSONNE },
};
// Les questions fréquentes de VATA, lues dans la page elle-même (src/pages/VataExperience.tsx, FAQS) :
// la même réponse que celle que la visiteuse lit, jamais un texte à part.
try {
  const vata = readFileSync(resolve(racine, 'src/pages/VataExperience.tsx'), 'utf8');
  const bloc = vata.match(/const FAQS = \[([\s\S]*?)\n\];/)?.[1] || '';
  const chaine = String.raw`(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')`;
  const paires = [...bloc.matchAll(new RegExp(String.raw`\[\s*` + chaine + String.raw`\s*,\s*` + chaine + String.raw`\s*\]`, 'g'))]
    .map((m) => [(m[1] ?? m[2]).replace(/\\'/g, "'"), (m[3] ?? m[4]).replace(/\\'/g, "'")]);
  if (paires.length >= 3) {
    DONNEES['/vata'] = { '@graph': [
      { ...DONNEES['/vata'] },
      { '@type': 'FAQPage', mainEntity: paires.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
    ] };
  }
} catch (e) { console.warn('questions de VATA non lues :', e.message); }

// Les questions fréquentes du quiz, lues dans src/content/quizFaq.ts (la même source que la page /quiz).
try {
  const faq = readFileSync(resolve(racine, 'src/content/quizFaq.ts'), 'utf8');
  const paires = [...faq.matchAll(/\[\s*'([^']+)',\s*'([^']+)',\s*\]/g)].map((m) => [m[1], m[2]]);
  if (paires.length >= 3) {
    DONNEES['/quiz'] = { '@graph': [
      { ...DONNEES['/quiz'] },
      { '@type': 'FAQPage', mainEntity: paires.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
    ] };
  }
} catch (e) { console.warn('questions du quiz non lues :', e.message); }

// La routine du matin des Rituels, lue dans src/content/routineMatin.ts (même source que la page).
try {
  const rm = readFileSync(resolve(racine, 'src/content/routineMatin.ts'), 'utf8');
  const paires = [...rm.matchAll(/\[\s*'([^']+)',\s*'([^']+)',\s*\]/g)].map((m) => [m[1], m[2]]);
  if (paires.length >= 3) {
    DONNEES['/rituels-essentiels'] = { '@graph': [
      { ...DONNEES['/rituels-essentiels'] },
      { '@type': 'FAQPage', mainEntity: paires.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
    ] };
  }
} catch (e) { console.warn('routine du matin non lue :', e.message); }

const jsonLd = (route) => DONNEES[route]
  ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', url: ORIGIN + route, ...DONNEES[route] }).replace(/</g, '\\u003c')}</script>\n</head>`
  : '</head>';

const routes = [...src.matchAll(/^  '(\/[^']+)': \{([\s\S]*?)^  \},/gm)];
mkdirSync(resolve(racine, 'dist/og'), { recursive: true });
const faites = [];
for (const [, route, bloc] of routes) {
  const titre = champ(bloc, 'title'); const description = champ(bloc, 'description');
  if (!titre || !description) continue;
  const image = ORIGIN + (champ(bloc, 'image') || '/og-image.jpg');
  const alt = champ(bloc, 'imageAlt') || 'Krystine St-Laurent, accueil du site';
  const url = ORIGIN + route;
  let page = gabarit.replace(/<title>[^<]*<\/title>/, `<title>${html(titre)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  for (const [cle, val] of [['description', description], ['og:title', titre], ['og:description', description], ['og:url', url],
    ['og:image', image], ['og:image:alt', alt], ['twitter:title', titre], ['twitter:description', description], ['twitter:image', image], ['twitter:image:alt', alt]]) {
    page = meta(page, cle, val);
  }
  page = page.replace('</head>', jsonLd(route));
  const nom = route.slice(1).replace(/\//g, '-') + '.html';
  writeFileSync(resolve(racine, 'dist/og', nom), page);
  faites.push(`${route} → /og/${nom}`);
}
console.log(`pages de partage : ${faites.length}\n  ${faites.join('\n  ')}`);
