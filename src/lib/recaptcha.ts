import { useCallback, useEffect, useRef, useState } from 'react';
import { getLang } from './i18n/lang';

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
//
// Plus tolérante (6 oct. 2026, deux lectures perdues la nuit précédente :
// une case expirée, une case absente). La protection ne bouge pas : le serveur
// exige toujours un jeton valide de moins de deux minutes. Ce qui change, c'est
// qu'on n'envoie plus un jeton voué au refus et que la personne sait quoi faire :
//  · la case expirée se recharge d'elle-même, et `etat` passe à « expiree »;
//  · un jeton coché depuis plus de 100 s n'est pas envoyé : la case se recharge;
//  · une case qui ne s'affiche pas (script bloqué, réseau lent) passe à
//    « absente » après 10 s, et `recharger()` la redemande, en alternant avec
//    www.recaptcha.net (même service de Google, joignable là où google.com est filtré);
//  · un formulaire démonté puis remonté (recommencer le quiz) reçoit une
//    nouvelle case au lieu de garder l'ancienne, disparue avec lui.
export const RECAPTCHA_SITE_KEY =
  ((import.meta as any).env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || '';

declare const grecaptcha: any;

export type EtatCase = 'chargement' | 'prete' | 'cochee' | 'expiree' | 'absente';

// Google accepte un jeton deux minutes; le serveur aussi (functions/src/captcha.ts).
// Vingt secondes de marge pour l'aller-retour.
const AGE_MAX_JETON_MS = 100 * 1000;
const ATTENTE_CASE_MS = 10 * 1000;

// La case normale de Google fait 304 px de large, sans démordre. Dans une
// carte au téléphone, elle déborde et pousse toute la page vers la droite :
// vu au 390 le 21 septembre 2026 sur la page de désabonnement. Google prévoit
// une taille « compact » (164 px) pour exactement ce cas, alors on la prend
// sous 480 px plutôt que de bricoler une mise à l'échelle en CSS.
const tailleCase = (): 'normal' | 'compact' =>
  (typeof window !== 'undefined' && window.innerWidth < 480 ? 'compact' : 'normal');

// Plusieurs formulaires peuvent attendre le script en même temps : une file.
const enAttente: Array<() => void> = [];
function quandPret(f: () => void, essai: number, surEchec: () => void) {
  if (typeof grecaptcha !== 'undefined' && grecaptcha.render) { f(); return; }
  enAttente.push(f);
  (window as any).__recaptchaReady = () => { while (enAttente.length) enAttente.shift()!(); };
  const hote = essai % 2 === 0 ? 'www.google.com' : 'www.recaptcha.net';
  if (!document.querySelector(`script[src*="${hote}/recaptcha/api.js"]`)) {
    const s = document.createElement('script');
    // La case parle la langue du site (hl=fr ou hl=en).
    s.src = `https://${hote}/recaptcha/api.js?onload=__recaptchaReady&render=explicit&hl=${getLang()}`;
    s.async = true;
    s.onerror = surEchec;
    document.head.appendChild(s);
  }
}

export function useRecaptcha(active: boolean) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  // Une référence-fonction : la case se pose dès que son emplacement existe,
  // même s'il apparaît après l'activation, et se repose s'il est remplacé.
  const boxRef = useCallback((n: HTMLDivElement | null) => setEl(n), []);
  const widgetRef = useRef<{ id: number; el: HTMLDivElement } | null>(null);
  const cocheeLe = useRef(0);
  const [etat, setEtat] = useState<EtatCase>('chargement');
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!active || !RECAPTCHA_SITE_KEY || !el) return;
    if (widgetRef.current?.el === el) return;
    let fini = false;
    setEtat('chargement');
    const poser = () => {
      if (fini || widgetRef.current?.el === el || !el.isConnected) return;
      try {
        el.replaceChildren();
        const id = grecaptcha.render(el, {
          sitekey: RECAPTCHA_SITE_KEY,
          size: tailleCase(),
          callback: () => { cocheeLe.current = Date.now(); setEtat('cochee'); },
          // Expirée : la case se recharge d'elle-même, vide, prête à recocher.
          'expired-callback': () => {
            cocheeLe.current = 0;
            try { grecaptcha.reset(id); } catch { /* noop */ }
            setEtat('expiree');
          },
          'error-callback': () => { cocheeLe.current = 0; setEtat('absente'); },
        });
        widgetRef.current = { id, el };
        setEtat('prete');
      } catch {
        setEtat('absente');
      }
    };
    quandPret(poser, essai, () => { if (!fini) setEtat('absente'); });
    const minuteur = window.setTimeout(() => {
      if (!fini && widgetRef.current?.el !== el) setEtat('absente');
    }, ATTENTE_CASE_MS);
    return () => { fini = true; window.clearTimeout(minuteur); };
  }, [active, el, essai]);

  const resetWidget = () => {
    cocheeLe.current = 0;
    if (widgetRef.current !== null) { try { grecaptcha.reset(widgetRef.current.id); } catch { /* noop */ } }
    setEtat(widgetRef.current ? 'prete' : 'chargement');
  };

  const getToken = (): string => {
    if (widgetRef.current === null) return '';
    // Un jeton trop vieux serait refusé par le serveur : la case se recharge
    // plutôt que de faire échouer l'envoi.
    if (cocheeLe.current && Date.now() - cocheeLe.current > AGE_MAX_JETON_MS) {
      cocheeLe.current = 0;
      try { grecaptcha.reset(widgetRef.current.id); } catch { /* noop */ }
      setEtat('expiree');
      return '';
    }
    try { return grecaptcha.getResponse(widgetRef.current.id) || ''; } catch { return ''; }
  };

  /** Redemande la case : réinitialise celle qui existe, ou recharge le script. */
  const recharger = () => {
    cocheeLe.current = 0;
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render && widgetRef.current?.el === el && el?.isConnected) {
      resetWidget();
      return;
    }
    widgetRef.current = null;
    setEssai(n => n + 1);
  };

  return { boxRef, getToken, resetWidget, recharger, etat };
}
