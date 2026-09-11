import React from 'react';
import { SIGNATURE_NOIRE } from '../client/Signature';

// Le diplôme de complétion d'un programme, dessiné pour être accroché au mur
// (Alex, 10 septembre 2026). Il se lit à l'écran dans « Mes diplômes » et
// s'imprime en A4 paysage, ou s'enregistre en PDF par la fenêtre d'impression
// du navigateur, qui rend un texte vectoriel net plutôt qu'une capture floue.
//
// Registre : parchemin universitaire tenu par la charte de Krystine, avec un
// double filet de laiton, les capitales espacées de Cormorant Garamond et la
// signature manuscrite véritable.

export interface DiplomeInfos {
  /** Le nom de la personne, tel qu'il doit paraître sur le mur. */
  nom: string;
  /** Le titre du programme, par exemple « Expérience Ayurveda · Saison Vata ». */
  programme: string;
  /** Ce qui a été accompli, par exemple « huit semaines et cinquante leçons ». */
  accompli: string;
  /** AAAA-MM-JJ du jour où la dernière leçon s'est fermée. */
  date: string;
  /** Le numéro discret en pied de parchemin. */
  numero: string;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const enLettres = (iso: string, fr: boolean): string => {
  const [a, m, j] = iso.split('-').map(Number);
  return fr ? `${j} ${MOIS[(m || 1) - 1]} ${a}` : `${MONTHS[(m || 1) - 1]} ${j}, ${a}`;
};

/** Le grain du parchemin, en SVG inline pour qu'il survive à l'impression. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E\")";

const Diplome: React.FC<{ infos: DiplomeInfos; lang: 'FR' | 'EN' }> = ({ infos, lang }) => {
  const fr = lang === 'FR';
  return (
    <div
      className="diplome-feuille relative mx-auto w-full overflow-hidden bg-[#F7F3EA] text-[#2b2419]"
      style={{ aspectRatio: '297 / 210', containerType: 'inline-size' }}
    >
      {/* Le grain du papier */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.055]" style={{ backgroundImage: GRAIN, backgroundSize: '200px 200px', mixBlendMode: 'multiply' }} />
      {/* La lumière chaude qui vient du haut */}
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(72% 54% at 50% 0%, rgba(186,123,57,0.13), transparent 68%)' }} />

      {/* Le double filet de laiton */}
      <span aria-hidden className="pointer-events-none absolute" style={{ inset: '2.6cqw', border: '1.5px solid #BA7B39' }} />
      <span aria-hidden className="pointer-events-none absolute" style={{ inset: '3.4cqw', border: '0.5px solid rgba(186,123,57,0.55)' }} />

      {/* Les quatre coins ornés */}
      {[
        { top: '2.6cqw', left: '2.6cqw', rotate: '0deg' },
        { top: '2.6cqw', right: '2.6cqw', rotate: '90deg' },
        { bottom: '2.6cqw', right: '2.6cqw', rotate: '180deg' },
        { bottom: '2.6cqw', left: '2.6cqw', rotate: '270deg' },
      ].map((coin, i) => (
        <span key={i} aria-hidden className="pointer-events-none absolute" style={{ ...coin, width: '4.4cqw', height: '4.4cqw', transform: `rotate(${coin.rotate})` }}>
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <path d="M0 14 C 0 6, 6 0, 14 0" fill="none" stroke="#BA7B39" strokeWidth="1.2" />
            <circle cx="5.5" cy="5.5" r="1.6" fill="#BA7B39" />
          </svg>
        </span>
      ))}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-[9cqw] text-center">
        {/* Le monogramme */}
        <p style={{ fontSize: '1.28cqw', letterSpacing: '0.42em' }} className="font-sans font-bold uppercase text-[#8B4A2F]">
          Inspirata Ayurveda
        </p>
        <span aria-hidden className="mt-[1.5cqw] block" style={{ width: '7cqw', height: '1px', background: 'linear-gradient(90deg, transparent, #BA7B39, transparent)' }} />

        <h1 className="font-serif" style={{ fontSize: '4.3cqw', lineHeight: 1.02, marginTop: '2.1cqw', letterSpacing: '0.015em' }}>
          {fr ? 'Diplôme de complétion' : 'Certificate of Completion'}
        </h1>

        <p className="font-sans" style={{ fontSize: '1.18cqw', letterSpacing: '0.28em', marginTop: '2.4cqw' }}>
          <span className="uppercase text-[#5a4a37]">{fr ? 'décerné à' : 'awarded to'}</span>
        </p>

        <p className="font-serif" style={{ fontSize: '5.1cqw', lineHeight: 1.06, marginTop: '0.9cqw', color: '#1f1a12' }}>
          {infos.nom}
        </p>
        <span aria-hidden className="mt-[1.2cqw] block" style={{ width: '34cqw', height: '1px', background: 'rgba(90,74,55,0.32)' }} />

        <p className="font-sans" style={{ fontSize: '1.42cqw', lineHeight: 1.85, marginTop: '2.2cqw', maxWidth: '62cqw', color: '#4a3d2c' }}>
          {fr
            ? `pour avoir traversé ${infos.accompli} de l’${infos.programme}, et refermé une à une les portes de ses sens.`
            : `for completing ${infos.accompli} of the ${infos.programme}, closing the doors of the senses one by one.`}
        </p>

        {/* La signature et la date, sur la même ligne de base */}
        <div className="mt-[3.4cqw] flex w-full items-end justify-center" style={{ gap: '9cqw' }}>
          <div className="flex flex-col items-center">
            <img src={SIGNATURE_NOIRE} alt="" style={{ height: '4.6cqw', width: 'auto', opacity: 0.92 }} />
            <span aria-hidden className="mt-[0.7cqw] block" style={{ width: '17cqw', height: '1px', background: 'rgba(90,74,55,0.42)' }} />
            <p className="font-sans uppercase" style={{ fontSize: '0.98cqw', letterSpacing: '0.24em', marginTop: '0.8cqw', color: '#5a4a37' }}>
              Krystine St-Laurent
            </p>
          </div>
          <div className="flex flex-col items-center">
            <p className="font-serif" style={{ fontSize: '1.9cqw', color: '#2b2419' }}>{enLettres(infos.date, fr)}</p>
            <span aria-hidden className="mt-[0.7cqw] block" style={{ width: '17cqw', height: '1px', background: 'rgba(90,74,55,0.42)' }} />
            <p className="font-sans uppercase" style={{ fontSize: '0.98cqw', letterSpacing: '0.24em', marginTop: '0.8cqw', color: '#5a4a37' }}>
              {fr ? 'Date' : 'Date'}
            </p>
          </div>
        </div>

        <p className="font-sans" style={{ fontSize: '0.82cqw', letterSpacing: '0.2em', marginTop: '2.6cqw', color: 'rgba(90,74,55,0.55)' }}>
          {infos.numero}
        </p>
      </div>
    </div>
  );
};

export default Diplome;
