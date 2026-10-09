import React, { useState, useEffect, useMemo, useRef } from 'react';
import DemandeEntrevue from '../../components/v2/DemandeEntrevue';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import SplitType from 'split-type';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDown, ArrowRight, Microphone, BookOpen,
  Coins, Lock, Star, Play,
} from '@phosphor-icons/react';
import { BoutonNoir } from '../../components/v2/Magazine';
import { BandePreuve } from '../../components/v2/BandePreuve';
import { useApp } from '../../contexts/AppContext';
import { useGamification } from '../../contexts/GamificationContext';
import { CONTENT } from '../../content';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../../shopify';
import NewsletterSignup from '../../components/NewsletterSignup';
import WaitlistModal, { type WaitlistTarget } from '../../components/WaitlistModal';
import BoutonCompte from '../../components/BoutonCompte';

gsap.registerPlugin(ScrollTrigger);

/**
 * Médias, même langage que /krystine (V2 « magazine crème »).
 * Cover photo-menée (la trilogie), podcast (embed Spotify), bibliothèque
 * (trilogie + Shopify/commande + Tome 3 en liste d'attente), Santé la vie
 * (TV, épisodes en niskas dans l'espace client, coffret 3 saisons à venir),
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

/* ─── Refonte du 9 octobre 2026 : la page parle d'abord à la productrice ─── */

// La porte unique : le formulaire de réservation de /conferenciere (id="reserver").
const RESERVER = '/conferenciere#reserver';
const ENTREVUE = '#entrevue';

// Bio approuvée, mot pour mot (src/content/presse.ts, carte « portrait »).
const BIO_FR = "Près de 40 ans d'expérience, soins intensifs, recherche clinique, les coulisses du système, avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Auteure de trois livres aux Éditions de l'Homme. Créatrice de Santé la vie et du podcast Au-delà des tendances.";
const BIO_EN = "Nearly 40 years of experience, intensive care, clinical research, the inner workings of the system, before choosing herbalism, Ayurveda and aromatherapy. Author of three books with Éditions de l'Homme. Creator of Santé la vie and the podcast Au-delà des tendances.";

// Les trois portes d'entrevue retenues par Krystine (9 oct. 2026, réflexion de productrice, lentille d'Eric Edmeades).
const SUJETS: { q: string; public: string }[] = [
  { q: 'Pourquoi ce qui fonctionne pour quelqu’un peut ne pas fonctionner pour vous\u00a0?', public: 'Pour un public qui a déjà essayé plusieurs approches et qui cherche à mieux comprendre son propre terrain.' },
  { q: 'Pourquoi suivons-nous autant de conseils qui ne nous conviennent pas\u00a0?', public: 'Pour un public qui ne veut pas choisir entre science, expérience et traditions, et qui cherche des repères clairs.' },
  { q: 'Le corps sait-il quelque chose que nous n’écoutons plus\u00a0?', public: 'Pour un public qui sent que quelque chose ne va pas, sans toujours savoir le nommer.' },
];

// La bande « Vue et entendue à » vit dans src/components/v2/BandePreuve.tsx, partagée avec /conferenciere.

/** Une vidéo embarquée : affiche, lecture au clic avec le son. */
const BIEN = { src: '/medias/bien-2021.mp4', poster: '/medias/bien-2021.jpg', label: 'Krystine St-Laurent présente Féminité & Ayurveda à Nathalie Simard, émission Bien, lors du lancement de Féminité & Ayurveda', bouton: ['Regarder l’extrait de l’émission Bien, avec le son', 'Watch the Bien segment, with sound'] as [string, string], etiquette: 'Émission Bien', legende: 'Émission Bien · lors du lancement de Féminité & Ayurveda' };
const MONTAGE_SLV = { src: '/medias/sante-la-vie-montage.mp4', poster: '/medias/sante-la-vie-montage.jpg', label: 'Santé la vie, trois saisons créées et animées par Krystine St-Laurent', bouton: ['Regarder Santé la vie, avec le son', 'Watch Santé la vie, with sound'] as [string, string], etiquette: 'Santé la vie', legende: 'Santé la vie · trois saisons, diffusée sur Vidéotron' };

