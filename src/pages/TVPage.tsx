import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import EditableText from '../components/edit/EditableText';
import { useTVPlaylists, CHANNEL_URL } from '../lib/youtube';

// TVPage — 5 playlists curées de la chaîne YouTube.
// Chaque carte = une playlist ; click = lance la playlist dans un lecteur
// intégré qui commence sur la vidéo de tête et enchaîne automatiquement.

const TVPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].media.details.tv;

  const playlists = useTVPlaylists();
  const [activeListId, setActiveListId] = useState<string | null>(null);

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] pt-36 pb-24">
      {/* Sticky editorial header */}
      <div className="text-center mb-16 sticky top-20 bg-white/95 dark:bg-[#3A251E]/95 backdrop-blur z-30 py-4 px-6 shadow-sm border-b border-[#3A251E]/5 dark:border-white/5">
        <h1 className="text-4xl md:text-6xl font-serif text-[#3A251E] dark:text-white italic mb-4">
          <EditableText fieldKey="tv.hero.title" defaultValue={t.title} />
        </h1>
        <p className="text-[#3A251E]/70 dark:text-white/70 font-serif text-lg max-w-3xl mx-auto">
          <EditableText fieldKey="tv.hero.desc" defaultValue={t.desc} multiline />
        </p>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] hover:text-[#6B402F] transition-colors"
        >
          <i className="fa-brands fa-youtube text-sm" />
          {lang === 'FR' ? "S'abonner sur YouTube" : 'Subscribe on YouTube'}
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
        </a>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((p, idx) => (
            <article
              key={p.listId}
              className="group rounded-[20px] overflow-hidden transition-all duration-500 hover:-translate-y-1"
              style={{
                background: '#F4E7DD',
                border: '1px solid rgba(184,83,47,0.22)',
                boxShadow: '0 8px 24px rgba(107,74,47,0.10)',
              }}
            >
              <div
                className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                onClick={() => setActiveListId(activeListId === p.listId ? null : p.listId)}
              >
                {activeListId === p.listId ? (
                  <iframe
                    title={p.title || `Playlist ${idx + 1}`}
                    src={`https://www.youtube.com/embed/${p.videoId}?list=${p.listId}&autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-full"
                  />
                ) : (
                  <>
                    <img
                      src={p.thumbnail}
                      alt={p.title || `Playlist ${idx + 1}`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3A251E]/60 via-[#3A251E]/20 to-transparent" />
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3A251E]/80 text-[#F4E7DD] text-[9px] uppercase tracking-[0.2em] font-bold backdrop-blur-sm">
                      <i className="fa-solid fa-list text-[9px]" />
                      {lang === 'FR' ? 'Playlist' : 'Playlist'}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background: 'rgba(244,231,221,0.92)',
                          border: '1px solid rgba(184,83,47,0.5)',
                          boxShadow: '0 6px 20px rgba(58,37,30,0.35)',
                        }}
                      >
                        <i className="fa-solid fa-play text-[#6B402F] text-base ml-0.5" />
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="p-5 md:p-6">
                <h2 className="font-serif text-lg md:text-xl text-[#3A251E] group-hover:text-[#B8532F] transition-colors leading-snug line-clamp-2">
                  {p.title || (lang === 'FR' ? `Playlist ${idx + 1}` : `Playlist ${idx + 1}`)}
                </h2>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] font-bold text-[#3A251E]/55">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-circle-play text-[#B8532F] text-[10px]" />
                    {lang === 'FR' ? 'Regarder la série' : 'Watch the series'}
                  </span>
                  <a
                    href={`https://www.youtube.com/playlist?list=${p.listId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:text-[#B8532F] transition-colors"
                    aria-label={lang === 'FR' ? 'Ouvrir sur YouTube' : 'Open on YouTube'}
                  >
                    <i className="fa-brands fa-youtube text-sm" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TVPage;
