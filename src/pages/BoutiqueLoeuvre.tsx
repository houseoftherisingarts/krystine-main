import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ShoppingBag, Leaf, Sparkle, Check, ArrowRight, ArrowDown, Drop, Plant,
} from '@phosphor-icons/react';
import { useApp, useBoutique } from '../contexts/AppContext';
import {
  getProducts,
  formatMoney,
  isShopifyConfigured,
  type ShopifyProduct,
} from '../shopify';
import NewsletterSignup from '../components/NewsletterSignup';
import { Atmosphere } from '../components/motion/loeuvre';

/**
 * La Boutique · V2 « magazine crème » (spec canonique krystine-v2-branding).
 * Couverture éditoriale sur crème, produit vedette pleine largeur, grille de
 * cartes claires avec cascade indexée, moment sombre unique (citation) borné
 * par des filets nets, infolettre en clôture.
 *
 * Back-end PRÉSERVÉ à l'identique :
 *  · Soupape de redirection : useBoutique (redirectEnabled / redirectUrl),
 *    window.location.replace vers la boutique historique quand activée.
 *  · Catalogue Shopify : getProducts(50, lang), filtré par hiddenProducts
 *    (handles masqués via /admin), ajout au panier via addToCart (même forme
 *    de CartItem que BoutiqueCollectionPage), puis setCartOpen(true).
 *  · NewsletterSignup source="boutique".
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.8 };

/* ════════════════════════ Primitives V2 ════════════════════════ */

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.95, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] ${className}`}>{children}</p>
);

/* Filet laiton qui se trace au scroll (origine gauche, ou centre). */
const DrawRule: React.FC<{ className?: string; center?: boolean; delay?: number }> = ({
  className = '', center = false, delay = 0.15,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`h-px bg-[#9c7a44] ${className}`}
      style={{ transformOrigin: center ? 'center' : 'left center' }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 1.2, ease: EASE, delay }}
    />
  );
};

/* Parallax doux (±5 %) pour la photo hero encadrée. */
const PortraitParallax: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '5%']);
  return (
    <div ref={ref} className={`overflow-hidden ${className || ''}`}>
      <motion.div className="h-[112%] -mt-[6%] will-change-transform" style={reduce ? undefined : { y }}>
        {children}
      </motion.div>
    </div>
  );
};

/* ════════════════════════ Carte produit ════════════════════════ */

const cardVariants = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
  hover: reduce ? {} : { y: -8, transition: SPRING },
});

const AddButton: React.FC<{
  p: ShopifyProduct;
  soldOut: boolean;
  hasVariant: boolean;
  isAdded: boolean;
  lang: string;
  onAdd: (p: ShopifyProduct, e: React.MouseEvent) => void;
}> = ({ p, soldOut, hasVariant, isAdded, lang, onAdd }) => {
  if (soldOut || !hasVariant) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 border border-[#1c1712]/20 px-5 py-3 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/40 cursor-not-allowed min-h-[44px]"
      >
        {lang === 'FR' ? 'Indisponible' : 'Unavailable'}
      </button>
    );
  }
  return (
    <button
      onClick={e => onAdd(p, e)}
      aria-label={`${lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'} : ${p.title}`}
      className={`inline-flex items-center gap-2.5 px-5 py-3 text-[0.66rem] uppercase tracking-[0.18em] transition-colors duration-300 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7a44] ${
        isAdded
          ? 'bg-[#55602f] border border-[#55602f] text-[#f4efe6]'
          : 'border border-[#1c1712] text-[#1c1712] hover:bg-[#1c1712] hover:text-[#f4efe6]'
      }`}
    >
      {isAdded ? (
        <><Check size={14} weight="regular" /> {lang === 'FR' ? 'Ajouté' : 'Added'}</>
      ) : (
        <><ShoppingBag size={14} weight="light" /> {lang === 'FR' ? 'Ajouter' : 'Add'}</>
      )}
    </button>
  );
};

const SoldOutTab: React.FC<{ lang: string }> = ({ lang }) => (
  <span className="absolute top-0 left-0 z-[2] bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.24em]">
    {lang === 'FR' ? 'Épuisé' : 'Sold out'}
  </span>
);

