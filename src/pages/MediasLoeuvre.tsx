import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Tv, BookOpen, ArrowRight, Youtube, Lock, Star, Quote } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import NewsletterSignup from '../components/NewsletterSignup';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import { Seam, Parallax } from '../components/motion/loeuvre';

// Grain fin (SVG feTurbulence inline) — texture « matière » premium sur les
// fonds sombres. Recette D3 (Motionsites Maison).
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Médias — page React au style L'Œuvre (espresso / cream / brass).
 * Rebuild éditorial complet : aucun visuel de l'ancienne MediasPage conservé.
 * Le back-end est préservé : données CONTENT[lang].media (podcast, livres,
 * tv), intégration Shopify pour la commande des livres, playlists YouTube
 * curées, NewsletterSignup (source="medias"), WaitlistModal pour le Tome 3.
 * Skills : premium-web (orchestrateur) + ui-ux-pro-max (tokens/contraste) + impeccable.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 1.0, ease, delay }}>
    {children}
  </motion.div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>{children}</h2>
);

/* ─── Shopify book matching (preserved from MediasPage) ─── */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const looksLikeBook = (p: ShopifyProduct): boolean => {
  const bag = [p.productType, ...p.tags].map(norm);
  return bag.some(s => s.includes('livre') || s.includes('book') || s.includes('ayurveda book'));
};
const matchBookToShopify = (bookTitle: string, fullTitle: string | undefined, products: ShopifyProduct[]): ShopifyProduct | undefined => {
  const candidates = [fullTitle, bookTitle].filter(Boolean) as string[];
  for (const c of candidates) {
    const n = norm(c);
    const hit = products.find(p => { const pn = norm(p.title); return pn === n || pn.includes(n) || n.includes(pn); });
    if (hit) return hit;
  }
  return undefined;
};

