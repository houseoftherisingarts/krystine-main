import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { useApp } from '../contexts/AppContext';
import { StyleV2 } from '../components/v2/Magazine';
import PressePage from './PressePage';

/**
 * /presse/kit#k=<jeton> : le lien personnel envoyé après l'acceptation de
 * Krystine (functions/src/presse.ts). Le jeton est vérifié par le serveur à
 * chaque ouverture; seulement alors la salle de presse s'affiche avec ses
 * boutons de téléchargement. Un lien absent, faux ou expiré renvoie à la
 * demande sur /presse.
 *
 * Le jeton vit dans le fragment (#k=), jamais dans la chaîne de requête : le
 * navigateur ne l'envoie à aucun serveur et il ne fuit pas par le Referer.
 * La page pose en plus referrer « no-referrer » tant qu'elle est ouverte.
 */
const PresseKitPage: React.FC = () => {
  const { hash } = useLocation();
  const { lang } = useApp();
  const fr = lang !== 'EN';
  const k = new URLSearchParams(hash.replace(/^#/, '')).get('k') || '';

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);
  const [etat, setEtat] = useState<'verif' | 'ok' | 'expire' | 'refuse'>(k ? 'verif' : 'refuse');

  useEffect(() => {
    if (!k) return;
    let annule = false;
    httpsCallable(getFunctions(app, 'us-central1'), 'verifierAccesPresse')({ k })
      .then(() => { if (!annule) setEtat('ok'); })
      .catch((err: { code?: string }) => { if (!annule) setEtat(String(err?.code || '').includes('deadline') ? 'expire' : 'refuse'); });
    return () => { annule = true; };
  }, [k]);

  if (etat === 'ok') return <PressePage acces />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-4 py-24 text-[#1c1712]">
      <StyleV2 />
      {etat === 'verif' ? (
        <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[#7d6330]" role="status">{fr ? 'Vérification du lien…' : 'Checking the link…'}</p>
      ) : (
        <div className="max-w-[46ch] text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">{fr ? 'Kit de presse' : 'Press kit'}</p>
          <h1 className="v2-serif mt-5 text-[clamp(1.9rem,4vw,2.7rem)] font-light leading-[1.1]">
            {etat === 'expire' ? (fr ? 'Ce lien a expiré' : 'This link has expired') : (fr ? 'Ce lien ne mène à aucun kit' : 'This link leads to no kit')}
          </h1>
          <p className="mt-6 text-[0.95rem] font-light leading-[1.8] text-[#3a2f23]">
            {fr
              ? 'Les liens personnels restent valables sept jours. Faites une nouvelle demande depuis la salle de presse et notre équipe vous répond par courriel.'
              : 'Personal links stay valid for seven days. Send a new request from the press room and our team will reply by email.'}
          </p>
          <Link to="/presse" className="mt-9 inline-flex min-h-[48px] items-center justify-center bg-[#1c1712] px-7 text-[0.68rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44]">
            {fr ? 'Retour à la salle de presse' : 'Back to the press room'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default PresseKitPage;
