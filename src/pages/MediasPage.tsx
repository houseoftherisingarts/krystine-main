import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { addDoshaQuizResult, updateMember } from '../firebase/firestore';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';

// Dosha quiz — same 4 questions used previously on /ayurveda.
const QUIZ_DATA = [
  { question: "Comment décririez-vous votre digestion ?", qEN: "How would you describe your digestion?", options: [{ text: "Inconstante, votre appétit fluctue.", textEN: "Inconsistent, your appetite fluctuates.", type: 'vata' }, { text: "Forte, vous devenez irritable si vous mangez tard.", textEN: "Strong, you become irritable if you eat late.", type: 'pitta' }, { text: "Stable, vous vous sentez rassasié longtemps.", textEN: "Stable, you feel full for a long time.", type: 'kapha' }] },
  { question: "Comment réagissez-vous au stress ?", qEN: "How do you react to stress?", options: [{ text: "Anxieux et inquiet.", textEN: "Anxious and worried.", type: 'vata' }, { text: "Irritable et impatient.", textEN: "Irritable and impatient.", type: 'pitta' }, { text: "Vous retirez et évitez les conflits.", textEN: "You withdraw and avoid conflict.", type: 'kapha' }] },
  { question: "Comment gérez-vous votre créativité ?", qEN: "How do you manage your creativity?", options: [{ text: "Très créatif, plusieurs projets à la fois.", textEN: "Very creative, multiple projects at once.", type: 'vata' }, { text: "Créatif dans le leadership.", textEN: "Creative in leadership.", type: 'pitta' }, { text: "Méthodique, calme, ancré.", textEN: "Methodical, calm, grounded.", type: 'kapha' }] },
  { question: "Comment décririez-vous votre tempérament ?", qEN: "How would you describe your temperament?", options: [{ text: "Enthousiaste, aime les nouvelles choses.", textEN: "Enthusiastic, loves new things.", type: 'vata' }, { text: "Déterminé, axé sur les objectifs.", textEN: "Determined, goal-oriented.", type: 'pitta' }, { text: "Facile à vivre, suit le courant.", textEN: "Easy-going, goes with the flow.", type: 'kapha' }] },
];

