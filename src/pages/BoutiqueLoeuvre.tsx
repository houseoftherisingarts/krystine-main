import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight, Leaf, Sparkles, Check } from 'lucide-react';
import { useApp, useBoutique } from '../contexts/AppContext';
import {
  getProducts,
  formatMoney,
  isShopifyConfigured,
  type ShopifyProduct,
} from '../shopify';
import NewsletterSignup from '../components/NewsletterSignup';
import { Atmosphere, KenBurns, Parallax } from '../components/motion/loeuvre';

/**
 * La Boutique — page React au style L'Œuvre (espresso / cream / brass).
 * Rebuild éditorial complet : aucun visuel de l'ancienne boutique conservé.
 *
 * Back-end PRÉSERVÉ à l'identique :
 *  · Soupape de redirection — quand Krystine active le switch dans /admin
 *    (useBoutique → redirectEnabled / redirectUrl), tout visiteur est renvoyé
 *    vers la boutique historique inspiratanature.com (window.location.replace).
 *  · Catalogue Shopify — getProducts(50, lang), filtré par hiddenProducts
 *    (handles masqués via /admin), ajout au panier via addToCart avec la même
 *    forme de CartItem que BoutiqueCollectionPage, puis setCartOpen(true).
 *  · NewsletterSignup source="boutique".
 *
 * Skills : premium-web (orchestrateur) + ui-ux-pro-max (tokens/contraste) + impeccable (craft).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1.0, ease, delay }}
  >
    {children}
  </motion.div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
    {children}
  </p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

const BoutiqueLoeuvre: React.FC = () => {
  const { lang, addToCart, setCartOpen } = useApp();
  const { redirectEnabled, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();

  // ── Soupape de redirection (préservée de BoutiquePage) ──
  useEffect(() => {
    if (!redirectLoading && redirectEnabled && redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectLoading, redirectEnabled, redirectUrl]);

  // ── Catalogue Shopify ──
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!isShopifyConfigured) return;
    setLoadingShop(true);
    setShopError(null);
    getProducts(50, lang)
      .then(ps => setProducts(ps))
      .catch(e => setShopError(e?.message || 'shop_error'))
      .finally(() => setLoadingShop(false));
  }, [lang]);

  // Respecter les produits masqués depuis /admin (par handle).
  const visibleProducts = useMemo(
    () => products.filter(p => !hiddenProducts.has(p.handle)),
    [products, hiddenProducts],
  );

  const handleAdd = (p: ShopifyProduct, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const variant = p.variants.find(v => v.availableForSale) || p.variants[0];
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
    setCartOpen(true);
    setAdded(p.id);
    window.setTimeout(() => setAdded(cur => (cur === p.id ? null : cur)), 1600);
  };

  // Pendant le chargement du flag de redirection, afficher un voile sobre
  // plutôt qu'un flash du catalogue avant un éventuel rebond.
  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-espressoDeep">
        <p className="font-sans text-[0.62rem] uppercase tracking-[0.3em] text-brass">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO (dark, éditorial 2-col) ─────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-espressoDeep">
        <Atmosphere light="72% 22%" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              {lang === 'FR' ? 'Inspirata Ayurveda · La boutique' : 'Inspirata Ayurveda · The shop'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.4rem,5.2vw,4.4rem)] max-w-[15ch]">
              {lang === 'FR' ? 'La Boutique.' : 'The Boutique.'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-ctextSoft max-w-[26ch]">
              {lang === 'FR'
                ? <>Des huiles infusées à la main, <span className="text-brassBright not-italic">une formulation signée Krystine.</span></>
                : <>Hand-infused oils, <span className="text-brassBright not-italic">a formulation signed by Krystine.</span></>}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <a
                href="#catalogue"
                className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]"
              >
                {lang === 'FR' ? 'Voir les produits' : 'See the products'} <ArrowRight size={16} />
              </a>
              <span className="inline-flex items-center gap-2 font-serif italic text-ctextSoft/80 text-base">
                <Leaf size={15} className="text-forestSoft" />
                {lang === 'FR' ? 'Plantes locales, pression lente' : 'Local plants, slow pressing'}
              </span>
            </div>
          </motion.div>
          <Parallax speed={0.12} className="relative">
            <motion.div initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease, delay: 0.15 }}>
              <div className="relative rounded-[1.8rem] overflow-hidden border border-brass/25 shadow-[0_30px_80px_rgba(0,0,0,0.5)] aspect-[4/5]">
                <KenBurns
                  src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=900&output=webp"
                  alt="Krystine St-Laurent"
                />
                <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'linear-gradient(120deg, rgba(22,16,10,0.4) 0%, transparent 50%)' }} />
              </div>
            </motion.div>
          </Parallax>
        </div>
      </section>

      {/* ─────────── CATALOGUE (light) · id="catalogue" ─────────── */}
      <section id="catalogue" className="relative scroll-mt-28 bg-cream py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="max-w-[640px]">
            <Eyebrow>{lang === 'FR' ? 'Le catalogue Inspirata' : 'The Inspirata catalogue'}</Eyebrow>
            <SectionTitle className="mt-4">
              {lang === 'FR' ? 'Les essentiels de la maison' : 'The essentials of the house'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[46ch]">
              {lang === 'FR'
                ? 'Huiles corporelles, rituels et soins composés autour d’un dosha ou d’un moment de vie.'
                : 'Body oils, rituals and care composed around a dosha or a moment in life.'}
            </p>
            <div className="mt-5 h-px w-16 bg-brass" />
            {loadingShop && (
              <p className="mt-6 text-[0.7rem] uppercase tracking-[0.2em] text-inkSoft/50">
                {lang === 'FR' ? 'Synchronisation boutique…' : 'Syncing shop…'}
              </p>
            )}
          </Reveal>

          {/* Boutique indisponible — message sobre, jamais d'écran cassé */}
          {!isShopifyConfigured || shopError ? (
            <Reveal className="mt-16">
              <div className="rounded-[2rem] border border-cream3 bg-card p-10 md:p-14 text-center shadow-sm">
                <ShoppingBag size={30} className="text-brassInk mx-auto mb-5" />
                <p className="font-serif text-2xl text-ink">
                  {lang === 'FR' ? 'La boutique revient bientôt' : 'The shop is back soon'}
                </p>
                <p className="mt-3 font-sans text-[0.95rem] text-inkSoft max-w-[44ch] mx-auto leading-relaxed">
                  {lang === 'FR'
                    ? 'Le catalogue est momentanément indisponible. En attendant, retrouvez tous les produits sur la boutique Inspirata.'
                    : 'The catalogue is momentarily unavailable. In the meantime, find every product on the Inspirata shop.'}
                </p>
                <a
                  href="https://www.inspiratanature.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-3 rounded-full bg-espresso px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-ctext transition-colors hover:bg-espressoDeep min-h-[44px]"
                >
                  {lang === 'FR' ? 'Visiter inspiratanature.com' : 'Visit inspiratanature.com'} <ArrowRight size={16} />
                </a>
              </div>
            </Reveal>
          ) : (
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 items-start">
              {visibleProducts.map((p, idx) => {
                const variant = p.variants.find(v => v.availableForSale) || p.variants[0];
                const soldOut = !p.availableForSale;
                const price = variant
                  ? formatMoney(variant.price, lang)
                  : formatMoney(p.priceRange.minVariantPrice, lang);
                const image = p.featuredImage?.url || p.images[0]?.url;
                const isAdded = added === p.id;
                return (
                  <Reveal key={p.id} delay={(idx % 3) * 0.08}>
                    <article className="group flex flex-col h-full rounded-[1.4rem] border border-brass/25 bg-card overflow-hidden shadow-sm transition-shadow duration-500 hover:shadow-[0_22px_55px_rgba(125,99,48,0.16)]">
                      {/* Visuel, cadre brass */}
                      <div className="relative aspect-[4/5] overflow-hidden bg-cream2">
                        {image ? (
                          <img
                            src={image}
                            alt={p.featuredImage?.altText || p.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-brass/40">
                            <ShoppingBag size={34} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-espressoDeep/12 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        {soldOut && (
                          <span className="absolute top-3 left-3 rounded-full bg-espressoDeep/85 text-ctext px-3 py-1 text-[0.56rem] uppercase tracking-[0.2em] font-bold backdrop-blur-sm">
                            {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                          </span>
                        )}
                      </div>

                      {/* Méta */}
                      <div className="flex flex-col flex-1 p-6">
                        {p.productType && (
                          <p className="font-sans text-[0.58rem] uppercase tracking-[0.22em] text-brassInk">{p.productType}</p>
                        )}
                        <h3 className="mt-2 font-serif text-[1.35rem] leading-snug text-ink">{p.title}</h3>
                        <div className="mt-auto pt-6 flex items-center justify-between gap-4">
                          <span className="font-serif text-xl text-brassInk tabular-nums">{price}</span>
                          {soldOut || !variant ? (
                            <button
                              disabled
                              className="rounded-full bg-cream3 px-5 py-2.5 font-sans text-[0.64rem] uppercase tracking-[0.16em] text-inkSoft/60 cursor-not-allowed min-h-[44px]"
                            >
                              {lang === 'FR' ? 'Indisponible' : 'Unavailable'}
                            </button>
                          ) : (
                            <button
                              onClick={e => handleAdd(p, e)}
                              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-sans text-[0.64rem] uppercase tracking-[0.16em] transition-colors min-h-[44px] ${
                                isAdded
                                  ? 'bg-forest text-cream'
                                  : 'bg-brass text-espressoDeep hover:bg-brassBright'
                              }`}
                              aria-label={`${lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'} : ${p.title}`}
                            >
                              {isAdded ? (
                                <><Check size={14} /> {lang === 'FR' ? 'Ajouté' : 'Added'}</>
                              ) : (
                                <><ShoppingBag size={14} /> {lang === 'FR' ? 'Ajouter' : 'Add'}</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}

              {/* Catalogue vide après filtrage (tout masqué / aucune donnée) */}
              {!loadingShop && visibleProducts.length === 0 && (
                <div className="col-span-full rounded-[2rem] border border-cream3 bg-card p-10 text-center shadow-sm">
                  <p className="font-serif text-xl text-ink">
                    {lang === 'FR' ? 'Aucun produit pour le moment.' : 'No products at the moment.'}
                  </p>
                  <a
                    href="https://www.inspiratanature.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 font-sans text-[0.66rem] uppercase tracking-[0.18em] text-brassInk hover:text-brassBright"
                  >
                    {lang === 'FR' ? 'Voir inspiratanature.com' : 'See inspiratanature.com'} <ArrowRight size={14} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── PROMESSE (light cream2) ─────────── */}
      <section className="bg-cream2 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1180px] px-6 md:px-12">
          <Reveal className="text-center mb-16 max-w-[640px] mx-auto">
            <Eyebrow>{lang === 'FR' ? 'La signature Inspirata' : 'The Inspirata signature'}</Eyebrow>
            <SectionTitle className="mt-4">
              {lang === 'FR' ? 'Ce qui entre dans chaque flacon' : 'What goes into each bottle'}
            </SectionTitle>
            <div className="mt-5 h-px w-24 bg-brass mx-auto" />
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Leaf,
                titleFR: 'Plantes locales', titleEN: 'Local plants',
                bodyFR: 'Des végétaux choisis près d’ici, infusés à la main, sans précipitation.',
                bodyEN: 'Botanicals chosen close to home, hand-infused, without haste.',
              },
              {
                icon: Sparkles,
                titleFR: 'Composées par dosha', titleEN: 'Composed by dosha',
                bodyFR: 'Chaque formule s’accorde à un dosha ou à un moment de vie.',
                bodyEN: 'Each formula attunes to a dosha or a moment in life.',
              },
              {
                icon: ShoppingBag,
                titleFR: 'Signées Krystine', titleEN: 'Signed by Krystine',
                bodyFR: 'Une formulation tenue à la main, pensée pour se rappliquer à soi.',
                bodyEN: 'A hand-held formulation, made to return to oneself.',
              },
            ].map((c, i) => (
              <Reveal key={c.titleEN} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-3xl bg-card border-l-[3px] border-l-brass border-y border-r border-cream3 p-8 md:p-9 transition-shadow hover:shadow-xl">
                  <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brass/12 text-brassInk mb-5">
                    <c.icon size={20} />
                  </span>
                  <h3 className="font-serif text-xl md:text-2xl text-ink">{lang === 'FR' ? c.titleFR : c.titleEN}</h3>
                  <p className="mt-3 font-sans text-[0.95rem] leading-[1.8] text-inkSoft">{lang === 'FR' ? c.bodyFR : c.bodyEN}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── NEWSLETTER (dark) ─────────── */}
      <section className="relative bg-espressoDeep py-24 md:py-32 overflow-hidden">
        <Atmosphere strength={0.8} light="50% 8%" />
        <div className="relative z-10 mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <Sparkles size={26} className="text-brass mx-auto mb-6" />
            <Eyebrow on="dark">{lang === 'FR' ? 'Rester connectés' : 'Stay connected'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR'
                ? <>Les nouveautés,<br /><span className="italic font-normal text-brassBright">au fil des saisons.</span></>
                : <>The new arrivals,<br /><span className="italic font-normal text-brassBright">season after season.</span></>}
            </SectionTitle>
            <p className="mt-6 font-sans text-[1rem] leading-relaxed text-ctextSoft max-w-[48ch] mx-auto">
              {lang === 'FR'
                ? 'Recevez chaque nouvelle formule et chaque retour en stock directement par courriel.'
                : 'Get each new formula and restock straight to your inbox.'}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup
              source="boutique"
              variant="dark"
              className="max-w-[460px] mx-auto"
            />
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default BoutiqueLoeuvre;
