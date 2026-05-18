import React from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import NewsletterSignup from '../components/NewsletterSignup';
import EditableText from '../components/edit/EditableText';

const PodcastPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].media.details.podcast;

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] pt-36 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="bg-[#3A251E]/5 dark:bg-white/5 text-[#3A251E] dark:text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">
            <EditableText fieldKey="podcast.hero.kicker" defaultValue="Podcast" />
          </span>
          <h1 className="text-4xl md:text-6xl font-serif text-[#3A251E] dark:text-white uppercase leading-tight mb-4">
            <EditableText fieldKey="podcast.hero.title" defaultValue={t.title} />
          </h1>
          <p className="text-xl font-serif text-[#3A251E]/70 dark:text-white/70 italic max-w-2xl mx-auto">
            <EditableText fieldKey="podcast.hero.subtitle" defaultValue={t.subtitle} multiline />
          </p>
        </div>

        {/* Spotify embed */}
        <div className="w-full shadow-2xl rounded-[12px] overflow-hidden mb-12">
          <iframe style={{ borderRadius: '12px' }} src={t.spotifyUrl} width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Points */}
          <div className="bg-[#F4E7DD] dark:bg-white/5 p-8 rounded-[24px] border border-[#3A251E]/5 dark:border-white/5">
            <h3 className="font-serif text-2xl text-[#3A251E] dark:text-white mb-6 flex items-center gap-2">
              <i className="fa-solid fa-star-of-life text-[#B8532F] text-lg" /> Au programme
            </h3>
            <ul className="space-y-4">
              {t.points?.map((point: string, i: number) => (
                <li key={i} className="text-[#3A251E]/80 dark:text-white/80 leading-relaxed text-sm flex gap-3">
                  <span className="w-1.5 h-1.5 bg-[#B8532F] rounded-full mt-2 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <a href={t.ctaLink} target="_blank" rel="noopener noreferrer" className="mt-8 text-[#B8532F] font-bold text-xs uppercase tracking-widest border-b border-[#B8532F] hover:text-[#3A251E] hover:border-[#3A251E] dark:hover:text-white dark:hover:border-white transition-colors pb-1 inline-flex items-center gap-1">
              {t.cta} <i className="fa-solid fa-arrow-right" />
            </a>
          </div>

          {/* Newsletter */}
          <div className="bg-[#3A251E] text-white p-8 rounded-[24px] flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B8532F]/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <h3 className="font-serif text-2xl mb-2 relative z-10">{t.newsletter.title}</h3>
            <p className="text-white/60 text-sm italic mb-6 relative z-10">{t.newsletter.subtitle}</p>
            <p className="text-white/80 mb-8 text-sm relative z-10">{t.newsletter.desc}</p>
            <div className="relative z-10">
              <NewsletterSignup
                source="podcast"
                variant="dark"
                ctaLabel={t.newsletter.button}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PodcastPage;
