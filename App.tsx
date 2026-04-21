import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './src/contexts/AppContext';
import NavBar from './src/components/layout/NavBar';
import Footer from './src/components/layout/Footer';
import CartDrawer from './src/components/layout/CartDrawer';
import ConsentBanner from './src/components/layout/ConsentBanner';
import SignInModal from './src/components/layout/SignInModal';
import PrivacyPolicy from './components/pages/PrivacyPolicy';

// Lazy-loaded pages for code splitting
const SplashScreen     = lazy(() => import('./src/pages/SplashScreen'));
const InspiratHome     = lazy(() => import('./src/pages/InspiratHome'));
const KrystinePage     = lazy(() => import('./src/pages/KrystinePage'));
const AyurvedaPage     = lazy(() => import('./src/pages/AyurvedaPage'));
const BoutiquePage     = lazy(() => import('./src/pages/BoutiquePage'));
const LivresPage       = lazy(() => import('./src/pages/LivresPage'));
const MediasPage       = lazy(() => import('./src/pages/MediasPage'));
const TVPage           = lazy(() => import('./src/pages/TVPage'));
const BloguePage       = lazy(() => import('./src/pages/BloguePage'));
const LocationsPage    = lazy(() => import('./src/pages/LocationsPage'));
const ConferencierePage = lazy(() => import('./src/pages/ConferencierePage'));
const EvenementsPage   = lazy(() => import('./src/pages/EvenementsPage'));
const FormationsPage   = lazy(() => import('./src/pages/FormationsPage'));
const DimanchesPage    = lazy(() => import('./src/pages/DimanchesPage'));
const ClientPortal     = lazy(() => import('./src/pages/ClientPortal'));
const AdminDashboard   = lazy(() => import('./src/pages/AdminDashboard'));

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
    || location.pathname === '/accueil';
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
  if (location.pathname.startsWith('/admin') || location.pathname === '/') return null;
  return (
    <>
      <Footer />
      <ConsentBanner />
    </>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <BrowserRouter>
      <Chrome />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Écran d'accueil (splash) puis accueil principal ──────── */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/accueil" element={<InspiratHome />} />

          {/* ── Pages Inspirata ───────────────────────────────────────── */}
          <Route path="/krystine"        element={<KrystinePage />} />
          <Route path="/ayurveda"        element={<AyurvedaPage />} />
          <Route path="/boutique"        element={<BoutiquePage />} />
          <Route path="/livres"          element={<LivresPage />} />
          <Route path="/medias"          element={<MediasPage />} />
          <Route path="/medias/tv"       element={<TVPage />} />
          <Route path="/blogue"          element={<BloguePage />} />
          <Route path="/points-de-vente" element={<LocationsPage />} />
          <Route path="/conferenciere"   element={<ConferencierePage />} />
          <Route path="/evenements"      element={<EvenementsPage />} />

          {/* ── Programmes / ex-dist ──────────────────────────────────── */}
          <Route path="/formations"        element={<FormationsPage />} />
          <Route path="/dimanches-origine" element={<DimanchesPage />} />
          {/* /origine, /podcast, /vata are served as-is from public/ — see firebase.json */}

          {/* ── Système ───────────────────────────────────────────────── */}
          <Route path="/politique-de-confidentialite" element={<PrivacyPolicy lang="fr" />} />
          <Route path="/compte" element={<ClientPortal />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
      <Footing />
      <SignInModal />
    </BrowserRouter>
  </AppProvider>
);

export default App;