const AyurvedaIkigai: React.FC<{ doshas: any[]; onDoshaClick: (d: any) => void; onQuizClick: () => void; lang: string }> = ({ doshas, onDoshaClick, onQuizClick, lang }) => (
  <svg viewBox="-200 -200 400 400" className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] overflow-visible drop-shadow-2xl">
    <defs>
      <filter id="glow-ay-m">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {[
      { cx: -60, cy: -50, fill: '#8F9779', dosha: doshas[0] },
      { cx: 60, cy: -50, fill: '#BC4A3C', dosha: doshas[1] },
      { cx: 0, cy: 70, fill: '#4A7C9D', dosha: doshas[2] },
    ].map(({ cx, cy, fill, dosha }, i) => (
      <g key={i} onClick={() => onDoshaClick(dosha)} className="cursor-pointer group">
        <circle cx={cx} cy={cy} r={90} fill={fill} opacity={0.9} className="transition-all duration-300 hover:opacity-100" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="16" fontFamily="serif" fontWeight="bold" letterSpacing="2" className="pointer-events-none uppercase">{dosha.name}</text>
      </g>
    ))}
    <g onClick={onQuizClick} className="cursor-pointer group">
      <circle cx={0} cy={10} r={55} fill="rgba(255,255,255,0.88)" stroke="rgba(212,175,55,0.3)" strokeWidth={1} filter="url(#glow-ay-m)" className="transition-all duration-300 hover:scale-105" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      <text x={0} y={4} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Faire' : 'Take'}</text>
      <text x={0} y={20} textAnchor="middle" fill="#0B1A36" fontSize="13" fontFamily="serif" fontWeight="bold" className="pointer-events-none uppercase tracking-widest">{lang === 'FR' ? 'Le Quiz' : 'The Quiz'}</text>
    </g>
  </svg>
);

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
  const { lang, addToCart, user, member, setSignInOpen } = useApp();
  const t = CONTENT[lang];
  const media = t.media;
  const ay = t.ayurveda;
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

  // ── Ayurveda / Quiz ──
  const [selectedDosha, setSelectedDosha] = useState<any>(null);
  const [quizState, setQuizState] = useState({
    isOpen: false, step: 0,
    scores: { vata: 0, pitta: 0, kapha: 0 },
    formData: { firstName: '', lastName: '', email: '' },
    teaser: null as null | { dominant: any; percentages: { vata: number; pitta: number; kapha: number } },
    result: null as any,
  });
  const [submitting, setSubmitting] = useState(false);

  const computeTeaser = (scores: { vata: number; pitta: number; kapha: number }) => {
    const { vata, pitta, kapha } = scores;
    let dominant = ay.doshas[0];
    if (pitta > vata && pitta > kapha) dominant = ay.doshas[1];
    if (kapha > vata && kapha > pitta) dominant = ay.doshas[2];
    const total = vata + pitta + kapha || 1;
    return {
      dominant,
      percentages: {
        vata: Math.round((vata / total) * 100),
        pitta: Math.round((pitta / total) * 100),
        kapha: Math.round((kapha / total) * 100),
      },
    };
  };

  const handleQuizAnswer = (type: string) => {
    const newScores = { ...quizState.scores, [type]: quizState.scores[type as keyof typeof quizState.scores] + 1 };
    const nextStep = quizState.step + 1;
    const teaser = nextStep >= QUIZ_DATA.length ? computeTeaser(newScores) : quizState.teaser;
    setQuizState({ ...quizState, scores: newScores, step: nextStep, teaser });
  };

  const handleQuizCompute = async () => {
    if (!user) { setSignInOpen(true); return; }
    const { dominant, percentages } = quizState.teaser ?? computeTeaser(quizState.scores);
    const fullName = (member?.displayName || user.displayName || '').trim();
    const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [''];
    const lastName = rest.join(' ');
    setSubmitting(true);
    try {
      await addDoshaQuizResult({
        uid: user.uid,
        firstName: firstName || '',
        lastName: lastName || '',
        email: user.email || '',
        dominant: dominant.name,
        ...percentages,
      } as any);
      try { await updateMember(user.uid, { dosha: dominant.name }); } catch { /* non-fatal */ }
    } catch {}
    finally { setSubmitting(false); }
    setQuizState(qs => ({ ...qs, result: { dominant, percentages } }));
  };

  useEffect(() => {
    if (user && quizState.isOpen && quizState.step >= QUIZ_DATA.length && !quizState.result && !submitting) {
      handleQuizCompute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, quizState.step, quizState.isOpen]);

  // Scroll to section matching the hash when landing from /medias#livres etc.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [location.hash, loadingShop]);

  const openQuiz = () => setQuizState({ ...quizState, isOpen: true, step: 0, scores: { vata: 0, pitta: 0, kapha: 0 }, result: null });

  const pod = media.details.podcast;
  const tv = media.details.tv;

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-36 pb-24 text-[#0B1A36] dark:text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            {lang === 'FR' ? 'Découvrir' : 'Discover'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif uppercase tracking-widest leading-none">
            {lang === 'FR' ? 'Podcasts, Médias & Livres' : 'Podcasts, Media & Books'}
          </h1>
          <p className="mt-6 text-base md:text-lg text-[#0B1A36]/60 dark:text-white/60 font-serif italic max-w-2xl mx-auto">
            {lang === 'FR'
              ? 'Podcast, émissions, livres, Ayurveda et le quiz dosha — tout ce qu\'il faut pour commencer à écouter votre nature.'
              : 'Podcast, TV shows, books, Ayurveda, and the dosha quiz — everything you need to start listening to your nature.'}
          </p>
          <div className="w-24 h-1 bg-[#D4AF37] mt-6 mx-auto" />

          {/* Anchor nav — quick jumps between the stacked sections */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {[
              { id: 'podcast', label: lang === 'FR' ? 'Podcast' : 'Podcast', icon: 'fa-microphone' },
              { id: 'tv', label: lang === 'FR' ? 'Télé' : 'TV', icon: 'fa-tv' },
              { id: 'livres', label: lang === 'FR' ? 'Livres' : 'Books', icon: 'fa-book' },
              { id: 'ayurveda', label: 'Ayurveda', icon: 'fa-leaf' },
              { id: 'quiz', label: lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz', icon: 'fa-compass' },
            ].map(s => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0B1A36]/15 dark:border-white/15 text-xs uppercase tracking-widest font-bold text-[#0B1A36]/70 dark:text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors">
                <i className={`fa-solid ${s.icon} text-[10px]`} />{s.label}
              </a>
            ))}
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
              <a href={pod.ctaLink} target="_blank" rel="noopener noreferrer"
                className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors inline-flex items-center gap-2">
                {pod.cta} <i className="fa-solid fa-arrow-right" />
              </a>
            </div>
          </div>
        </section>

        {/* ── TV ── */}
        <section id="tv" className="scroll-mt-32 mb-28">
          <div className="text-center mb-10">
            <span className="text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-2 block">{lang === 'FR' ? 'Télé' : 'TV'}</span>
            <h2 className="text-4xl md:text-5xl font-serif italic mb-4">{tv.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 max-w-2xl mx-auto">{tv.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {tv.videos?.map((v: any, i: number) => (
              <div key={i} className="group bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg overflow-hidden border border-[#0B1A36]/5 dark:border-white/5 hover:shadow-2xl transition-all">
                <div className="relative aspect-video bg-black cursor-pointer" onClick={() => setActiveVideo(activeVideo === v.id ? null : v.id)}>
                  {activeVideo === v.id ? (
                    <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title} frameBorder={0} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-[#0B1A36] flex items-center justify-center">
                        <img src={ASSETS.logo} className="w-24 h-auto opacity-40" alt="" style={{ filter: 'invert(1) brightness(1.5)' }} />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-play text-white ml-1" />
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

        {/* ── Ayurveda ── Merged from /ayurveda */}
        <section id="ayurveda" className="scroll-mt-32 mb-28">
          <div className="text-center mb-16 max-w-6xl mx-auto">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">Ayurveda</span>
            <h2 className="text-3xl md:text-5xl font-serif mb-6 tracking-wide">{ay.whatIsTitle}</h2>
            <p className="text-[#0B1A36]/80 dark:text-white/80 font-serif text-lg md:text-2xl leading-relaxed italic max-w-4xl mx-auto">{ay.whatIsText}</p>
            <div className="w-16 h-1 bg-[#D4AF37] mx-auto mt-8" />
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-12 lg:gap-24">
            <div className="relative flex items-center justify-center lg:w-1/2">
              <AyurvedaIkigai doshas={ay.doshas} onDoshaClick={setSelectedDosha} onQuizClick={openQuiz} lang={lang} />
              {selectedDosha && (
                <div className="absolute z-30 inset-0 flex items-center justify-center">
                  <div className="bg-white dark:bg-[#0B1A36] p-8 rounded-[30px] shadow-2xl max-w-xs md:max-w-sm text-center relative border border-[#D4AF37]/20">
                    <button onClick={() => setSelectedDosha(null)} className="absolute top-3 right-4 text-[#0B1A36]/40 dark:text-white/40 hover:text-[#0B1A36] text-2xl">×</button>
                    <h3 className="text-3xl font-serif font-bold mb-2 text-[#D4AF37]">{selectedDosha.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 mb-4">{selectedDosha.elements}</p>
                    <div className="w-12 h-px bg-[#D4AF37]/30 mx-auto mb-4" />
                    <p className="text-[#0B1A36]/80 dark:text-white/80 text-sm leading-relaxed mb-4">{selectedDosha.definition}</p>
                    <p className="text-[#D4AF37] font-serif italic">{selectedDosha.action}</p>
                    <div className="mt-6 pt-4 border-t border-[#0B1A36]/10">
                      <button
                        onClick={() => { addToCart({ title: selectedDosha.productRecom, price: '48.00 CAD', type: 'Soin Ayurvédique' }); setSelectedDosha(null); }}
                        className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-2 rounded-full text-xs font-bold uppercase hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                      >
                        {lang === 'FR' ? 'Ajouter' : 'Add'} {selectedDosha.productRecom}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:w-1/2 text-center lg:text-left max-w-xl">
              <span className="text-[#D4AF37] uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{ay.introTitle}</span>
              <h3 className="text-3xl md:text-5xl font-serif mb-6">{ay.title}</h3>
              <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif text-lg leading-relaxed mb-6 italic">{ay.introText}</p>
              <div className="bg-white dark:bg-[#0B1A36]/60 border border-[#0B1A36]/5 dark:border-white/5 p-8 rounded-[24px] shadow-lg mb-8">
                <p className="text-[#0B1A36]/80 dark:text-white/80 leading-relaxed mb-4 font-medium">{ay.desc}</p>
                <p className="text-[#0B1A36] dark:text-white font-bold">{ay.quizPrompt}</p>
              </div>
              <a href="#quiz" onClick={e => { e.preventDefault(); openQuiz(); }}
                className="inline-block bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors">
                {ay.quizBtn}
              </a>
            </div>
          </div>
        </section>

        {/* ── Quiz section ── Trigger lives here too, so the anchor in the subnav has a target. */}
        <section id="quiz" className="scroll-mt-32 mb-8">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-[#0B1A36] to-[#1A2642] rounded-[30px] p-12 text-white border border-[#D4AF37]/20 shadow-2xl">
            <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
              {lang === 'FR' ? 'Quiz Dosha' : 'Dosha Quiz'}
            </span>
            <h2 className="text-3xl md:text-5xl font-serif mb-4">{ay.title}</h2>
            <p className="text-white/70 font-serif italic mb-8 max-w-xl mx-auto">
              {lang === 'FR'
                ? 'Quatre questions pour dévoiler votre dominance du moment. Résultat immédiat, sauvegarde dans votre espace client.'
                : 'Four questions to reveal your current dominance. Instant result, saved in your client space.'}
            </p>
            <button onClick={openQuiz}
              className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:scale-105 transition-transform">
              <i className="fa-solid fa-compass" /> {ay.quizBtn}
            </button>
          </div>
        </section>
      </div>

      {/* ── Quiz Modal ── */}
      {quizState.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1A36]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B1A36] w-full max-w-2xl rounded-[30px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#0B1A36]/10 dark:border-white/10 flex justify-between items-center bg-[#F5F5F0] dark:bg-white/5">
              <div>
                <h3 className="font-serif text-2xl">Dosha Quiz</h3>
                <p className="text-xs text-[#D4AF37] uppercase tracking-widest font-bold mt-1">
                  {quizState.result
                    ? (lang === 'FR' ? 'Résultats' : 'Results')
                    : quizState.step < QUIZ_DATA.length
                      ? `${lang === 'FR' ? 'Question' : 'Question'} ${quizState.step + 1} / ${QUIZ_DATA.length + 1}`
                      : (lang === 'FR' ? 'Finalisation' : 'Finalizing')}
                </p>
              </div>
              <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#0B1A36]/40 hover:text-[#0B1A36] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-xl" />
              </button>
            </div>
            {!quizState.result && (
              <div className="w-full h-1 bg-[#0B1A36]/5">
                <div className="h-full bg-[#D4AF37] transition-all duration-500" style={{ width: `${((quizState.step + 1) / (QUIZ_DATA.length + 1)) * 100}%` }} />
              </div>
            )}
            <div className="p-8 overflow-y-auto flex-1">
              {!quizState.result ? (
                quizState.step < QUIZ_DATA.length ? (
                  <div>
                    <h4 className="text-xl md:text-2xl font-serif mb-8 leading-relaxed">
                      {lang === 'FR' ? QUIZ_DATA[quizState.step].question : QUIZ_DATA[quizState.step].qEN}
                    </h4>
                    <div className="space-y-4">
                      {QUIZ_DATA[quizState.step].options.map((opt, idx) => (
                        <button key={idx} onClick={() => handleQuizAnswer(opt.type)}
                          className="w-full text-left p-4 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all group shadow-sm bg-white/50 dark:bg-white/5">
                          <div className="flex items-start gap-4">
                            <div className="w-5 h-5 rounded-full border border-[#0B1A36]/20 dark:border-white/20 flex items-center justify-center mt-0.5 group-hover:border-[#D4AF37] flex-shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[#0B1A36]/80 dark:text-white/80 text-sm leading-relaxed">
                              {lang === 'FR' ? opt.text : opt.textEN}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center max-w-md mx-auto py-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-3">
                      {lang === 'FR' ? 'Votre nature dominante' : 'Your dominant nature'}
                    </p>
                    <h2 className="text-5xl font-serif font-bold text-[#D4AF37] mb-4">{quizState.teaser?.dominant.name}</h2>
                    {quizState.teaser && (
                      <div className="flex justify-center gap-8 mb-6 text-sm text-[#0B1A36]/70 dark:text-white/70">
                        {(['vata', 'pitta', 'kapha'] as const).map(d => (
                          <div key={d} className="flex flex-col items-center">
                            <span className="font-bold text-[#D4AF37] text-lg">{quizState.teaser!.percentages[d]}%</span>
                            <span className="capitalize text-xs uppercase tracking-widest">{d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {quizState.teaser?.dominant.elements && (
                      <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#0B1A36]/50 dark:text-white/50 mb-6">{quizState.teaser.dominant.elements}</p>
                    )}
                    <div className="border-t border-[#0B1A36]/10 dark:border-white/10 pt-6 mt-6">
                      <div className="flex items-center gap-3 mb-4 justify-center">
                        <i className="fa-solid fa-lock text-[#D4AF37] text-sm" />
                        <span className="text-xs uppercase tracking-[0.25em] font-bold text-[#0B1A36]/70 dark:text-white/70">{lang === 'FR' ? 'Profil complet' : 'Full profile'}</span>
                      </div>
                      <p className="text-[#0B1A36]/60 dark:text-white/60 mb-6 text-sm leading-relaxed">
                        {user
                          ? (lang === 'FR' ? 'Enregistrez votre résultat dans votre espace client pour accéder aux rituels et recommandations personnalisés.' : 'Save your result to your client space to unlock personalized rituals and recommendations.')
                          : (lang === 'FR' ? 'Connectez-vous pour enregistrer votre profil et débloquer vos rituels personnalisés.' : 'Sign in to save your profile and unlock your personalized rituals.')}
                      </p>
                      {user ? (
                        <button onClick={handleQuizCompute} disabled={submitting}
                          className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg flex items-center justify-center gap-2">
                          {submitting
                            ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'Enregistrement…' : 'Saving…'}</>
                            : <>{lang === 'FR' ? 'Enregistrer + voir le profil complet' : 'Save + reveal full profile'} <i className="fa-solid fa-arrow-right text-[10px]" /></>}
                        </button>
                      ) : (
                        <button onClick={() => setSignInOpen(true)}
                          className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg flex items-center justify-center gap-2">
                          <i className="fa-solid fa-user text-sm" />
                          {lang === 'FR' ? 'Se connecter pour sauvegarder' : 'Sign in to save'}
                        </button>
                      )}
                      <p className="mt-4 text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                        {lang === 'FR' ? 'Vos résultats restent privés et sécurisés.' : 'Your results stay private and secure.'}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center">
                  <p className="font-serif text-xl italic text-[#0B1A36]/60 dark:text-white/60 mb-2">{lang === 'FR' ? `Bonjour ${quizState.formData.firstName}, votre nature dominante est :` : `Hello ${quizState.formData.firstName}, your dominant nature is:`}</p>
                  <h2 className="text-5xl font-serif font-bold mb-6 text-[#D4AF37]">{quizState.result.dominant.name}</h2>
                  <div className="flex justify-center gap-8 mb-8 text-sm text-[#0B1A36]/70 dark:text-white/70">
                    {['vata', 'pitta', 'kapha'].map(d => (
                      <div key={d} className="flex flex-col items-center">
                        <span className="font-bold text-[#D4AF37]">{quizState.result.percentages[d]}%</span>
                        <span className="capitalize">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="max-w-md mx-auto mb-8 bg-[#F5F5F0] dark:bg-white/5 p-6 rounded-xl border border-[#0B1A36]/5">
                    <p className="text-[#0B1A36]/80 dark:text-white/80 italic leading-relaxed">{quizState.result.dominant.definition}</p>
                  </div>
                  <button onClick={() => { addToCart({ title: `Rituel ${quizState.result.dominant.name}`, price: '85.00 CAD', type: 'Bundle Dosha' }); setQuizState({ ...quizState, isOpen: false, result: null }); }}
                    className="w-full bg-[#D4AF37] text-[#0B1A36] py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-[#0B1A36] hover:text-white transition-colors shadow-lg mb-4 max-w-sm mx-auto block">
                    {lang === 'FR' ? `Ajouter le Rituel ${quizState.result.dominant.name}` : `Add ${quizState.result.dominant.name} Ritual`}
                  </button>
                  <button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37] transition-colors">
                    {lang === 'FR' ? 'Fermer et explorer le site' : 'Close and explore the site'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediasPage;
