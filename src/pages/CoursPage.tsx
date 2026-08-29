import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFormationsPubliees, type Formation } from '../firebase/formations';
import { useUI } from '../contexts/AppContext';

// La vitrine des formations natives : les cours publiés par Krystine,
// chacun vers sa fiche /cours/:id. Remplace la vitrine Kajabi.

const CoursPage: React.FC = () => {
  const { lang } = useUI();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | 'cours' | 'musique'>('tous');

  useEffect(() => {
    getFormationsPubliees().then(setFormations).finally(() => setLoading(false));
  }, []);

  const visibles = formations.filter(f => filtre === 'tous' || (f.categorie || 'cours') === filtre);

  return (
    <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7d6330]">
          {lang === 'FR' ? 'Les formations' : 'Courses'}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[#2a2015] md:text-5xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>
          {lang === 'FR' ? 'Apprendre avec Krystine' : 'Learn with Krystine'}
        </h1>
        <p className="mt-4 max-w-2xl text-[#3a3126]/70 dark:text-white/70">
          {lang === 'FR'
            ? 'Des parcours guidés pour revenir au corps, aux rythmes et aux cycles de la nature, à suivre à votre rythme.'
            : 'Guided paths back to the body, its rhythms and the cycles of nature, at your own pace.'}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {([['tous', lang === 'FR' ? 'Tout' : 'All'], ['cours', lang === 'FR' ? 'Les cours' : 'Courses'], ['musique', lang === 'FR' ? 'La musique' : 'Music']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFiltre(k)}
              className={`rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                filtre === k
                  ? 'bg-[#bb9a5e] text-[#2a2015]'
                  : 'border border-[#3a3126]/15 text-[#3a3126]/60 hover:border-[#bb9a5e] hover:text-[#7d6330] dark:border-white/15 dark:text-white/60'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-14 text-sm text-[#3a3126]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>
        ) : visibles.length === 0 ? (
          <p className="mt-14 text-sm text-[#3a3126]/50 dark:text-white/50">
            {lang === 'FR' ? 'Les premières formations arrivent bientôt.' : 'The first courses are coming soon.'}
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map(f => (
              <Link
                key={f.id}
                to={f.lienFiche || `/cours/${f.id}`}
                className="group overflow-hidden rounded-[20px] border border-white/60 bg-white/55 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-[#2a2015]/55"
              >
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.titre} className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[#bb9a5e]/10">
                    <i className="fa-solid fa-graduation-cap text-3xl text-[#7d6330]" />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-serif text-lg leading-snug text-[#2a2015] dark:text-white">{f.titre}</h2>
                  {f.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[#3a3126]/60 dark:text-white/60">{f.description}</p>
                  )}
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-[#7d6330]">
                    {f.paywall && f.prix
                      ? `${f.prix} $ CA`
                      : (lang === 'FR' ? 'Accès libre' : 'Free access')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursPage;
