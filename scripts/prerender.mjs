#!/usr/bin/env node
/**
 * Postbuild static prerender (2026-05-08).
 *
 * Why this exists
 * ---------------
 * Two real-world failures were traced to the same root cause: the SPA
 * served the same `dist/index.html` for every URL, so crawlers (Bing,
 * Framer's AEO scanner, social previews) saw:
 *   - identical <title> / <meta description> across every route
 *   - canonical hard-coded to /accueil on every URL — telling Bing
 *     that /medias, /krystine, /quiz, /podcast etc. were duplicates
 *     of /accueil and should NOT be indexed separately
 *   - none of the in-body content (internal links, external citations,
 *     H2 hierarchy) — that all only renders after React hydrates, and
 *     these crawlers don't reliably wait for client-side JS
 *
 * What it does
 * ------------
 * Spins up `vite preview`, drives a headless Chromium through every
 * indexable route, waits for hydration to finish (the per-route H1
 * landing in the DOM via Helmet), and dumps the rendered HTML to
 * `dist/<path>/index.html`. Firebase Hosting serves static files first,
 * so crawlers hitting `/medias` now get `dist/medias/index.html` with
 * its real H1, internal links, citations, and self-canonical — no
 * Helmet round-trip required.
 *
 * The catch-all `dist/index.html` is preserved (Vite output) so unknown
 * URLs still fall through the firebase rewrite to a sensible shell.
 *
 * Hydration UX trade-off
 * ----------------------
 * The app uses `createRoot` (not `hydrateRoot`), so on first paint of
 * a prerendered route the user sees static HTML for ~50ms before React
 * mounts and replaces it. Visually identical content → imperceptible
 * flash. In-app navigation (clicking a <Link>) is unaffected — that
 * never fetches the prerendered HTML.
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const PORT = 4567;
const PREVIEW_URL = `http://localhost:${PORT}`;

// FR canonical paths to prerender. EN mirrors auto-generated below for
// the routes that have an EN twin (i.e. not in FR_ONLY).
const FR_ROUTES = [
  '/accueil',
  '/krystine',
  '/conferenciere',
  '/medias',
  '/medias/tv',
  '/blogue',
  '/boutique',
  '/points-de-vente',
  '/formations',
  '/origine',
  '/podcast',
  '/vata',
  '/quiz',
  '/guide',
  '/politique-de-confidentialite',
];

// Static-bundle / FR-only paths that have no English mirror.
const FR_ONLY = new Set(['/origine', '/podcast', '/vata']);

const EN_ROUTES = FR_ROUTES
  .filter((path) => !FR_ONLY.has(path))
  .map((path) => '/en' + path);

const ALL_ROUTES = [...FR_ROUTES, ...EN_ROUTES];

/**
 * Boot `vite preview` and resolve once it announces it's listening on
 * PORT. Rejects if the server fails to start within 30s.
 */
