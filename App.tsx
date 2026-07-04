import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './src/contexts/AppContext';
import { EditModeProvider } from './src/contexts/EditModeContext';
import { SiteFlagsProvider } from './src/contexts/SiteFlagsContext';
import NavBar from './src/components/layout/NavBar';
import Footer from './src/components/layout/Footer';
import CartDrawer from './src/components/layout/CartDrawer';
import ConsentBanner from './src/components/layout/ConsentBanner';
import SignInModal from './src/components/layout/SignInModal';
import ErrorBoundary from './src/components/layout/ErrorBoundary';
import EditModeBar from './src/components/edit/EditModeBar';
import EditOverlay from './src/components/edit/EditOverlay';
import { PageShareBar } from './src/components/ShareButtons';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import { trackPageView } from './src/lib/track';
import { applyPageMeta } from './src/lib/pageMeta';
import { processDevAdminUrl } from './src/lib/devAdmin';

// Run the dev-mode admin URL processor once at module load — before
// any React component mounts — so an `?unlock=…` query param is acted
// on (set localStorage flags + reload) before the auth context boots
// and decides who's an admin. No-op in production builds.
processDevAdminUrl();

// The home is served as a self-contained static bundle via Firebase Hosting
// (public/accueil/, see firebase.json rewrites + staticRoutes.ts). On client-side
// navigation to /accueil, force a full document load so Firebase serves the static
// landing instead of React Router rendering the SPA. The previous React home is
// kept at /accueil-classic for rollback and side-by-side comparison.
function HardReload({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

// Lazy-loaded pages for code splitting
const InspiratHome     = lazy(() => import('./src/pages/InspiratHome'));
const BoutiqueCollectionPage = lazy(() => import('./src/pages/BoutiqueCollectionPage'));
const TVPage           = lazy(() => import('./src/pages/TVPage'));
const ClientPortal     = lazy(() => import('./src/pages/ClientPortal'));
const AdminDashboard   = lazy(() => import('./src/pages/AdminDashboard'));
const UnsubscribePage  = lazy(() => import('./src/pages/UnsubscribePage'));
const SlideBg          = lazy(() => import('./src/pages/SlideBg'));
// /vexel is the hidden inbox for Salon des Inconnus website-inquiry leads
// captured from the footer contact card. URL-only access — never linked
// from the visible navigation.
const VexelPage        = lazy(() => import('./src/pages/VexelPage'));
// Expérience Origine — refonte React au style L'Œuvre (remplacera le bundle
// statique /origine une fois toutes les sections portées). Preview en cours.
const OrigineExperience = lazy(() => import('./src/pages/OrigineExperience'));
// Expérience Vata — portée du bundle statique vers React (style L'Œuvre)
const VataExperience = lazy(() => import('./src/pages/VataExperience'));
// Pages publiques rebâties from scratch en L'Œuvre (back-end préservé)
const BlogueLoeuvre = lazy(() => import('./src/pages/BlogueLoeuvre'));
const LocationsLoeuvre = lazy(() => import('./src/pages/LocationsLoeuvre'));
const GuideLoeuvre = lazy(() => import('./src/pages/GuideLoeuvre'));
const BoutiqueLoeuvre = lazy(() => import('./src/pages/BoutiqueLoeuvre'));
const ListeAttenteLoeuvre = lazy(() => import('./src/pages/ListeAttenteLoeuvre'));
const QuizLoeuvre = lazy(() => import('./src/pages/QuizLoeuvre'));

// Concepts de refonte (comparaison côte à côte) — pages standalone, chrome masqué.
const KrystineV1 = lazy(() => import('./src/pages/concepts/KrystineV1'));
const KrystineV2 = lazy(() => import('./src/pages/concepts/KrystineV2'));
const KrystineV3 = lazy(() => import('./src/pages/concepts/KrystineV3'));
// Formations en langage V2 (magazine crème), même branding que /krystine.
const FormationsV2 = lazy(() => import('./src/pages/concepts/FormationsV2'));
const MediasV2 = lazy(() => import('./src/pages/concepts/MediasV2'));
const PodcastV2 = lazy(() => import('./src/pages/concepts/PodcastV2'));

// On-palette loader (crème V2 + laiton). Le site est magazine crème :
// un loader espresso flashait un écran brun entre deux pages claires.
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f4efe6]">
    <div className="w-9 h-9 rounded-full border-2 border-[#9c7a44]/25 border-t-[#9c7a44] animate-spin" />
  </div>
);

// Per-page mount, no page-level opacity fade. A full-page fade made the
// incoming page semi-transparent for ~0.5s, which exposed the base color
// behind it (the old-background flash) and slowed perceived load. Each page
// plays its own hero entrance + section reveals instead. Keyed on the
// pathname so the route remounts cleanly and those entrances replay.
const RouteFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <div key={location.pathname}>{children}</div>;
};

const Chrome: React.FC = () => {
  const location = useLocation();
  const hidden = location.pathname.startsWith('/admin')
    || location.pathname === '/'
    || location.pathname === '/accueil'
    || location.pathname === '/desinscription'
    || location.pathname === '/slidebg'
    || location.pathname === '/v1'
    || location.pathname === '/v2'
    || location.pathname === '/v3';
  if (hidden) return null;
  return (
    <>
      <NavBar />
      <CartDrawer />
    </>
  );
};

