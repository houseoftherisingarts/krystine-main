import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { X } from '@phosphor-icons/react';
import app from '../../firebase';
import Portail from '../Portail';

/**
 * « Demander le kit de presse » (Krystine, 8 oct. 2026). La salle de presse
 * ne laisse plus rien télécharger : la personne remplit ce formulaire, la
 * fonction demanderKitPresse range la demande (demandesPresse, statut
 * 'attente') et avise l'équipe. Le lien personnel part seulement lorsque
 * Krystine clique Accepter dans l'admin (functions/src/presse.ts).
 */

const T = {
  FR: {
    kicker: 'Pour la presse', titre: 'Demander le kit de presse',
    intro: 'Dites-nous qui vous êtes et ce que vous préparez. Lorsque la demande est acceptée, nous vous écrivons avec un lien personnel vers les fichiers en haute définition.',
    nom: 'Votre nom', media: 'Média ou organisation', email: 'Courriel', usage: 'Pourquoi souhaitez-vous le kit ?',
    usageAide: 'Article, entrevue, programme d’événement…',
    date: 'Date de publication prévue (facultatif)',
    envoyer: 'Envoyer la demande', envoi: 'Envoi…', fermer: 'Fermer',
    fait: 'Votre demande est bien reçue. Notre équipe la lit et vous répond par courriel.',
    erreur: 'La demande n’a pas pu partir. Réessayez dans un instant.',
  },
  EN: {
    kicker: 'For the press', titre: 'Request the press kit',
    intro: 'Tell us who you are and what you are preparing. Once the request is accepted, we will write to you with a personal link to the high-definition files.',
    nom: 'Your name', media: 'Media outlet or organization', email: 'Email', usage: 'Why do you want the kit?',
    usageAide: 'Article, interview, event programme…',
    date: 'Planned publication date (optional)',
    envoyer: 'Send the request', envoi: 'Sending…', fermer: 'Close',
    fait: 'Your request has been received. Our team will read it and reply by email.',
    erreur: 'The request could not be sent. Please try again in a moment.',
  },
};

const DemandeKitPresse: React.FC<{ lang: 'FR' | 'EN'; onFermer: () => void }> = ({ lang, onFermer }) => {
  const t = T[lang];
  const [nom, setNom] = useState('');
  const [media, setMedia] = useState('');
  const [email, setEmail] = useState('');
  const [usage, setUsage] = useState('');
  const [date, setDate] = useState('');
  const [pot, setPot] = useState('');
  const [etat, setEtat] = useState<'pret' | 'envoi' | 'fait'>('pret');
  const [erreur, setErreur] = useState<string | null>(null);
  const premier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    premier.current?.focus();
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', echap);
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = avant; };
  }, [onFermer]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEtat('envoi');
    try {
      await httpsCallable(getFunctions(app, 'us-central1'), 'demanderKitPresse')({
        nom: nom.trim(), media: media.trim(), email: email.trim(), usage: usage.trim(),
        datePublication: date.trim(), lang, site: pot,
      });
      setEtat('fait');
    } catch (err) {
      setEtat('pret');
      setErreur((err as { message?: string })?.message || t.erreur);
    }
  };

  const champ = 'w-full min-h-[48px] border border-[#1c1712]/25 bg-[#faf6ee] px-4 text-[0.95rem] text-[#1c1712] outline-none transition-colors focus:border-[#1c1712]';
  const libelle = 'text-[0.6rem] uppercase tracking-[0.22em] text-[#1c1712]/70';

  return (
    <Portail>
      <div className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-[#1c1712]/55 p-4 sm:items-center" onClick={onFermer}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kit-presse-titre"
          onClick={e => e.stopPropagation()}
          className="relative my-auto w-full max-w-[540px] bg-[#f4efe6] p-[clamp(1.5rem,5vw,2.5rem)] text-[#1c1712] shadow-[0_30px_80px_-20px_rgba(28,23,18,0.45)]"
          style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
        >
          <span className="pointer-events-none absolute inset-2 border border-[#9c7a44]/35" aria-hidden />
          <button type="button" onClick={onFermer} aria-label={t.fermer} className="absolute right-3 top-3 grid h-11 w-11 place-items-center text-[#1c1712]/60 hover:text-[#1c1712]">
            <X size={18} />
          </button>

          <p className="text-[0.6rem] uppercase tracking-[0.26em] text-[#7d6330]">{t.kicker}</p>
          <h2 id="kit-presse-titre" className="v2-serif mt-3 pr-8 text-[clamp(1.5rem,4vw,1.9rem)] font-light leading-[1.15]">{t.titre}</h2>

          {etat === 'fait' ? (
            <p className="mt-6 text-[0.98rem] leading-[1.75]" role="status">{t.fait}</p>
          ) : (
            <form onSubmit={envoyer} className="mt-5 grid gap-4">
              <p className="text-[0.9rem] leading-[1.7] text-[#3a2f23]">{t.intro}</p>
              <input type="text" name="site" value={pot} onChange={e => setPot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                <label className="grid gap-1.5">
                  <span className={libelle}>{t.nom}</span>
                  <input ref={premier} type="text" required maxLength={120} autoComplete="name" value={nom} onChange={e => setNom(e.target.value)} className={champ} />
                </label>
                <label className="grid gap-1.5">
                  <span className={libelle}>{t.media}</span>
                  <input type="text" required maxLength={160} autoComplete="organization" value={media} onChange={e => setMedia(e.target.value)} className={champ} />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className={libelle}>{t.email}</span>
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={champ} />
              </label>
              <label className="grid gap-1.5">
                <span className={libelle}>{t.usage}</span>
                <textarea required maxLength={2000} rows={3} placeholder={t.usageAide} value={usage} onChange={e => setUsage(e.target.value)} className={`${champ} py-3 leading-relaxed`} />
              </label>
              <label className="grid gap-1.5">
                <span className={libelle}>{t.date}</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champ} />
              </label>
              {erreur && <p className="text-[0.84rem] text-[#8a2f1f]" role="alert">{erreur}</p>}
              <button
                type="submit"
                disabled={etat === 'envoi'}
                className="mt-1 inline-flex min-h-[50px] items-center justify-center bg-[#1c1712] px-6 text-[0.68rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60"
              >
                {etat === 'envoi' ? t.envoi : t.envoyer}
              </button>
            </form>
          )}
        </div>
      </div>
    </Portail>
  );
};

export default DemandeKitPresse;
