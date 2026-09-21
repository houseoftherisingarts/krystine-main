import { useEffect, useRef } from 'react';

// ─── La case « Je ne suis pas un robot » ─────────────────────────────────────
// reCAPTCHA v2, rendu à la main. Le crochet vivait dans SignInModal.tsx; il en
// est sorti le 21 septembre 2026 pour servir aussi au téléchargement de
// l'extrait, à la musique d'Origine et à la carte de réhabilitation de
// l'espace membre.
//
// Sans clé configurée (dev), la case ne s'affiche pas et `getToken` rend une
// chaîne vide : les appelants laissent alors passer, exactement comme avant.
// La case ne protège que là où une fonction vérifie le jeton côté serveur;
// ailleurs, elle ne serait qu'un décor.
export const RECAPTCHA_SITE_KEY =
  ((import.meta as any).env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || '';

declare const grecaptcha: any;

export function useRecaptcha(active: boolean) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !RECAPTCHA_SITE_KEY) return;
    const render = () => {
      if (widgetRef.current !== null || !boxRef.current) return;
      widgetRef.current = grecaptcha.render(boxRef.current, { sitekey: RECAPTCHA_SITE_KEY });
    };
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) { render(); return; }
    (window as any).__recaptchaReady = render;
    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaReady&render=explicit';
      s.async = true;
      document.head.appendChild(s);
    }
  }, [active]);

  const getToken = (): string => {
    if (widgetRef.current === null) return '';
    try { return grecaptcha.getResponse(widgetRef.current) || ''; } catch { return ''; }
  };
  const resetWidget = () => {
    if (widgetRef.current !== null) { try { grecaptcha.reset(widgetRef.current); } catch { /* noop */ } }
  };
  return { boxRef, getToken, resetWidget };
}