const Footing: React.FC = () => {
  const location = useLocation();
  if (
    location.pathname.startsWith('/admin')
    || location.pathname === '/'
    || location.pathname === '/desinscription'
    || location.pathname === '/slidebg'
    || location.pathname === '/v1'
    || location.pathname === '/v2'
    || location.pathname === '/v3'
    || location.pathname === '/krystine'
    || location.pathname === '/conferenciere'
    || location.pathname === '/formations'
    || location.pathname === '/medias'
    || location.pathname === '/podcast'
  ) return null;
  return (
    <>
      <PageShareBar />
      <Footer />
      <ConsentBanner />
    </>
  );
};

// SPA page_view tracker — fires only once analytics / the Pixel have been
// initialized (after the visitor accepts consent via ConsentBanner). Routes
// through trackPageView so GA4 AND the Meta Pixel stay in sync on every
// route change (previously only GA4 fired; the Pixel claimed to but didn't).
const AnalyticsPageViews: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

// Per-route SEO: title, description, canonical and og: tags follow the
// route (see src/lib/pageMeta.ts). Without this, every SPA page shipped
// the home title and declared itself canonical of the root.
const PageMeta: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    applyPageMeta(location.pathname);
  }, [location.pathname]);
  return null;
};

const App: React.FC = () => (
  <AppProvider>
    <SiteFlagsProvider>
    <EditModeProvider>
    <BrowserRouter>
      <AnalyticsPageViews />
      <PageMeta />
      <Chrome />
      <EditModeBar />
      <EditOverlay />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <RouteFade>
        <Routes>
          {/* ── Écran d'accueil (splash) puis accueil principal ────────
              Splash is currently hidden — "/" lands straight on /accueil.
              Restore by swapping back to `element={<SplashScreen />}` below. */}
          <Route path="/" element={<Navigate to="/accueil" replace />} />
          <Route path="/accueil" element={<HardReload to="/accueil" />} />
          <Route path="/accueil-classic" element={<InspiratHome />} />

          {/* ── Pages Inspirata ───────────────────────────────────────── */}
          {/* Expérience Origine — /origine sert la page de vente en mode
              pré-ouverture : les infos du parcours, sans prix ni inscription,
              avec invitation à la liste d'attente (/liste-attente?programme=origine). */}
          <Route path="/origine" element={<OrigineExperience />} />
          <Route path="/origine-loeuvre" element={<Navigate to="/origine" replace />} />
          {/* Podcast porté en React (remplace le bundle statique /podcast) */}
          <Route path="/podcast" element={<PodcastV2 />} />
          {/* Vata porté en React (remplace le bundle statique /vata) */}
          <Route path="/vata" element={<VataExperience />} />
          <Route path="/krystine"        element={<KrystineV2 />} />

          {/* ── Concepts de refonte (comparaison) ─────────────────────── */}
          <Route path="/v1" element={<KrystineV1 />} />
          <Route path="/v2" element={<KrystineV2 />} />
          <Route path="/v3" element={<KrystineV3 />} />
          <Route path="/boutique"        element={<BoutiqueLoeuvre />} />
          <Route path="/boutique/:slug"  element={<BoutiqueCollectionPage />} />
          <Route path="/medias"          element={<MediasV2 />} />
          <Route path="/medias/tv"       element={<TVPage />} />
          <Route path="/blogue"          element={<BlogueLoeuvre />} />
          <Route path="/points-de-vente" element={<LocationsLoeuvre />} />
          <Route path="/conferenciere"   element={<KrystineV2 />} />

          {/* ── Standalone Quiz + Livres live under /medias,
                Événements lives under /formations. Keep legacy URLs redirecting. */}
          <Route path="/quiz"       element={<QuizLoeuvre />} />
          <Route path="/guide"      element={<GuideLoeuvre />} />
          <Route path="/ayurveda"   element={<Navigate to="/quiz"                    replace />} />
          <Route path="/livres"     element={<Navigate to="/medias#livres"           replace />} />
          <Route path="/evenements" element={<Navigate to="/formations#evenements"   replace />} />

          {/* ── Programmes / ex-dist ──────────────────────────────────── */}
          <Route path="/formations"        element={<FormationsV2 />} />
          <Route path="/liste-attente"     element={<ListeAttenteLoeuvre />} />
          {/* /origine, /podcast, /vata are served as-is from public/ — see firebase.json */}

          {/* ── Système ───────────────────────────────────────────────── */}
          <Route path="/politique-de-confidentialite" element={<PrivacyPolicy lang="fr" />} />
          <Route path="/compte" element={<ClientPortal />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/desinscription" element={<UnsubscribePage />} />
          {/* Hidden / unlisted — slide-style background of the home hero */}
          <Route path="/slidebg" element={<SlideBg />} />
          {/* Hidden / unlisted — Salon des Inconnus inbound-leads inbox */}
          <Route path="/vexel" element={<VexelPage />} />
        </Routes>
        </RouteFade>
      </Suspense>
      </ErrorBoundary>
      <Footing />
      <SignInModal />
    </BrowserRouter>
    </EditModeProvider>
    </SiteFlagsProvider>
  </AppProvider>
);

export default App;
