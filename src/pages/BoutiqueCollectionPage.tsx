import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApp, useBoutique } from '../contexts/AppContext';
import { ASSETS } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import {
  ALL_PRODUCTS_SLUG, COLLECTIONS, findCollection,
  type CollectionManifest,
} from '../lib/collections';

// Synthetic manifest used when the route is /boutique/tous — not a real
// collection, but reuses the same editorial layout so the safety-valve page
// doesn't feel like a different screen.
const allProductsManifest = (lang: 'FR' | 'EN'): CollectionManifest => ({
  id: ALL_PRODUCTS_SLUG,
  slug: ALL_PRODUCTS_SLUG,
  labelFR: 'Tous les produits',
  labelEN: 'All products',
  taglineFR: 'La boutique dans son ensemble',
  taglineEN: 'The full boutique',
  storyFR: "Chaque formule, chaque objet — tout ce qui compose aujourd'hui la maison Inspirata, réuni en un seul lieu.",
  storyEN: "Every formula, every object — all that makes up Maison Inspirata today, gathered in one place.",
  bannerImage: ASSETS.shopBg,
  match: () => true,
});

const BoutiqueCollectionPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang, addToCart } = useApp();
  const { redirectEnabled, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();

  const manifest = slug === ALL_PRODUCTS_SLUG ? allProductsManifest(lang) : findCollection(slug);

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<ShopifyProduct | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Same emergency redirect as /boutique — any collection page also bounces
  // to inspiratanature.com when Krystine has the switch enabled.
  useEffect(() => {
    if (!redirectLoading && redirectEnabled && redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectLoading, redirectEnabled, redirectUrl]);

  useEffect(() => {
    if (redirectEnabled) return;
    if (!isShopifyConfigured) {
      setLoading(false);
      setError(lang === 'FR' ? 'Boutique non configurée.' : 'Shop not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    getProducts(50, lang)
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lang, redirectEnabled]);

  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-[#2E1A14] text-[#3A251E] dark:text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#B8532F] font-bold">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  if (!manifest) return <Navigate to="/boutique" replace />;

  // Apply Krystine's per-product hide toggles before the collection match.
  // Hidden handles fall out of every collection (and the all-products view)
  // until she flips them back on in Admin → Boutique.
  const visibleProducts = products.filter(p => !hiddenProducts.has(p.handle));
  const filtered = visibleProducts.filter(manifest.match);

  const label = lang === 'FR' ? manifest.labelFR : manifest.labelEN;
  const tagline = lang === 'FR' ? manifest.taglineFR : manifest.taglineEN;
  const story = lang === 'FR' ? manifest.storyFR : manifest.storyEN;

  const handleAdd = (p: ShopifyProduct, e: React.MouseEvent, variantId?: string) => {
    e.preventDefault(); e.stopPropagation();
    const variant = p.variants.find(v => v.id === variantId)
      || p.variants.find(v => v.availableForSale)
      || p.variants[0];
    if (!variant) return;
    addToCart({
      id: p.id,
      variantId: variant.id,
      title: p.title,
      type: p.productType,
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: p.featuredImage?.url,
    });
  };

  const openProduct = (p: ShopifyProduct) => {
    setActiveProduct(p);
    const firstAvailable = p.variants.find(v => v.availableForSale) || p.variants[0];
    setActiveVariantId(firstAvailable?.id || null);
    setActiveImage(p.featuredImage?.url || p.images[0]?.url || null);
  };
  const closeProduct = () => {
    setActiveProduct(null); setActiveVariantId(null); setActiveImage(null);
  };

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] pt-20">
      {/* Editorial banner — full-bleed image, centered label/tagline over dark
          gradient. Same rhythm as the /formations featured hero. */}
      <div className="relative w-full h-[55vh] md:h-[60vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${manifest.bannerImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2E1A14] via-[#2E1A14]/50 to-[#2E1A14]/20" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <Link to="/boutique" className="inline-flex items-center gap-2 text-[#B8532F] uppercase tracking-[0.3em] text-[10px] font-bold mb-6 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left text-[9px]" />
            {lang === 'FR' ? 'Boutique' : 'Shop'}
          </Link>
          <h1 className="text-5xl md:text-7xl font-serif mb-4 leading-[1.05]">{label}</h1>
          <p className="text-base md:text-lg text-white/80 font-serif italic">{tagline}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        {/* Manifesto — short story paragraph, quiet editorial voice */}
        <section className="py-16 md:py-20 text-center">
          <p className="font-serif italic text-xl md:text-2xl leading-relaxed text-[#3A251E]/80 dark:text-white/80 max-w-3xl mx-auto">
            {story}
          </p>
          <div className="w-24 h-1 bg-[#B8532F] mx-auto mt-10" />
        </section>

        {/* Trust strip */}
        <div className="mb-14 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
          {[
            { icon: 'fa-lock',  titleFR: 'Paiement sécurisé',       titleEN: 'Secure checkout',     descFR: 'Shopify + SSL',         descEN: 'Shopify + SSL' },
            { icon: 'fa-leaf',  titleFR: 'Formules ayurvédiques',   titleEN: 'Ayurvedic formulas',  descFR: 'Conçues par Krystine',  descEN: 'Crafted by Krystine' },
            { icon: 'fa-truck', titleFR: 'Livraison Canada',        titleEN: 'Ships across Canada', descFR: 'Expédition rapide',     descEN: 'Fast shipping' },
            { icon: 'fa-heart', titleFR: 'Satisfaction',            titleEN: 'Satisfaction',        descFR: "37 ans d'expérience",   descEN: '37 years of expertise' },
          ].map(b => (
            <div key={b.icon} className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[#F4E7DD] dark:bg-[#3A251E] border border-[#B8532F]/10">
              <i className={`fa-solid ${b.icon} text-[#B8532F] text-lg`} />
              <span className="text-[11px] md:text-xs uppercase tracking-[0.15em] font-bold text-[#3A251E] dark:text-white">
                {lang === 'FR' ? b.titleFR : b.titleEN}
              </span>
              <span className="text-xs md:text-sm text-[#3A251E]/70 dark:text-white/70">
                {lang === 'FR' ? b.descFR : b.descEN}
              </span>
            </div>
          ))}
        </div>

        {/* Loading / error / empty / grid */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent border-[#B8532F] rounded-full animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-[#3A251E]/60 dark:text-white/60 font-serif italic mb-4">
              {lang === 'FR' ? 'La boutique est momentanément indisponible.' : 'The shop is momentarily unavailable.'}
            </p>
            <p className="text-sm text-[#3A251E]/50 dark:text-white/50 font-mono">{error}</p>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-[#3A251E]/60 dark:text-white/60 font-serif italic mb-6">
              {lang === 'FR'
                ? 'Les pièces de cette collection arrivent bientôt.'
                : 'The pieces of this collection are arriving soon.'}
            </p>
            <Link
              to="/boutique"
              className="inline-flex items-center gap-2 text-[#B8532F] uppercase tracking-[0.3em] text-[11px] font-bold hover:text-[#3A251E] dark:hover:text-white transition-colors"
            >
              {lang === 'FR' ? "Revenir à la boutique" : 'Back to the shop'}
              <i className="fa-solid fa-arrow-right text-[9px]" />
            </Link>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {filtered.map(product => {
              const image = product.featuredImage?.url || ASSETS.productVata;
              const price = formatMoney(product.priceRange.minVariantPrice, lang);
              const soldOut = !product.availableForSale;
              return (
                <div key={product.id} className="group flex flex-col relative">
                  <button
                    type="button"
                    onClick={() => openProduct(product)}
                    className="text-left block relative aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 mb-5 bg-[#F4E7DD] dark:bg-[#3A251E] cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    {soldOut && (
                      <span className="absolute top-4 left-4 bg-[#3A251E]/80 backdrop-blur text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                        {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                      </span>
                    )}
                  </button>
                  <div className="text-center px-2 cursor-pointer" onClick={() => openProduct(product)}>
                    {product.productType && (
                      <span className="text-[10px] text-[#3A251E]/50 dark:text-white/50 uppercase tracking-[0.25em] font-bold">{product.productType}</span>
                    )}
                    <h3 className="text-lg font-serif text-[#3A251E] dark:text-white mt-1 mb-1 group-hover:text-[#B8532F] transition-colors">{product.title}</h3>
                    <p className="text-sm text-[#3A251E]/80 dark:text-white/80 font-medium">{price}</p>
                  </div>
                  {!soldOut ? (
                    <button
                      type="button"
                      onClick={e => handleAdd(product, e)}
                      className="mt-4 w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] py-3 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-md"
                    >
                      {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 w-full bg-transparent border border-[#3A251E]/20 dark:border-white/20 text-[#3A251E]/50 dark:text-white/50 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest cursor-not-allowed"
                    >
                      {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer — navigate to another collection */}
        <div className="mt-24 pt-16 border-t border-[#3A251E]/10 dark:border-white/10 text-center">
          <span className="text-[#B8532F] uppercase tracking-[0.3em] text-[10px] font-bold block mb-8">
            {lang === 'FR' ? 'Autres collections' : 'Other collections'}
          </span>
          <div className="flex flex-wrap justify-center gap-3">
            {COLLECTIONS.filter(c => c.slug !== manifest.slug).map(c => (
              <Link
                key={c.slug}
                to={`/boutique/${c.slug}`}
                className="text-xs uppercase tracking-[0.25em] font-bold px-5 py-2.5 rounded-full border border-[#3A251E]/15 dark:border-white/15 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F] transition-colors"
              >
                {lang === 'FR' ? c.labelFR : c.labelEN}
              </Link>
            ))}
          </div>
        </div>

        {/* Product detail modal — kept in sync with the original /boutique modal;
            any future enhancement (ritual panel, notes chips) lands here. */}
        {activeProduct && (() => {
          const p = activeProduct;
          const variant = p.variants.find(v => v.id === activeVariantId) || p.variants[0];
          const gallery = [p.featuredImage, ...p.images].filter(Boolean) as { url: string; altText: string | null }[];
          const unique = Array.from(new Map(gallery.map(g => [g.url, g])).values());
          const displayImage = activeImage || unique[0]?.url || ASSETS.productVata;
          return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#3A251E]/50 backdrop-blur-md" onClick={closeProduct}>
              <div
                className="relative bg-white dark:bg-[#3A251E] w-full max-w-5xl max-h-[90vh] rounded-[30px] shadow-2xl border border-[#B8532F]/20 overflow-hidden grid grid-cols-1 md:grid-cols-2"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={closeProduct}
                  aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 dark:bg-[#2E1A14]/80 backdrop-blur flex items-center justify-center text-[#3A251E] dark:text-white hover:bg-[#B8532F] hover:text-white transition-colors"
                >
                  <i className="fa-solid fa-times text-lg" />
                </button>

                {/* Gallery */}
                <div className="relative bg-[#F4E7DD] dark:bg-[#2E1A14] flex flex-col">
                  <div className="relative aspect-square md:aspect-auto md:flex-1 min-h-[320px]">
                    <div className="absolute inset-0 bg-contain bg-no-repeat bg-center" style={{ backgroundImage: `url(${displayImage})` }} />
                  </div>
                  {unique.length > 1 && (
                    <div className="p-4 flex gap-2 overflow-x-auto">
                      {unique.map(img => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => setActiveImage(img.url)}
                          className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${displayImage === img.url ? 'border-[#B8532F]' : 'border-transparent hover:border-[#B8532F]/50'}`}
                        >
                          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${img.url})` }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-8 md:p-10 overflow-y-auto max-h-[90vh]">
                  {p.productType && (
                    <span className="text-[10px] text-[#B8532F] uppercase tracking-[0.3em] font-bold block mb-3">{p.productType}</span>
                  )}
                  <h2 className="text-3xl md:text-4xl font-serif text-[#3A251E] dark:text-white leading-tight mb-4">{p.title}</h2>
                  <p className="text-2xl font-serif text-[#B8532F] mb-6">
                    {variant ? formatMoney(variant.price, lang) : formatMoney(p.priceRange.minVariantPrice, lang)}
                  </p>

                  <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#3A251E]/75 dark:text-white/75">
                    <span className="inline-flex items-center gap-1.5">
                      <i className="fa-solid fa-seedling text-[#B8532F]" />
                      {lang === 'FR' ? 'Formule Krystine' : 'Krystine formula'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <i className="fa-solid fa-award text-[#B8532F]" />
                      {lang === 'FR' ? "37 ans d'expertise" : '37 years of expertise'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <i className="fa-solid fa-truck-fast text-[#B8532F]" />
                      {lang === 'FR' ? 'Expédition Canada' : 'Ships from Canada'}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-[#3A251E]/70 dark:text-white/70 leading-relaxed mb-8 whitespace-pre-line">{p.description}</p>
                  )}

                  {p.variants.length > 1 && (
                    <div className="mb-8">
                      <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#3A251E]/60 dark:text-white/60 block mb-3">
                        {lang === 'FR' ? 'Option' : 'Option'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {p.variants.map(v => {
                          const selected = v.id === activeVariantId;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={!v.availableForSale}
                              onClick={() => setActiveVariantId(v.id)}
                              className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-semibold border transition-colors ${
                                selected
                                  ? 'bg-[#3A251E] text-white border-[#3A251E] dark:bg-[#B8532F] dark:text-[#3A251E] dark:border-[#B8532F]'
                                  : 'bg-transparent text-[#3A251E] dark:text-white border-[#3A251E]/20 dark:border-white/20 hover:border-[#B8532F]'
                              } ${!v.availableForSale ? 'line-through opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {v.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!variant?.availableForSale}
                    onClick={e => {
                      handleAdd(p, e, activeVariantId || undefined);
                      closeProduct();
                    }}
                    className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {variant?.availableForSale
                      ? (lang === 'FR' ? 'Ajouter au panier' : 'Add to cart')
                      : (lang === 'FR' ? 'Épuisé' : 'Sold out')}
                  </button>

                  {p.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#3A251E]/10 dark:border-white/10 flex flex-wrap gap-2">
                      {p.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest text-[#3A251E]/40 dark:text-white/40 bg-[#3A251E]/5 dark:bg-white/5 px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default BoutiqueCollectionPage;
