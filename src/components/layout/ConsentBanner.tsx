import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useAuth } from '../../contexts/AppContext';
import { enableAnalytics } from '../../firebase';
import { activerVexelHotjar } from '../../vexelhotjar';
import { mesureExclue } from '../../vexelhotjar/tracker';
import { compterVisiteAnonyme } from '../../vexelhotjar/compte';

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
  // Pixel « KSL » (KAJABI. KSL PIXEL), celui des campagnes de Krystine (3 oct. 2026) : les mêmes événements partent aux deux.
  window.fbq?.('init', '1520805652120798');
  window.fbq?.('track', 'PageView');
}

// Le choix seul part au compteur anonyme du bilan du matin (accepte ou
// refuse, rien d'autre), pour connaître la part des visiteuses que la mesure
// ne voit pas. Aucun témoin, aucune adresse gardée (13 oct. 2026).
// L'affichage se compte une seule fois par onglet (drapeau « 1 » en
// sessionStorage, qui ne désigne personne et s'efface à la fermeture), pour
// connaître celles qui ne choisissent pas sans compter chaque page vue.
const CLE_AFFICHEE = 'inspirata.banniere.comptee';
function signalerAffichage() {
  try {
    if (sessionStorage.getItem(CLE_AFFICHEE)) return;
    sessionStorage.setItem(CLE_AFFICHEE, '1');
  } catch { return; }
  envoyerCompte('affiche');
}
function signalerChoix(value: ConsentValue) {
  envoyerCompte(value === 'accepted' ? 'accepte' : 'refuse');
}
function envoyerCompte(choix: 'affiche' | 'accepte' | 'refuse') {
  try {
    if (mesureExclue()) return;
    const sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    const corps = JSON.stringify({ v: 1, site: 'krystine', sid, t: 'consent', choix });
    const blob = new Blob([corps], { type: 'text/plain' });
    if (!(navigator.sendBeacon && navigator.sendBeacon('/api/vh', blob))) {
      fetch('/api/vh', { method: 'POST', body: blob, keepalive: true, credentials: 'omit' }).catch(() => {});
    }
  } catch { /* le compteur ne doit jamais gêner la visite */ }
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

  // Toutes les visites se comptent, de façon anonyme, quel que soit le choix (16 oct. 2026).
  useEffect(() => { if (authReady) compterVisiteAnonyme(); }, [authReady]);

  // La bannière attend que la visiteuse commence à lire : un premier défilement, ou 8 secondes sur la page.
  const [prete, setPrete] = useState(false);
  useEffect(() => {
    if (choice || prete) return;
    const ouvrir = () => setPrete(true);
    const surDefil = () => { if (window.scrollY > 120) ouvrir(); };
    const minuterie = window.setTimeout(ouvrir, 8000);
    window.addEventListener('scroll', surDefil, { passive: true });
    return () => { window.clearTimeout(minuterie); window.removeEventListener('scroll', surDefil); };
  }, [choice, prete]);

  useEffect(() => {
    if (!choice && authReady && prete) signalerAffichage();
  }, [choice, authReady, prete]);

  const decide = (value: ConsentValue) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    signalerChoix(value);
    setChoice(value);
  };

  // La bande réserve sa propre hauteur au bas du document tant qu'elle est
  // là, sinon elle couvrirait la dernière rangée de boutons de la page
  // qu'on est en train de lire (salle de presse, 22 septembre 2026).
  useEffect(() => {
    const bande = ref.current;
    if (choice || !prete || !bande) return;
    // --bande-temoins laisse les barres fixes d'une page (barre d'achat de
    // /vata) se poser au-dessus de la bande au lieu d'être cachées dessous.
    const poser = () => {
      document.body.style.paddingBottom = `${bande.offsetHeight}px`;
      document.documentElement.style.setProperty('--bande-temoins', `${bande.offsetHeight}px`);
    };
    poser();
    const obs = new ResizeObserver(poser);
    obs.observe(bande);
    window.addEventListener('resize', poser);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', poser);
      document.body.style.paddingBottom = '';
      document.documentElement.style.removeProperty('--bande-temoins');
    };
  }, [choice, lang, prete]);

  if (choice || !prete) return null;

  // Une bande fine ancrée au bas de l'écran, sur toute la largeur, au canon
  // du Festival Médiéval : la carte flottante d'avant se posait au tiers droit
  // de l'écran et recouvrait les tuiles de la salle de presse. Tout tient sur
  // une seule rangée, l'étiquette et le lien de la politique coulant dans la
  // phrase pour que la bande reste basse.
  // La question, refaite avec Krystine le 16 oct. 2026 (« je suis tannée de ça ») : une phrase
  // courte, vraie (le pixel de Meta sert aux annonces, d'où « faire connaître »), une seule porte
  // forte. Le refus reste à un clic, comme l'exige le RGPD pour la France et la Belgique.
  const texte = (
    <>
      {lang === 'FR'
        ? 'Pouvons-nous compter votre passage ? Cela nous aide à mieux vous accueillir et à faire connaître le travail de Krystine. Nous ne vendons rien de vous.'
        : 'May we count your visit? It helps us welcome you better and share Krystine’s work. We never sell anything about you.'}
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
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-1.5 sm:gap-y-2 px-4 py-2 sm:py-2.5 md:px-8">
        <p className="min-w-0 flex-1 basis-[15rem] text-[13px] leading-snug text-[#2a2015]/80 dark:text-white/80">
          <i className="fa-solid fa-cookie-bite text-[#7d6330] mr-2.5" aria-hidden />
          {texte}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => decide('accepted')}
            className="min-h-[40px] bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] font-bold uppercase tracking-widest text-[13px] px-6 py-2 rounded-full hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            {lang === 'FR' ? 'Oui, avec plaisir' : 'Yes, gladly'}
          </button>
          <button
            onClick={() => decide('rejected')}
            className="min-h-[40px] px-2 text-[12px] underline underline-offset-4 text-[#2a2015]/60 dark:text-white/60 hover:text-[#7d6330]"
          >
            {lang === 'FR' ? 'Non merci' : 'No thanks'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
