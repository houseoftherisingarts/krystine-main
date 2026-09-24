import React from 'react';
import { ORIGINE, PILIERS } from '../../../pages/origine2/piliers';

// Le seuil de l'Expérience Origine : une bande compacte, pas un écran entier.
// La couverture porte déjà son titre, alors rien ne s'écrit par-dessus; le
// texte vit dans le panneau d'à côté, dans l'olive profond du pilier I.

interface Props {
  image: string;
  titre: string;
  etiquette: string;
  nbLecons: number;
  terminees: number;
  reprise?: { titre: string; onOuvrir: () => void };
  lang: 'FR' | 'EN';
}

const SeuilOrigine: React.FC<Props> = ({ image, titre, etiquette, nbLecons, terminees, reprise, lang }) => {
  const fr = lang === 'FR';
  const pct = nbLecons ? Math.round((terminees / nbLecons) * 100) : 0;
  const rayon = 30;
  const perimetre = 2 * Math.PI * rayon;
  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-[15px] shadow-[0_24px_60px_-30px_rgba(38,41,15,0.55)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[300px]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-8 px-7 py-7 md:px-10 md:py-9" style={{ background: ORIGINE.oliveProfond, color: '#f3ead2' }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: ORIGINE.orClair }}>{fr ? 'Expérience Origine' : 'Origin Experience'} · {etiquette}</p>
          <h1 className="mt-3 font-serif text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.05]">{titre}</h1>
          <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-[#f3ead2]/75">
            {fr ? '12 semaines en trois piliers, ' : '12 weeks in three pillars, '}
            {PILIERS.map(p => (fr ? p.nom.fr : p.nom.en).toLowerCase()).join(', ')}.
            {' '}{fr ? 'Chaque semaine dépose son audio, sa méditation et le rendez-vous du dimanche.' : 'Each week brings its audio, its meditation and the Sunday session.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative h-[72px] w-[72px] shrink-0">
            <svg viewBox="0 0 72 72" className="h-[72px] w-[72px] -rotate-90">
              <circle cx="36" cy="36" r={rayon} fill="none" stroke="rgba(243,234,210,0.16)" strokeWidth="5" />
              <circle cx="36" cy="36" r={rayon} fill="none" stroke={ORIGINE.orClair} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${perimetre}`} strokeDashoffset={`${perimetre * (1 - pct / 100)}`} className="transition-[stroke-dashoffset] duration-700" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-serif text-base">{pct} %</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg leading-tight">{terminees} {fr ? 'sur' : 'of'} {nbLecons} {fr ? 'leçons' : 'lessons'}</p>
            {reprise && (
              <>
                <p className="mt-1 text-[12px] leading-snug text-[#f3ead2]/70">{fr ? 'Prochaine leçon' : 'Next lesson'} : {reprise.titre}</p>
                <button type="button" onClick={reprise.onOuvrir}
                  className="mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors hover:brightness-110"
                  style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
                  <i className="fa-solid fa-play text-[10px]" />
                  {terminees ? (fr ? 'Continuer' : 'Continue') : (fr ? 'Commencer' : 'Start')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SeuilOrigine;
