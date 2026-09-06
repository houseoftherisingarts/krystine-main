import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDown, ArrowRight, Microphone, BookOpen, Television,
  Coins, Lock, Star,
} from '@phosphor-icons/react';
import { useApp } from '../../contexts/AppContext';
import { CONTENT } from '../../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../../shopify';
import NewsletterSignup from '../../components/NewsletterSignup';
import WaitlistModal, { type WaitlistTarget } from '../../components/WaitlistModal';
import BoutonCompte from '../../components/BoutonCompte';

gsap.registerPlugin(ScrollTrigger);

/**
 * Médias — même langage que /krystine (V2 « magazine crème »).
 * Cover photo-menée (la trilogie), podcast (embed Spotify), bibliothèque
 * (trilogie + Shopify/commande + Tome 3 en liste d'attente), YouTube/TV,
 * infolettre. Back-end préservé : CONTENT[lang].media, Shopify (getProducts +
 * addToCart), points, NewsletterSignup source="medias", WaitlistModal Tome 3,
 * scroll vers #livres. Animations transform/opacity (Poids-plume).
 */

const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const ease = [0.22, 1, 0.36, 1] as const;

/* ─── Shopify book matching (préservé de MediasLoeuvre) ─── */
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

const Kicker: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] ${className}`}>{children}</p>
);

export default function MediasV2() {
  const root = useRef<HTMLDivElement>(null);
  const { lang, addToCart, user } = useApp();
  const t = CONTENT[lang];
  const media = t.media;
  const pod = media.details.podcast;
  const book = media.details.book;
  const location = useLocation();

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

  // Scroll vers #livres quand on arrive via /medias#livres.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }, [location.hash, loadingShop]);

  // Motion (GSAP + Lenis), désactivé si reduced-motion.
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let lenis: Lenis | null = null;
    let split: SplitType | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);

    const onAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = root.current?.querySelector(href) as HTMLElement | null;
      if (target) { e.preventDefault(); lenis?.scrollTo(target, { offset: -72 }); }
    };

    const ctx = gsap.context(() => {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const power3 = 'power3.out';

      gsap.from('[data-line] > span', { yPercent: 115, duration: 1.2, ease: power3, stagger: 0.12, delay: 0.15 });
      gsap.from('[data-portrait-clip]', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.35, ease: power3, delay: 0.3 });
      gsap.from('[data-portrait-img]', { scale: 1.12, duration: 1.9, ease: power3, delay: 0.3 });
      gsap.from('[data-fade]', { opacity: 0, y: 22, duration: 1, ease: power3, stagger: 0.09, delay: 0.6 });
      gsap.to('[data-portrait-img]', {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });

      gsap.set('[data-reveal]', { opacity: 0, y: 36 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 86%',
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.05, ease: power3, stagger: 0.1, overwrite: true }),
      });
    }, root);

    root.current?.addEventListener('click', onAnchorClick);
    return () => {
      root.current?.removeEventListener('click', onAnchorClick);
      ctx.revert();
      split?.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
    };
  }, []);

  const navLinks = [
    ['Podcast', '#podcast'],
    ['Livres', '#livres'],
    ['À la télé', '#tv'],
  ];

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden"
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
        .v2-cue { animation: v2cue 2.4s ${EASE} infinite; }
        @media (prefers-reduced-motion: reduce) { .v2-cue { animation: none; } }
      `}</style>

      <div className="v2-grain" aria-hidden />

      {/* Menu unifié du site = NavBar global (affiché par App.tsx) */}

      {/* ─────────── HERO · couverture (plate paysage : la trilogie) ─────────── */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)] flex flex-col"
      >
        <div data-fade className="flex items-center justify-between border-t border-[#1c1712]/15 pt-3.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
          <span>N&deg; 03 &middot; Médias &amp; Voix</span>
          <span className="hidden sm:inline">Québec &middot; MMXXVI</span>
        </div>

        <div className="mt-[clamp(2rem,5vh,3.5rem)]">
          <p data-fade className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-6">La voix de Krystine</p>
          <h1 className="v2-serif font-light leading-[0.9] text-[#1c1712] text-[clamp(3.2rem,10vw,9rem)] max-w-[14ch]">
            <span data-line className="block overflow-hidden"><span className="block">Dans les médias</span></span>
          </h1>
          <p data-fade className="mt-7 v2-serif italic text-[clamp(1.3rem,2.4vw,1.95rem)] font-light leading-[1.32] text-[#3a2f23] max-w-[40ch]">
            Le podcast, les livres, la télé : les mots et la voix, au fil des saisons.
          </p>
          <div data-fade className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {navLinks.map(([label, href]) => (
              <a key={label} href={href} className="text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/70 border-b border-[#1c1712]/30 pb-1.5 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors duration-300">
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Plate paysage · la trilogie (ratio natif 16/9, aucun recadrage) */}
        <div className="mt-[clamp(2.5rem,6vh,4.5rem)] relative w-full">
          <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
          <div data-portrait-clip className="relative w-full aspect-[16/9] overflow-hidden" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
            <img
              data-portrait-img
              src="/accueil/assets/trilogy-books.png"
              alt="La trilogie Nature & Ayurveda, Féminité & Ayurveda et le tome 3 à paraître"
              className="h-full w-full object-cover object-center will-change-transform"
            />
            <span data-fade className="absolute -top-0 left-0 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em]">
              La Trilogie
            </span>
          </div>
          <p data-fade className="mt-3 v2-serif italic text-[#1c1712]/55 text-sm">
            Nature &amp; Ayurveda &middot; Féminité &amp; Ayurveda &middot; Tome 3 &middot; Éditions de l’Homme
          </p>
        </div>

        <div data-fade className="flex items-end justify-between border-b border-[#1c1712]/15 pb-3.5 mt-[clamp(2rem,5vh,3.5rem)] text-[0.6rem] uppercase tracking-[0.28em] text-[#1c1712]/55">
          <span className="flex items-center gap-2 v2-cue"><ArrowDown size={13} weight="regular" /> Faire défiler</span>
          <span className="hidden sm:inline">Podcast &middot; Livres &middot; Télé</span>
        </div>
      </section>

      {/* ─────────── CHAPITRE 01 · LE PODCAST ─────────── */}
      <section id="podcast" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 items-center">
          <div data-reveal>
            <Kicker className="mb-5">Chapitre 01 · Le podcast</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">{pod.title}</h2>
            <p className="mt-3 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23]">{pod.subtitle}</p>
            <span className="mt-7 block h-px w-12 bg-[#9c7a44]" aria-hidden />
            <ul className="mt-8 space-y-4">
              {pod.points?.map((p: string) => (
                <li key={p} className="flex items-start gap-3 text-[0.98rem] leading-relaxed text-[#3a2f23] max-w-[44ch]">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#9c7a44] shrink-0" />{p}
                </li>
              ))}
            </ul>
            <a
              href="/podcast"
              className="group mt-10 inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
            >
              {pod.cta} <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
          <div data-reveal>
            {/* Le podcast dans le canon KSL : vert profond, fil ambre, ivoire.
                La pochette et une invitation vers /podcast, où les épisodes
                s'écoutent; plus de lecteur tiers ni de fond rouge ici. */}
            <a
              href="/podcast"
              className="group relative block overflow-hidden rounded-[15px] bg-[#28352F] text-[#EEE7DB] shadow-[0_40px_80px_-50px_rgba(41,48,39,0.8)]"
            >
              <span className="pointer-events-none absolute inset-3 rounded-[11px] border border-[#BA7B39]/35" aria-hidden />
              <span aria-hidden className="pointer-events-none absolute -right-[20%] -top-[30%] h-[80%] w-[70%] rounded-full blur-[50px]"
                style={{ background: 'radial-gradient(circle, rgba(186,123,57,.38) 0%, rgba(40,53,47,0) 70%)' }} />
              <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center md:p-8">
                <img
                  src="/assets/podcast-cover.webp"
                  alt="Pochette du podcast Au-delà des tendances"
                  loading="lazy"
                  className="w-full max-w-[220px] rounded-[10px] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)] transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#BA7B39]">Au-delà des tendances</p>
                  <p className="mt-3 v2-serif text-[clamp(1.4rem,2.2vw,1.9rem)] font-light leading-[1.15]">Des conversations lentes, loin du bruit ambiant.</p>
                  <p className="mt-3 text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">Les épisodes, les directs et les rediffusions vous attendent sur la page du podcast.</p>
                  <span className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#BA7B39] px-5 py-2.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 group-hover:bg-[#d9a05b]">
                    Écouter les épisodes <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ─────────── CHAPITRE 02 · LES LIVRES (Shopify préservé) ─────────── */}
      <section id="livres" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6] scroll-mt-24">
        <div data-reveal className="max-w-[640px] mb-14">
          <Kicker className="mb-5">Chapitre 02 · La Trilogie</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">{book.title}</h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
            Deux best-sellers, et un troisième tome à paraître. La même sagesse, livre après livre.
          </p>
          {loadingShop && <p className="mt-6 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/40">Synchronisation boutique…</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12 items-start">
          {book.items?.map((item: any, idx: number) => {
            const shopify = bookMatches.get(idx);
            const variant = shopify?.variants.find(v => v.availableForSale) || shopify?.variants[0];
            const canOrder = item.status === 'available' && !!variant;
            const displayPrice = variant ? formatMoney(variant.price, lang) : item.price;
            const isLocked = item.status === 'locked';
            const isOpen = bookOpen === idx;
            return (
              <motion.article
                key={idx}
                data-reveal
                className="flex flex-col"
              >
                {/* Cover (cadre complet, jamais de filet latéral) */}
                <motion.div
                  onClick={() => !isLocked && setBookOpen(isOpen ? null : idx)}
                  whileHover={isLocked ? undefined : { y: -8 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                  className={`group relative w-full aspect-[1/1.3] overflow-hidden shadow-[0_18px_50px_rgba(28,23,18,0.18)] ${isLocked ? 'opacity-90' : 'cursor-pointer'}`}
                >
                  <span className="pointer-events-none absolute inset-0 z-10 border border-[#9c7a44]/30" aria-hidden />
                  {item.cover ? (
                    <img src={item.cover} alt={item.fullTitle || item.title} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#34241a] text-[#f4efe6] p-6 text-center">
                      {isLocked ? <Lock size={32} weight="light" className="text-[#9c7a44]/60 mb-4" /> : <BookOpen size={28} weight="light" className="text-[#9c7a44]/60 mb-4" />}
                      <h4 className="v2-serif text-xl">{item.title}</h4>
                    </div>
                  )}
                  {isLocked && (
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#9c7a44] text-[#1c1712] px-3 py-1 text-[0.56rem] uppercase tracking-[0.18em] whitespace-nowrap">
                      Parution · 4 nov. 2026
                    </span>
                  )}
                </motion.div>

                {/* Meta */}
                <h3 className="mt-7 v2-serif text-[1.6rem] font-light leading-snug text-[#1c1712]">{item.title}</h3>
                {(item.subtitle || item.desc) && (
                  <p className="mt-1.5 text-[0.86rem] text-[#1c1712]/60">{item.subtitle || item.desc}</p>
                )}

                {/* Locked · Tome 3 */}
                {isLocked && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {item.publisher && <p className="v2-serif italic text-[0.95rem] text-[#3a2f23]/85">{item.publisher}</p>}
                    {item.captureCta && (
                      <button
                        type="button"
                        onClick={() => setWaitlistTarget({
                          id: 'parution-livre-3',
                          labelFR: 'Parution · Titre à révéler (février 2027)',
                          labelEN: 'Release · Title to be revealed (February 2027)',
                        })}
                        className="mt-1 inline-flex items-center justify-center gap-2 bg-[#1c1712] py-3 px-5 text-[0.66rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors hover:bg-[#9c7a44]"
                      >
                        {item.captureCta} <ArrowRight size={14} weight="regular" />
                      </button>
                    )}
                  </div>
                )}

                {/* Available · commande */}
                {item.status === 'available' && (
                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="v2-serif text-xl text-[#7d6330] tabular-nums">{displayPrice}</span>
                      {item.reviews && (
                        <span className="inline-flex items-center gap-1.5 text-[0.8rem] text-[#1c1712]/60">
                          <Star size={13} weight="fill" className="text-[#7d6330]" /> {item.reviews}
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
                        className="w-full bg-[#1c1712] py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors hover:bg-[#9c7a44]"
                      >
                        {lang === 'FR' ? 'Commander' : 'Order'}
                      </button>
                    ) : shopError ? (
                      <button disabled title={shopError} className="w-full bg-[#e7ddcb] py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#1c1712]/50 cursor-not-allowed">
                        {lang === 'FR' ? 'Boutique indisponible' : 'Shop unavailable'}
                      </button>
                    ) : loadingShop ? (
                      <button disabled className="w-full bg-[#e7ddcb] py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#1c1712]/40 cursor-wait">
                        {lang === 'FR' ? 'Chargement…' : 'Loading…'}
                      </button>
                    ) : (
                      <button disabled className="w-full bg-[#e7ddcb] py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#1c1712]/50 cursor-not-allowed">
                        {lang === 'FR' ? 'Bientôt en boutique' : 'Coming to shop'}
                      </button>
                    )}
                  </div>
                )}

                {/* Expanded blurb */}
                {isOpen && item.shortDesc && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
                    className="mt-5 bg-[#faf6ee] p-6 border border-[#9c7a44]/20">
                    <p className="text-[0.92rem] leading-[1.8] text-[#3a2f23] whitespace-pre-line">{item.shortDesc}</p>
                    {item.features && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.features.map((f: string, i: number) => (
                          <span key={i} className="inline-flex items-center text-[0.72rem] uppercase tracking-[0.14em] text-[#7d6330] border border-[#9c7a44]/30 px-3 py-1">{f}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ─────────── CHAPITRE 03 · À LA TÉLÉ · SANTÉ LA VIE ─────────── */}
      <section id="tv" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24">
        <div data-reveal className="grid lg:grid-cols-[1fr_1fr] gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 items-center mb-14">
          <div>
            <Kicker className="mb-5">Chapitre 03 · À la télé</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,4rem)]">Santé la vie</h2>
            <p className="mt-3 v2-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">Trois saisons sur les ondes de MAtv</p>
            <p className="mt-7 text-[1rem] leading-[1.85] text-[#3a2f23] max-w-[56ch]">
              Pendant trois saisons, Krystine a conçu, produit et animé Santé la vie sur MAtv, avec son complice François Lemay. Le fil conducteur : relier les sagesses anciennes, l’Ayurveda en tête, aux réalités d’aujourd’hui. Mieux respirer, mieux manger, ralentir et revenir à son équilibre, par gestes simples, sans dogme, une chose à la fois. Ces épisodes vivent aujourd’hui dans votre espace, saison après saison.
            </p>
          </div>
          <div className="relative w-full">
            <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
            <div className="relative w-full aspect-[4/3] overflow-hidden">
              <img
                src="/sante-la-vie.jpg"
                alt="Krystine St-Laurent et son coanimateur François Lemay sur le plateau de l’émission Santé la vie (MAtv)"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        <div data-reveal className="grid md:grid-cols-2 gap-px bg-[#1c1712]/12 border border-[#1c1712]/12">
          {/* Redécouvrir sur YouTube · accès libre */}
          <div className="flex flex-col p-[clamp(1.75rem,3vw,2.75rem)] bg-[#faf6ee]">
            <span className="inline-grid place-items-center w-12 h-12 rounded-full border border-[#9c7a44]/40 text-[#7d6330] mb-7">
              <YoutubeLogo size={22} weight="light" />
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330] mb-4">En accès libre</span>
            <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#1c1712]">Redécouvrir les épisodes</h3>
            <p className="mt-4 text-[0.95rem] leading-[1.8] text-[#3a2f23] flex-1">
              Des épisodes de Santé la vie, des capsules et des passages télé sont rassemblés sur sa chaîne YouTube, à revoir librement, quand vous voulez.
            </p>
            <a
              href="https://www.youtube.com/@KrystineStLaurent"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex w-fit items-center gap-2.5 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712] pb-1.5 transition-colors duration-300 hover:text-[#7d6330] hover:border-[#9c7a44]"
            >
              Voir la chaîne YouTube
              <ArrowUpRight size={14} weight="regular" className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          {/* Coffret des 3 saisons · 30 $ */}
          <div className="flex flex-col p-[clamp(1.75rem,3vw,2.75rem)] bg-[#faf6ee]">
            <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-[#9c7a44] text-[#faf6ee] mb-7">
              <Television size={22} weight="light" />
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330] mb-4">Le coffret complet</span>
            <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#1c1712]">Les trois saisons réunies</h3>
            <p className="mt-4 text-[0.95rem] leading-[1.8] text-[#3a2f23] flex-1">
              L’intégrale de Santé la vie, les trois saisons réunies en un coffret, à revoir à votre rythme, où que vous soyez.
            </p>
            <div className="mt-8 pt-6 border-t border-[#1c1712]/12 flex items-end justify-between gap-4">
              <span className="v2-serif text-[clamp(2rem,4vw,2.8rem)] font-light leading-none text-[#7d6330] tabular-nums">30&nbsp;$</span>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex items-center gap-2.5 bg-[#1c1712]/15 px-7 py-3.5 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712]/45 cursor-not-allowed"
              >
                Bientôt disponible
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── INFOLETTRE (back-end préservé) ─────────── */}
      <section className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#f4efe6]">
        <div data-reveal className="max-w-[720px] mx-auto text-center">
          <Kicker className="mb-5">{pod.newsletter?.title || 'Restons connectés'}</Kicker>
          <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">
            Hors des réseaux, au fil des saisons
          </h2>
          <p className="mt-6 v2-serif italic text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[48ch] mx-auto leading-snug">
            {pod.newsletter?.desc || 'Recevez chaque nouvel épisode et chaque parution directement par courriel.'}
          </p>
          <div className="mt-10">
            <NewsletterSignup
              source="medias"
              variant="light"
              emailOnly
              ctaLabel={pod.newsletter?.button || 'Rejoindre le fil'}
              placeholder="Votre adresse courriel"
              className="max-w-xl mx-auto"
            />
          </div>
        </div>
      </section>

      {/* ─────────── CLÔTURE · back-cover ─────────── */}
      <footer className="relative w-full bg-[#34241a] text-[#f4efe6] px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(5rem,12vh,9rem)] pb-12">
        <div className="max-w-[860px] mx-auto text-center">
          <p className="v2-serif italic font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#f4efe6]">
            « Les mots et la voix, au fil des saisons. »
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
            <a
              href="#livres"
              className="group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#34241a] bg-[#f4efe6] px-8 py-3.5 transition-colors duration-300 hover:bg-[#9c7a44]"
            >
              Découvrir les livres
              <ArrowRight size={15} weight="regular" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a href="/krystine" className="inline-flex items-center gap-2.5 v2-serif italic text-lg text-[#f4efe6]/80 hover:text-[#c8a86a] transition-colors duration-300">
              La conférencière
            </a>
          </div>
        </div>
        <div className="mt-[clamp(4rem,9vh,7rem)] pt-7 border-t border-[#f4efe6]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-[0.6rem] uppercase tracking-[0.24em] text-[#f4efe6]/45">
          <span className="v2-serif normal-case tracking-tight text-[0.95rem] text-[#f4efe6]/80">
            Krystine <span className="italic font-light">St-Laurent</span>
          </span>
          <span>Inspira Nature &middot; Québec &middot; MMXXVI</span>
        </div>
      </footer>

      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
    </div>
  );
}