const MediasLoeuvre: React.FC = () => {
  const { lang, addToCart, user } = useApp();
  const t = CONTENT[lang];
  const media = t.media;
  const pod = media.details.podcast;
  const book = media.details.book;
  const location = useLocation();

  // ── Livres (Shopify) ──
  const [bookOpen, setBookOpen] = useState<number | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [waitlistTarget, setWaitlistTarget] = useState<WaitlistTarget | null>(null);

  useEffect(() => {
    if (!isShopifyConfigured) return;
    setLoadingShop(true);
    setShopError(null);
    getProducts(50, lang)
      .then(ps => setProducts(ps.filter(looksLikeBook).length > 0 ? ps.filter(looksLikeBook) : ps))
      .catch(e => setShopError(e?.message || 'shop_error'))
      .finally(() => setLoadingShop(false));
  }, [lang]);

  const bookMatches = useMemo(() => {
    const map = new Map<number, ShopifyProduct | undefined>();
    book.items?.forEach((item: any, idx: number) => {
      if (item.status !== 'available') return;
      map.set(idx, matchBookToShopify(item.title, item.fullTitle, products));
    });
    return map;
  }, [products, book.items]);

  // Hash-scroll when arriving from /medias#livres (other pages link here).
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [location.hash, loadingShop]);

  const NAV = [
    { id: 'podcast', label: lang === 'FR' ? 'Le podcast' : 'The podcast', href: '#podcast', icon: Mic, onPage: true },
    { id: 'livres', label: lang === 'FR' ? 'Les livres' : 'The books', href: '#livres', icon: BookOpen, onPage: true },
    { id: 'tv', label: lang === 'FR' ? 'À la télé' : 'On TV', href: '#tv', icon: Tv, onPage: true },
  ];

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO — éditorial sombre, type cinétique (zéro photo) ─────────── */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden bg-espressoDeep text-ctext">
        {/* Orbs ambiants laiton — drift transform-only, 2 orbs, poids-plume (60fps) */}
        <motion.span aria-hidden className="pointer-events-none absolute -top-40 -left-28 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(187,154,94,0.18), transparent 70%)' }}
          animate={{ x: [0, 44, 0], y: [0, 30, 0] }}
          transition={{ duration: 28, ease: 'easeInOut', repeat: Infinity }} />
        <motion.span aria-hidden className="pointer-events-none absolute -bottom-44 -right-24 h-[42rem] w-[42rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(220,184,116,0.10), transparent 70%)' }}
          animate={{ x: [0, -38, 0], y: [0, -26, 0] }}
          transition={{ duration: 34, ease: 'easeInOut', repeat: Infinity }} />
        {/* Grain matière */}
        <span aria-hidden className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        {/* Contenu ancré bas-gauche (anti-centré D1) */}
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 pb-20 md:pb-28">
          <motion.div
            className="max-w-[46ch]"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 1.0, ease } } }}
              className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.34em] text-brass mb-7">
              {lang === 'FR' ? 'Médias · La voix de Krystine' : 'Media · Krystine’s voice'}
            </motion.p>
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 1.1, ease } } }}
              className="font-serif font-medium text-ctext leading-[0.96] text-[clamp(2.8rem,6.6vw,5.4rem)]">
              {lang === 'FR' ? <>Krystine,<br /><span className="italic font-normal text-brassBright">dans les médias.</span></> : <>Krystine,<br /><span className="italic font-normal text-brassBright">in the media.</span></>}
            </motion.h1>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 1.0, ease } } }}
              className="mt-6 font-serif italic text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-ctextSoft max-w-[32ch]">
              {lang === 'FR'
                ? <>Le podcast, les livres, la télé : <span className="text-brass not-italic">les mots et la voix</span>, au fil des saisons.</>
                : <>The podcast, the books, the TV: <span className="text-brass not-italic">the words and the voice</span>, season after season.</>}
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
              className="mt-10 flex flex-wrap items-center gap-3">
              {NAV.map(n => (
                <a key={n.id} href={n.href}
                  className="inline-flex items-center gap-2.5 rounded-full border border-brass/30 bg-brass/10 px-5 py-2.5 font-sans text-[0.68rem] uppercase tracking-[0.16em] text-brass transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px]">
                  <n.icon size={15} /> {n.label}
                </a>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Indice de défilement */}
        <motion.div
          aria-hidden
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[0.58rem] uppercase tracking-[0.3em] text-brass/50"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, 4, 0] }}
          transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
        >
          {lang === 'FR' ? 'défiler' : 'scroll'}
        </motion.div>
      </section>

      {/* ─────────── PODCAST (light) ─────────── */}
      <section id="podcast" className="relative scroll-mt-28 bg-cream py-24 md:py-32 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 grid lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-20 items-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-brass/12 text-brassInk px-4 py-1.5 text-[0.62rem] font-sans uppercase tracking-[0.2em]">
              <Mic size={14} /> {lang === 'FR' ? 'Le podcast' : 'The podcast'}
            </span>
            <SectionTitle className="mt-6">{pod.title}</SectionTitle>
            <p className="mt-3 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft">{pod.subtitle}</p>
            <div className="mt-7 h-px w-16 bg-brass" />
            <ul className="mt-8 space-y-4">
              {pod.points?.map((p: string) => (
                <li key={p} className="flex items-start gap-3 font-sans text-[0.98rem] leading-relaxed text-inkSoft max-w-[44ch]">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-forest shrink-0" />{p}
                </li>
              ))}
            </ul>
            <a
              href="/podcast"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-espresso px-8 py-3.5 font-sans text-[0.7rem] uppercase tracking-[0.18em] text-ctext transition-colors duration-300 hover:bg-espressoDeep min-h-[44px]"
            >
              {pod.cta} <ArrowRight size={16} />
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-cream3 bg-card p-4 md:p-5 shadow-xl">
              <iframe
                style={{ borderRadius: '1.25rem' }}
                src={pod.spotifyUrl}
                width="100%" height="352"
                frameBorder={0}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title={pod.title}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LIVRES (light cream2) · id="livres" ─────────── */}
      <section id="livres" className="scroll-mt-28 bg-cream2 py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="max-w-[640px]">
            <Eyebrow>{lang === 'FR' ? 'Bibliothèque Inspirata · La Trilogie' : 'Inspirata Library · The Trilogy'}</Eyebrow>
            <SectionTitle className="mt-4">{book.title}</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft max-w-[46ch]">
              {lang === 'FR'
                ? 'Deux best-sellers, et un troisième tome à paraître. La même sagesse, livre après livre.'
                : 'Two best-sellers, and a third volume on the way. The same wisdom, book after book.'}
            </p>
            <div className="mt-5 h-px w-16 bg-brass" />
            {loadingShop && (
              <p className="mt-6 text-[0.7rem] uppercase tracking-[0.2em] text-inkSoft/50">
                {lang === 'FR' ? 'Synchronisation boutique…' : 'Syncing shop…'}
              </p>
            )}
          </Reveal>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-start">
            {book.items?.map((item: any, idx: number) => {
              const shopify = bookMatches.get(idx);
              const variant = shopify?.variants.find(v => v.availableForSale) || shopify?.variants[0];
              const canOrder = item.status === 'available' && !!variant;
              const displayPrice = variant ? formatMoney(variant.price, lang) : item.price;
              const isLocked = item.status === 'locked';
              const isOpen = bookOpen === idx;
              return (
                <Reveal key={idx} delay={(idx % 3) * 0.08}>
                  <article className="flex flex-col">
                    {/* Cover */}
                    <Parallax speed={idx === 1 ? 0.16 : 0.08}>
                    <div
                      onClick={() => !isLocked && setBookOpen(isOpen ? null : idx)}
                      className={`group relative w-full aspect-[1/1.3] rounded-l-[3px] rounded-r-[14px] overflow-hidden border-l-[6px] border-l-brass shadow-2xl transition-all duration-500 ${isLocked && !item.cover ? 'opacity-80' : 'cursor-pointer'} ${isOpen ? 'rotate-1 -translate-y-2' : 'hover:-translate-y-2 hover:rotate-1'}`}
                    >
                      {item.cover ? (
                        <img src={item.cover} alt={item.fullTitle || item.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-espressoDeep text-ctext p-6 text-center">
                          {isLocked ? <Lock size={34} className="text-brass/40 mb-4" /> : <BookOpen size={28} className="text-brass/50 mb-4" />}
                          <h4 className="font-serif text-xl uppercase tracking-[0.12em]">{item.title}</h4>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cream/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      {isLocked && (
                        <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-brass text-espressoDeep px-3 py-1 text-[0.58rem] uppercase tracking-[0.2em] font-bold shadow-md whitespace-nowrap">
                          {lang === 'FR' ? 'Parution · 4 nov. 2026' : 'Release · Nov 4 2026'}
                        </span>
                      )}
                    </div>
                    </Parallax>

                    {/* Meta */}
                    <h3 className="mt-7 font-serif text-2xl text-ink leading-snug">{item.title}</h3>
                    {(item.subtitle || item.desc) && (
                      <p className="mt-1.5 font-sans text-[0.86rem] text-inkSoft">{item.subtitle || item.desc}</p>
                    )}

                    {/* Locked · Tome 3 */}
                    {isLocked && (
                      <div className="mt-4 flex flex-col gap-2.5">
                        {item.publisher && <p className="font-serif italic text-[0.95rem] text-inkSoft/80">{item.publisher}</p>}
                        {item.captureCta && (
                          <button
                            type="button"
                            onClick={() => setWaitlistTarget({
                              id: 'parution-livre-3',
                              labelFR: 'Parution · Titre à révéler (février 2027)',
                              labelEN: 'Release · Title to be revealed (February 2027)',
                            })}
                            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-5 py-3 font-sans text-[0.66rem] uppercase tracking-[0.18em] text-ctext transition-colors hover:bg-espressoDeep min-h-[44px]"
                          >
                            {item.captureCta} <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Available · order */}
                    {item.status === 'available' && (
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-serif text-xl text-brassInk tabular-nums">{displayPrice}</span>
                          {item.reviews && (
                            <span className="inline-flex items-center gap-1.5 text-[0.8rem] text-inkSoft">
                              <Star size={13} className="text-brass fill-brass" /> {item.reviews}
                            </span>
                          )}
                        </div>
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
                            className="w-full rounded-full bg-brass py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
                          >
                            {lang === 'FR' ? 'Commander' : 'Order'}
                          </button>
                        ) : shopError ? (
                          <button disabled title={shopError} className="w-full rounded-full bg-cream3 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.18em] text-inkSoft/60 cursor-not-allowed">
                            {lang === 'FR' ? 'Boutique indisponible' : 'Shop unavailable'}
                          </button>
                        ) : loadingShop ? (
                          <button disabled className="w-full rounded-full bg-cream3 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.18em] text-inkSoft/50 cursor-wait">
                            {lang === 'FR' ? 'Chargement…' : 'Loading…'}
                          </button>
                        ) : (
                          <button disabled className="w-full rounded-full bg-cream3 py-3.5 font-sans text-[0.68rem] uppercase tracking-[0.18em] text-inkSoft/60 cursor-not-allowed">
                            {lang === 'FR' ? 'Bientôt en boutique' : 'Coming to shop'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expanded blurb */}
                    {isOpen && item.shortDesc && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
                        className="mt-5 rounded-2xl border border-cream3 bg-card p-6 shadow-sm">
                        <p className="font-sans text-[0.92rem] leading-[1.8] text-inkSoft whitespace-pre-line">{item.shortDesc}</p>
                        {item.features && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.features.map((f: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-brass/25 px-3 py-1 text-[0.75rem] text-brassInk">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────── SUR YOUTUBE (dark) — hero + lien unique, plus d'embeds ─────────── */}
      <section id="tv" className="relative scroll-mt-28 bg-espresso py-28 md:py-40 overflow-hidden">
        <Seam from="#f1ebe0" />
        {/* Orb ambiant + grain pour la matière */}
        <motion.span aria-hidden className="pointer-events-none absolute -top-32 right-[-8rem] h-[40rem] w-[40rem] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(187,154,94,0.14), transparent 70%)' }}
          animate={{ x: [0, -34, 0], y: [0, 24, 0] }}
          transition={{ duration: 30, ease: 'easeInOut', repeat: Infinity }} />
        <span aria-hidden className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

        <div className="relative z-10 mx-auto w-full max-w-[920px] px-6 md:px-12 text-center">
          <Reveal>
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brass text-espressoDeep mb-9 shadow-[0_0_50px_rgba(187,154,94,0.35)]">
              <Youtube size={38} />
            </span>
            <Eyebrow on="dark">{lang === 'FR' ? 'Émissions, entrevues & passages télé' : 'Shows, interviews & TV'}</Eyebrow>
            <SectionTitle on="dark" className="mt-5 mx-auto max-w-[20ch]">
              {lang === 'FR'
                ? <>Tout est rassemblé<br /><span className="italic font-normal text-brassBright">sur sa chaîne YouTube.</span></>
                : <>It all lives<br /><span className="italic font-normal text-brassBright">on her YouTube channel.</span></>}
            </SectionTitle>
            <p className="mt-7 font-serif italic text-[clamp(1.15rem,2.1vw,1.6rem)] text-ctextSoft max-w-[46ch] mx-auto">
              {lang === 'FR'
                ? 'Trois saisons de Santé la vie, Salut Bonjour, et toutes les capsules qui les ont précédées. Au même endroit, en accès libre.'
                : 'Three seasons of Santé la vie, Salut Bonjour, and every capsule that came before. All in one place, freely.'}
            </p>
          </Reveal>

          <Reveal delay={0.12} className="mt-11">
            <a
              href="https://www.youtube.com/@KrystineStLaurent"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3.5 rounded-full bg-brass px-9 py-5 font-sans text-[0.72rem] uppercase tracking-[0.18em] text-espressoDeep shadow-xl transition-all duration-300 hover:bg-brassBright hover:-translate-y-0.5 min-h-[44px]"
            >
              <Youtube size={18} />
              {lang === 'FR' ? 'Voir la chaîne YouTube' : 'Visit the YouTube channel'}
              <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <p className="mt-5 font-sans text-[0.8rem] tracking-[0.12em] text-ctextSoft/70">@KrystineStLaurent</p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── NEWSLETTER (dark) ─────────── */}
      <section className="bg-espressoDeep py-24 md:py-32 overflow-hidden">
        <div className="pointer-events-none absolute" />
        <div className="mx-auto w-full max-w-[760px] px-6 md:px-12 text-center">
          <Reveal>
            <Quote size={28} className="text-brass mx-auto mb-6" />
            <Eyebrow on="dark">{pod.newsletter?.title || (lang === 'FR' ? 'Restons connectés' : 'Stay connected')}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? <>Hors des réseaux,<br /><span className="italic font-normal text-brassBright">au fil des saisons.</span></> : <>Off the feeds,<br /><span className="italic font-normal text-brassBright">season after season.</span></>}
            </SectionTitle>
            <p className="mt-6 font-sans text-[1rem] leading-relaxed text-ctextSoft max-w-[48ch] mx-auto">
              {pod.newsletter?.desc || (lang === 'FR' ? 'Recevez chaque nouvel épisode et chaque parution directement par courriel.' : 'Get each new episode and release straight to your inbox.')}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup
              source="medias"
              variant="dark"
              ctaLabel={pod.newsletter?.button}
              className="max-w-[460px] mx-auto"
            />
          </Reveal>
        </div>
      </section>

      {/* Tome 3 launch waitlist */}
      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
    </div>
  );
};

export default MediasLoeuvre;
