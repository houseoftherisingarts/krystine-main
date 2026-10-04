import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ShoppingBag, Leaf, ArrowRight, Drop, Plant,
} from '@phosphor-icons/react';
import { useApp, useBoutique } from '../contexts/AppContext';
import {
  getProducts,
  formatMoney,
  isShopifyConfigured,
  libelleEtiquette,
  libelleFormat,
  type ShopifyProduct,
} from '../shopify';
import { useProduitsPerso, appliquerPerso, estVisible, trierSelonPerso } from '../firebase/boutiqueProduits';
import { modeApercu } from '../lib/apercuBoutique';
import NewsletterSignup from '../components/NewsletterSignup';
import { CaseProduit, CarteProduit, BoutonAjouter, GrilleProduits, taille, guideFormats } from '../components/v2/Produit';
import { COLLECTIONS, assignCollection } from '../lib/collections';
import { saisonCourante, ORDRE_FAMILLES, USAGES } from '../lib/saisonBoutique';
import { CarteVerte } from '../components/v2/Magazine';

/**
 * La Boutique · V2 « magazine crème » (spec canonique krystine-v2-branding).
 * Organisée autour de la saison en cours (4 oct. 2026) : titre « Les
 * essentiels de la saison », la dominance et ses éléments, l'huile vedette,
 * une rangée d'essentiels, puis le reste du catalogue par famille. Moment
 * sombre unique (citation) borné par des filets nets, infolettre en clôture.
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

type ShopifyVariant = ShopifyProduct['variants'][number];

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

/* ── Pourquoi · Comment l'utiliser (vedette et essentiels de la saison) ── */
const ModeEmploi: React.FC<{ lang: 'FR' | 'EN'; pourquoi: string; usage?: string; className?: string }> = ({ lang, pourquoi, usage, className = '' }) => {
  const fr = lang === 'FR';
  return (
    <dl className={`space-y-4 ${className}`}>
      <div>
        <dt className="text-[0.58rem] uppercase tracking-[0.24em] text-[#7d6330]">{fr ? 'Pourquoi' : 'Why'}</dt>
        <dd className="mt-1.5 text-[0.95rem] leading-[1.75] text-[#3a2f23]">{pourquoi}</dd>
      </div>
      {usage && (
        <div>
          <dt className="text-[0.58rem] uppercase tracking-[0.24em] text-[#7d6330]">{fr ? "Comment l'utiliser" : 'How to use it'}</dt>
          <dd className="mt-1.5 text-[0.95rem] leading-[1.75] text-[#3a2f23]">{usage}</dd>
        </div>
      )}
    </dl>
  );
};

