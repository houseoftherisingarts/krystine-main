import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, ArrowRight, Compass } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { Seam, KenBurns } from '../components/motion/loeuvre';

/**
 * Points de vente · Où nous trouver — page React au style L'Œuvre (espresso/cream/brass).
 * Back-end préservé : la liste des points de vente vient à 100 % de CONTENT[lang].locations
 * (mêmes noms de boutiques, adresses, téléphones, horaires, regroupés par région).
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
  <h2 className={`font-serif font-medium leading-[1.05] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

const BOUTIQUE = 'https://www.inspiratanature.com';

interface Spot { name: string; address: string; tel: string; hours: string }
interface Region { name: string; spots: Spot[] }

const LocationsLoeuvre: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].locations;
  const regions: Region[] = (t.regions as unknown as Region[]) ?? [];
  const total = regions.reduce((n, r) => n + r.spots.length, 0);
  const isFr = lang === 'FR';

  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-espressoDeep">
        <KenBurns src="/footer-jacques-cartier.jpg" alt="" />
        <span aria-hidden className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.92) 0%, rgba(22,16,10,0.62) 45%, rgba(22,16,10,0.28) 100%)' }} />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }} className="max-w-[44ch]">
            <p className="inline-flex items-center gap-2 text-brass text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.3em] mb-8">
              <Compass size={14} /> {isFr ? 'Où nous trouver' : 'Where to find us'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[1.0] text-[clamp(2.4rem,5.4vw,4.6rem)]">
              {isFr ? 'Points de vente' : 'Sales points'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.2rem,2.4vw,1.8rem)] leading-snug text-ctextSoft max-w-[34ch]">
              {t.intro}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
              <div className="flex flex-col">
                <span className="font-serif text-brassBright text-3xl tabular-nums leading-none">{total}</span>
                <span className="font-sans text-[0.65rem] uppercase tracking-[0.18em] text-ctextSoft/70 mt-1.5">
                  {isFr ? 'Boutiques partenaires' : 'Partner stores'}
                </span>
              </div>
              <div className="w-px h-10 bg-brass/25" />
              <div className="flex flex-col">
                <span className="font-serif text-brassBright text-3xl tabular-nums leading-none">{regions.length}</span>
                <span className="font-sans text-[0.65rem] uppercase tracking-[0.18em] text-ctextSoft/70 mt-1.5">
                  {isFr ? 'Régions du Québec' : 'Quebec regions'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────── INTRO ÉDITORIALE ─────────── */}
      <section className="relative bg-cream py-20 md:py-28 overflow-hidden">
        <Seam from="#16100a" />
        <div className="relative z-10 mx-auto w-full max-w-[860px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow>{isFr ? 'Nos précieux collaborateurs' : 'Our cherished collaborators'}</Eyebrow>
            <SectionTitle className="mt-5">{t.title}</SectionTitle>
            <div className="mt-7 h-px w-20 bg-brass mx-auto" />
            <p className="mt-8 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-inkSoft leading-snug max-w-[46ch] mx-auto">
              {isFr
                ? 'Retrouvez les livres et rituels Inspirata chez des partenaires choisis pour leurs valeurs.'
                : 'Find Inspirata books and rituals at partners chosen for their values.'}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── LISTE DES POINTS DE VENTE (par région) ─────────── */}
      <section className="bg-cream2 py-20 md:py-28">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 space-y-20 md:space-y-28">
          {regions.map((region, ri) => (
            <Reveal key={ri} delay={(ri % 2) * 0.05}>
              <div className="flex items-center gap-5 mb-10">
                <h3 className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-brassInk whitespace-nowrap">
                  {region.name}
                </h3>
                <span className="flex-1 h-px bg-brass/25" />
                <span className="font-serif text-inkSoft/60 text-sm tabular-nums whitespace-nowrap">
                  {region.spots.length} {region.spots.length > 1
                    ? (isFr ? 'adresses' : 'addresses')
                    : (isFr ? 'adresse' : 'address')}
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {region.spots.map((spot, si) => (
                  <div
                    key={si}
                    className="h-full flex flex-col rounded-3xl bg-card border-l-[3px] border-l-brass border-y border-r border-cream3 p-7 md:p-8 transition-shadow hover:shadow-xl"
                  >
                    <h4 className="font-serif text-xl md:text-2xl text-ink leading-snug">{spot.name}</h4>

                    <div className="mt-5 flex items-start gap-3 text-inkSoft">
                      <MapPin size={16} className="text-brassInk mt-0.5 shrink-0" />
                      <p className="font-sans text-[0.9rem] leading-relaxed whitespace-pre-line">{spot.address}</p>
                    </div>

                    <a
                      href={`tel:${spot.tel.replace(/[^+\d]/g, '')}`}
                      className="mt-4 flex items-center gap-3 text-ink hover:text-brassInk transition-colors min-h-[44px]"
                    >
                      <Phone size={16} className="text-brassInk shrink-0" />
                      <span className="font-sans text-[0.9rem] font-medium tabular-nums">{spot.tel}</span>
                    </a>

                    <div className="mt-4 pt-4 border-t border-cream3 flex items-start gap-3 text-inkSoft">
                      <Clock size={16} className="text-brassInk mt-0.5 shrink-0" />
                      <p className="font-sans text-[0.85rem] leading-relaxed whitespace-pre-line">{spot.hours}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── CTA BOUTIQUE EN LIGNE ─────────── */}
      <section className="relative bg-espresso py-24 md:py-32 overflow-hidden">
        <Seam from="#ede5d7" />
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow on="dark">{isFr ? 'À distance' : 'From anywhere'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {isFr ? 'Trop loin d’une boutique ?' : 'Too far from a store?'}
            </SectionTitle>
            <p className="mt-6 mx-auto max-w-[48ch] font-sans text-[1rem] leading-[1.8] text-ctextSoft">
              {isFr
                ? 'Tous les livres et rituels Inspirata sont aussi disponibles en ligne, livrés directement chez vous.'
                : 'Every Inspirata book and ritual is also available online, delivered straight to your door.'}
            </p>
            <a
              href={BOUTIQUE}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-brass px-9 py-4 font-sans text-[0.7rem] uppercase tracking-[0.16em] text-espressoDeep transition-colors hover:bg-brassBright min-h-[44px]"
            >
              {isFr ? 'Visiter la boutique en ligne' : 'Visit the online boutique'} <ArrowRight size={16} />
            </a>
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default LocationsLoeuvre;
