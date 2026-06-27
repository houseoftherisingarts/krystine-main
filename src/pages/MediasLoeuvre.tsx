import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Tv, BookOpen, ArrowRight, Youtube, Play, Lock, Star, Quote } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { points } from '../firebase/points';
import { useTVPlaylists } from '../lib/youtube';
import NewsletterSignup from '../components/NewsletterSignup';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import { KenBurns, Seam } from '../components/motion/loeuvre';

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
  const tv = media.details.tv;
  const book = media.details.book;
  const location = useLocation();

  // ── TV / YouTube — curated playlists ──
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const tvPlaylists = useTVPlaylists();

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

      {/* ─────────── HERO (crème texturé, Ken Burns + voile) ─────────── */}
      <section className="relative min-h-screen flex items-end overflow-hidden bg-cream">
        <KenBurns src="/krystine-bg.jpg" />
        {/* voile bas : lisibilité du titre + fondu vers la section crème suivante */}
        <span aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(246,243,238,0.94) 0%, rgba(246,243,238,0.35) 32%, transparent 64%)' }} />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 pb-20 md:pb-28">
          <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease }} className="max-w-[44ch]">
            <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brassInk mb-7">
              {lang === 'FR' ? 'Médias · La voix de Krystine' : 'Media · Krystine’s voice'}
            </p>
            <h1 className="font-serif font-medium text-ink leading-[0.96] text-[clamp(2.6rem,6.2vw,5rem)]">
              {lang === 'FR' ? 'Krystine dans les médias.' : 'Krystine in the media.'}
            </h1>
            <p className="mt-6 font-serif italic text-[clamp(1.3rem,2.6vw,2rem)] leading-snug text-inkSoft max-w-[30ch]">
              {lang === 'FR'
                ? <>Le podcast, les livres, la télé : <span className="text-brassInk not-italic">les mots et la voix</span>, au fil des saisons.</>
                : <>The podcast, the books, the TV: <span className="text-brassInk not-italic">the words and the voice</span>, season after season.</>}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {NAV.map(n => (
                <a key={n.id} href={n.href}
                  className="inline-flex items-center gap-2.5 rounded-full border border-brassInk/30 bg-brass/10 px-5 py-2.5 font-sans text-[0.68rem] uppercase tracking-[0.16em] text-brassInk transition-colors duration-300 hover:bg-brass hover:text-espressoDeep min-h-[44px]">
                  <n.icon size={15} /> {n.label}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
        {/* indice de défilement */}
        <motion.div
          aria-hidden
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[0.58rem] uppercase tracking-[0.3em] text-ink/45"
          animate={{ opacity: [0.4, 1, 0.4], y: [0, 4, 0] }}
          transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
        >
          {lang === 'FR' ? 'défiler' : 'scroll'}
        </motion.div>
      </section>

      {/* ─────────── PODCAST (light) ─────────── */}
      <section id="podcast" className="relative scroll-mt-28 bg-cream py-24 md:py-32 overflow-hidden">
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
              onClick={() => { if (user?.uid) points.podcastListened(user.uid, 'overall').catch(() => {}); }}
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
                    <div
                      onClick={() => !isLocked && setBookOpen(isOpen ? null : idx)}
                      className={`group relative w-full aspect-[1/1.3] rounded-l-[3px] rounded-r-[14px] overflow-hidden border-l-[6px] border-l-brass shadow-2xl transition-all duration-500 ${isLocked ? 'opacity-80' : 'cursor-pointer'} ${isOpen ? 'rotate-1 -translate-y-2' : 'hover:-translate-y-2 hover:rotate-1'}`}
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
                              labelFR: 'Parution · Titre à révéler (4 novembre 2026)',
                              labelEN: 'Release · Title to be revealed (November 4, 2026)',
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

      {/* ─────────── TÉLÉ / YOUTUBE (dark) ─────────── */}
      <section id="tv" className="relative scroll-mt-28 bg-espressoSoft py-24 md:py-32 overflow-hidden">
        <Seam from="#ede5d7" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="max-w-[640px]">
            <Eyebrow on="dark">{lang === 'FR' ? 'À la télé & YouTube' : 'TV & YouTube'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">{tv.title}</SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-ctextSoft max-w-[50ch]">{tv.desc}</p>
            <div className="mt-5 h-px w-16 bg-brass" />
          </Reveal>

          {/* YouTube channel band */}
          <Reveal delay={0.08} className="mt-12">
            <a href="https://www.youtube.com/@KrystineStLaurent" target="_blank" rel="noopener noreferrer"
              className="group flex flex-col md:flex-row items-center gap-6 md:gap-10 rounded-[1.8rem] border border-brass/20 bg-espresso px-6 md:px-10 py-8">
              <span className="grid place-items-center w-16 h-16 rounded-2xl bg-brass text-espressoDeep shrink-0 transition-transform group-hover:scale-105">
                <Youtube size={30} />
              </span>
              <div className="flex-1 text-center md:text-left">
                <span className="block text-[0.6rem] uppercase tracking-[0.24em] text-brass font-semibold mb-2">{lang === 'FR' ? 'Chaîne YouTube' : 'YouTube Channel'}</span>
                <p className="font-serif text-2xl md:text-3xl text-ctext">@KrystineStLaurent</p>
                <p className="mt-2 font-sans text-[0.9rem] text-ctextSoft/80 max-w-xl">
                  {lang === 'FR' ? 'Entrevues, capsules et rediffusions. Abonnez-vous pour les prochaines publications.' : 'Interviews, capsules and replays. Subscribe to get the next uploads.'}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brass px-6 py-3 font-sans text-[0.66rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors group-hover:bg-brassBright whitespace-nowrap shrink-0">
                <Youtube size={15} /> {lang === 'FR' ? "S'abonner" : 'Subscribe'}
              </span>
            </a>
          </Reveal>

          {/* Curated playlists */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-7">
            {tvPlaylists.map((p, idx) => (
              <Reveal key={p.listId} delay={(idx % 2) * 0.06}>
                <div className="group rounded-[1.6rem] border border-brass/20 bg-espresso overflow-hidden shadow-lg transition-shadow hover:shadow-2xl">
                  <div
                    className="relative aspect-video bg-espressoDeep cursor-pointer"
                    onClick={() => {
                      const nextId = activeListId === p.listId ? null : p.listId;
                      setActiveListId(nextId);
                      if (nextId && user?.uid) points.videoWatched(user.uid, p.videoId).catch(() => {});
                    }}
                  >
                    {activeListId === p.listId ? (
                      <iframe
                        width="100%" height="100%"
                        src={`https://www.youtube.com/embed/${p.videoId}?list=${p.listId}&autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                        title={p.title || `Playlist ${idx + 1}`}
                        referrerPolicy="strict-origin-when-cross-origin"
                        frameBorder={0}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <>
                        <img
                          src={p.thumbnail}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${p.videoId}/hqdefault.jpg`; }}
                          alt={p.title || `Playlist ${idx + 1}`}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-espressoDeep/70 via-espressoDeep/10 to-transparent" />
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-espressoDeep/80 text-ctext px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em] font-bold backdrop-blur-sm">
                          {lang === 'FR' ? 'Playlist' : 'Playlist'}
                        </span>
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="grid place-items-center w-16 h-16 rounded-full bg-cream/15 border border-cream/30 backdrop-blur-md shadow-xl transition-all group-hover:bg-brass group-hover:border-brass group-hover:scale-110">
                            <Play size={20} className="text-ctext ml-0.5 transition-colors group-hover:text-espressoDeep" />
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-5 text-center">
                    <h3 className="font-serif text-lg text-ctext line-clamp-2">{p.title || `Playlist ${idx + 1}`}</h3>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.18em] text-brass">
                      <Play size={11} /> {lang === 'FR' ? 'Regarder la série' : 'Watch the series'}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
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
