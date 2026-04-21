import path from 'path';
import fs from 'fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server middleware: serve /origine, /podcast, /vata as their own static SPAs
// from public/. Without this, Vite's catch-all sends them to the main React app.
const STATIC_APPS = ['origine', 'podcast', 'vata'];

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

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), serveStaticApps()],
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
