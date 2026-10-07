// Harnais des captures d'analytics : sert les vrais écrans de VexelHotjar dans
// l'habillage du back-office de Krystine, nourris de données inventées. Jamais
// bâti, jamais déployé.
// Lancer : npx vite --config scripts/qa/harnais-analytics/vite.config.ts
import { mergeConfig, type Plugin, type UserConfig } from 'vite';
import path from 'path';
import configBase from '../../../vite.config';

const DEMO = path.resolve(__dirname, 'donnees-demo.ts');
const COQUILLE: Record<string, string> = { firestore: path.resolve(__dirname, 'coquille-firestore.ts'), auth: path.resolve(__dirname, 'coquille-auth.ts') };

// Tout import de « donnees » venu des écrans de VexelHotjar reçoit le module de
// démonstration. L'habillage, lui, écoute les conversations privées et sait se
// déconnecter : ces deux appels passent par une coquille vide.
function donneesDemo(): Plugin {
  return {
    name: 'harnais-donnees-demo',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer?.includes('/pages/admin/sections/') && /(^|\/)donnees$/.test(source)) return DEMO;
      const coquille = source.match(/^\.\.\/\.\.\/firebase\/(firestore|auth)$/)?.[1];
      if (coquille && importer?.endsWith('/pages/admin/AdminShell.tsx')) return COQUILLE[coquille];
      return null;
    },
  };
}

const base = (typeof configBase === 'function' ? configBase({ command: 'serve', mode: 'development' }) : configBase) as UserConfig;

export default mergeConfig(base, {
  plugins: [donneesDemo()],
  // Le pré-chargement part du harnais seul, pas de toutes les pages du dépôt.
  optimizeDeps: { entries: [path.resolve(__dirname, 'index.html')] },
  // Un cache de dépendances à part, pour ne jamais croiser celui du serveur de dev habituel.
  cacheDir: path.resolve(__dirname, '../../../node_modules/.vite-harnais-analytics'),
  server: { port: 5184, strictPort: true, host: 'localhost', watch: { ignored: ['**/dist*/**'] } },
});
