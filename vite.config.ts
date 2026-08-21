import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server middleware: serve /accueil, /origine, /podcast, /vata as their own
// static SPAs from public/. Without this, Vite's catch-all sends them to the main
// React app, which then redirects back (isStaticRoute) -> infinite reload loop.
const STATIC_APPS = ['accueil'];

function serveStaticApps(): Plugin {
  return {
    name: 'serve-static-apps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        for (const app of STATIC_APPS) {
          if (url === `/${app}` || url === `/${app}/`) {
            const file = path.resolve(__dirname, 'public', app, 'index.html');
            if (fs.existsSync(file)) {
              res.setHeader('Content-Type', 'text/html');
              fs.createReadStream(file).pipe(res);
              return;
            }
          }
        }
        next();
      });
    },
  };
}

// Route every app-side `react/jsx-runtime` import through the i18n shim
// (src/lib/i18n/jsx-runtime.ts) so JSX strings are translated at render time.
// node_modules keep the real runtime.
function i18nJsxRuntime(): Plugin {
  const shim = path.resolve(__dirname, 'src/lib/i18n');
  return {
    name: 'i18n-jsx-runtime',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || importer.includes('node_modules') || importer.startsWith(shim)) return null;
      if (source === 'react/jsx-runtime') return path.join(shim, 'jsx-runtime.ts');
      if (source === 'react/jsx-dev-runtime') return path.join(shim, 'jsx-dev-runtime.ts');
      return null;
    },
  };
}

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [i18nJsxRuntime(), react(), serveStaticApps()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'src': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        // Split heavy vendor libs into their own chunks so the initial page
        // doesn't pay for animation/3D code it may not even render.
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics'],
              'vendor-motion': ['framer-motion'],
              'vendor-gsap': ['gsap'],
              // three / threejs-components are dynamically imported via
              // LiquidOilBackground and already land in their own split chunk.
              'vendor-shaders': ['@paper-design/shaders-react'],
            },
          },
        },
        chunkSizeWarningLimit: 1200,
      },
    };
});
