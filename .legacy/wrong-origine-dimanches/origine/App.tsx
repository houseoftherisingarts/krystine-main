// Origine page — migrated 2026-05-06 from the standalone Vite project
// `maj-6-avril-les-dimanches-d'origine (1)` into the main React app.
//
// The original App wrapped <LandingPage> in its own BrowserRouter so it
// could run as a self-contained Vite bundle. The main app already provides
// BrowserRouter (see /App.tsx), so we render LandingPage directly inside a
// `.origine-page` wrapper that applies the chalk/eucalyptus body styling
// (scoped here so it doesn't leak onto other routes).
//
// All other source files (components/*, pages/LandingPage.tsx, origine.css)
// are copied verbatim from the Downloads folder. The CSS is loaded only on
// this route via the import below — Vite scopes it to the chunk.
import LandingPage from './pages/LandingPage';
import './origine.css';

export default function OrigineApp() {
  return (
    <div className="origine-page">
      <LandingPage />
    </div>
  );
}
