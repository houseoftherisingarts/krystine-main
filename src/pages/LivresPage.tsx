import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';

// Normalize for fuzzy title matching: strip accents, punctuation, extra whitespace.
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const looksLikeBook = (p: ShopifyProduct): boolean => {
  const bag = [p.productType, ...p.tags].map(norm);
  return bag.some(s => s.includes('livre') || s.includes('book') || s.includes('ayurveda book'));
};

const matchBookToShopify = (bookTitle: string, fullTitle: string | undefined, products: ShopifyProduct[]): ShopifyProduct | undefined => {
  const candidates = [fullTitle, bookTitle].filter(Boolean) as string[];
  for (const c of candidates) {
    const n = norm(c);
    const hit = products.find(p => {
      const pn = norm(p.title);
      return pn === n || pn.includes(n) || n.includes(pn);
    });
    if (hit) return hit;
  }
  return undefined;
};

const LivresPage: React.FC = () => {
  const { lang, addToCart } = useApp();
  const t = CONTENT[lang].media.details.book;
  const [bookOpen, setBookOpen] = useState<number | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  useEffect(() => {
    if (!isShopifyConfigured) return;
    setLoadingShop(true);
    setShopError(null);
    getProducts(50, lang)
      .then(ps => setProducts(ps.filter(looksLikeBook).length > 0 ? ps.filter(looksLikeBook) : ps))
      .catch(e => setShopError(e?.message || 'shop_error'))
      .finally(() => setLoadingShop(false));
  }, [lang]);

  // Pre-match each static book entry once per products/lang update.
  const bookMatches = useMemo(() => {
    const map = new Map<number, ShopifyProduct | undefined>();
    t.items?.forEach((item: any, idx: number) => {
      if (item.status !== 'available') return;
      map.set(idx, matchBookToShopify(item.title, item.fullTitle, products));
    });
    return map;
  }, [products, t.items]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-20">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            {lang === 'FR' ? 'Bibliothèque Inspirata' : 'Inspirata Library'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif text-[#0B1A36] dark:text-white">{t.title}</h1>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-10" />
          {loadingShop && (
            <p className="mt-6 text-xs uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
              <i className="fa-solid fa-circle-notch fa-spin mr-2" />
              {lang === 'FR' ? 'Synchronisation boutique…' : 'Syncing shop…'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {t.items?.map((item: any, idx: number) => {
            const shopify = bookMatches.get(idx);
            const variant = shopify?.variants.find(v => v.availableForSale) || shopify?.variants[0];
            const canOrder = item.status === 'available' && !!variant;
            const displayPrice = variant ? formatMoney(variant.price, lang) : item.price;

            return (
              <div
                key={idx}
                className={`flex flex-col items-center text-center group ${item.status === 'locked' ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                onClick={() => item.status !== 'locked' && setBookOpen(bookOpen === idx ? null : idx)}
              >

                {/* Book */}
                <div className={`w-full aspect-[1/1.3] rounded-r-[16px] rounded-l-[3px] mb-8 overflow-hidden relative shadow-2xl border-l-4 border-[#0B1A36]/10 transition-all duration-500 ${bookOpen === idx ? 'rotate-3 translate-y-[-12px] shadow-[0_30px_60px_rgba(0,0,0,0.3)]' : 'group-hover:-translate-y-4 group-hover:rotate-1'}`}>
                  {item.cover ? (
                    <div className="absolute inset-0" style={{ backgroundImage: `url(${item.cover})`, backgroundSize: '100% 100%' }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1A36] text-white p-6">
                      {item.status === 'locked' ? (
                        <i className="fa-solid fa-lock text-4xl text-white/20 mb-4" />
                      ) : (
                        <i className="fa-solid fa-leaf text-2xl text-[#D4AF37] mb-4 opacity-60" />
                      )}
                      <h4 className="font-serif text-xl uppercase tracking-widest">{item.title}</h4>
                    </div>
                  )}
                  {/* Shine */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>

                <h3 className="text-2xl font-serif text-[#0B1A36] dark:text-white mb-2 group-hover:text-[#D4AF37] transition-colors">{item.title}</h3>
                <p className="text-sm text-[#0B1A36]/60 dark:text-white/60 mb-4">{item.subtitle || item.desc}</p>

                {item.status === 'available' && (
                  <div className="flex flex-col gap-3 w-full">
                    <p className="font-bold text-[#D4AF37] text-lg">{displayPrice}</p>

                    {canOrder && variant ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          addToCart({
                            id: shopify!.id,
                            variantId: variant.id,
                            title: item.fullTitle || item.title,
                            type: 'Livre',
                            price: formatMoney(variant.price, lang),
                            priceAmount: variant.price.amount,
                            priceCurrency: variant.price.currencyCode,
                            image: item.cover || shopify!.featuredImage?.url,
                          });
                        }}
                        className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                      >
                        {lang === 'FR' ? 'Commander' : 'Order'}
                      </button>
                    ) : shopError ? (
                      <button
                        disabled
                        title={shopError}
                        className="w-full bg-[#0B1A36]/30 dark:bg-white/10 text-white/80 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-not-allowed"
                      >
                        {lang === 'FR' ? 'Boutique indisponible' : 'Shop unavailable'}
                      </button>
                    ) : loadingShop ? (
                      <button
                        disabled
                        className="w-full bg-[#0B1A36]/20 dark:bg-white/5 text-[#0B1A36]/50 dark:text-white/50 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-wait"
                      >
                        <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                        {lang === 'FR' ? 'Chargement…' : 'Loading…'}
                      </button>
                    ) : (
                      <button
                        disabled
                        title={lang === 'FR' ? 'Livre non trouvé dans Shopify — ajoutez-le à la boutique Inspirata pour activer la commande.' : 'Book not found in Shopify — add it to the Inspirata shop to enable ordering.'}
                        className="w-full bg-[#0B1A36]/30 dark:bg-white/10 text-white/80 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-not-allowed"
                      >
                        {lang === 'FR' ? 'Bientôt en boutique' : 'Coming to shop'}
                      </button>
                    )}

                    {/* Mini reviews */}
                    {item.reviews && (
                      <p className="text-xs text-[#0B1A36]/40 dark:text-white/40">
                        <i className="fa-solid fa-star text-[#D4AF37] mr-1" /> {item.reviews}
                      </p>
                    )}
                  </div>
                )}

                {/* Expanded view */}
                {bookOpen === idx && item.shortDesc && (
                  <div className="mt-6 p-6 bg-white dark:bg-[#0B1A36]/60 rounded-[20px] text-left shadow-lg border border-[#0B1A36]/5 dark:border-white/5">
                    <p className="text-[#0B1A36]/80 dark:text-white/80 leading-relaxed whitespace-pre-line text-sm">{item.shortDesc}</p>
                    {item.features && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.features.map((f: string, i: number) => (
                          <span key={i} className="text-xs border border-[#0B1A36]/10 dark:border-white/10 px-3 py-1 rounded-full text-[#0B1A36]/60 dark:text-white/60">
                            <i className="fa-solid fa-check text-[#D4AF37] mr-1" />{f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reviews section */}
        {(CONTENT[lang].media.details.book.items as unknown as any[]).find(i => i.detailedReviews)?.detailedReviews && (
          <div className="mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-serif text-[#0B1A36] dark:text-white italic">
                {lang === 'FR' ? 'Ce qu\'elles en disent' : 'What they say'}
              </h2>
              <div className="w-16 h-1 bg-[#D4AF37] mx-auto mt-4 opacity-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(CONTENT[lang].media.details.book.items[0] as any).detailedReviews?.map((r: any, i: number) => (
                <div key={i} className="bg-white dark:bg-[#0B1A36]/60 p-8 rounded-[24px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 relative mt-4">
                  <div className="absolute -top-4 left-8 text-4xl text-[#D4AF37] opacity-30 font-serif">"</div>
                  <div className="flex text-[#D4AF37] mb-4 text-xs gap-1">{Array(r.rating).fill(0).map((_, j) => <i key={j} className="fa-solid fa-star" />)}</div>
                  <p className="text-[#0B1A36]/80 dark:text-white/80 italic font-serif text-lg mb-6 leading-relaxed">"{r.text}"</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">{r.user}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LivresPage;
