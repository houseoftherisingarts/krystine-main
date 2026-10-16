import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';

// Le miroir de fin des Rituels essentiels (Krystine, 15 oct. 2026) : avant
// toute offre, « Comment vous sentez-vous après ces gestes ? ». La suite part
// de ce qu'elle a vécu : VATA en prolongement, VATA en réponse au Vent, ou un
// seul geste à reprendre, sans aucune vente. La réponse va dans l'admin.
type Cle = 'calme' | 'agite' | 'rythme';
const CHOIX: [Cle, string][] = [
  ['calme', 'Plus calme, et j’en veux encore'],
  ['agite', 'Le mental court encore, mes nuits sont agitées'],
  ['rythme', 'Je n’ai pas encore trouvé mon rythme'],
];
const SUITES: Record<Cle, string> = {
  calme: 'Vous avez senti ce que cinq minutes peuvent faire. VATA Essentiel prolonge ces gestes pendant sept semaines, un sens à la fois.',
  agite: 'C’est souvent le Vent qui prend trop de place : le mental s’emballe et les nuits se fragmentent. VATA Essentiel est fait pour l’apaiser, semaine après semaine.',
  rythme: '',
};
const CLE_LOCALE = 'ksl-miroir-vecu-rituels';

const CarteVata: React.FC<{ texte: string; lien: string; image?: string; details?: string[] }> = ({ texte, lien, image, details }) => (
  <div className="mt-5 overflow-hidden rounded-[18px] bg-[#28352F] text-[#EEE7DB] shadow-[0_24px_60px_-34px_rgba(20,19,17,0.8)] sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    {image && <img src={image} alt="Les semaines de VATA Essentiel" loading="lazy" className="block aspect-[16/10] w-full object-cover sm:aspect-auto sm:h-full" />}
    <div className="px-6 py-7 md:px-8 md:py-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d9a05b]">La suite</p>
      <p className="mt-2 text-[clamp(1.5rem,2.4vw,2rem)] font-light uppercase tracking-[0.12em] leading-[1.1]">VATA Essentiel</p>
      <p className="mt-2 font-serif text-[1.15rem] leading-[1.35] text-[#EEE7DB]/90">Apaiser le mental, un sens à la fois</p>
      <p className="mt-4 text-[14px] leading-[1.7] text-[#EEE7DB]/80">{texte}</p>
      {details && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {details.map(d => <li key={d} className="rounded-full border border-[#d9a05b]/40 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EEE7DB]/85">{d}</li>)}
        </ul>
      )}
      <a href={lien} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[#151d19] hover:bg-[#d9a05b]">Découvrir VATA Essentiel <i className="fa-solid fa-arrow-right" /></a>
    </div>
  </div>
);

const MiroirVecu: React.FC<{ lien: string; image?: string; details?: string[] }> = ({ lien, image, details }) => {
  const [choix, setChoix] = useState<Cle | null>(null);
  useEffect(() => {
    try { const v = localStorage.getItem(CLE_LOCALE) as Cle | null; if (v && v in SUITES) setChoix(v); } catch { /* rien */ }
  }, []);
  const repondre = (c: Cle) => {
    setChoix(c);
    try { localStorage.setItem(CLE_LOCALE, c); } catch { /* rien */ }
    if (app) httpsCallable(getFunctions(app, 'us-central1'), 'enregistrerVecu')({ r: c }).catch(() => { /* la page suit quand même */ });
  };

  return (
    <div className="mt-6 rounded-[18px] border border-[#BA7B39]/30 bg-[#f4efe6] px-6 py-7 dark:bg-white/5 md:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8B4A2F] dark:text-[#d9a05b]">Un petit miroir</p>
      <p className="mt-2 font-serif text-[clamp(1.4rem,2.2vw,1.8rem)] leading-[1.2] text-[#293027] dark:text-white">Comment vous sentez-vous après ces gestes ?</p>
      <p className="mt-2 text-[14px] leading-[1.7] text-[#3a2f23]/75 dark:text-white/70">Il n’y a pas de bonne ou de mauvaise réponse, et surtout aucune pression : juste un petit miroir pour mieux vous accompagner.</p>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {CHOIX.map(([c, libelle]) => (
          <button key={c} type="button" onClick={() => repondre(c)} aria-pressed={choix === c}
            className={`rounded-full border px-5 py-3 text-left text-[13px] leading-snug transition-colors ${choix === c ? 'border-[#BA7B39] bg-[#BA7B39] text-[#151d19]' : 'border-[#293027]/20 text-[#293027] hover:border-[#BA7B39] dark:border-white/20 dark:text-white'}`}>
            {libelle}
          </button>
        ))}
      </div>

      {choix === 'rythme' && (
        <div className="mt-6 border-l-2 border-[#BA7B39] pl-5">
          <p className="font-serif text-[1.25rem] leading-[1.3] text-[#293027] dark:text-white">Un seul geste, ce soir</p>
          <p className="mt-2 text-[14px] leading-[1.75] text-[#3a2f23] dark:text-white/80">Reprenez l’automassage avant le coucher : cinq minutes, un peu d’huile sur les mains et les pieds, puis des bas de laine pour la nuit. Le rythme vient en revenant au même geste, jour après jour.</p>
          <p className="mt-3 text-[13px] text-[#3a2f23]/70 dark:text-white/60">Notre équipe est là pour vous : <a href="mailto:teamksl@inspiratanature.com" className="underline decoration-[#BA7B39] underline-offset-2">teamksl@inspiratanature.com</a></p>
        </div>
      )}
      {(choix === 'calme' || choix === 'agite') && <CarteVata texte={SUITES[choix]} lien={lien} image={image} details={details} />}
    </div>
  );
};

export default MiroirVecu;