function startPreviewServer() {
  return new Promise((resolveServer, reject) => {
    const server = spawn(
      'npx',
      ['vite', 'preview', '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    let resolved = false;

    const onStdout = (chunk) => {
      const out = chunk.toString();
      if (!resolved && out.includes(`localhost:${PORT}`)) {
        resolved = true;
        resolveServer(server);
      }
    };
    server.stdout.on('data', onStdout);
    server.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    server.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited (${code})\n${stderr}`));
    });

    setTimeout(() => {
      if (!resolved) reject(new Error('vite preview did not start within 30s'));
    }, 30000);
  });
}

/**
 * Render a single route: navigate, wait for hydration, dump HTML, write
 * to dist/<route>/index.html. Returns true on success, false on caught
 * error (so one bad route doesn't kill the whole build).
 */
async function prerenderRoute(page, route) {
  const url = PREVIEW_URL + route;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for at least one in-body H1 (the AEO change made every
    // indexable page render a visible h1) — proves the route's body
    // tree mounted, not just the shell.
    await page.waitForSelector('h1', { timeout: 8000 }).catch(() => null);

    // Network idle gives Firebase / Shopify product fetches a chance
    // to settle. Bounded so a hung request doesn't stall the build.
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => null);

    // Settle any post-network state updates (Helmet flushes, lazy
    // sections registering with framer-motion, etc.).
    await new Promise((r) => setTimeout(r, 800));

    // Dedup head tags before dumping. The source `index.html` ships
    // sensible fallbacks so non-JS crawlers landing on the catch-all
    // dist/index.html see something. Helmet then injects per-route
    // tags on hydration — but with a quirk: react-helmet-async
    // PREPENDS a new <title> (so the static title becomes index 1)
    // and APPENDS new <meta>/<link> tags (so the static ones stay at
    // index 0). The dedup therefore uses different strategies:
    //   · <title>      → keep the FIRST occurrence (Helmet's prepended)
    //   · everything   → keep the LAST occurrence (Helmet's appended)
    //   · hreflangs    → keep the LAST occurrence per `hreflang` value
    // Verified empirically against Helmet 3.x via scripts/_probe.mjs.
    await page.evaluate(() => {
      const head = document.head;

      // <title>: Helmet prepends → keep first, drop the rest.
      const titles = head.querySelectorAll('title');
      for (let i = 1; i < titles.length; i++) titles[i].remove();

      // Other unique-by-design tags: Helmet appends → keep last, drop earlier.
      const keepLastSelectors = [
        'link[rel="canonical"]',
        'meta[name="description"]',
        'meta[property="og:title"]',
        'meta[property="og:description"]',
        'meta[property="og:url"]',
        'meta[property="og:locale"]',
        'meta[name="twitter:title"]',
        'meta[name="twitter:description"]',
        'meta[name="twitter:image"]',
      ];
      for (const sel of keepLastSelectors) {
        const matches = head.querySelectorAll(sel);
        if (matches.length <= 1) continue;
        for (let i = 0; i < matches.length - 1; i++) matches[i].remove();
      }

      // Hreflang alternates: dedupe per `hreflang` value, keep last.
      const seenHl = new Set();
      const altLinks = Array.from(head.querySelectorAll('link[rel="alternate"][hreflang]'));
      for (let i = altLinks.length - 1; i >= 0; i--) {
        const hl = altLinks[i].getAttribute('hreflang');
        if (seenHl.has(hl)) altLinks[i].remove();
        else seenHl.add(hl);
      }
    });

    const html = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);

    const outDir = resolve(DIST, route.replace(/^\//, ''));
    await mkdir(outDir, { recursive: true });
    await writeFile(resolve(outDir, 'index.html'), html, 'utf8');
    return true;
  } catch (err) {
    console.warn(`  ⚠  ${route}: ${err.message}`);
    return false;
  }
}

async function main() {
  // Clean stale prerendered subdirectories before starting the
  // preview server. Otherwise vite preview's static-file serving
  // would hand the headless browser the previous build's prerendered
  // output (HTML with React already mounted), and a fresh prerender
  // would render that recursively — capturing the previous run's
  // bugs into the new run's HTML. Removing the per-route subdirs
  // forces vite preview to fall through to dist/index.html (the
  // SPA shell) for every navigation.
  console.log('▶ cleaning stale prerendered routes…');
  for (const route of ALL_ROUTES) {
    const dir = resolve(DIST, route.replace(/^\//, ''));
    await rm(dir, { recursive: true, force: true });
  }

  console.log('▶ starting vite preview…');
  const server = await startPreviewServer();

  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      // Tell the server to render in the same locale Bing would request.
      locale: 'fr-CA',
    });
    const page = await ctx.newPage();

    console.log(`▶ prerendering ${ALL_ROUTES.length} routes…`);
    let ok = 0;
    let failed = 0;
    for (const route of ALL_ROUTES) {
      process.stdout.write(`  · ${route} `);
      const success = await prerenderRoute(page, route);
      if (success) {
        ok++;
        console.log('✓');
      } else {
        failed++;
      }
    }
    console.log(`✓ prerender complete — ${ok} ok, ${failed} failed`);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
