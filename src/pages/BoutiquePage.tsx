import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useBoutique } from '../contexts/AppContext';
import { useApp } from '../contexts/AppContext';
import { ALL_PRODUCTS_SLUG } from '../lib/collections';

// Boutique landing — TEMPORARY: collections grid hidden per request, all
// shoppers go straight to the all-products view. Krystine wants every
// SKU visible without filtering by collection while she's still
// curating. To restore the doorways, revert this commit (the previous
// editorial-collections index is preserved in git).
//
// Implementation: /boutique now redirects to /boutique/tous (the
// existing all-products collection page in BoutiqueCollectionPage),
// preserving the redirect-to-Shopify safety valve when Krystine flips
// the emergency switch in /admin.

const BoutiquePage: React.FC = () => {
  const { lang } = useApp();
  const { redirectEnabled, redirectUrl, loading: redirectLoading } = useBoutique();

  // Emergency redirect — when Krystine flips the switch in /admin, anyone
  // landing on /boutique bounces to the legacy inspiratanature.com site.
  useEffect(() => {
    if (!redirectLoading && redirectEnabled && redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectLoading, redirectEnabled, redirectUrl]);

  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#2E1A14] text-[#3A251E] dark:text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#B8532F] font-bold">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  // Bypass the collections index — everyone lands on the all-products grid.
  return <Navigate to={`/boutique/${ALL_PRODUCTS_SLUG}`} replace />;
};

export default BoutiquePage;