/* ── Produit vedette · pleine largeur éditoriale ── */
const FeaturedProduct: React.FC<{
  p: ShopifyProduct & { accroche?: string };
  lang: 'FR' | 'EN';
  added: string | null;
  onAdd: (p: ShopifyProduct, e: React.MouseEvent, v?: ShopifyVariant) => void;
  couleur: string;
  libelle: string;
  pourquoi: string;
  usage?: string;
}> = ({ p, lang, added, onAdd, couleur, libelle, pourquoi, usage }) => {
  // Le format se choisit ici même (4 oct. 2026) : la nouvelle venue voit
  // ce qu'elle achète (50 ml, 230 ml, 500 ml) avant d'ajouter.
  const [choix, setChoix] = useState<string | null>(null);
  const variant = p.variants.find(v => v.id === choix) || p.variants.find(v => v.availableForSale) || p.variants[0];
  const soldOut = !p.availableForSale;
  const price = variant
    ? formatMoney(variant.price, lang)
    : formatMoney(p.priceRange.minVariantPrice, lang);
  const image = p.featuredImage?.url || p.images[0]?.url;
  const isAdded = added === p.id;
  const fiche = `/boutique/produit/${p.handle}`;
  const formats = p.variants.filter(v => libelleFormat(v.title));
  const guide = guideFormats(p, lang);

  return (
    <div className="grid lg:grid-cols-[0.8fr_1.2fr] items-center bg-[#faf6ee] border border-[#9c7a44]/25 border-t-2" style={{ borderTopColor: couleur }}>
      <Link to={fiche} aria-label={p.title} className="group block p-[clamp(1rem,2vw,1.75rem)] pb-0 lg:pb-[clamp(1rem,2vw,1.75rem)]">
        <CaseProduit src={image} alt={p.featuredImage?.altText || p.title} ratio="aspect-[4/5]" largeur={900} filet={false} etiquette={soldOut ? (lang === 'FR' ? 'Épuisé' : 'Sold out') : null} />
      </Link>
      <div className="flex flex-col justify-center p-[clamp(1.75rem,4vw,3.5rem)]">
        <p className="mb-6 text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330]">
          {libelle}
        </p>
        <h3 className="v2-serif font-light leading-[1.04] text-[#1c1712] text-[clamp(2rem,3.6vw,3.2rem)]">
          <Link to={fiche} className="hover:text-[#7d6330] transition-colors duration-300">{p.title}</Link>
        </h3>
        <ModeEmploi lang={lang} pourquoi={pourquoi} usage={usage} className="mt-6 max-w-[56ch]" />
        {formats.length > 1 && (
          <fieldset className="mt-8">
            <legend className="mb-3 text-[0.58rem] uppercase tracking-[0.24em] text-[#7d6330]">{lang === 'FR' ? 'Choisir le format' : 'Choose the size'}</legend>
            <div className="flex flex-wrap gap-2.5">
              {formats.map(v => {
                const choisi = v.id === variant?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.availableForSale}
                    onClick={() => setChoix(v.id)}
                    aria-pressed={choisi}
                    className={`min-h-[44px] px-4 py-2 text-[0.74rem] tracking-[0.06em] border transition-colors ${
                      choisi ? 'bg-[#1c1712] border-[#1c1712] text-[#f4efe6]' : 'border-[#1c1712]/25 text-[#1c1712] hover:border-[#1c1712]'
                    } ${v.availableForSale ? '' : 'opacity-45 line-through cursor-not-allowed'}`}
                  >
                    {libelleFormat(v.title)}
                    <span className="ml-2 tabular-nums opacity-70">{formatMoney(v.price, lang)}</span>
                  </button>
                );
              })}
            </div>
            {guide && <p className="mt-3 max-w-[56ch] text-[0.84rem] leading-[1.65] text-[#1c1712]/65">{guide}</p>}
          </fieldset>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <span className="v2-serif font-light text-[clamp(1.5rem,2.4vw,2rem)] text-[#7d6330] tabular-nums">{price}</span>
          <BoutonAjouter disponible={!soldOut && !!variant?.availableForSale} ajoute={isAdded} lang={lang} titre={p.title} format={libelleFormat(variant?.title)} onClick={e => onAdd(p, e, variant)} long className="whitespace-nowrap max-sm:px-4 max-sm:tracking-[0.12em]" />
          <Link to={fiche} className="text-[0.66rem] uppercase tracking-[0.2em] text-[#1c1712]/70 border-b border-[#1c1712]/30 pb-1 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
            {lang === 'FR' ? 'Voir le produit' : 'View product'}
          </Link>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════ Page ════════════════════════ */

const BoutiqueLoeuvre: React.FC = () => {
  const { lang, addToCart, setCartOpen } = useApp();
  const { redirectEnabled: renvoiActif, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();
  // ?apercu=1 montre la boutique du site même lorsque le renvoi vers
  // inspiratanature.com est allumé, pour que Krystine la voie avant la
  // bascule (4 oct. 2026).
  const apercu = useMemo(() => modeApercu(), []);
  const redirectEnabled = renvoiActif && !apercu;
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

  // Respecter les produits masqués depuis /admin (par handle, ou dans la
  // fiche personnalisée), puis appliquer la personnalisation et l'ordre choisi.
  const { perso } = useProduitsPerso();
  const visibleProducts = useMemo(
    () => trierSelonPerso(
      products.filter(p => estVisible(p.handle, hiddenProducts, perso)).map(p => appliquerPerso(p, perso.get(p.handle))),
      perso,
    ),
    [products, hiddenProducts, perso],
  );

  const handleAdd = (p: ShopifyProduct, e: React.MouseEvent, choisie?: ShopifyVariant) => {
    e.preventDefault(); e.stopPropagation();
    const variant = choisie || p.variants.find(v => v.availableForSale) || p.variants[0];
    if (!variant) return;
    addToCart({
      id: p.id,
      variantId: variant.id,
      title: p.title,
      // Le panier dit quel format part (« 50 ml »), comme depuis la fiche.
      type: libelleFormat(variant.title) || libelleEtiquette(p.productType, lang) || '',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: p.featuredImage?.url ? taille(p.featuredImage.url, 300) : undefined,
    });
    setCartOpen(true);
    setAdded(p.id);
    window.setTimeout(() => setAdded(cur => (cur === p.id ? null : cur)), 1600);
  };

  // ── La mise en place saisonnière (Krystine, 4 oct. 2026) ──
  // En haut, l'huile de la dominance puis trois essentiels choisis pour elle
  // (table dans lib/saisonBoutique.ts); ensuite le reste, par famille, sans
  // répéter ce qui est déjà montré.
  const fr = lang === 'FR';
  const saison = useMemo(() => saisonCourante(), []);
  const { vedette, essentiels, familles } = useMemo(() => {
    const parHandle = new Map(visibleProducts.map(p => [p.handle, p]));
    const offert = (h: string) => {
      const p = parHandle.get(h);
      return p && p.availableForSale ? p : undefined;
    };
    const v = offert(saison.vedette.handle);
    // L'huile de la dominance fait aussi partie des essentiels (Krystine, 4 oct. 2026).
    const rangee = [{ handle: saison.vedette.handle, pourquoiFR: saison.vedette.pourquoiFR, pourquoiEN: saison.vedette.pourquoiEN }, ...saison.essentiels]
      .map(e => ({ p: offert(e.handle), pourquoi: fr ? e.pourquoiFR : e.pourquoiEN }))
      .filter((e): e is { p: ShopifyProduct; pourquoi: string } => !!e.p)
      .slice(0, 4);
    const montres = new Set([v?.handle, ...rangee.map(e => e.p.handle)]);
    const reste = visibleProducts.filter(p => !montres.has(p.handle));
    const groupes = ORDRE_FAMILLES
      .map(id => COLLECTIONS.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map(c => ({
        id: c.id, slug: c.slug as string | null,
        label: fr ? c.labelFR : c.labelEN,
        tagline: fr ? c.taglineFR : c.taglineEN,
        produits: reste.filter(p => assignCollection(p)?.id === c.id),
      }));
    const sansFamille = reste.filter(p => !assignCollection(p));
    if (sansFamille.length) {
      groupes.push({ id: 'autres', slug: null, label: fr ? 'Et aussi' : 'And also', tagline: '', produits: sansFamille });
    }
    return { vedette: v, essentiels: rangee, familles: groupes.filter(g => g.produits.length > 0) };
  }, [visibleProducts, saison, fr]);

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
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* ─────────── CHAPITRE 01 · LES ESSENTIELS DE LA SAISON ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(5rem,12vh,8rem)]">
        <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start mt-[clamp(1.5rem,4vh,3rem)]">
          <div>
            <motion.p
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-7"
            >
              {fr ? 'La boutique Inspirata' : 'The Inspirata shop'}
            </motion.p>
            <h1 className="v2-serif font-light leading-[0.95] text-[#1c1712] text-[clamp(2.9rem,6.6vw,6.2rem)]">
              <span className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={reduce ? { y: 0 } : { y: '115%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
                >
                  {fr ? <>Les essentiels <br className="hidden sm:block" />de la saison</> : <>The essentials <br className="hidden sm:block" />of the season</>}
                </motion.span>
              </span>
            </h1>
            <motion.p
              initial={reduce ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
              className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.74rem] uppercase tracking-[0.22em] text-[#1c1712]"
            >
              <span>
                <span className="mr-3 inline-block h-2.5 w-2.5 rounded-full align-[0.05em]" style={{ background: saison.couleur }} aria-hidden />
                {fr ? saison.saisonFR : saison.saisonEN} · {fr ? saison.doshaFR : saison.doshaEN}
              </span>
              <span className="text-[#1c1712]/50 normal-case tracking-[0.04em] text-[0.8rem]">{fr ? saison.periodeFR : saison.periodeEN}</span>
            </motion.p>
          </div>
          <motion.div
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.5 }}
          >
            <p className="v2-serif text-[clamp(1.1rem,1.7vw,1.35rem)] font-light leading-[1.5] text-[#3a2f23] max-w-[48ch]">
              {fr ? saison.introFR : saison.introEN}
            </p>
            {/* Nouvelle ici ? · ce qu'il faut savoir avant d'acheter, en deux phrases (4 oct. 2026) */}
            <aside className="mt-7 border-t border-[#9c7a44]/40 pt-5 max-w-[52ch]">
              <p className="text-[0.62rem] uppercase tracking-[0.26em] text-[#7d6330]">{fr ? 'Nouvelle ici ?' : 'New here?'}</p>
              <p className="mt-2.5 text-[0.92rem] leading-[1.75] text-[#3a2f23]">
                {fr
                  ? "Vous n'avez pas besoin de savoir « quel type » vous êtes. La saison nous influence déjà : en ce moment, l'air froid et sec assèche la peau, rend le sommeil plus léger et fait courir le mental. L'huile ci-dessous a été pensée pour ce moment de l'année."
                  : 'INSPIRATA AYURVEDA is a line of oils and care products designed by Krystine St-Laurent, with local plants infused by hand in oil. Ayurveda, a care tradition born in India, sees three dominances, Vata (Wind and Space), Pitta (Fire and Water) and Kapha (Water and Earth): each season awakens one, and each oil is made for one of them.'}
              </p>
              <p className="mt-2.5 text-[0.92rem] leading-[1.75] text-[#3a2f23]">
                {fr
                  ? "Les huiles INSPIRATA AYURVEDA sont conçues par Krystine St-Laurent, avec des plantes d'ici infusées à la main dans l'huile. Pour aller plus loin, à votre rythme : "
                  : 'You do not need to know yours to begin: the oil below goes with the current season. '}
                <Link to="/quiz" className="whitespace-nowrap text-[#1c1712] border-b border-[#1c1712]/40 pb-0.5 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
                  {fr ? 'Me situer en ce moment · 3 min' : 'Where am I right now · 3 min'} <ArrowRight size={14} className="inline align-[-0.1em]" />
                </Link>
              </p>
            </aside>
          </motion.div>
        </div>

        <div className="mt-[clamp(2.5rem,6vh,4rem)]">
          {loadingShop && (
            <p className="mb-10 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/45">
              {fr ? 'Chargement des produits…' : 'Loading the products…'}
            </p>
          )}

          {/* Boutique indisponible : message sobre, jamais d'écran cassé */}
          {!isShopifyConfigured || shopError ? (
            <Reveal>
              <div className="bg-[#faf6ee] border border-[#9c7a44]/25 p-10 md:p-14 text-center">
                <ShoppingBag size={32} weight="light" className="text-[#7d6330] mx-auto mb-5" />
                <p className="v2-serif font-light text-[1.7rem] text-[#1c1712]">
                  {fr ? 'La boutique revient bientôt' : 'The shop is back soon'}
                </p>
                <p className="mt-3 text-[0.95rem] text-[#3a2f23] max-w-[44ch] mx-auto leading-relaxed">
                  {fr
                    ? 'Le catalogue ne se charge pas pour le moment. Tous nos produits restent offerts sur la boutique Inspirata.'
                    : 'The catalogue is not loading right now. All our products are still available on the Inspirata shop.'}
                </p>
                <a
                  href="https://www.inspiratanature.com/?country=CA&locale=fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-8 inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                >
                  {fr ? 'Visiter inspiratanature.com' : 'Visit inspiratanature.com'}
                  <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </Reveal>
          ) : (
            <>
              {/* Vedette · l'huile de la dominance */}
              {vedette && (
                <Reveal>
                  <FeaturedProduct
                    p={vedette} lang={lang} added={added} onAdd={handleAdd} couleur={saison.couleur}
                    libelle={fr ? saison.vedette.libelleFR : saison.vedette.libelleEN}
                    pourquoi={fr ? saison.vedette.pourquoiFR : saison.vedette.pourquoiEN}
                    usage={USAGES[vedette.handle]?.[lang]}
                  />
                </Reveal>
              )}

              {/* Avant d'acheter · faits tirés de la politique d'expédition Shopify d'INSPIRATA (4 oct. 2026) */}
              {visibleProducts.length > 0 && (
                <ul className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 border-y border-[#1c1712]/12 py-5">
                  {(fr
                    ? [['Paiement sécurisé', 'Par Shopify, en dollars canadiens'], ['Livraison', 'Au Canada et aux États-Unis, en 3 à 4 jours ouvrables en général'], ['Livraison offerte', 'Dès 135 $ d’achat, avant taxes'], ['Fait à la main', 'En petites quantités, selon les formules de Krystine']]
                    : [['Secure checkout', 'By Shopify, in Canadian dollars'], ['Shipping', 'To Canada and the United States, usually in 3 to 4 business days'], ['Shipping included', 'From $135, before taxes'], ['Handmade', 'In small batches, from Krystine’s formulas']]
                  ).map(([t, d]) => (
                    <li key={t}>
                      <p className="text-[0.58rem] uppercase tracking-[0.22em] text-[#7d6330]">{t}</p>
                      <p className="mt-1.5 text-[0.84rem] leading-snug text-[#3a2f23]">{d}</p>
                    </li>
                  ))}
                </ul>
              )}

              {/* Rangée · les essentiels de la saison */}
              {essentiels.length > 0 && (
                <div className="mt-[clamp(3.5rem,8vh,5.5rem)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#1c1712]/15 pb-4 mb-10">
                    <p className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.3em] text-[#7d6330]">
                      <span className="h-px w-8" style={{ background: saison.couleur }} aria-hidden />
                      {fr ? 'Les essentiels de la saison' : 'The essentials of the season'}
                    </p>
                    <p className="text-[0.66rem] uppercase tracking-[0.2em] text-[#1c1712]/55">{fr ? saison.doshaFR : saison.doshaEN}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-[clamp(1rem,2.5vw,2.25rem)] gap-y-[clamp(2.5rem,5vw,3.5rem)]">
                    {essentiels.map(({ p, pourquoi }) => (
                      <Reveal key={p.id} className="h-full flex flex-col">
                        <div><CarteProduit p={p} lang={lang} ajoute={added === p.id} onAjouter={handleAdd} /></div>
                        <ModeEmploi lang={lang} pourquoi={pourquoi} usage={USAGES[p.handle]?.[lang]} className="mt-6 border-t border-[#1c1712]/12 pt-5 [&_dd]:text-[0.88rem]" />
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Pourquoi l'automassage · la seule carte vert profond de la page, citée mot pour mot du livre */}
              {vedette && (
                <Reveal className="mt-[clamp(3.5rem,8vh,5.5rem)]">
                  <CarteVerte className="px-[clamp(1.75rem,5vw,4.5rem)] py-[clamp(2.75rem,6vw,4.5rem)]">
                    <div className="grid gap-x-[clamp(2rem,5vw,4.5rem)] gap-y-10 lg:grid-cols-[1.25fr_1fr]">
                      <figure>
                        <p className="text-[0.66rem] uppercase tracking-[0.3em] text-[#BA7B39]">{fr ? "Pourquoi l'automassage" : 'Why self-massage'}</p>
                        <blockquote lang="fr" className="mt-6 v2-serif font-light text-[clamp(1.15rem,1.9vw,1.5rem)] leading-[1.55] text-[#EEE7DB]">
                          « Le massage et l’automassage sont très prisés dans l’approche ayurvédique. Que ce soit dans les rituels ou dans la routine quotidienne (dynacharia), l’automassage est recommandé et fait même partie des activités de tous les jours, au même titre que se nourrir, dormir, bouger et éliminer. Travaillant systématiquement sur trois systèmes (circulatoire, lymphatique et nerveux), l’automassage est extrêmement important pour apaiser vata et, de façon générale, pour apaiser la tête, le cœur (les émotions) et le corps en entier. »
                        </blockquote>
                        <figcaption className="mt-6 text-[0.66rem] uppercase tracking-[0.2em] text-[#EEE7DB]/65">
                          Krystine St-Laurent, <cite className="not-italic">Nature & Ayurveda</cite> (Éditions de l’Homme, 2018)
                        </figcaption>
                      </figure>
                      <ul className="space-y-7 lg:border-l lg:border-[#BA7B39]/35 lg:pl-[clamp(2rem,4vw,3.5rem)] self-center">
                        <li>
                          <p className="text-[0.6rem] uppercase tracking-[0.26em] text-[#BA7B39]">{fr ? "L'huile infusée" : 'Infused oil'}</p>
                          <p lang="fr" className="mt-2 text-[0.95rem] leading-[1.75] text-[#EEE7DB]/90">« Se masser avec une huile infusée est l’équivalent de prendre une tisane par la peau. »</p>
                        </li>
                        <li>
                          <p className="text-[0.6rem] uppercase tracking-[0.26em] text-[#BA7B39]">{fr ? 'Combien de fois' : 'How often'}</p>
                          <p lang="fr" className="mt-2 text-[0.95rem] leading-[1.75] text-[#EEE7DB]/90">
                            {fr ? 'Vata (Vent et Espace)' : 'Vata (Wind and Space)'} : « chaque jour, et même matin et soir si possible ».<br />
                            {fr ? 'Pitta (Feu et Eau)' : 'Pitta (Fire and Water)'} : « trois fois par semaine, en moyenne ».<br />
                            {fr ? 'Kapha (Eau et Terre)' : 'Kapha (Water and Earth)'} : « une ou deux fois par semaine », et « un automassage actif le matin avec une huile adaptée pour kapha ».
                          </p>
                        </li>
                        <li>
                          <p className="text-[0.6rem] uppercase tracking-[0.26em] text-[#BA7B39]">{fr ? 'Combien de temps' : 'How long'}</p>
                          <p lang="fr" className="mt-2 text-[0.95rem] leading-[1.75] text-[#EEE7DB]/90">« En moyenne, un automassage peut prendre entre 10 et 20 minutes. Si vous manquez de temps, massez à tout le moins la poitrine, les mains et les pieds. »</p>
                        </li>
                      </ul>
                    </div>
                  </CarteVerte>
                </Reveal>
              )}

              {/* Catalogue vide après filtrage (tout masqué / aucune donnée) */}
              {!loadingShop && visibleProducts.length === 0 && (
                <div className="bg-[#faf6ee] border border-[#9c7a44]/25 p-10 text-center">
                  <p className="v2-serif font-light text-[1.5rem] text-[#1c1712]">
                    {fr ? 'Aucun produit pour le moment.' : 'No products at the moment.'}
                  </p>
                  <a
                    href="https://www.inspiratanature.com/?country=CA&locale=fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-6 inline-flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44] min-h-[44px]"
                  >
                    {fr ? 'Voir inspiratanature.com' : 'See inspiratanature.com'}
                    <ArrowRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · TOUTE LA BOUTIQUE, PAR FAMILLE ─────────── */}
      {familles.length > 0 && (
        <section
          id="catalogue"
          ref={catalogueRef}
          className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,10rem)] bg-[#efe6d7] scroll-mt-24 overflow-hidden"
        >
          {/* Grand mot fantôme qui glisse derrière la grille */}
          <motion.span
            aria-hidden
            style={reduce ? undefined : { x: ghostX }}
            className="pointer-events-none select-none absolute top-[18%] left-0 whitespace-nowrap v2-serif font-light leading-none text-[clamp(7rem,20vw,18rem)] text-[#9c7a44]/[0.08] will-change-transform"
          >
            {fr ? 'Familles' : 'Families'}
          </motion.span>

          <div className="relative">
            <Reveal className="max-w-[760px] mb-4">
              <Kicker className="mb-5">{fr ? 'Toute la boutique' : 'The whole shop'}</Kicker>
              <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
                {fr ? 'Le reste du catalogue' : 'The rest of the catalogue'}
              </h2>
              <p className="mt-6 v2-serif text-[clamp(1.05rem,1.8vw,1.35rem)] text-[#3a2f23] max-w-[50ch] leading-snug">
                {fr
                  ? 'Tous nos autres soins, rangés par famille. Chaque flacon est préparé à la main, en petite quantité.'
                  : 'All our other products, sorted by family. Each bottle is prepared by hand, in small batches.'}
              </p>
            </Reveal>
            <DrawRule className="w-24" />

            {/* Raccourcis vers chaque famille : la page est longue, surtout au téléphone */}
            <nav aria-label={fr ? 'Les familles' : 'The families'} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {familles.map(({ id, label }) => (
                <a key={id} href={`#famille-${id}`} className="inline-flex min-h-[40px] items-center text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/75 border-b border-transparent hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
                  {label}
                </a>
              ))}
            </nav>

            {familles.map(({ id, slug, label, tagline, produits }) => (
              <div key={id} id={`famille-${id}`} className="mt-[clamp(3.5rem,8vh,5.5rem)] scroll-mt-28">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[#1c1712]/15 pb-4 mb-10">
                  <div>
                    <h3 className="v2-serif font-light text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.1] text-[#1c1712]">{label}</h3>
                    {tagline && <p className="mt-2 text-[0.66rem] uppercase tracking-[0.22em] text-[#7d6330]">{tagline}</p>}
                  </div>
                  {slug && (
                    <Link to={`/boutique/${slug}`} className="group inline-flex min-h-[44px] items-center gap-2 text-[0.64rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712]/40 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
                      {fr ? 'La famille au complet' : 'The full family'}
                      <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
                <GrilleProduits>
                  {produits.map(p => (
                    <Reveal key={p.id} className="h-full">
                      <CarteProduit p={p} lang={lang} ajoute={added === p.id} onAjouter={handleAdd} />
                    </Reveal>
                  ))}
                </GrilleProduits>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── CHAPITRE 02 · LA SIGNATURE (panneau) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
        <Reveal className="max-w-[760px] mb-6">
          <Kicker className="mb-5">
            {fr ? 'La signature INSPIRATA' : 'The INSPIRATA signature'}
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
              titleFR: 'Des plantes d’ici', titleEN: 'Plants from here',
              bodyFR: 'Des plantes choisies près de chez nous, infusées dans l’huile à la main, en prenant le temps qu’il faut.',
              bodyEN: 'Plants chosen close to home, infused in oil by hand, taking the time it needs.',
            },
            {
              Icon: Drop,
              titleFR: 'Ce qui domine en ce moment', titleEN: 'What leads right now',
              bodyFR: 'Chaque huile répond à ce qui prend de la place selon la saison et le moment : le froid et le sec, la chaleur, la lourdeur, ou un moment précis de la vie.',
              bodyEN: 'Each oil answers a dominance, Vata (Wind and Space), Pitta (Fire and Water) or Kapha (Water and Earth), or a specific moment of life.',
            },
            {
              Icon: Leaf,
              titleFR: 'Signées Krystine', titleEN: 'Signed by Krystine',
              bodyFR: 'Chaque formule est pensée, essayée et ajustée par Krystine avant d’arriver jusqu’à vous.',
              bodyEN: 'Each formula is designed, tried and adjusted by Krystine before it reaches you.',
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
                  <Icon size={30} weight="light" className="text-[#7d6330]" />
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
        <div className="relative z-10 px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)]">
          <Reveal className="max-w-[900px] mx-auto text-center">
            <span className="mx-auto mb-8 block h-px w-12 bg-[#BA7B39]" aria-hidden />
            <p className="v2-serif font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">
              {lang === 'FR'
                ? '« Le corps porte le même langage que la nature, il ne demande qu’à être écouté. »'
                : '« The body speaks the same language as nature, it only asks to be heard. »'}
            </p>
            <p className="mt-8 text-[0.6rem] uppercase tracking-[0.28em] text-[#f4efe6]/50">
              Krystine St-Laurent
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section id="infolettre" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6] scroll-mt-24">
        <div className="grid gap-x-[clamp(2.5rem,6vw,6rem)] gap-y-10 lg:grid-cols-[1fr_1fr] items-center">
          <Reveal>
            <Kicker className="mb-5">{fr ? 'Rester dans le fil' : 'Stay in the loop'}</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
              {lang === 'FR'
                ? <>Les nouveautés, <span>au fil des saisons.</span></>
                : <>The new arrivals, <span>season after season.</span></>}
            </h2>
            <p className="mt-6 v2-serif text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[44ch] leading-snug">
              {lang === 'FR'
                ? 'Une nouvelle formule, un retour en stock, un changement de saison : nous vous écrivons lorsque cela en vaut la peine.'
                : 'A new formula, a restock, a change of season: we write when it is worth it.'}
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
