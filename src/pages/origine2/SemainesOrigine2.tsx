import React from 'react';
import { SEMAINES, PILIERS_ORIGINE2, semaineOuverteRang, labelDebut } from './semaines';

// L'en-tête et la grille des douze semaines dans l'espace du cours
// (/cours/origine2), le pendant des douze portes du Foyer. Une seule semaine
// est ouverte à la fois; les autres attendent, barrées, leur tour.
const SemainesOrigine2: React.FC<{ dateSortie?: string | null }> = ({ dateSortie }) => {
  const rang = semaineOuverteRang(dateSortie);
  const ouvert = rang >= 0;
  const enCours = ouvert ? SEMAINES[rang] : SEMAINES[0];
  const pilier = PILIERS_ORIGINE2[enCours.pilier - 1];
  return (
    <>
      <section className="mt-10 rounded-[24px] border border-[#BA7B39]/35 bg-gradient-to-br from-[#293027] to-[#1b241f] px-7 py-10 text-white md:px-12 md:py-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a05b]">Votre cohorte</p>
        <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight md:text-4xl">Bienvenue dans l'Expérience Origine 2</h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80">
          Douze semaines s'ouvrent une à la fois, en trois piliers. Chaque semaine, Krystine dépose ici son module
          audio, sa méditation guidée et les documents du rendez-vous en direct. Rien à rattraper : tout ce qui a été
          déposé reste là, et vous y revenez quand vous en avez envie.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[12px] font-bold uppercase tracking-widest text-[#d9a05b]">
          <span><i className="fa-solid fa-calendar-week mr-2" />Douze semaines, une à la fois</span>
          <span><i className="fa-solid fa-broadcast-tower mr-2" />Un rendez-vous en direct par semaine</span>
          <span><i className="fa-solid fa-headphones mr-2" />Un module audio et une méditation par semaine</span>
          <span><i className="fa-solid fa-book-open mr-2" />Le Guide du Retour à l'Origine</span>
        </div>
      </section>

      <div className="mt-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Les douze semaines</p>
        <h2 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">
          {ouvert ? `La ${enCours.label.toLowerCase()} est ouverte` : 'La première semaine s\'ouvre au départ de la cohorte'}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[#38403a]/60 dark:text-white/60">
          {ouvert
            ? `${pilier.roman} · ${pilier.titre}. Les semaines passées restent ouvertes, les suivantes attendent leur tour.`
            : `Votre place est prise. ${labelDebut(dateSortie)}, puis une semaine s'ouvre chaque dimanche.`}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SEMAINES.map((s, i) => {
            const passee = ouvert && i < rang;
            const active = ouvert && i === rang;
            const p = PILIERS_ORIGINE2[s.pilier - 1];
            return (
              <div key={s.n} className={`relative overflow-hidden rounded-[16px] border p-4 text-center transition-all duration-300 ${
                active ? 'border-[#BA7B39]/70 bg-[#BA7B39]/12 shadow-[0_0_26px_4px_rgba(186,123,57,0.35)]'
                : passee ? 'border-[#BA7B39]/30 bg-white/55 dark:bg-white/5'
                : 'border-[#38403a]/10 bg-white/40 dark:border-white/10 dark:bg-white/5'}`}>
                <p className={`font-serif text-3xl ${active || passee ? 'text-[#293027] dark:text-white' : 'text-[#38403a]/35 dark:text-white/30'}`}>{s.rang}</p>
                <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.18em] ${active ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#38403a]/40 dark:text-white/40'}`}>{p.roman}</p>
                {!active && !passee && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#293027]/70 text-[#d9a05b]">
                    <i className="fa-solid fa-lock text-[10px]" />
                  </span>
                )}
                {passee && <span className="absolute right-2 top-2 text-[#8B4A2F]"><i className="fa-solid fa-check text-[11px]" /></span>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SemainesOrigine2;
