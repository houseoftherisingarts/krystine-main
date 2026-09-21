import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { useApp } from '../contexts/AppContext';
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../lib/recaptcha';

// ─── « Vous n'êtes peut-être pas un robot » ──────────────────────────────────
// Une adresse sur un domaine d'alias jetable entre en quarantaine et cesse de
// recevoir les lettres. Le plus souvent, ce n'est pas un robot du tout : c'est
// quelqu'un de prudent qui masque son adresse avec Proton Pass ou DuckDuckGo.
// Cette carte lui rend la main. Elle coche la case, une fonction vérifie le
// jeton, sa fiche redevient active, et Krystine voit passer la confirmation
// dans la sous-liste « Humains confirmés » de son admin.
//
// Posée en tête de l'onglet Profil de l'espace membre et sur la page de
// désabonnement. Elle ne s'affiche que si une fiche est vraiment en
// quarantaine, donc elle est invisible pour à peu près tout le monde.

type Etat = 'cachee' | 'visible' | 'envoi' | 'faite' | 'refusee';

// Aperçu en développement seulement, même convention que `devAdmin.ts` :
// `?robot=visible`, `?robot=faite`, `?robot=refusee` montrent la carte dans
// l'état voulu sans passer par la fonction. Ça sert à la relire à l'œil et à
// la capturer sans poser de fausse fiche dans `newsletter`. Un build de
// production remplace `import.meta.env.DEV` par false et tout ceci disparaît.
function apercuDev(): Etat | null {
  if (!(import.meta as any).env?.DEV || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('robot');
  return v === 'visible' || v === 'faite' || v === 'refusee' ? v : null;
}

const CarteRobotPotentiel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, user } = useApp();
  const apercu = apercuDev();
  const [etat, setEtat] = useState<Etat>(apercu || 'cachee');
  const [erreur, setErreur] = useState<string | null>(null);
  const captcha = useRecaptcha(etat === 'visible' || etat === 'envoi');
  const fr = lang === 'FR';

  // Est-ce que cette personne a au moins une fiche en quarantaine ? La
  // collection `newsletter` est fermée en lecture aux membres (règles
  // Firestore), donc c'est la fonction qui répond, et seulement sur les fiches
  // de l'appelante. Une fiche verrouillée par Krystine mène directement au
  // message qui renvoie vers l'équipe : inutile de faire cocher une case pour
  // se voir refuser ensuite.
  useEffect(() => {
    let vivant = true;
    if (!user || !app) return;
    (async () => {
      try {
        const res = await httpsCallable(getFunctions(app!, 'us-central1'), 'confirmerHumain')({ sonder: true });
        const d = res.data as { enQuarantaine?: number; bloquee?: boolean };
        if (!vivant || !d?.enQuarantaine) return;
        setEtat(d.bloquee ? 'refusee' : 'visible');
      } catch {
        // Fonction injoignable : la carte reste cachée plutôt que d'inquiéter
        // quelqu'un pour rien.
      }
    })();
    return () => { vivant = false; };
  }, [user]);

  const confirmer = async () => {
    setErreur(null);
    if (RECAPTCHA_SITE_KEY && !captcha.getToken()) {
      setErreur(fr ? 'Cochez la case « Je ne suis pas un robot ».' : 'Please check the "I\'m not a robot" box.');
      return;
    }
    setEtat('envoi');
    try {
      await httpsCallable(getFunctions(app!, 'us-central1'), 'confirmerHumain')({ token: captcha.getToken() });
      setEtat('faite');
    } catch (e: any) {
      captcha.resetWidget();
      const message = String(e?.message || '');
      if (message.includes("l'équipe de Krystine")) {
        setEtat('refusee');
        return;
      }
      setEtat('visible');
      setErreur(fr
        ? "La vérification n'a pas abouti. Réessayez dans un instant."
        : 'The check did not go through. Please try again in a moment.');
    }
  };

  if (etat === 'cachee') return null;

  const cadre = `rounded-[15px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 p-6 ${className}`;

  if (etat === 'faite') {
    return (
      <div className={cadre} role="status" aria-live="polite">
        <div className="flex items-start gap-4">
          <i className="fa-solid fa-circle-check mt-1 text-xl text-[#7d6330]" aria-hidden />
          <p className="font-sans text-sm leading-relaxed text-[#293027] dark:text-white">
            {fr
              ? 'Merci, vous recevrez de nouveau les lettres de Krystine.'
              : 'Thank you, you will receive Krystine’s letters again.'}
          </p>
        </div>
      </div>
    );
  }

  if (etat === 'refusee') {
    return (
      <div className={cadre} role="status" aria-live="polite">
        <div className="flex items-start gap-4">
          <i className="fa-solid fa-envelope mt-1 text-xl text-[#7d6330]" aria-hidden />
          <p className="font-sans text-sm leading-relaxed text-[#293027] dark:text-white">
            {fr
              ? 'Écrivez à l’équipe de Krystine pour être rétablie : teamksl@inspiratanature.com'
              : 'Please write to Krystine’s team to be reinstated: teamksl@inspiratanature.com'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cadre}>
      <div className="flex items-start gap-4">
        <i className="fa-solid fa-shield-halved mt-1 text-xl text-[#7d6330]" aria-hidden />
        <div className="flex-1">
          <p className="font-sans text-sm leading-relaxed text-[#293027] dark:text-white">
            {fr
              ? 'Notre système a détecté que vous êtes peut-être un robot. Cela dit, peut-être utilisez-vous simplement un courriel Proton ou sécurisé. Cliquez ici pour confirmer que vous n’êtes pas un robot.'
              : 'Our system flagged this address as possibly automated. You may simply be using a Proton or another privacy address. Confirm below that you are not a robot.'}
          </p>
          {RECAPTCHA_SITE_KEY && <div ref={captcha.boxRef} className="mt-4" />}
          <button
            type="button"
            onClick={confirmer}
            disabled={etat === 'envoi'}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#293027] px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#BA7B39] hover:text-[#293027] disabled:opacity-50"
          >
            {etat === 'envoi'
              ? <><i className="fa-solid fa-circle-notch fa-spin" aria-hidden /> {fr ? 'Un instant…' : 'One moment…'}</>
              : (fr ? 'Je ne suis pas un robot' : 'I am not a robot')}
          </button>
          {erreur && <p className="mt-3 font-sans text-xs text-red-600">{erreur}</p>}
        </div>
      </div>
    </div>
  );
};

export default CarteRobotPotentiel;