const VideoMedia: React.FC<{ lang: string; src: string; poster: string; label: string; bouton: [string, string]; etiquette: string; legende: string }> = ({ lang, src, poster, label, bouton, etiquette, legende }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [joue, setJoue] = useState(false);
  const lancer = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {});
    setJoue(true);
  };
  return (
    <figure className="relative w-full">
      <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
      <div className="relative aspect-video w-full overflow-hidden bg-[#1c1712]">
        <video
          ref={ref}
          src={src}
          poster={poster}
          controls={joue}
          playsInline
          preload="metadata"
          onPlay={() => setJoue(true)}
          aria-label={label}
          className="h-full w-full object-cover"
        />
        {!joue && (
          <button
            type="button"
            onClick={lancer}
            aria-label={lang === 'FR' ? bouton[0] : bouton[1]}
            className="group absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-[clamp(3.6rem,6vw,5rem)] w-[clamp(3.6rem,6vw,5rem)] items-center justify-center rounded-full bg-[#f4efe6]/90 text-[#1c1712] shadow-[0_18px_40px_-16px_rgba(28,23,18,0.7)] transition-transform duration-500 group-hover:scale-105">
              <Play size={22} weight="fill" className="translate-x-[2px]" />
            </span>
          </button>
        )}
        {!joue && (
          <span className="pointer-events-none absolute left-0 top-0 bg-[#1c1712] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em] text-[#f4efe6]">
            {etiquette}
          </span>
        )}
      </div>
      <figcaption className="mt-3.5 text-[0.66rem] uppercase tracking-[0.2em] text-[#1c1712]/60">{legende}</figcaption>
    </figure>
  );
};

