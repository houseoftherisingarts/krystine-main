import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { goToRoute } from '../lib/staticRoutes';
import { points } from '../firebase/points';
import EditableText from '../components/edit/EditableText';

// Fuzzy title normalizer — reused from LivresPage to match books by Shopify title.
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

const MediasPage: React.FC = () => {
  const { lang, addToCart, user } = useApp();
  const t = CONTENT[lang];
  const media = t.media;
  const book = t.media.details.book;
  const navigate = useNavigate();
  const location = useLocation();

  // ── TV ──
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // ── Livres (Shopify integration) ──
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

  const bookMatches = useMemo(() => {
    const map = new Map<number, ShopifyProduct | undefined>();
    book.items?.forEach((item: any, idx: number) => {
      if (item.status !== 'available') return;
      map.set(idx, matchBookToShopify(item.title, item.fullTitle, products));
    });
    return map;
  }, [products, book.items]);

  // Scroll to section matching the hash when landing from /medias#livres etc.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [location.hash, loadingShop]);

  const pod = media.details.podcast;
  const tv = media.details.tv;

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-36 pb-24 text-[#0B1A36] dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="medias.hero.kicker"
              defaultValue={lang === 'FR' ? 'Découvrir' : 'Discover'}
            />
          </span>
          <h1 className="text-5xl md:text-7xl font-serif uppercase tracking-widest leading-none">
            <EditableText
              fieldKey="medias.hero.title"
              defaultValue={lang === 'FR' ? 'Podcasts, Médias & Livres' : 'Podcasts, Media & Books'}
            />
          </h1>
          <p className="mt-6 text-base md:text-lg text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-2xl mx-auto">
            <EditableText
              fieldKey="medias.hero.lead"
              defaultValue={lang === 'FR'
                ? 'Podcast, émissions, livres — les mots et la voix de Krystine, au fil des saisons.'
                : 'Podcast, TV shows, books — Krystine\'s words and voice, across the seasons.'}
              multiline
            />
          </p>
          <div className="w-24 h-1 bg-[#D4AF37] mt-6 mx-auto" />
        </div>

        {/* Overview — 4 square cards on the left, brand image on the right.
            Cards anchor-scroll to the matching stacked section below; "book"
            lands on #livres, "blog" opens the separate /blogue page. */}
        <div className="mb-24 flex flex-col lg:flex-row gap-16 items-center justify-center">
          {/* Cards */}
          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-6">
            {[
              { id: 'podcast',  href: '/podcast',  label: lang === 'FR' ? 'Podcast' : 'Podcast', icon: 'fa-microphone', onPage: false },
              { id: 'tv',       href: '#tv',       label: 'TV & YouTube',                         icon: 'fa-tv',         onPage: true },
              { id: 'book',     href: '#livres',   label: lang === 'FR' ? 'Livres' : 'Books',    icon: 'fa-book',       onPage: true },
              { id: 'blog',     href: '/blogue',   label: lang === 'FR' ? 'Blog' : 'Blog',       icon: 'fa-pen-nib',    onPage: false },
            ].map(item => {
              const cardInner = (
                <div className="rounded-[24px] aspect-square flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0B1A36]/60 border border-[#0B1A36]/5 dark:border-white/5 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-16 h-16 rounded-full bg-[#0B1A36]/5 dark:bg-white/5 flex items-center justify-center mb-4 text-[#0B1A36] dark:text-white group-hover:bg-[#0B1A36] group-hover:text-white transition-all duration-300 relative z-10">
                    <i className={`fa-solid ${item.icon} text-2xl`} />
                  </div>
                  <h3 className="text-lg font-serif text-[#0B1A36] dark:text-white relative z-10">{item.label}</h3>
                  <div className="w-8 h-px bg-[#D4AF37] mt-3 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center relative z-10" />
                </div>
              );
              return item.onPage ? (
                <a key={item.id} href={item.href} className="group cursor-pointer">{cardInner}</a>
              ) : (
                <a key={item.id} href={item.href} className="group cursor-pointer" onClick={e => { e.preventDefault(); goToRoute(navigate, item.href); }}>{cardInner}</a>
              );
            })}
          </div>

          {/* Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="w-full aspect-square rounded-[30px] overflow-hidden shadow-2xl relative group max-w-[500px]">
              <img
                src="https://storage.googleapis.com/inspirata/Base%20site/Gemini_Generated_Image_2cz8f92cz8f92cz8.png"
                alt="Inspirata Media"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36]/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* ── Podcast ── */}
        <section id="podcast" className="scroll-mt-32 mb-28">
          <div className="text-center mb-10">
            <span className="text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-2 block">Podcast</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-4">{pod.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif italic">{pod.subtitle}</p>
          </div>
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl overflow-hidden shadow-2xl mb-12">
              <iframe style={{ borderRadius: '12px' }} src={pod.spotifyUrl} width="100%" height="352" frameBorder={0} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
            </div>
            <div className="flex justify-center">
              <a
                href="/podcast"
                onClick={() => {
                  // Loyalty — 2 pts when a member engages with the podcast.
                  // Without per-episode tracking (the Spotify embed doesn't
                  // expose play events), we cap this at once per lifetime
                  // via the `podcast:overall:{uid}` dedup key.
                  if (user?.uid) {
                    points.podcastListened(user.uid, 'overall').catch(() => { /* non-fatal */ });
                  }
                }}
                className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors inline-flex items-center gap-2"
              >
                {pod.cta} <i className="fa-solid fa-arrow-right" />
              </a>
            </div>
          </div>
        </section>

        {/* ── TV ── */}
        <section id="tv" className="scroll-mt-32 mb-28">
          <div className="text-center mb-10">
            <span className="text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-2 block">TV &amp; YouTube</span>
            <h2 className="text-4xl md:text-5xl font-serif italic mb-4">{tv.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 max-w-2xl mx-auto">{tv.desc}</p>
          </div>

          {/* YouTube channel block — Krystine's channel, with a subscribe CTA.
              YouTube disallows embedding channel pages directly in an iframe,
              so we surface the channel handle + a one-click subscribe link. */}
          <a
            href="https://www.youtube.com/@KrystineStLaurent"
            target="_blank"
            rel="noopener noreferrer"
            className="group block mb-10 rounded-[24px] overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-gradient-to-br from-[#1A0000] via-[#2A0000] to-[#0B0000] text-white border border-white/5"
          >
            <div className="px-6 md:px-10 py-8 md:py-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* YouTube icon + "LIVE" pulse */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-[#FF0000] flex items-center justify-center shadow-[0_10px_30px_rgba(255,0,0,0.4)] group-hover:scale-105 transition-transform">
                  <i className="fa-brands fa-youtube text-white text-4xl" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF0000] animate-ping opacity-60" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF0000]" />
              </div>

              <div className="flex-1 text-center md:text-left">
                <span className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase font-bold text-[#FF4D4D] block mb-2">
                  {lang === 'FR' ? 'Chaîne YouTube' : 'YouTube Channel'}
                </span>
                <p className="font-serif text-2xl md:text-3xl mb-2">@KrystineStLaurent</p>
                <p className="text-sm text-white/70 leading-relaxed max-w-xl">
                  {lang === 'FR'
                    ? 'Entrevues, capsules et replays. Abonnez-vous pour recevoir les prochaines publications.'
                    : 'Interviews, capsules and replays. Subscribe to get the next uploads.'}
                </p>
              </div>

              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF0000] group-hover:bg-white text-white group-hover:text-[#FF0000] font-bold uppercase tracking-[0.25em] text-[11px] whitespace-nowrap transition-colors flex-shrink-0">
                <i className="fa-brands fa-youtube text-sm" />
                {lang === 'FR' ? "S'abonner" : 'Subscribe'}
              </span>
            </div>
          </a>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tv.videos?.map((v: any, i: number) => (
              <div key={i} className="group bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg overflow-hidden border border-[#0B1A36]/5 dark:border-white/5 hover:shadow-2xl transition-all">
                <div
                  className="relative aspect-video bg-black cursor-pointer"
                  onClick={() => {
                    const nextId = activeVideo === v.id ? null : v.id;
                    setActiveVideo(nextId);
                    // Loyalty — award 3 pts the first time this member plays
                    // this video. Dedupped per (videoId, uid) so replays are
                    // silent no-ops.
                    if (nextId && user?.uid) {
                      points.videoWatched(user.uid, v.id).catch(() => { /* non-fatal */ });
                    }
                  }}
                >
                  {activeVideo === v.id ? (
                    <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title} frameBorder={0} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
                  ) : (
                    <>
                      {/* YouTube's hqdefault is always available (unlike maxresdefault,
                          which 404s on older uploads). Fall back to sddefault if the
                          hq one ever fails. */}
                      <img
                        src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${v.id}/sddefault.jpg`; }}
                        alt={v.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_8px_28px_rgba(0,0,0,0.35)] group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:scale-110 transition-all">
                          <i className="fa-solid fa-play text-white group-hover:text-[#0B1A36] text-lg ml-1 transition-colors" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="p-5 text-center">
                  <h3 className="font-serif text-lg">{v.title}</h3>
                  <span className="text-xs text-[#0B1A36]/40 dark:text-white/40 uppercase tracking-widest">{lang === 'FR' ? `Épisode ${i + 1}` : `Episode ${i + 1}`}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Livres ── Merged from /livres */}
        <section id="livres" className="scroll-mt-32 mb-28">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? 'Bibliothèque Inspirata' : 'Inspirata Library'}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif">{book.title}</h2>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-6" />
            {loadingShop && (
              <p className="mt-6 text-xs uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                {lang === 'FR' ? 'Synchronisation boutique…' : 'Syncing shop…'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {book.items?.map((item: any, idx: number) => {
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
                  <div className={`w-full aspect-[1/1.3] rounded-r-[16px] rounded-l-[3px] mb-8 overflow-hidden relative shadow-2xl border-l-4 border-[#0B1A36]/10 transition-all duration-500 ${bookOpen === idx ? 'rotate-3 translate-y-[-12px] shadow-[0_30px_60px_rgba(0,0,0,0.3)]' : 'group-hover:-translate-y-4 group-hover:rotate-1'}`}>
                    {item.cover ? (
                      <div className="absolute inset-0" style={{ backgroundImage: `url(${item.cover})`, backgroundSize: '100% 100%' }} />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1A36] text-white p-6">
                        {item.status === 'locked' ? <i className="fa-solid fa-lock text-4xl text-white/20 mb-4" /> : <i className="fa-solid fa-leaf text-2xl text-[#D4AF37] mb-4 opacity-60" />}
                        <h4 className="font-serif text-xl uppercase tracking-widest">{item.title}</h4>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                  <h3 className="text-2xl font-serif mb-2 group-hover:text-[#D4AF37] transition-colors">{item.title}</h3>
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
                        <button disabled title={shopError} className="w-full bg-[#0B1A36]/30 dark:bg-white/10 text-white/80 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-not-allowed">
                          {lang === 'FR' ? 'Boutique indisponible' : 'Shop unavailable'}
                        </button>
                      ) : loadingShop ? (
                        <button disabled className="w-full bg-[#0B1A36]/20 dark:bg-white/5 text-[#0B1A36]/50 dark:text-white/50 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-wait">
                          <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                          {lang === 'FR' ? 'Chargement…' : 'Loading…'}
                        </button>
                      ) : (
                        <button disabled className="w-full bg-[#0B1A36]/30 dark:bg-white/10 text-white/80 py-3 rounded-full font-bold uppercase tracking-widest text-xs cursor-not-allowed">
                          {lang === 'FR' ? 'Bientôt en boutique' : 'Coming to shop'}
                        </button>
                      )}
                      {item.reviews && (
                        <p className="text-xs text-[#0B1A36]/40 dark:text-white/40">
                          <i className="fa-solid fa-star text-[#D4AF37] mr-1" /> {item.reviews}
                        </p>
                      )}
                    </div>
                  )}
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
        </section>

      </div>
    </div>
  );
};

export default MediasPage;
