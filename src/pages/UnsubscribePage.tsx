import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { unsubscribeByToken } from '../firebase/firestore';

type State = 'pending' | 'ok' | 'invalid';

const UnsubscribePage: React.FC = () => {
  const loc = useLocation();
  const [state, setState] = useState<State>('pending');
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    const token = new URLSearchParams(loc.search).get('t');
    if (!token) { setState('invalid'); return; }
    unsubscribeByToken(token)
      .then(r => {
        setEmail(r.email);
        setState(r.ok ? 'ok' : 'invalid');
      })
      .catch(() => setState('invalid'));
  }, [loc.search]);

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white dark:bg-[#3A251E] rounded-[24px] border border-[#3A251E]/5 dark:border-white/5 p-10 text-center">
        <img src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png" alt="Inspirata" className="h-14 w-auto mx-auto mb-6 opacity-80 dark:invert dark:brightness-[1.5]" />
        {state === 'pending' && (
          <>
            <i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl mb-4 block" />
            <p className="text-[#3A251E]/70 dark:text-white/70">Traitement de votre désinscription…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#B8532F]/15 border border-[#B8532F]/30 flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-check text-[#B8532F] text-xl" />
            </div>
            <h1 className="text-2xl font-serif text-[#3A251E] dark:text-white mb-3">Vous avez été désabonné</h1>
            {email && <p className="text-sm text-[#3A251E]/60 dark:text-white/60 mb-6">{email}</p>}
            <p className="text-sm text-[#3A251E]/70 dark:text-white/70 leading-relaxed mb-8">
              Vous ne recevrez plus d’infolettres de Krystine St-Laurent. Merci d’avoir fait partie de la communauté Inspirata.
            </p>
            <a href="/accueil" className="inline-block bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors">
              Retour à l’accueil
            </a>
          </>
        )}
        {state === 'invalid' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-xmark text-red-500 text-xl" />
            </div>
            <h1 className="text-2xl font-serif text-[#3A251E] dark:text-white mb-3">Lien invalide</h1>
            <p className="text-sm text-[#3A251E]/70 dark:text-white/70 leading-relaxed mb-8">
              Ce lien de désinscription est expiré ou incorrect. Écrivez-nous à
              &nbsp;<a href="mailto:equipe@inspiratanature.com" className="text-[#B8532F] underline">equipe@inspiratanature.com</a>&nbsp; et nous réglerons cela manuellement.
            </p>
            <a href="/accueil" className="inline-block bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors">
              Retour à l’accueil
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