export default function MediasV2() {
  const root = useRef<HTMLDivElement>(null);
  const { lang, addToCart, user } = useApp();
  // Le jeu des niskas fermé : aucun prix en niskas sur la page.
  const { jeu } = useGamification();
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

      {/* ─────────── SEUIL · elle, vue et entendue (refonte du 9 octobre 2026) ───────────
          La page parle d'abord à la productrice qui ne connaît pas encore
          Krystine : son visage et sa voix, qui elle est, et une seule porte. */}
      <section
        data-hero
        className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(2.5rem,6vh,4.5rem)]"
      >
        <div className="grid gap-x-[clamp(2rem,4vw,4.5rem)] gap-y-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:grid-rows-[auto_auto]">
          <div className="order-1 lg:col-start-1 lg:row-start-1 lg:self-end">
            <p data-fade className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330] mb-5">La voix de Krystine</p>
            <h1 className="v2-serif font-light leading-[0.92] text-[#1c1712] text-[clamp(2.9rem,6.4vw,6.2rem)]">
              <span data-line className="block overflow-hidden pb-[0.06em]"><span className="block">{lang === 'FR' ? 'Dans les médias' : 'In the media'}</span></span>
            </h1>
          </div>

          {/* Le montage de Santé la vie (trois saisons, 9 oct. 2026). */}
          <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            <VideoMedia lang={lang} {...MONTAGE_SLV} />
          </div>

          <div className="order-3 lg:col-start-1 lg:row-start-2 lg:self-start">
            <p data-fade className="max-w-[46ch] text-[1.05rem] leading-[1.75] text-[#3a2f23]">
              {lang === 'FR' ? BIO_FR : BIO_EN}
            </p>
            <div data-fade className="mt-8">
              <BoutonNoir href={ENTREVUE}>{lang === 'FR' ? 'Demander une entrevue' : 'Request an interview'}</BoutonNoir>
            </div>
          </div>
        </div>
      </section>

      <BandePreuve lang={lang} />

      {/* ─────────── SUJETS D'ENTREVUE · la grande conversation et ses trois portes (9 oct. 2026) ─────────── */}
      <section id="sujets" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#f4efe6] scroll-mt-24">
        <div data-reveal className="mx-auto max-w-[1320px]">
          <Kicker className="mb-6">{lang === 'FR' ? 'Sujets d’entrevue' : 'Interview topics'}</Kicker>
          <p className="v2-serif text-[clamp(1.15rem,1.8vw,1.5rem)] font-light text-[#7d6330]">Plus d’information que jamais.</p>
          <h2 className="mt-2 v2-serif font-light leading-[1.05] text-[#1c1712] text-[clamp(2.1rem,4.6vw,4rem)]">Pourquoi autant de confusion&nbsp;?</h2>
          <span className="mt-8 block h-px w-12 bg-[#9c7a44]" aria-hidden />
        </div>
        <ol data-reveal className="mx-auto mt-[clamp(2.5rem,6vh,4rem)] grid max-w-[1320px] gap-x-[clamp(1.25rem,2.5vw,2.25rem)] gap-y-12 md:grid-cols-3">
          {SUJETS.map((s, i) => (
            <li key={s.q} className="flex flex-col">
              <div className="relative">
                <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
                <img src={`/medias/sujets/porte-${i + 1}.webp`} alt="" loading="lazy" className="relative aspect-[3/2] w-full object-cover" />
                <span className="absolute left-0 top-0 bg-[#1c1712] px-3 py-1.5 v2-serif text-[0.95rem] text-[#f4efe6] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-6 v2-serif text-[clamp(1.25rem,1.7vw,1.5rem)] font-light leading-[1.35] text-[#1c1712]">{s.q}</h3>
              <p className="mt-3 text-[0.95rem] leading-[1.7] text-[#3a2f23]">{s.public}</p>
            </li>
          ))}
        </ol>
        <div data-reveal className="mx-auto mt-[clamp(2.5rem,6vh,3.5rem)] max-w-[1320px]">
          <BoutonNoir href={ENTREVUE}>{lang === 'FR' ? 'Demander une entrevue' : 'Request an interview'}</BoutonNoir>
        </div>
      </section>

      {/* ─────────── CHAPITRE 01 · LE PODCAST ─────────── */}
      <section id="podcast" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(6rem,15vh,11rem)] bg-[#efe6d7] scroll-mt-24">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 items-center">
          <div data-reveal>
            <Kicker className="mb-5">Chapitre 01 · Le podcast</Kicker>
            <h2 className="v2-serif font-light leading-[1.02] text-[#1c1712] text-[clamp(2.2rem,5vw,3.8rem)]">{pod.title}</h2>
            <p className="mt-3 v2-serif text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23]">{pod.subtitle}</p>
            <span className="mt-7 block h-px w-12 bg-[#9c7a44]" aria-hidden />
            <ul className="mt-8 space-y-4">
              {pod.points?.map((p: string) => (
                <li key={p} className="flex items-start gap-3 text-base leading-relaxed text-[#3a2f23] max-w-[44ch]">
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
                  src="/podcast/live-cover.jpg"
                  alt="Au-delà des tendances, saison 2, avec Krystine St-Laurent"
                  loading="lazy"
                  className="w-full max-w-[220px] rounded-[10px] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)] transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#BA7B39]">Au-delà des tendances</p>
                  <p className="mt-3 v2-serif text-[clamp(1.4rem,2.2vw,1.9rem)] font-light leading-[1.15]">Nous n’avons jamais eu autant de choix. Et jamais autant besoin de revenir à ce qui est authentique.</p>
                  <p className="mt-3 text-base leading-[1.7] text-[#EEE7DB]/75">Les épisodes, les directs et les rediffusions vous attendent sur la page du podcast.</p>
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
          <p className="mt-6 v2-serif text-[clamp(1.1rem,2vw,1.5rem)] text-[#3a2f23] max-w-[46ch] leading-snug">
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
                  className={`group relative w-full aspect-[1/1.3] overflow-hidden shadow-[0_18px_50px_rgba(28,23,18,0.18)] ${isLocked ? (item.cover ? '' : 'opacity-90') : 'cursor-pointer'}`}
                >
                  <span className="pointer-events-none absolute inset-0 z-10 border border-[#9c7a44]/30" aria-hidden />
                  {item.cover ? (
                    <img src={item.cover} alt={item.fullTitle || item.title} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#34241a] text-[#f4efe6] p-6 text-center">
                      {/* Livre verrouillé : le cadre reste nu, sans répéter le
                          titre qui vit déjà sous la couverture (Krystine,
                          7 septembre 2026). */}
                      {isLocked ? (
                        <Lock size={32} weight="light" className="text-[#9c7a44]/60" />
                      ) : (
                        <>
                          <BookOpen size={28} weight="light" className="text-[#9c7a44]/60 mb-4" />
                          <h4 className="v2-serif text-xl">{item.title}</h4>
                        </>
                      )}
                    </div>
                  )}
                  {isLocked && (
                    <span className="absolute top-[19%] left-1/2 -translate-x-1/2 z-20 bg-[#9c7a44] text-[#1c1712] px-3 py-1 text-[0.56rem] uppercase tracking-[0.18em] whitespace-nowrap">
                      {lang === 'FR' ? 'Parution · février 2027' : 'Release · February 2027'}
                    </span>
                  )}
                </motion.div>

                {/* Meta */}
                <h3 className="mt-7 v2-serif text-[1.6rem] font-light leading-snug text-[#1c1712]">{item.title}</h3>
                {(item.subtitle || item.desc) && (
                  <p className="mt-1.5 text-base text-[#1c1712]/65">{item.subtitle || item.desc}</p>
                )}

                {/* Locked · Tome 3 */}
                {isLocked && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {item.publisher && <p className="v2-serif text-base text-[#3a2f23]/85">{item.publisher}</p>}
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
                    <p className="text-base leading-[1.8] text-[#3a2f23] whitespace-pre-line">{item.shortDesc}</p>
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
            <p className="mt-3 v2-serif text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">Trois saisons sur les ondes de Vidéotron</p>
            <p className="mt-7 text-[1rem] leading-[1.85] text-[#3a2f23] max-w-[56ch]">
              Pendant trois saisons, Krystine a conçu, produit et animé Santé la vie, diffusée sur Vidéotron. Le fil conducteur : relier les sagesses anciennes, l’Ayurveda en tête, aux réalités d’aujourd’hui. Mieux respirer, mieux manger, ralentir et revenir à son équilibre, par gestes simples, sans dogme, une chose à la fois. Ces épisodes vivent aujourd’hui dans votre espace, saison après saison.
            </p>
          </div>
          <div className="relative w-full">
            <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
            <div className="relative w-full aspect-[4/3] overflow-hidden">
              <img
                src="/sante-la-vie.jpg"
                alt="Krystine St-Laurent sur le plateau de l’émission Santé la vie, diffusée sur Vidéotron"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* L'émission Bien (2021), descendue sous Santé la vie quand le montage a pris le haut de page. */}
        <div data-reveal className="mx-auto max-w-[960px]">
          <Kicker className="mb-5">{lang === 'FR' ? 'Aussi à la télé' : 'Also on TV'}</Kicker>
          <VideoMedia lang={lang} {...BIEN} />
          <p className="mt-8 mb-8 v2-serif text-[clamp(1.15rem,1.8vw,1.45rem)] font-light leading-[1.5] text-[#1c1712]">
            {lang === 'FR' ? 'Pour découvrir ce dont parle Krystine dans l’extrait de l’émission, les rituels avec huiles et plantes :' : 'To discover what Krystine talks about in the segment, rituals with oils and plants:'}
          </p>
        </div>

        <div data-reveal className="mx-auto max-w-[960px]">
          {/* Rituels essentiels · à la place du coffret, pas encore disponible (Krystine, 9 oct. 2026) */}
          <div className="grid items-center gap-x-[clamp(1.75rem,4vw,3.5rem)] p-[clamp(1.75rem,3vw,2.75rem)] bg-[#28352F] md:grid-cols-2">
            <a href="/rituels-essentiels" className="block overflow-hidden border border-[#BA7B39]/50 mb-7 md:mb-0" aria-label="Rituels essentiels inspirés de l'Ayurveda">
              <img src="/rituels-essentiels/carte-fondu.webp" alt="Rituels essentiels inspirés de l'Ayurveda : gestes simples à l'huile" loading="lazy" className="aspect-[16/10] w-full object-cover" />
            </a>
            <div className="flex min-w-0 flex-col">
            <span className="text-[0.6rem] uppercase tracking-[0.24em] text-[#BA7B39] mb-4">
              {lang === 'FR' ? 'Commencer, dès ce soir' : 'Start tonight'}
            </span>
            <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#EEE7DB]">
              {lang === 'FR' ? 'Rituels essentiels inspirés de l’Ayurveda' : 'Essential rituals inspired by Ayurveda'}
            </h3>
            <p className="mt-4 text-base leading-[1.8] text-[#EEE7DB]/85 flex-1">
              {lang === 'FR'
                ? 'Des pratiques courtes qui redonnent ancrage et direction : l’automassage, les soins du nez et de la bouche, les soins des mains et des pieds.'
                : 'Short practices that bring back grounding and direction: self-massage, care for the nose and mouth, care for the hands and feet.'}
            </p>
            <div className="mt-8 pt-6 border-t border-[#EEE7DB]/20 flex items-end justify-between gap-4">
              <span className="v2-serif text-[clamp(2rem,4vw,2.8rem)] font-light leading-none text-[#BA7B39] tabular-nums">27&nbsp;$</span>
              <a
                href="/rituels-essentiels"
                className="inline-flex items-center gap-2.5 whitespace-nowrap bg-[#EEE7DB] px-5 py-3.5 sm:px-7 text-[0.7rem] uppercase tracking-[0.2em] text-[#1c1712] transition-colors duration-300 hover:bg-[#f4efe6]"
              >
                {lang === 'FR' ? 'Commencer ce soir' : 'Start tonight'}
                <ArrowRight size={14} weight="regular" />
              </a>
            </div>
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
          <p className="mt-6 v2-serif text-[clamp(1.1rem,2vw,1.45rem)] text-[#3a2f23] max-w-[48ch] mx-auto leading-snug">
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

      {/* ─────────── INVITER · la même porte qu'au seuil, en français et en anglais ─────────── */}
      <section id="inviter" className="relative w-full px-[clamp(1.5rem,5vw,5.5rem)] py-[clamp(5rem,12vh,9rem)] bg-[#efe6d7] border-t border-[#9c7a44]/25 scroll-mt-24">
        <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-14 md:grid-cols-[1.2fr_0.8fr]">
          <div data-reveal id="entrevue" className="flex flex-col items-start scroll-mt-36">
            <Kicker className="mb-5">Pour une entrevue</Kicker>
            <h2 className="v2-serif font-light leading-[1.05] text-[#1c1712] text-[clamp(2rem,3.6vw,3rem)]">Demander une entrevue</h2>
            <span className="mt-6 block h-px w-12 bg-[#9c7a44]" aria-hidden />
            <p className="mt-6 mb-8 max-w-[46ch] text-base leading-[1.8] text-[#3a2f23]">L’équipe revient sous 48&nbsp;h ouvrables. Pour une conférence ou un événement, passez plutôt par <a href={RESERVER} className="underline decoration-[#9c7a44] underline-offset-4">Inviter Krystine</a>.</p>
            <DemandeEntrevue />
          </div>
          {/* Pour les podcasts anglophones : la bio anglaise approuvée du kit de
              presse (src/content/presse.ts, carte « portrait », corpsEN). */}
          <div data-reveal lang="en" className="flex flex-col items-start md:border-l md:border-[#1c1712]/15 md:pl-[clamp(2rem,4vw,4rem)]">
            <Kicker className="mb-5">In English</Kicker>
            <h2 className="v2-serif font-light leading-[1.05] text-[#1c1712] text-[clamp(2rem,3.6vw,3rem)]">Invite Krystine</h2>
            <span className="mt-6 block h-px w-12 bg-[#9c7a44]" aria-hidden />
            <p className="mt-6 max-w-[46ch] text-base leading-[1.8] text-[#3a2f23]">{BIO_EN}</p>
            <p className="mt-4 text-[0.66rem] uppercase tracking-[0.22em] text-[#1c1712]/60">French primarily, English on request, bilingual possible</p>
            <BoutonNoir href={ENTREVUE} className="mt-8">Request an interview</BoutonNoir>
          </div>
        </div>
      </section>

      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
    </div>
  );
}
