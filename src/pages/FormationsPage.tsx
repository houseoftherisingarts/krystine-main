import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { ASSETS } from '../content';
import { goToRoute } from '../lib/staticRoutes';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import { getUpcomingEvents } from '../lib/liveEvents';
import LiveEventsSection from '../components/LiveEvents';
import PremiersRituelsHero from '../components/PremiersRituelsHero';
import EditableText from '../components/edit/EditableText';

interface Programme {
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  href: string;
  image: string;
  featured?: boolean;
  // When set, clicking the card opens a waitlist capture modal instead of
  // navigating. `href` is ignored for these.
  waitlist?: WaitlistTarget;
}

const FormationsPage: React.FC = () => {
  const { lang } = useApp();
  const navigate = useNavigate();
  const [waitlistTarget, setWaitlistTarget] = useState<WaitlistTarget | null>(null);

  // Waitlist targets keep their dosha-based ids — they're what the CRM
  // filters on (`waitlist-pitta` / `waitlist-kapha` / `waitlist-vata`) — but
  // the user-facing labels lead with the season name now.
  const kaphaTarget: WaitlistTarget = { id: 'kapha', labelFR: 'Le Printemps · Programme Kapha', labelEN: 'Spring · Kapha Program' };
  const pittaTarget: WaitlistTarget = { id: 'pitta', labelFR: "L'Été · Programme Pitta",        labelEN: 'Summer · Pitta Program' };
  const vataTarget:  WaitlistTarget = { id: 'vata',  labelFR: "L'Automne · Programme Vata",     labelEN: 'Autumn · Vata Program' };

  const programmes: Programme[] = lang === 'FR'
    ? [
        {
          tag: 'Parcours signature',
          title: "L'Expérience Origine",
          subtitle: 'Retrouver votre boussole intérieure',
          description: "Un parcours de 12 semaines au cœur de l'Ayurveda. Chaque semaine, un enseignement, un rituel et une pratique pour rentrer chez soi.",
          duration: '12 semaines',
          href: '/origine',
          image: ASSETS.origineBanner,
          featured: true,
        },
        {
          tag: 'Saison Kapha · Bientôt',
          title: 'Le Printemps',
          subtitle: 'Activer · Alléger · Stimuler',
          description: "L'éveil du printemps demande de bouger, drainer, alléger. Un programme pour traverser la saison Kapha avec élan et clarté.",
          duration: "Liste d'attente ouverte",
          href: '#',
          image: ASSETS.livresBg,
          waitlist: kaphaTarget,
        },
        {
          tag: 'Saison Pitta · Bientôt',
          title: "L'Été",
          subtitle: 'Rafraîchir · Apaiser · Adoucir',
          description: "Quand la chaleur monte, le feu intérieur s'emballe. Un programme pour traverser la saison Pitta sans se brûler.",
          duration: "Liste d'attente ouverte",
          href: '#',
          image: ASSETS.evenementsBg,
          waitlist: pittaTarget,
        },
        {
          tag: 'Saison Vata · Bientôt',
          title: "L'Automne",
          subtitle: 'Enraciner · Réchauffer · Apaiser',
          description: "Vent, sécheresse, dispersion : la saison Vata teste les nerfs. Un programme pour ancrer le corps et la tête avant l'hiver.",
          duration: "Liste d'attente ouverte",
          href: '#',
          image: ASSETS.ayurvedaBg,
          waitlist: vataTarget,
        },
      ]
    : [
        {
          tag: 'Signature journey',
          title: 'The Origin Experience',
          subtitle: 'Rediscover your inner compass',
          description: 'A 12-week journey at the heart of Ayurveda. Each week, a teaching, a ritual, and a practice to come home to yourself.',
          duration: '12 weeks',
          href: '/origine',
          image: ASSETS.origineBanner,
          featured: true,
        },
        {
          tag: 'Kapha season · Soon',
          title: 'Spring',
          subtitle: 'Activate · Lighten · Stimulate',
          description: "Spring's awakening calls for movement, drainage, lightness. A program to walk through the Kapha season with momentum and clarity.",
          duration: 'Waitlist open',
          href: '#',
          image: ASSETS.livresBg,
          waitlist: kaphaTarget,
        },
        {
          tag: 'Pitta season · Soon',
          title: 'Summer',
          subtitle: 'Cool · Soothe · Soften',
          description: 'When the heat rises, the inner fire flares. A program to walk through the Pitta season without burning out.',
          duration: 'Waitlist open',
          href: '#',
          image: ASSETS.evenementsBg,
          waitlist: pittaTarget,
        },
        {
          tag: 'Vata season · Soon',
          title: 'Autumn',
          subtitle: 'Ground · Warm · Soothe',
          description: "Wind, dryness, scattering: the Vata season tests the nerves. A program to ground body and mind before winter.",
          duration: 'Waitlist open',
          href: '#',
          image: ASSETS.ayurvedaBg,
          waitlist: vataTarget,
        },
      ];

  const podcast = lang === 'FR'
    ? {
        tag: 'Écoute & transmission',
        title: 'Au-delà des tendances',
        subtitle: 'Le podcast',
        description: "Conversations ancrées sur la sagesse ayurvédique, les rituels de saisons et l'art de vivre conscient.",
        duration: 'Nouveaux épisodes',
        cta: 'Écouter les épisodes',
      }
    : {
        tag: 'Listen & learn',
        title: 'Beyond Trends',
        subtitle: 'The podcast',
        description: 'Grounded conversations on ayurvedic wisdom, seasonal rituals, and the art of conscious living.',
        duration: 'New episodes',
        cta: 'Listen to episodes',
      };

  const openCard = (p: Programme) => {
    if (p.waitlist) setWaitlistTarget(p.waitlist);
    else goToRoute(navigate, p.href);
  };

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] text-[#3A251E] dark:text-white pt-32 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* Hero */}
        <div className="text-center mb-20">
          <span className="text-[#B8532F] uppercase tracking-[0.3em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="formations.hero.kicker"
              defaultValue={lang === 'FR' ? 'Programmes & Accompagnements' : 'Programs & Guidance'}
            />
          </span>
          <h1 className="text-5xl md:text-7xl font-serif mb-6">
            <EditableText
              fieldKey="formations.hero.title"
              defaultValue={lang === 'FR' ? 'Formations' : 'Programs'}
            />
          </h1>
          <p className="text-xl text-[#3A251E]/60 dark:text-white/60 font-serif italic max-w-2xl mx-auto">
            <EditableText
              fieldKey="formations.hero.lead"
              defaultValue={lang === 'FR'
                ? "Des parcours pour intégrer l'Ayurveda dans votre quotidien — à votre rythme, à votre mesure."
                : 'Journeys to weave Ayurveda into your daily life — at your own pace, on your own terms.'}
              multiline
            />
          </p>
          <div className="w-24 h-1 bg-[#B8532F] mx-auto mt-10" />
        </div>

        {/* Featured programme */}
        {programmes.filter(p => p.featured).map(p => (
          <section
            key={p.title}
            onClick={() => openCard(p)}
            className="group relative cursor-pointer mb-16 rounded-[30px] overflow-hidden shadow-2xl border border-[#B8532F]/20 hover:shadow-[0_0_40px_rgba(184,83,47,0.25)] transition-all"
          >
            <div className="relative h-[500px] bg-[#3A251E]">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${p.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3A251E] via-[#3A251E]/60 to-[#3A251E]/20" />
              <div className="absolute bottom-0 left-0 right-0 p-10 md:p-16 text-white">
                {/* Larger eyebrow on the featured (Origine) card so the
                    "Parcours signature" label reads as the heading kicker
                    it actually is. */}
                <span className="text-[#B8532F] uppercase tracking-[0.3em] text-sm md:text-base lg:text-lg font-bold block mb-4">{p.tag}</span>
                <h2 className="text-4xl md:text-6xl font-serif mb-3">{p.title}</h2>
                <p className="text-xl md:text-2xl font-serif italic text-white/80 mb-6 max-w-2xl">{p.subtitle}</p>
                <p className="text-white/70 max-w-2xl mb-8 leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-3 bg-[#B8532F] text-[#3A251E] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg group-hover:scale-105 transition-transform">
                    {lang === 'FR' ? 'Découvrir' : 'Discover'} <i className="fa-solid fa-arrow-right" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-bold">
                    <i className="fa-regular fa-clock mr-2" />{p.duration}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Les Premiers Rituels — entry-level $27 program. Sits between the
            signature Origine (featured above) and the seasonal waitlists
            below, offering the most accessible first step for visitors who
            aren't ready to commit to a full journey. Shared component with
            the home page. */}
        <div className="my-12 md:my-16">
          <PremiersRituelsHero />
        </div>

        {/* Les Saisonniers — Vata + the two coming-soon waitlists */}
        <div className="text-center mb-10 mt-16">
          <span className="text-[#B8532F] uppercase tracking-[0.3em] text-xs font-bold block mb-3">
            {lang === 'FR' ? 'Au rythme des saisons' : 'With the seasons'}
          </span>
          <h2 className="text-3xl md:text-5xl font-serif leading-tight">
            {lang === 'FR' ? 'Les Programmes Saisonniers' : 'The Seasonal Programs'}
          </h2>
          <div className="w-16 h-px bg-[#B8532F]/70 mx-auto mt-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programmes.filter(p => !p.featured).map(p => {
            const soon = !!p.waitlist;
            return (
              <article
                key={p.title}
                onClick={() => openCard(p)}
                className={`group cursor-pointer bg-white dark:bg-[#3A251E]/60 rounded-[24px] shadow-lg border border-[#3A251E]/5 dark:border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${soon ? 'relative' : ''}`}
              >
                <div className="relative h-48 overflow-hidden bg-[#3A251E]">
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 ${soon ? 'opacity-70' : ''}`}
                    style={{ backgroundImage: `url(${p.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3A251E]/80 via-[#3A251E]/20 to-transparent" />
                  <span className={`absolute top-5 left-5 uppercase tracking-[0.25em] text-[10px] font-bold backdrop-blur px-3 py-1.5 rounded-full border ${
                    soon
                      ? 'text-[#B8532F] bg-[#3A251E]/80 border-[#B8532F]/50'
                      : 'text-[#B8532F] bg-[#3A251E]/60 border-[#B8532F]/30'
                  }`}>
                    {p.tag}
                  </span>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-serif text-[#3A251E] dark:text-white mb-2 group-hover:text-[#B8532F] transition-colors">{p.title}</h3>
                  <p className="text-sm font-serif italic text-[#B8532F] mb-4">{p.subtitle}</p>
                  <p className="text-[#3A251E]/70 dark:text-white/70 text-sm leading-relaxed mb-6">{p.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-[#3A251E]/10 dark:border-white/10">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#3A251E]/40 dark:text-white/40 font-bold">
                      <i className={`fa-regular ${soon ? 'fa-hourglass-half' : 'fa-clock'} mr-2`} />{p.duration}
                    </span>
                    <span className="text-[#B8532F] text-lg group-hover:translate-x-1 transition-transform">
                      <i className={`fa-solid ${soon ? 'fa-bell' : 'fa-arrow-right'}`} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Podcast — full-width band below the 3 programme cards */}
        <section
          onClick={() => goToRoute(navigate, '/podcast')}
          className="group mt-12 cursor-pointer rounded-[28px] overflow-hidden shadow-xl border border-[#B8532F]/15 hover:shadow-[0_0_40px_rgba(184,83,47,0.2)] transition-all"
        >
          <div className="relative bg-[#3A251E]">
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
              <div className="relative h-56 md:h-auto min-h-[260px] overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${ASSETS.blogBg})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#3A251E]/30 via-transparent to-[#3A251E]/50 md:bg-gradient-to-r md:from-transparent md:to-[#3A251E]" />
              </div>
              <div className="p-8 md:p-12 text-white flex flex-col justify-center">
                <span className="text-[#B8532F] uppercase tracking-[0.3em] text-[10px] font-bold block mb-3">
                  {podcast.tag}
                </span>
                <h3 className="text-3xl md:text-4xl font-serif mb-2">{podcast.title}</h3>
                <p className="text-lg md:text-xl font-serif italic text-white/80 mb-4">{podcast.subtitle}</p>
                <p className="text-white/70 leading-relaxed mb-6">{podcast.description}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 bg-[#B8532F] text-[#3A251E] px-7 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg group-hover:scale-105 transition-transform">
                    <i className="fa-solid fa-headphones" /> {podcast.cta}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">
                    <i className="fa-regular fa-clock mr-2" />{podcast.duration}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Événements & Conférences — below the podcast so /formations keeps
            the "programmes → podcast → live gatherings" narrative order. */}
        <div className="mt-24 pt-16 border-t border-[#3A251E]/10 dark:border-white/10">
          <LiveEventsSection
            events={getUpcomingEvents()}
            kickerFR="Où on se rejoint · LIVE"
            kickerEN="Where we meet · LIVE"
            titleFR="Événements & Conférences"
            titleEN="Events & Conferences"
            leadFR="Rencontres en direct, retraites, lancements — et une tournée en préparation."
            leadEN="Live gatherings, retreats, launches — and a tour in the making."
          />
        </div>

      </div>

      <WaitlistModal target={waitlistTarget} onClose={() => setWaitlistTarget(null)} />
    </div>
  );
};

export default FormationsPage;
