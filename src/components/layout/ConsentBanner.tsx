import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAuth } from '../../contexts/AppContext';
import { enableAnalytics } from '../../firebase';
import { activerVexelHotjar } from '../../vexelhotjar';
import { mesureExclue } from '../../vexelhotjar/tracker';

const STORAGE_KEY = 'inspirata.consent.v1';
type ConsentValue = 'accepted' | 'rejected';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function loadMetaPixel() {
  if (typeof window === 'undefined' || window.fbq) return;
  /* eslint-disable */
  // @ts-ignore — vendor snippet
  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = !0; n.version = '2.0';
    n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq?.('init', '836682756431077');
  window.fbq?.('track', 'PageView');
}

export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'rejected' ? v : null;
}

const ConsentBanner: React.FC = () => {
  const { lang } = useApp();
  const { authReady } = useAuth();
  const [choice, setChoice] = useState<ConsentValue | null>(() => getConsent());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Un navigateur d'administratrice (drapeau vh.moi) ne charge rien, même
    // consenti; le drapeau se pose à la première réponse de Firebase, donc
    // rien ne démarre avant elle.
    if (choice === 'accepted' && authReady && !mesureExclue()) {
      loadMetaPixel();
      enableAnalytics();
      activerVexelHotjar();
    }
  }, [choice, authReady]);

  const decide = (value: ConsentValue) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
  };

  // La bande réserve sa propre hauteur au bas du document tant qu'elle est
  // là, sinon elle couvrirait la dernière rangée de boutons de la page
  // qu'on est en train de lire (salle de presse, 22 septembre 2026).
  useEffect(() => {
    const bande = ref.current;
    if (choice || !bande) return;
    const poser = () => { document.body.style.paddingBottom = `${bande.offsetHeight}px`; };
    poser();
    const obs = new ResizeObserver(poser);
    obs.observe(bande);
    window.addEventListener('resize', poser);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', poser);
      document.body.style.paddingBottom = '';
    };
  }, [choice, lang]);

  if (choice) return null;

  // Une bande fine ancrée au bas de l'écran, sur toute la largeur, au canon
  // du Festival Médiéval : la carte flottante d'avant se posait au tiers droit
  // de l'écran et recouvrait les tuiles de la salle de presse. Tout tient sur
  // une seule rangée, l'étiquette et le lien de la politique coulant dans la
  // phrase pour que la bande reste basse.
  const texte = (
    <>
      <span className="hidden sm:inline uppercase tracking-[0.28em] font-bold text-[#7d6330] mr-2">
        {lang === 'FR' ? 'En toute transparence' : 'With full transparency'}
      </span>
      {/* Mobile: une ligne. Le détail complet reste sur sm+ (recette
          bandeau compact, improvements-ledger 2026-07-04). */}
      <span className="sm:hidden">
        {lang === 'FR'
          ? 'Quelques témoins discrets, vous gardez le contrôle (Loi 25).'
          : 'A few discreet cookies; you stay in control (Law 25).'}
      </span>
      <span className="hidden sm:inline">
        {lang === 'FR'
          ? "Quelques témoins discrets nous aident à améliorer votre expérience, et si vous êtes connectée, les pages que vous consultez servent aussi à vous proposer une offre qui vous ressemble. Vous gardez le contrôle, comme le veut la Loi 25."
          : "A few discreet cookies help us improve your experience, and if you're signed in, the pages you visit also help us suggest offers that fit you. You stay in control, as Quebec's Law 25 intends."}
      </span>
      <Link
        to="/politique-de-confidentialite"
        className="ml-2 whitespace-nowrap underline text-[#2a2015]/55 dark:text-white/55 hover:text-[#7d6330]"
      >
        {lang === 'FR' ? 'Politique de confidentialité' : 'Privacy policy'}
      </Link>
    </>
  );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-live="polite"
      aria-label={lang === 'FR' ? 'Bandeau de consentement' : 'Consent banner'}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#bb9a5e]/30 bg-white/95 dark:bg-[#2a2015]/95 backdrop-blur-xl shadow-[0_-10px_30px_rgba(42,32,21,0.14)]"
    >
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 md:px-8">
        <p className="min-w-0 flex-1 basis-[15rem] text-[13px] leading-snug text-[#2a2015]/80 dark:text-white/80">
          <i className="fa-solid fa-cookie-bite text-[#7d6330] mr-2.5" aria-hidden />
          {texte}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide('accepted')}
            className="min-h-[40px] bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] font-bold uppercase tracking-widest text-[13px] px-5 py-2 rounded-full hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            {lang === 'FR' ? "J'accepte" : 'I accept'}
          </button>
          <button
            onClick={() => decide('rejected')}
            className="min-h-[40px] border border-[#2a2015]/20 dark:border-white/20 text-[#2a2015] dark:text-white font-bold uppercase tracking-widest text-[13px] px-5 py-2 rounded-full hover:border-[#bb9a5e] hover:text-[#7d6330] transition-colors"
          >
            {lang === 'FR' ? 'Non merci' : 'No thanks'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
