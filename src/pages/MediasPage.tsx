import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';

const MediasPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].media;
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const renderSection = () => {
    if (!selected) return null;
    const d = t.details;
    if (selected === 'tv') {
      return (
        <div className="mt-16 w-full max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white italic mb-4">{d.tv.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 max-w-2xl mx-auto">{d.tv.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {d.tv.videos?.map((v: any, i: number) => (
              <div key={i} className="group bg-white dark:bg-[#0B1A36]/60 rounded-[24px] shadow-lg overflow-hidden border border-[#0B1A36]/5 dark:border-white/5 hover:shadow-2xl transition-all">
                <div className="relative aspect-video bg-black cursor-pointer" onClick={() => setActiveVideo(activeVideo === v.id ? null : v.id)}>
                  {activeVideo === v.id ? (
                    <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full" />
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
                  <h3 className="font-serif text-lg text-[#0B1A36] dark:text-white">{v.title}</h3>
                  <span className="text-xs text-[#0B1A36]/40 dark:text-white/40 uppercase tracking-widest">Épisode {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (selected === 'podcast') {
      return (
        <div className="mt-16 w-full max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-2 block">Podcast</span>
            <h2 className="text-4xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-4">{d.podcast.title}</h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 font-serif italic">{d.podcast.subtitle}</p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl mb-12">
            <iframe style={{ borderRadius: '12px' }} src={d.podcast.spotifyUrl} width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
          </div>
          <a href={d.podcast.ctaLink} target="_blank" rel="noopener noreferrer" className="flex justify-center">
            <span className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors inline-flex items-center gap-2">
              {d.podcast.cta} <i className="fa-solid fa-arrow-right" />
            </span>
          </a>
        </div>
      );
    }
    if (selected === 'blog') {
      window.location.href = '/blogue';
      return null;
    }
    if (selected === 'book') {
      window.location.href = '/livres';
      return null;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-[#D4AF37] uppercase tracking-[0.3em] text-xs font-bold block mb-4">{t.subtitle}</span>
          <h1 className="text-5xl md:text-7xl font-serif text-[#0B1A36] dark:text-white uppercase tracking-widest leading-none">{t.title}</h1>
          <div className="w-24 h-1 bg-[#D4AF37] mt-6 mx-auto" />
        </div>

        {/* Back button */}
        {selected && (
          <div className="mb-8">
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 hover:text-[#D4AF37] transition-colors">
              <i className="fa-solid fa-arrow-left" /> {t.back}
            </button>
          </div>
        )}

        {!selected ? (
          <div className="flex flex-col lg:flex-row gap-16 items-center justify-center">
            {/* Cards */}
            <div className="w-full lg:w-1/2 grid grid-cols-2 gap-6">
              {t.sections?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => {
                    // /podcast is a statically hosted page (see firebase.json rewrites) —
                    // must do a full page navigation so the host serves the static bundle.
                    if (item.id === 'podcast') { window.location.href = '/podcast'; return; }
                    if (item.id === 'blog') { navigate('/blogue'); return; }
                    if (item.id === 'book') { navigate('/livres'); return; }
                    setSelected(item.id);
                  }}
                  className="group cursor-pointer"
                >
                  <div className="rounded-[24px] aspect-square flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0B1A36]/60 border border-[#0B1A36]/5 dark:border-white/5 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-[#D4AF37]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-16 h-16 rounded-full bg-[#0B1A36]/5 dark:bg-white/5 flex items-center justify-center mb-4 text-[#0B1A36] dark:text-white group-hover:bg-[#0B1A36] group-hover:text-white transition-all duration-300 relative z-10">
                      <i className={`fa-solid ${item.icon} text-2xl`} />
                    </div>
                    <h3 className="text-lg font-serif text-[#0B1A36] dark:text-white relative z-10">{item.label}</h3>
                    <div className="w-8 h-px bg-[#D4AF37] mt-3 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center relative z-10" />
                  </div>
                </div>
              ))}
            </div>

            {/* Image */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="w-full aspect-square rounded-[30px] overflow-hidden shadow-2xl relative group max-w-[500px]">
                <img src="https://storage.googleapis.com/inspirata/Base%20site/Gemini_Generated_Image_2cz8f92cz8f92cz8.png" alt="Inspirata Media" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A36]/20 to-transparent" />
              </div>
            </div>
          </div>
        ) : (
          renderSection()
        )}
      </div>
    </div>
  );
};

export default MediasPage;
