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
import { logPageView } from './src/firebase';
import { processDevAdminUrl } from './src/lib/devAdmin';

// Run the dev-mode admin URL processor once at module load — before
// any React component mounts — so an `?unlock=…` query param is acted
// on (set localStorage flags + reload) before the auth context boots
// and decides who's an admin. No-op in production builds.
processDevAdminUrl();

// Lazy-loaded pages for code splitting
const SplashScreen     = lazy(() => import('./src/pages/SplashScreen'));
const InspiratHome     = lazy(() => import('./src/pages/InspiratHome'));
// /krystine + /conferenciere are now the same merged pillar page.
// ConferencierePage reads the current pathname and auto-scrolls to the
// form when opened via /conferenciere; /krystine opens at the top so
// the bio narrative leads.
const BoutiquePage           = lazy(() => import('./src/pages/BoutiquePage'));
const BoutiqueCollectionPage = lazy(() => import('./src/pages/BoutiqueCollectionPage'));
const MediasPage       = lazy(() => import('./src/pages/MediasPage'));
const TVPage           = lazy(() => import('./src/pages/TVPage'));
const BloguePage       = lazy(() => import('./src/pages/BloguePage'));
const QuizPage         = lazy(() => import('./src/pages/QuizPage'));
const GuidePage        = lazy(() => import('./src/pages/GuidePage'));
const LocationsPage    = lazy(() => import('./src/pages/LocationsPage'));
const ConferencierePage = lazy(() => import('./src/pages/ConferencierePage'));
const FormationsPage   = lazy(() => import('./src/pages/FormationsPage'));
const ClientPortal     = lazy(() => import('./src/pages/ClientPortal'));
const AdminDashboard   = lazy(() => import('./src/pages/AdminDashboard'));
const UnsubscribePage  = lazy(() => import('./src/pages/UnsubscribePage'));
const SlideBg          = lazy(() => import('./src/pages/SlideBg'));
// /vexel is the hidden inbox for Salon des Inconnus website-inquiry leads
// captured from the footer contact card. URL-only access — never linked
// from the visible navigation.
const VexelPage        = lazy(() => import('./src/pages/VexelPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050C1A]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-t-transparent border-[#D4AF37] animate-spin" />
      <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Chargement...</p>
    </div>
  </div>
);

const Chrome: React.FC = () => {
  const location = useLocation();
  const hidden = location.pathname.startsWith('/admin')
    || location.pathname === '/'
    || location.pathname === '/accueil'
    || location.pathname === '/desinscription'
    || location.pathname === '/slidebg';
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
  ) return null;
  return (
    <>
      <PageShareBar />
      <Footer />
      <ConsentBanner />
    </>
  );
};

// SPA page_view tracker — fires only once analytics has been initialized
// (which happens after the user accepts consent via ConsentBanner).
const AnalyticsPageViews: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    logPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

const App: React.FC = () => (
  <AppProvider>
    <SiteFlagsProvider>
    <EditModeProvider>
    <BrowserRouter>
      <AnalyticsPageViews />
      <Chrome />
      <EditModeBar />
      <EditOverlay />
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Écran d'accueil (splash) puis accueil principal ────────
              Splash is currently hidden — "/" lands straight on /accueil.
              Restore by swapping back to `element={<SplashScreen />}` below. */}
          <Route path="/" element={<Navigate to="/accueil" replace />} />
          <Route path="/accueil" element={<InspiratHome />} />

          {/* ── Pages Inspirata ───────────────────────────────────────── */}
          <Route path="/krystine"        element={<ConferencierePage />} />
          <Route path="/boutique"        element={<BoutiquePage />} />
          <Route path="/boutique/:slug"  element={<BoutiqueCollectionPage />} />
          <Route path="/medias"          element={<MediasPage />} />
          <Route path="/medias/tv"       element={<TVPage />} />
          <Route path="/blogue"          element={<BloguePage />} />
          <Route path="/points-de-vente" element={<LocationsPage />} />
          <Route path="/conferenciere"   element={<ConferencierePage />} />

          {/* ── Standalone Quiz + Livres live under /medias,
                Événements lives under /formations. Keep legacy URLs redirecting. */}
          <Route path="/quiz"       element={<QuizPage />} />
          <Route path="/guide"      element={<GuidePage />} />
          <Route path="/ayurveda"   element={<Navigate to="/quiz"                    replace />} />
          <Route path="/livres"     element={<Navigate to="/medias#livres"           replace />} />
          <Route path="/evenements" element={<Navigate to="/formations#evenements"   replace />} />

          {/* ── Programmes / ex-dist ──────────────────────────────────── */}
          <Route path="/formations"        element={<FormationsPage />} />
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
