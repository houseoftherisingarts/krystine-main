import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BellSimple, X } from '@phosphor-icons/react';
import app from '../../firebase';
import Portail from '../Portail';

/**
 * « M'aviser » (Krystine, 8 oct. 2026) : à la place du bouton d'achat
 * inactif d'un produit épuisé. La cliente laisse son courriel; la fonction
 * demanderAvisStock l'enregistre et avisStockRetours lui écrit une seule
 * fois, lorsque le produit revient (functions/src/shopify/avisStock.ts).
 */
export const BoutonAviser: React.FC<{
  handle: string;
  titre: string;
  lang: 'FR' | 'EN';
  className?: string;
}> = ({ handle, titre, lang, className = '' }) => {
  const fr = lang === 'FR';
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOuvert(true); }}
        aria-label={`${fr ? "M'aviser du retour" : 'Notify me'} : ${titre}`}
        className={`inline-flex min-h-[46px] items-center justify-center gap-2.5 border border-[#1c1712] px-6 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712] transition-colors duration-300 hover:bg-[#1c1712] hover:text-[#f4efe6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7a44] ${className}`}
      >
        <BellSimple size={14} weight="light" /> {fr ? "M'aviser" : 'Notify me'}
      </button>
      {ouvert && <FenetreAviser handle={handle} titre={titre} lang={lang} onFermer={() => setOuvert(false)} />}
    </>
  );
};

const FenetreAviser: React.FC<{ handle: string; titre: string; lang: 'FR' | 'EN'; onFermer: () => void }> = ({ handle, titre, lang, onFermer }) => {
  const fr = lang === 'FR';
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [accord, setAccord] = useState(false);
  const [pot, setPot] = useState('');
  const [etat, setEtat] = useState<'pret' | 'envoi' | 'fait'>('pret');
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    champ.current?.focus();
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!accord) { setErreur(fr ? 'Cochez la case pour recevoir le courriel.' : 'Tick the box to receive the email.'); return; }
    setEtat('envoi');
    try {
      await httpsCallable(getFunctions(app, 'us-central1'), 'demanderAvisStock')({
        handle, titre, email: email.trim(), prenom: prenom.trim(), consentement: true, site: pot,
      });
      setEtat('fait');
    } catch (err) {
      setEtat('pret');
      setErreur((err as { message?: string })?.message || (fr ? 'La demande n’a pas pu partir. Réessayez dans un instant.' : 'The request could not be sent. Please try again.'));
    }
  };

  const champClasse = 'w-full min-h-[48px] border border-[#1c1712]/25 bg-[#faf6ee] px-4 text-[0.95rem] text-[#1c1712] outline-none transition-colors focus:border-[#1c1712]';

  return (
    <Portail>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-[#1c1712]/55 p-4" onClick={onFermer}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="aviser-titre"
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-[460px] bg-[#f4efe6] text-[#1c1712] p-[clamp(1.5rem,5vw,2.5rem)] shadow-[0_30px_80px_-20px_rgba(28,23,18,0.45)]"
          style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
        >
          <span className="pointer-events-none absolute inset-2 border border-[#9c7a44]/35" aria-hidden />
          <button type="button" onClick={onFermer} aria-label={fr ? 'Fermer' : 'Close'} className="absolute top-3 right-3 grid h-11 w-11 place-items-center text-[#1c1712]/60 hover:text-[#1c1712]">
            <X size={18} />
          </button>

          <p className="text-[0.6rem] uppercase tracking-[0.26em] text-[#7d6330]">{fr ? 'De retour bientôt' : 'Back soon'}</p>
          <h2 id="aviser-titre" className="mt-3 pr-8 v2-serif font-light text-[clamp(1.5rem,4vw,1.9rem)] leading-[1.15]">{titre}</h2>

          {etat === 'fait' ? (
            <p className="mt-6 text-[0.98rem] leading-[1.75]" role="status">
              {fr ? "C'est noté. Nous vous écrivons dès son retour." : "Noted. We will write to you as soon as it's back."}
            </p>
          ) : (
            <form onSubmit={envoyer} className="mt-6 grid gap-4">
              <p className="text-[0.9rem] leading-[1.7] text-[#3a2f23]">
                {fr ? 'Laissez votre courriel : nous vous écrivons lorsque ce produit revient en boutique.' : 'Leave your email: we will write to you when this product is back.'}
              </p>
              <input type="text" name="site" value={pot} onChange={e => setPot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <label className="grid gap-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.22em] text-[#1c1712]/70">{fr ? 'Courriel' : 'Email'}</span>
                <input ref={champ} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={champClasse} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[0.6rem] uppercase tracking-[0.22em] text-[#1c1712]/70">{fr ? 'Prénom (facultatif)' : 'First name (optional)'}</span>
                <input type="text" autoComplete="given-name" value={prenom} onChange={e => setPrenom(e.target.value)} className={champClasse} />
              </label>
              <label className="flex items-start gap-3 text-[0.86rem] leading-[1.55] text-[#3a2f23] cursor-pointer">
                <input type="checkbox" checked={accord} onChange={e => setAccord(e.target.checked)} required className="mt-0.5 h-5 w-5 shrink-0 accent-[#1c1712]" />
                <span>{fr ? 'Recevoir un seul courriel lorsque ce produit revient' : 'Receive a single email when this product is back'}</span>
              </label>
              {erreur && <p className="text-[0.84rem] text-[#8a2f1f]" role="alert">{erreur}</p>}
              <button
                type="submit"
                disabled={etat === 'envoi'}
                className="mt-1 inline-flex min-h-[50px] items-center justify-center bg-[#1c1712] px-6 text-[0.68rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60"
              >
                {etat === 'envoi' ? (fr ? 'Envoi…' : 'Sending…') : (fr ? "M'aviser" : 'Notify me')}
              </button>
            </form>
          )}
        </div>
      </div>
    </Portail>
  );
};
