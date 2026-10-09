import React, { useId, useState } from 'react';
import { addNewsletterSubscriber } from '../../firebase/firestore';
import { trackLead } from '../../lib/track';

/**
 * « Les 3 rituels du moment » en PDF (d'abord « Recevoir le rituel d'automassage en PDF ») (Krystine, 8 oct. 2026 : « on
 * collecte les courriels »). Le formulaire s'ouvre sur place, sans fenêtre.
 * L'inscription passe par la porte unique de l'infolettre (inscrireInfolettre :
 * pot de miel, cadence par adresse IP), avec l'étiquette
 * « boutique-3-rituels-du-moment »; le courriel qui porte le lien du PDF part
 * de functions/src/newsletter/welcome.ts (CONFIRMATIONS_LISTES).
 */
const SOURCE = 'boutique-3-rituels-du-moment';

const RituelPdf: React.FC = () => {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [accord, setAccord] = useState(false);
  const [pot, setPot] = useState('');
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'fait' | 'erreur'>('repos');
  const [erreur, setErreur] = useState('');

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courriel.trim() || !accord) return;
    setEtat('envoi'); setErreur('');
    try {
      await addNewsletterSubscriber({
        email: courriel.trim(),
        firstName: prenom.trim() || undefined,
        source: SOURCE,
        tags: [SOURCE],
        consentement: true,
        site: pot,
      });
      trackLead(SOURCE);
      setEtat('fait');
    } catch (err: any) {
      setErreur(err?.message || "L'envoi n'a pas pu se faire. Réessayez dans un moment.");
      setEtat('erreur');
    }
  };

  const champ = 'mt-1.5 block w-full normal-case tracking-normal min-h-[46px] border border-[#1c1712]/25 bg-[#faf6ee] px-3.5 text-[1rem] text-[#1c1712] placeholder:text-[#1c1712]/45 focus:border-[#9c7a44] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c7a44]/40';

  return (
    <div className="mt-6 border-t border-[#9c7a44]/30 pt-5">
      <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[#7d6330]">Les 3 rituels du moment</p>
      <p className="mt-1.5 text-[1rem] leading-[1.6] text-[#3a2f23]">
        L’eau digestive du matin, l’automassage du ventre au réveil, le massage des oreilles et la respiration de l’abeille : trois rituels tirés des livres de Krystine St-Laurent, en PDF.
      </p>

      {etat === 'fait' ? (
        <p role="status" className="mt-4 border border-[#9c7a44]/40 bg-[#faf6ee] px-4 py-3.5 text-[1rem] leading-[1.6] text-[#1c1712]">
          Le PDF est en route vers votre boîte courriel. Il arrive dans quelques minutes.
        </p>
      ) : !ouvert ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-expanded={false}
          aria-controls={`${id}-form`}
          className="mt-4 inline-flex min-h-[46px] items-center justify-center bg-[#1c1712] px-6 text-[0.68rem] uppercase tracking-[0.16em] text-[#f4efe6] transition-[background-color,transform] duration-200 ease-out active:scale-[0.97] hover:bg-[#9c7a44]"
        >
          Recevoir les 3 rituels du moment
        </button>
      ) : (
        <form id={`${id}-form`} onSubmit={envoyer} className="mt-4 space-y-3.5" noValidate>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]">
              Prénom
              <input type="text" autoComplete="given-name" value={prenom} onChange={e => setPrenom(e.target.value)} className={champ} />
            </label>
            <label className="block text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]">
              Courriel
              <input type="email" required autoComplete="email" inputMode="email" value={courriel} onChange={e => setCourriel(e.target.value)} className={champ} />
            </label>
          </div>
          {/* Le pot de miel : invisible, hors tabulation, caché aux lecteurs d'écran */}
          <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden value={pot} onChange={e => setPot(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[0.95rem] leading-[1.55] text-[#3a2f23]">
            <input type="checkbox" required checked={accord} onChange={e => setAccord(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#1c1712]" />
            <span>Recevoir ce PDF et les lettres de Krystine St-Laurent.<span className="mt-1 block text-[0.8em] opacity-70">Désabonnement en un clic, en tout temps.</span></span>
          </label>
          {etat === 'erreur' && <p role="alert" className="text-[0.95rem] text-[#8a2f22]">{erreur}</p>}
          <button
            type="submit"
            disabled={etat === 'envoi' || !accord || !courriel.trim()}
            className="inline-flex min-h-[46px] items-center justify-center bg-[#1c1712] px-6 text-[0.68rem] uppercase tracking-[0.16em] text-[#f4efe6] transition-[background-color,transform,opacity] duration-200 ease-out active:scale-[0.97] hover:bg-[#9c7a44] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {etat === 'envoi' ? 'Envoi…' : 'Recevoir le PDF'}
          </button>
        </form>
      )}
    </div>
  );
};

export default RituelPdf;
