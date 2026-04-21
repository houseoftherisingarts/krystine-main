import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { enableAnalytics } from '../../firebase';

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
  const [choice, setChoice] = useState<ConsentValue | null>(() => getConsent());

  useEffect(() => {
    if (choice === 'accepted') {
      loadMetaPixel();
      enableAnalytics();
    }
  }, [choice]);

  const decide = (value: ConsentValue) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
  };

  if (choice) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={lang === 'FR' ? 'Bandeau de consentement' : 'Consent banner'}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[60] bg-white/95 dark:bg-[#0B1A36]/95 backdrop-blur-xl border border-[#D4AF37]/25 rounded-2xl shadow-xl p-4 md:p-5"
    >
      <div className="flex items-start gap-3 mb-3">
        <i className="fa-solid fa-cookie-bite text-[#D4AF37] text-sm mt-0.5" />
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-1">
            {lang === 'FR' ? 'Loi 25' : 'Law 25'}
          </p>
          <p className="text-xs text-[#0B1A36]/80 dark:text-white/80 leading-relaxed">
            {lang === 'FR'
              ? 'Témoins de mesure pour améliorer le site. Vous gardez le contrôle.'
              : 'Measurement cookies to improve the site. You stay in control.'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => decide('accepted')}
          className="flex-1 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-full hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
        >
          {lang === 'FR' ? 'Accepter' : 'Accept'}
        </button>
        <button
          onClick={() => decide('rejected')}
          className="flex-1 border border-[#0B1A36]/20 dark:border-white/20 text-[#0B1A36] dark:text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-full hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
        >
          {lang === 'FR' ? 'Refuser' : 'Decline'}
        </button>
      </div>
      <Link
        to="/politique-de-confidentialite"
        className="block mt-3 text-[10px] text-[#0B1A36]/50 dark:text-white/50 underline hover:text-[#D4AF37]"
      >
        {lang === 'FR' ? 'Politique de confidentialité' : 'Privacy policy'}
      </Link>
    </div>
  );
};

export default ConsentBanner;
