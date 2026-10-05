// Garde des clés publiques : refuse de mettre en ligne une version construite
// sans les clés que le navigateur attend. Le 3 oct. 2026, une version sans la
// clé reCAPTCHA a bloqué le formulaire du quiz pour tout le monde pendant au
// moins une journée (« jeton manquant » dans les journaux). Lancée par
// scripts/publier.sh juste après `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// Les bibliothèques (vendor-*) et les copies d'iCloud (« fichier 2.js ») sont
// ignorées : une suite de caractères des shaders imitait la clé, et la garde
// laissait passer une version sans la vraie clé (5 oct. 2026).

const dossier = join(process.cwd(), 'dist', 'assets');
const js = readdirSync(dossier).filter((f) => f.endsWith('.js') && !f.startsWith('vendor-') && !/ \d+\.js$/.test(f)).map((f) => readFileSync(join(dossier, f), 'utf8')).join('\n');

const attendues = [
  ['la clé de la case « Je ne suis pas un robot » (VITE_RECAPTCHA_SITE_KEY)', /6L[0-9A-Za-z_-]{38}/],
  ['la clé Firebase du site (VITE_FIREBASE_API_KEY)', /AIza[0-9A-Za-z_-]{35}/],
];
const manquantes = attendues.filter(([, re]) => !re.test(js)).map(([nom]) => nom);
if (manquantes.length) {
  console.error(`\nPublication arrêtée : la version construite n'a pas ${manquantes.join(' ni ')}.`);
  console.error("Le fichier .env.local manque ou est incomplet sur cet ordinateur. Rien n'a été mis en ligne. Montrez ce message à Alex.\n");
  process.exit(1);
}
console.log('Garde des clés : la case anti-robot et Firebase sont bien dans la version construite.');
