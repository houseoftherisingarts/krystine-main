import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useApp, useBoutique } from '../contexts/AppContext';
import { ASSETS } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, libelleEtiquette, type ShopifyProduct } from '../shopify';
import { useProduitsPerso, appliquerPerso, estVisible, trierSelonPerso } from '../firebase/boutiqueProduits';
import { modeApercu } from '../lib/apercuBoutique';
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
  const { redirectEnabled: renvoiActif, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();
  // L'aperçu (?apercu=1 sur /boutique) se garde pour la visite : la collection reste visible.
  const redirectEnabled = renvoiActif && !modeApercu();
  const { perso } = useProduitsPerso();

  const manifest = slug === ALL_PRODUCTS_SLUG ? allProductsManifest(lang) : findCollection(slug);

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen flex items-center justify-center dark:bg-[#16100a] text-[#2a2015] dark:text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-[#7d6330] font-bold">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  if (!manifest) return <Navigate to="/boutique" replace />;

  // Apply Krystine's per-product hide toggles before the collection match.
  // Hidden handles fall out of every collection (and the all-products view)
  // until she flips them back on in Admin → Boutique.
  const visibleProducts = trierSelonPerso(
    products.filter(p => estVisible(p.handle, hiddenProducts, perso)).map(p => appliquerPerso(p, perso.get(p.handle))),
    perso,
  );
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
      type: libelleEtiquette(p.productType, lang) || '',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: p.featuredImage?.url,
    });
  };


  return (
    <div className="min-h-screen dark:bg-[#16100a] pt-20">
      {/* Editorial banner — full-bleed image, centered label/tagline over dark
          gradient. Same rhythm as the /formations featured hero. */}
      <div className="relative w-full h-[55vh] md:h-[60vh] overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" data-edit-key={`boutique.collection.${manifest.slug}.banniere`} style={{ backgroundImage: `url(${manifest.bannerImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16100a] via-[#16100a]/50 to-[#16100a]/20" />
        <div className="relative z-10 text-center text-white px-6 max-w-3xl">
          <Link to="/boutique" className="inline-flex items-center gap-2 text-[#7d6330] uppercase tracking-[0.3em] text-[10px] font-bold mb-6 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left text-[9px]" />
            {lang === 'FR' ? 'Boutique' : 'Shop'}
          </Link>
          <h1 className="text-5xl md:text-7xl font-serif mb-4 leading-[1.05]">{label}</h1>
          <p className="text-base md:text-lg text-white/80 font-serif">{tagline}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
        {/* Manifesto — short story paragraph, quiet editorial voice */}
        <section className="py-16 md:py-20 text-center">
          <p className="font-serif text-xl md:text-2xl leading-relaxed text-[#2a2015]/80 dark:text-white/80 max-w-3xl mx-auto">
            {story}
          </p>
          <div className="w-24 h-1 bg-[#bb9a5e] mx-auto mt-10" />
        </section>

        {/* Trust strip */}
        <div className="mb-14 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-center">
          {[
            { icon: 'fa-lock',  titleFR: 'Paiement sécurisé',       titleEN: 'Secure checkout',     descFR: 'Shopify + SSL',         descEN: 'Shopify + SSL' },
            { icon: 'fa-leaf',  titleFR: 'Formules maison',         titleEN: 'House formulas',  descFR: 'Conçues par Krystine',  descEN: 'Crafted by Krystine' },
            { icon: 'fa-truck', titleFR: 'Livraison Canada',        titleEN: 'Ships across Canada', descFR: 'Expédition rapide',     descEN: 'Fast shipping' },
            { icon: 'fa-heart', titleFR: 'Satisfaction',            titleEN: 'Satisfaction',        descFR: "Près de 40 ans d'expérience",   descEN: 'Nearly 40 years of expertise' },
          ].map(b => (
            <div key={b.icon} className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[#f6f3ee] dark:bg-[#2a2015] border border-[#bb9a5e]/10">
              <i className={`fa-solid ${b.icon} text-[#7d6330] text-lg`} />
              <span className="text-[11px] md:text-xs uppercase tracking-[0.15em] font-bold text-[#2a2015] dark:text-white">
                {lang === 'FR' ? b.titleFR : b.titleEN}
              </span>
              <span className="text-xs md:text-sm text-[#2a2015]/70 dark:text-white/70">
                {lang === 'FR' ? b.descFR : b.descEN}
              </span>
            </div>
          ))}
        </div>

        {/* Loading / error / empty / grid */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent border-[#bb9a5e] rounded-full animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-[#2a2015]/60 dark:text-white/60 font-serif mb-4">
              {lang === 'FR' ? 'La boutique est momentanément indisponible.' : 'The shop is momentarily unavailable.'}
            </p>
            <p className="text-sm text-[#2a2015]/50 dark:text-white/50 font-mono">{error}</p>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-[#2a2015]/60 dark:text-white/60 font-serif mb-6">
              {lang === 'FR'
                ? 'Les pièces de cette collection arrivent bientôt.'
                : 'The pieces of this collection are arriving soon.'}
            </p>
            <Link
              to="/boutique"
              className="inline-flex items-center gap-2 text-[#7d6330] uppercase tracking-[0.3em] text-[11px] font-bold hover:text-[#2a2015] dark:hover:text-white transition-colors"
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
                  <Link
                    to={`/boutique/produit/${product.handle}`}
                    aria-label={product.title}
                    className="text-left block relative aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 mb-5 bg-[#f6f3ee] dark:bg-[#2a2015] cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    {soldOut && (
                      <span className="absolute top-4 left-4 bg-[#2a2015]/80 backdrop-blur text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                        {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                      </span>
                    )}
                  </Link>
                  <Link to={`/boutique/produit/${product.handle}`} className="block text-center px-2">
                    {libelleEtiquette(product.productType, lang) && (
                      <span className="text-[10px] text-[#2a2015]/50 dark:text-white/50 uppercase tracking-[0.25em] font-bold">{libelleEtiquette(product.productType, lang)}</span>
                    )}
                    <h3 className="text-lg font-serif text-[#2a2015] dark:text-white mt-1 mb-1 group-hover:text-[#7d6330] transition-colors">{product.title}</h3>
                    <p className="text-sm text-[#2a2015]/80 dark:text-white/80 font-medium">{price}</p>
                  </Link>
                  {!soldOut ? (
                    <button
                      type="button"
                      onClick={e => handleAdd(product, e)}
                      className="mt-4 w-full bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] py-3 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors shadow-md"
                    >
                      {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 w-full bg-transparent border border-[#2a2015]/20 dark:border-white/20 text-[#2a2015]/50 dark:text-white/50 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest cursor-not-allowed"
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
        <div className="mt-24 pt-16 border-t border-[#2a2015]/10 dark:border-white/10 text-center">
          <span className="text-[#7d6330] uppercase tracking-[0.3em] text-[10px] font-bold block mb-8">
            {lang === 'FR' ? 'Autres collections' : 'Other collections'}
          </span>
          <div className="flex flex-wrap justify-center gap-3">
            {COLLECTIONS.filter(c => c.slug !== manifest.slug).map(c => (
              <Link
                key={c.slug}
                to={`/boutique/${c.slug}`}
                className="text-xs uppercase tracking-[0.25em] font-bold px-5 py-2.5 rounded-full border border-[#2a2015]/15 dark:border-white/15 text-[#2a2015]/70 dark:text-white/70 hover:border-[#bb9a5e] hover:text-[#7d6330] transition-colors"
              >
                {lang === 'FR' ? c.labelFR : c.labelEN}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BoutiqueCollectionPage;
