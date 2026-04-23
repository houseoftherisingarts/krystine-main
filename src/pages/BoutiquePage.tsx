import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useBoutique } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { getProducts, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { ALL_PRODUCTS_SLUG, COLLECTIONS, countByCollection } from '../lib/collections';

// Boutique landing — editorial collections index.
// The per-collection product grid lives in BoutiqueCollectionPage so that this
// page can stay calm and directional: one doorway per collection, each
// doorway narrates its own promise before the shopper sees any prices.

const BoutiquePage: React.FC = () => {
  const { lang } = useApp();
  const { redirectEnabled, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();
  const t = CONTENT[lang];

  const [products, setProducts] = useState<ShopifyProduct[]>([]);

  // Emergency redirect — when Krystine flips the switch in /admin, anyone
  // landing on /boutique bounces to the legacy inspiratanature.com site.
  // `replace` avoids cluttering the back-button history.
  useEffect(() => {
    if (!redirectLoading && redirectEnabled && redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectLoading, redirectEnabled, redirectUrl]);

  useEffect(() => {
    if (!isShopifyConfigured || redirectEnabled) return;
    // We only need the products to compute per-collection counts under each
    // doorway card. If the fetch fails we simply render without counts —
    // never block the landing on it.
    getProducts(50, lang).then(setProducts).catch(() => { /* silent */ });
  }, [lang, redirectEnabled]);

  // While the redirect is firing, show a quiet placeholder instead of the
  // full boutique landing.
  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050C1A] text-[#0B1A36] dark:text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  // Counts on the doorways respect the per-product hide toggles set in
  // Admin → Boutique, so a collection that's been emptied via hides will
  // honestly show 0 rather than its raw Shopify count.
  const counts = countByCollection(products.filter(p => !hiddenProducts.has(p.handle)));

  return (
    <div className="min-h-screen bg-white dark:bg-[#050C1A] pt-20 text-[#0B1A36] dark:text-white">
      {/* Editorial banner */}
      <div className="relative w-full h-[55vh] overflow-hidden flex items-center justify-center mb-16">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050C1A] via-[#050C1A]/40 to-[#050C1A]/20" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            {lang === 'FR' ? 'La Boutique' : 'The Shop'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif mb-4 leading-[1.05]">{t.shop.title}</h1>
          <p className="text-lg md:text-xl text-white/80 font-serif italic">{t.shop.subtitle}</p>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-10" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        {/* Short manifesto above the doorways — sets the tone. */}
        <section className="text-center mb-20 max-w-3xl mx-auto">
          <p className="font-serif italic text-xl md:text-2xl leading-relaxed text-[#0B1A36]/80 dark:text-white/80">
            {lang === 'FR'
              ? "Six collections. Une même exigence : des formules pensées lentement, des matières choisies pour durer, des mots qui accompagnent le geste."
              : 'Six collections. One same standard: formulas composed slowly, materials chosen to last, words that accompany the gesture.'}
          </p>
        </section>

        {/* 6 collection doorways — 2 per row on desktop. Each is big enough to
            carry a real editorial banner and breathe; small enough that all 6
            fit above the fold on a 15" display. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {COLLECTIONS.map(c => {
            const label = lang === 'FR' ? c.labelFR : c.labelEN;
            const tagline = lang === 'FR' ? c.taglineFR : c.taglineEN;
            const count = counts.get(c.id) || 0;
            return (
              <Link
                key={c.slug}
                to={`/boutique/${c.slug}`}
                className="group relative block aspect-[4/5] md:aspect-[5/4] rounded-[28px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                  style={{ backgroundImage: `url(${c.bannerImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36] via-[#0B1A36]/55 to-[#0B1A36]/10" />
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10 text-white">
                  <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-[10px] font-bold mb-3 block">
                    {lang === 'FR' ? 'Collection' : 'Collection'}
                    {count > 0 && <span className="text-white/50 font-normal tracking-normal normal-case ml-2">· {count} {lang === 'FR' ? (count > 1 ? 'pièces' : 'pièce') : (count > 1 ? 'pieces' : 'piece')}</span>}
                  </span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-2 leading-[1.1]">{label}</h2>
                  <p className="text-sm md:text-base font-serif italic text-white/70 mb-6 max-w-md">{tagline}</p>
                  <span className="inline-flex items-center gap-2 self-start border border-white/40 text-white text-[10px] uppercase tracking-[0.25em] font-bold px-5 py-2.5 rounded-full backdrop-blur-sm bg-white/5 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-[#0B1A36] transition-colors">
                    {lang === 'FR' ? 'Explorer la collection' : 'Explore the collection'}
                    <i className="fa-solid fa-arrow-right text-[9px] transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Safety-valve: show-all link. Lives below the editorial grid so
            shoppers who skip the collections can still reach every SKU. */}
        <div className="mt-14 text-center">
          <Link
            to={`/boutique/${ALL_PRODUCTS_SLUG}`}
            className="inline-flex items-center gap-2 text-[#0B1A36]/60 dark:text-white/60 hover:text-[#D4AF37] text-[11px] uppercase tracking-[0.3em] font-bold transition-colors"
          >
            {lang === 'FR' ? 'Voir tous les produits' : 'View all products'}
            <i className="fa-solid fa-arrow-right text-[9px]" />
          </Link>
        </div>

        {/* Trust strip — same four guarantees, kept under the doorways so
            the editorial tone carries the page. */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
          {[
            { icon: 'fa-lock',  titleFR: 'Paiement sécurisé',     titleEN: 'Secure checkout',     descFR: 'Shopify + SSL',         descEN: 'Shopify + SSL' },
            { icon: 'fa-leaf',  titleFR: 'Formules ayurvédiques', titleEN: 'Ayurvedic formulas',  descFR: 'Conçues par Krystine',  descEN: 'Crafted by Krystine' },
            { icon: 'fa-truck', titleFR: 'Livraison Canada',      titleEN: 'Ships across Canada', descFR: 'Expédition rapide',     descEN: 'Fast shipping' },
            { icon: 'fa-heart', titleFR: 'Satisfaction',          titleEN: 'Satisfaction',        descFR: "37 ans d'expérience",   descEN: '37 years of expertise' },
          ].map(b => (
            <div key={b.icon} className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[#F5F5F0] dark:bg-[#0B1A36] border border-[#D4AF37]/10">
              <i className={`fa-solid ${b.icon} text-[#D4AF37] text-lg`} />
              <span className="text-[11px] md:text-xs uppercase tracking-[0.15em] font-bold text-[#0B1A36] dark:text-white">
                {lang === 'FR' ? b.titleFR : b.titleEN}
              </span>
              <span className="text-[10px] md:text-[11px] text-[#0B1A36]/60 dark:text-white/60">
                {lang === 'FR' ? b.descFR : b.descEN}
              </span>
            </div>
          ))}
        </div>

        {/* Bibliothèque teaser — keeps the old /livres entry point alive as
            an editorial cross-link, just recast as another doorway into the
            Bibliothèque collection. */}
        <div className="mt-20 relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0B1A36] to-[#1A2642] p-12 text-white text-center border border-[#D4AF37]/20">
          <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${ASSETS.livresBg})` }} />
          <div className="relative z-10">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? 'La Bibliothèque' : 'The Library'}
            </span>
            <h2 className="text-4xl md:text-6xl font-serif mb-4">
              {lang === 'FR' ? 'Lire, avant d’agir' : 'Read, before acting'}
            </h2>
            <p className="text-lg md:text-xl font-serif italic text-white/70 mb-8 max-w-2xl mx-auto">
              {lang === 'FR'
                ? 'Les trois ouvrages signés Krystine, à lire le soir, en début de saison.'
                : 'The three books signed by Krystine — to read at night, at the turn of a season.'}
            </p>
            <Link
              to="/boutique/bibliotheque"
              className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors"
            >
              {lang === 'FR' ? 'Découvrir les livres' : 'Discover the books'} <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoutiquePage;
