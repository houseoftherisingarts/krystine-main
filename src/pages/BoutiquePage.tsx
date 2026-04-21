import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';

const BoutiquePage: React.FC = () => {
  const { lang, addToCart } = useApp();
  const t = CONTENT[lang];

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<ShopifyProduct | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
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
  }, [lang]);

  const handleAdd = (p: ShopifyProduct, e: React.MouseEvent, variantId?: string) => {
    e.preventDefault();
    e.stopPropagation();
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
    setActiveProduct(null);
    setActiveVariantId(null);
    setActiveImage(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050C1A] pt-20">
      {/* Banner */}
      <div className="relative w-full h-[50vh] overflow-hidden flex items-center justify-center mb-16">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }} />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-serif tracking-widest uppercase mb-4">{t.shop.title}</h1>
          <p className="text-xl text-[#D4AF37] font-serif italic tracking-wide">{t.shop.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-24">
        {/* Featured heading */}
        <div className="text-center mb-16">
          <span className="text-[#D4AF37] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{t.featured.subtitle}</span>
          <h2 className="text-4xl md:text-5xl font-serif text-[#0B1A36] dark:text-white italic">{t.featured.title}</h2>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic mb-4">
              {lang === 'FR' ? 'La boutique est momentanément indisponible.' : 'The shop is momentarily unavailable.'}
            </p>
            <p className="text-xs text-[#0B1A36]/30 dark:text-white/30 font-mono">{error}</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map(product => {
              const image = product.featuredImage?.url || ASSETS.productVata;
              const price = formatMoney(product.priceRange.minVariantPrice, lang);
              const soldOut = !product.availableForSale;
              return (
                <div key={product.id} className="group flex flex-col relative">
                  <button
                    type="button"
                    onClick={() => openProduct(product)}
                    className="text-left block relative aspect-[3/4] rounded-[24px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 mb-4 bg-white dark:bg-[#0B1A36] cursor-pointer"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                    {soldOut && (
                      <span className="absolute top-4 left-4 bg-[#0B1A36]/80 backdrop-blur text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                        {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                      </span>
                    )}
                    {!soldOut && (
                      <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <button
                          onClick={e => handleAdd(product, e)}
                          className="bg-white/90 dark:bg-[#0B1A36]/90 backdrop-blur text-[#0B1A36] dark:text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-[#D4AF37] hover:text-white transition-colors w-full max-w-[200px]"
                        >
                          {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
                        </button>
                      </div>
                    )}
                  </button>
                  <div className="text-center px-2 cursor-pointer" onClick={() => openProduct(product)}>
                    {product.productType && (
                      <span className="text-[10px] text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest font-bold">{product.productType}</span>
                    )}
                    <h3 className="text-lg font-serif text-[#0B1A36] dark:text-white mt-1 mb-1 group-hover:text-[#D4AF37] transition-colors">{product.title}</h3>
                    <p className="text-sm text-[#0B1A36]/80 dark:text-white/80 font-medium">{price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-24 text-[#0B1A36]/60 dark:text-white/60 font-serif italic">
            {lang === 'FR' ? 'Aucun produit pour le moment.' : 'No products yet.'}
          </div>
        )}

        {/* Product detail modal */}
        {activeProduct && (() => {
          const p = activeProduct;
          const variant = p.variants.find(v => v.id === activeVariantId) || p.variants[0];
          const gallery = [p.featuredImage, ...p.images].filter(Boolean) as { url: string; altText: string | null }[];
          const unique = Array.from(new Map(gallery.map(g => [g.url, g])).values());
          const displayImage = activeImage || unique[0]?.url || ASSETS.productVata;
          return (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#0B1A36]/50 backdrop-blur-md" onClick={closeProduct}>
              <div
                className="relative bg-white dark:bg-[#0B1A36] w-full max-w-5xl max-h-[90vh] rounded-[30px] shadow-2xl border border-[#D4AF37]/20 overflow-hidden grid grid-cols-1 md:grid-cols-2"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={closeProduct}
                  aria-label="Close"
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 dark:bg-[#050C1A]/80 backdrop-blur flex items-center justify-center text-[#0B1A36] dark:text-white hover:bg-[#D4AF37] hover:text-white transition-colors"
                >
                  <i className="fa-solid fa-times text-lg" />
                </button>

                {/* Gallery */}
                <div className="relative bg-[#F5F5F0] dark:bg-[#050C1A] flex flex-col">
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
                          className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${displayImage === img.url ? 'border-[#D4AF37]' : 'border-transparent hover:border-[#D4AF37]/50'}`}
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
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] font-bold block mb-3">{p.productType}</span>
                  )}
                  <h2 className="text-3xl md:text-4xl font-serif text-[#0B1A36] dark:text-white leading-tight mb-4">{p.title}</h2>
                  <p className="text-2xl font-serif text-[#D4AF37] mb-6">
                    {variant ? formatMoney(variant.price, lang) : formatMoney(p.priceRange.minVariantPrice, lang)}
                  </p>
                  {p.description && (
                    <p className="text-[#0B1A36]/70 dark:text-white/70 leading-relaxed mb-8 whitespace-pre-line">{p.description}</p>
                  )}

                  {/* Variants */}
                  {p.variants.length > 1 && (
                    <div className="mb-8">
                      <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0B1A36]/60 dark:text-white/60 block mb-3">
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
                                  ? 'bg-[#0B1A36] text-white border-[#0B1A36] dark:bg-[#D4AF37] dark:text-[#0B1A36] dark:border-[#D4AF37]'
                                  : 'bg-transparent text-[#0B1A36] dark:text-white border-[#0B1A36]/20 dark:border-white/20 hover:border-[#D4AF37]'
                              } ${!v.availableForSale ? 'line-through opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {v.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add to cart */}
                  <button
                    type="button"
                    disabled={!variant?.availableForSale}
                    onClick={e => {
                      handleAdd(p, e, activeVariantId || undefined);
                      closeProduct();
                    }}
                    className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {variant?.availableForSale
                      ? (lang === 'FR' ? 'Ajouter au panier' : 'Add to cart')
                      : (lang === 'FR' ? 'Épuisé' : 'Sold out')}
                  </button>

                  {p.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#0B1A36]/10 dark:border-white/10 flex flex-wrap gap-2">
                      {p.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40 bg-[#0B1A36]/5 dark:bg-white/5 px-3 py-1 rounded-full">
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

        {/* Dosha oils promo */}
        <div className="mt-24 relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0B1A36] to-[#1A2642] p-12 text-white text-center border border-[#D4AF37]/20">
          <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: `url(${ASSETS.shopBg})` }} />
          <div className="relative z-10">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">{t.featured.hero.subtitle}</span>
            <h2 className="text-4xl md:text-6xl font-serif mb-4">{t.featured.hero.title}</h2>
            <p className="text-xl font-serif italic text-white/70 mb-8">{t.featured.intro.subtitle}</p>
            <a href="/livres" className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors">
              {lang === 'FR' ? 'Découvrir les Livres' : 'Discover Books'} <i className="fa-solid fa-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoutiquePage;
