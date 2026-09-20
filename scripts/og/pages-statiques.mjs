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
  const nom = route.slice(1).replace(/\//g, '-') + '.html';
  writeFileSync(resolve(racine, 'dist/og', nom), page);
  faites.push(`${route} → /og/${nom}`);
}
console.log(`pages de partage : ${faites.length}\n  ${faites.join('\n  ')}`);