const ProductCard: React.FC<{
  p: ShopifyProduct;
  index: number;
  lang: string;
  added: string | null;
  onAdd: (p: ShopifyProduct, e: React.MouseEvent) => void;
}> = ({ p, index, lang, added, onAdd }) => {
  const reduce = useReducedMotion() ?? false;
  const variant = p.variants.find(v => v.availableForSale) || p.variants[0];
  const soldOut = !p.availableForSale;
  const price = variant
    ? formatMoney(variant.price, lang)
    : formatMoney(p.priceRange.minVariantPrice, lang);
  const image = p.featuredImage?.url || p.images[0]?.url;
  const isAdded = added === p.id;

  return (
    <motion.article
      variants={cardVariants(reduce)}
      initial="rest"
      whileHover="hover"
      className="group relative flex h-full flex-col bg-[#faf6ee] border border-[#9c7a44]/25 will-change-transform"
    >
      {/* Visuel + médaillon prix */}
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#efe6d7]">
          {image ? (
            <img
              src={image}
              alt={p.featuredImage?.altText || p.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[#9c7a44]/40">
              <ShoppingBag size={36} weight="light" />
            </div>
          )}
          {soldOut && <SoldOutTab lang={lang} />}
        </div>
        <motion.span
          variants={{ rest: { scale: 1, rotate: 0 }, hover: reduce ? {} : { scale: 1.09, rotate: -4 } }}
          transition={SPRING}
          className="absolute -bottom-6 right-5 z-[2] grid place-items-center w-[4.25rem] h-[4.25rem] rounded-full bg-[#9c7a44] text-[#faf6ee] v2-serif text-[0.95rem] leading-none shadow-[0_10px_26px_rgba(60,45,20,0.28)] will-change-transform"
        >
          {price}
        </motion.span>
      </div>

      {/* Méta */}
      <div className="flex flex-col flex-1 p-6 pt-8">
        <span className="text-[0.58rem] uppercase tracking-[0.26em] text-[#7d6330]">
          {String(index).padStart(2, '0')}{p.productType ? ` · ${p.productType}` : ''}
        </span>
        <h3 className="mt-3 v2-serif font-light leading-[1.12] text-[1.5rem] text-[#1c1712]">{p.title}</h3>
        <span className="mt-5 block h-px w-10 bg-[#9c7a44]" aria-hidden />
        <div className="mt-auto pt-7">
          <AddButton p={p} soldOut={soldOut} hasVariant={!!variant} isAdded={isAdded} lang={lang} onAdd={onAdd} />
        </div>
      </div>
    </motion.article>
  );
};

/* ── Produit vedette · pleine largeur éditoriale ── */
const FeaturedProduct: React.FC<{
  p: ShopifyProduct;
  lang: string;
  added: string | null;
  onAdd: (p: ShopifyProduct, e: React.MouseEvent) => void;
}> = ({ p, lang, added, onAdd }) => {
  const variant = p.variants.find(v => v.availableForSale) || p.variants[0];
  const soldOut = !p.availableForSale;
  const price = variant
    ? formatMoney(variant.price, lang)
    : formatMoney(p.priceRange.minVariantPrice, lang);
  const image = p.featuredImage?.url || p.images[0]?.url;
  const isAdded = added === p.id;

  return (
    <div className="grid lg:grid-cols-[0.9fr_1.1fr] bg-[#faf6ee] border border-[#9c7a44]/25">
      <div className="relative overflow-hidden aspect-[4/3] lg:aspect-auto lg:min-h-[440px] bg-[#efe6d7]">
        {image ? (
          <img
            src={image}
            alt={p.featuredImage?.altText || p.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[#9c7a44]/40">
            <ShoppingBag size={44} weight="light" />
          </div>
        )}
        {soldOut && <SoldOutTab lang={lang} />}
      </div>
      <div className="flex flex-col justify-center p-[clamp(1.75rem,4vw,3.5rem)]">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-grid place-items-center w-11 h-11 rounded-full bg-[#9c7a44] text-[#faf6ee]">
            <Sparkle size={20} weight="light" />
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330]">
            {lang === 'FR' ? 'En vedette' : 'Featured'}{p.productType ? ` · ${p.productType}` : ''}
          </span>
        </div>
        <h3 className="v2-serif font-light leading-[1.04] text-[#1c1712] text-[clamp(2rem,3.6vw,3.2rem)]">{p.title}</h3>
        {p.description && (
          <p className="mt-6 text-[1rem] leading-[1.8] text-[#3a2f23] max-w-[56ch] line-clamp-4">{p.description}</p>
        )}
        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <span className="v2-serif font-light text-[clamp(1.5rem,2.4vw,2rem)] text-[#7d6330] tabular-nums">{price}</span>
          <AddButton p={p} soldOut={soldOut} hasVariant={!!variant} isAdded={isAdded} lang={lang} onAdd={onAdd} />
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const BoutiqueLoeuvre: React.FC = () => {
  const { lang, addToCart, setCartOpen } = useApp();
  const { redirectEnabled, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();
  const reduce = useReducedMotion();

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

  const featured = visibleProducts[0];
  const rest = visibleProducts.slice(1);

  // Grand mot Fraunces fantôme qui glisse derrière la grille au scroll.
  const catalogueRef = useRef<HTMLElement>(null);
  const { scrollYProgress: catProgress } = useScroll({
    target: catalogueRef,
    offset: ['start end', 'end start'],
  });
  const ghostX = useTransform(catProgress, [0, 1], ['4%', '-10%']);

  // Pendant le chargement du flag de redirection, afficher un voile sobre
  // plutôt qu'un flash du catalogue avant un éventuel rebond.
  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe6]">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Inter:wght@300;400;500&display=swap');
        .v2-serif { font-family: "Fraunces", Georgia, serif; }
        .v2-grain {
          position: fixed; inset: 0; z-index: 60; pointer-events: none;
          opacity: 0.045; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        @keyframes v2cue { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(8px); opacity:1 } }
        .v2-cue { animation: v2cue 2.4s cubic-bezier(0.22,1,0.36,1) infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* ─────────── HERO · couverture ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] min-h-screen flex flex-col">
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span>N&deg; 04 &middot; {lang === 'FR' ? 'La Boutique' : 'The Boutique'}</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </motion.div>

        <div className="flex-1 grid items-stretch gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] mt-[clamp(2rem,5vh,4rem)]">
          {/* MASTHEAD */}
          <div className="order-1 lg:row-start-1 lg:col-start-1 self-start">
            <motion.p
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7"
            >
              {lang === 'FR' ? 'Inspirata Ayurveda · Huiles infusées' : 'Inspirata Ayurveda · Infused oils'}
            </motion.p>
            <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.2rem,10vw,9rem)]">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reduce ? { y: 0 } : { y: '115%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
                >
                  {lang === 'FR' ? 'La Boutique.' : 'The Boutique.'}
                </motion.span>
              </span>
            </h1>
          </div>

          {/* PHOTO · portrait encadré filet laiton (ratio 5/6, parallax doux) */}
          <div className="order-2 lg:row-start-1 lg:row-span-2 lg:col-start-2 self-stretch relative flex">
            <motion.div
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
              className="relative w-full self-center"
            >
              <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
              <PortraitParallax className="relative w-full aspect-[5/6]">
                <img
                  src="https://wsrv.nl/?url=storage.googleapis.com/origine1/krystine%20red%20NG.webp&w=900&output=webp"
                  alt="Krystine St-Laurent"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-center"
                />
              </PortraitParallax>
              <div
                className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(28,23,18,0.5), transparent)' }}
                aria-hidden
              />
              <p className="absolute bottom-4 left-4 right-4 v2-serif italic text-[#f4efe6] text-sm tracking-wide">
                {lang === 'FR'
                  ? '« Des huiles infusées à la main, une formulation signée Krystine. »'
                  : '« Hand-infused oils, a formulation signed by Krystine. »'}
              </p>
              <span className="absolute -top-2 -left-2 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
                {lang === 'FR' ? 'Fait main' : 'Handmade'}
              </span>
            </motion.div>
          </div>

          {/* BAS-GAUCHE · cover-lines + tagline + CTA */}
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.5 }}
            className="order-3 lg:row-start-2 lg:col-start-1 self-end"
          >
            <ul className="flex flex-wrap gap-x-7 gap-y-2 mb-7">
              {(lang === 'FR'
                ? ['Plantes locales', 'Composées par dosha', 'Pression lente']
                : ['Local plants', 'Composed by dosha', 'Slow pressing']
              ).map(c => (
                <li key={c} className="flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70">
                  <span className="h-1 w-1 rounded-full bg-[#9c7a44]" />
                  {c}
                </li>
              ))}
            </ul>

            <p className="v2-serif italic text-[clamp(1.35rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[36ch]">
              {lang === 'FR'
                ? 'Huiles corporelles, rituels et soins composés autour d’un dosha ou d’un moment de vie.'
                : 'Body oils, rituals and care composed around a dosha or a moment in life.'}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
              <a
                href="#catalogue"
                className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
              >
                {lang === 'FR' ? 'Voir les produits' : 'See the products'}
                <ArrowDown size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="#infolettre"
                className="v2-serif italic text-lg text-[#1c1712]/70 hover:text-[#7d6330] transition-colors duration-300 min-h-[44px] inline-flex items-center"
              >
                {lang === 'FR' ? 'Recevoir les nouveautés' : 'Get the new arrivals'}
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(1.5rem,4vh,3rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55"
        >
          <span className="flex items-center gap-2 v2-cue">
            <ArrowDown size={13} weight="regular" />
            {lang === 'FR' ? 'Faire défiler' : 'Scroll'}
          </span>
          <span className="hidden sm:inline">{lang === 'FR' ? 'Huiles · Rituels · Saisons' : 'Oils · Rituals · Seasons'}</span>
        </motion.div>
      </section>

      {/* ─────────── CHAPITRE 01 · CATALOGUE ─────────── */}
      <section
        id="catalogue"
        ref={catalogueRef}
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6] scroll-mt-24 overflow-hidden"
      >
        {/* Grand mot fantôme qui glisse derrière la grille */}
        <motion.span
          aria-hidden
          style={reduce ? undefined : { x: ghostX }}
          className="pointer-events-none select-none absolute top-[34%] left-0 whitespace-nowrap v2-serif italic font-light leading-none text-[clamp(7rem,20vw,18rem)] text-[#9c7a44]/[0.09] will-change-transform"
        >
          {lang === 'FR' ? 'Rituels' : 'Rituals'}
        </motion.span>

        <div className="relative">
          <Reveal className="max-w-[760px] mb-4">
            <Kicker className="mb-5">
              {lang === 'FR' ? 'Chapitre 01 · Le catalogue Inspirata' : 'Chapter 01 · The Inspirata catalogue'}
            </Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">
              {lang === 'FR' ? 'Les essentiels de la maison' : 'The essentials of the house'}
            </h2>
            <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
              {lang === 'FR'
                ? 'Chaque flacon est composé à la main, en petite série, au rythme des saisons.'
                : 'Each bottle is hand-composed, in small batches, season after season.'}
            </p>
          </Reveal>
          <DrawRule className="w-24 mb-4" />
          {loadingShop && (
            <p className="mb-10 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/45">
              {lang === 'FR' ? 'Synchronisation boutique…' : 'Syncing shop…'}
            </p>
          )}

          {/* Boutique indisponible : message sobre, jamais d'écran cassé */}
          {!isShopifyConfigured || shopError ? (
            <Reveal className="mt-12">
              <div className="bg-[#faf6ee] border border-[#9c7a44]/25 p-10 md:p-14 text-center">
                <ShoppingBag size={32} weight="light" className="text-[#7d6330] mx-auto mb-5" />
                <p className="v2-serif font-light text-[1.7rem] text-[#1c1712]">
                  {lang === 'FR' ? 'La boutique revient bientôt' : 'The shop is back soon'}
                </p>
                <p className="mt-3 text-[0.95rem] text-[#3a2f23] max-w-[44ch] mx-auto leading-relaxed">
                  {lang === 'FR'
                    ? 'Le catalogue est momentanément indisponible. En attendant, retrouvez tous les produits sur la boutique Inspirata.'
                    : 'The catalogue is momentarily unavailable. In the meantime, find every product on the Inspirata shop.'}
                </p>
                <a
                  href="https://www.inspiratanature.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-8 inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  {lang === 'FR' ? 'Visiter inspiratanature.com' : 'Visit inspiratanature.com'}
                  <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </Reveal>
          ) : (
            <>
              {/* Vedette · pleine largeur éditoriale */}
              {featured && (
                <Reveal className="mt-12 mb-8">
                  <FeaturedProduct p={featured} lang={lang} added={added} onAdd={handleAdd} />
                </Reveal>
              )}

              {/* Grille des autres produits · cascade indexée */}
              {rest.length > 0 && (
                <motion.div
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.08 }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                  className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch"
                >
                  {rest.map((p, idx) => (
                    <ProductCard key={p.id} p={p} index={idx + 2} lang={lang} added={added} onAdd={handleAdd} />
                  ))}
                </motion.div>
              )}

              {/* Catalogue vide après filtrage (tout masqué / aucune donnée) */}
              {!loadingShop && visibleProducts.length === 0 && (
                <div className="mt-12 bg-[#faf6ee] border border-[#9c7a44]/25 p-10 text-center">
                  <p className="v2-serif font-light text-[1.5rem] text-[#1c1712]">
                    {lang === 'FR' ? 'Aucun produit pour le moment.' : 'No products at the moment.'}
                  </p>
                  <a
                    href="https://www.inspiratanature.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-6 inline-flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                  >
                    {lang === 'FR' ? 'Voir inspiratanature.com' : 'See inspiratanature.com'}
                    <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · LA SIGNATURE (panneau) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7]">
        <Reveal className="max-w-[760px] mb-6">
          <Kicker className="mb-5">
            {lang === 'FR' ? 'Chapitre 02 · La signature Inspirata' : 'Chapter 02 · The Inspirata signature'}
          </Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
            {lang === 'FR' ? 'Ce qui entre dans chaque flacon' : 'What goes into each bottle'}
          </h2>
        </Reveal>
        <DrawRule className="w-full mb-14" />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          className="grid gap-x-[clamp(2rem,4vw,4rem)] gap-y-12 md:grid-cols-3"
        >
          {[
            {
              Icon: Plant,
              titleFR: 'Plantes locales', titleEN: 'Local plants',
              bodyFR: 'Des végétaux choisis près d’ici, infusés à la main, sans précipitation.',
              bodyEN: 'Botanicals chosen close to home, hand-infused, without haste.',
            },
            {
              Icon: Drop,
              titleFR: 'Composées par dosha', titleEN: 'Composed by dosha',
              bodyFR: 'Chaque formule s’accorde à un dosha ou à un moment de vie.',
              bodyEN: 'Each formula attunes to a dosha or a moment in life.',
            },
            {
              Icon: Leaf,
              titleFR: 'Signées Krystine', titleEN: 'Signed by Krystine',
              bodyFR: 'Une formulation tenue à la main, pensée pour se rappliquer à soi.',
              bodyEN: 'A hand-held formulation, made to return to oneself.',
            },
          ].map((c, i) => {
            const Icon = c.Icon;
            return (
              <motion.div
                key={c.titleEN}
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 32 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#9c7a44] text-[#faf6ee]">
                    <Icon size={22} weight="light" />
                  </span>
                  <span className="text-[0.62rem] uppercase tracking-[0.26em] text-[#7d6330]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 v2-serif font-light text-[1.6rem] leading-[1.12] text-[#1c1712]">
                  {lang === 'FR' ? c.titleFR : c.titleEN}
                </h3>
                <p className="mt-4 text-[0.95rem] leading-[1.8] text-[#3a2f23]">
                  {lang === 'FR' ? c.bodyFR : c.bodyEN}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ─────────── MOMENT ÉDITORIAL · citation (unique section sombre, arêtes nettes) ─────────── */}
      <section className="relative w-full bg-[#34241a] overflow-hidden border-y border-[#9c7a44]/50">
        <Atmosphere light="72% 18%" strength={0.9} />
        <div className="relative z-10 px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)]">
          <Reveal className="max-w-[900px] mx-auto text-center">
            <Sparkle size={24} weight="light" className="text-[#c8a86a] mx-auto mb-7" />
            <p className="v2-serif italic font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">
              {lang === 'FR'
                ? '« Le corps sait. Chaque huile est une invitation à l’écouter, un geste à la fois. »'
                : '« The body knows. Each oil is an invitation to listen, one gesture at a time. »'}
            </p>
            <p className="mt-8 text-[0.6rem] uppercase tracking-[0.28em] text-[#f4efe6]/50">
              Krystine St-Laurent &middot; Inspira Nature
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section id="infolettre" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6] scroll-mt-24">
        <div className="grid gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-10 lg:grid-cols-[1fr_1fr] items-center">
          <Reveal>
            <Kicker className="mb-5">{lang === 'FR' ? 'Rester dans le fil' : 'Stay in the loop'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR'
                ? <>Les nouveautés, <span className="italic">au fil des saisons.</span></>
                : <>The new arrivals, <span className="italic">season after season.</span></>}
            </h2>
            <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] leading-snug">
              {lang === 'FR'
                ? 'Recevez chaque nouvelle formule et chaque retour en stock directement par courriel.'
                : 'Get each new formula and restock straight to your inbox.'}
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <NewsletterSignup
              source="boutique"
              variant="light"
              className="max-w-[520px]"
            />
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default BoutiqueLoeuvre;
