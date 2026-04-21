import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';

const TVPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].media.details.tv;
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B1A36] pt-36 pb-24">
      <div className="text-center mb-16 sticky top-20 bg-white/95 dark:bg-[#0B1A36]/95 backdrop-blur z-30 py-4 px-6 shadow-sm border-b border-[#0B1A36]/5 dark:border-white/5">
        <h1 className="text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white italic mb-4">{t.title}</h1>
        <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif text-lg max-w-3xl mx-auto">{t.desc}</p>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-12 grid grid-cols-1 gap-12">
        {t.videos?.map((video: any, idx: number) => (
          <div key={idx} className="group bg-[#F5F5F0] dark:bg-[#0B1A36]/60 rounded-[24px] overflow-hidden shadow-lg border border-[#0B1A36]/5 dark:border-white/5 hover:shadow-2xl transition-all p-4">
            <div className="relative aspect-video bg-black rounded-[16px] overflow-hidden cursor-pointer mb-6" onClick={() => setActiveId(activeId === video.id ? null : video.id)}>
              {activeId === video.id ? (
                <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`} title={video.title} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[#0B1A36]/90 flex items-center justify-center">
                    <img src={ASSETS.logo} className="w-24 h-auto opacity-40" alt="" style={{ filter: 'invert(1) brightness(1.5)' }} />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/20 transition-colors">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-play text-white text-lg ml-1" />
                    </div>
                    <p className="text-white/60 text-sm mt-4 uppercase tracking-widest">{video.title}</p>
                  </div>
                </>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-[#0B1A36] dark:text-white font-serif text-2xl group-hover:text-[#D4AF37] transition-colors">{video.title}</h2>
              <span className="text-xs uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40 mt-2 block">
                {lang === 'FR' ? 'Saison 3' : 'Season 3'} — {lang === 'FR' ? 'Épisode' : 'Episode'} {idx + 1}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVPage;
