import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { points } from '../firebase/points';

// Embedded social-share bar. Appears at the bottom of every public page via
// `App.tsx` → `ShareBar`. Each click:
//   1. Opens the target share URL (or copies the link to clipboard).
//   2. Awards 2 loyalty points to the signed-in member, dedupped per share
//      occurrence (so repeated clicks DO count as separate shares — the
//      dedup key is the current timestamp).
//
// No tracking when the user is anonymous — points require a uid.

interface Props {
  /**
   * Short label describing WHAT is being shared (e.g. "L'Expérience Origine",
   * "Le podcast Inspirata"). Goes into the social copy via `title`.
   */
  title?: string;
  /** Override the shared URL. Defaults to `window.location.href`. */
  url?: string;
  /** Wrapper class — the caller controls outer spacing/background. */
  className?: string;
  /** Small-footprint variant for tight spots. */
  compact?: boolean;
}

type Platform = 'facebook' | 'x' | 'email' | 'copy';

const ShareButtons: React.FC<Props> = ({ title, url, className = '', compact = false }) => {
  const { lang, user } = useApp();
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://krystinestlaurent.ca');
  const shareTitle = title || (typeof document !== 'undefined' ? document.title : 'Inspirata Ayurveda');

  const onShare = (platform: Platform) => {
    // Loyalty — each share counts. We include ms timestamp in the dedup
    // key so rapid successive shares of the same page/platform all award.
    if (user?.uid) {
      points.shared(user.uid, shareUrl, platform).catch(() => { /* non-fatal */ });
    }

    const enc = (s: string) => encodeURIComponent(s);
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=500');
    } else if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?text=${enc(shareTitle)}&url=${enc(shareUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=500');
    } else if (platform === 'email') {
      const subject = enc(shareTitle);
      const body = enc(`${shareTitle}\n\n${shareUrl}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } else if (platform === 'copy') {
      try {
        navigator.clipboard?.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch { /* fall back silently */ }
    }
  };

  const baseBtn = compact
    ? 'w-8 h-8 rounded-full flex items-center justify-center text-xs'
    : 'w-10 h-10 rounded-full flex items-center justify-center text-sm';

  const iconBtn = `${baseBtn} border transition-colors`;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#3A251E]/60 dark:text-white/60 mr-1">
        {lang === 'FR' ? 'Partager' : 'Share'}
      </span>
      <button
        type="button"
        onClick={() => onShare('facebook')}
        aria-label="Facebook"
        title="Facebook"
        className={`${iconBtn} border-[#3A251E]/15 dark:border-white/15 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]`}
      >
        <i className="fa-brands fa-facebook-f" />
      </button>
      <button
        type="button"
        onClick={() => onShare('x')}
        aria-label="X (Twitter)"
        title="X (Twitter)"
        className={`${iconBtn} border-[#3A251E]/15 dark:border-white/15 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]`}
      >
        <i className="fa-brands fa-x-twitter" />
      </button>
      <button
        type="button"
        onClick={() => onShare('email')}
        aria-label={lang === 'FR' ? 'Courriel' : 'Email'}
        title={lang === 'FR' ? 'Courriel' : 'Email'}
        className={`${iconBtn} border-[#3A251E]/15 dark:border-white/15 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]`}
      >
        <i className="fa-solid fa-envelope" />
      </button>
      <button
        type="button"
        onClick={() => onShare('copy')}
        aria-label={lang === 'FR' ? 'Copier le lien' : 'Copy link'}
        title={lang === 'FR' ? 'Copier le lien' : 'Copy link'}
        className={`${iconBtn} border-[#3A251E]/15 dark:border-white/15 text-[#3A251E]/70 dark:text-white/70 hover:border-[#B8532F] hover:text-[#B8532F]`}
      >
        <i className={`fa-solid ${copied ? 'fa-check' : 'fa-link'}`} />
      </button>
      {copied && (
        <span className="text-[10px] uppercase tracking-widest text-[#B8532F] font-bold ml-1">
          {lang === 'FR' ? 'Copié' : 'Copied'}
        </span>
      )}
    </div>
  );
};

export default ShareButtons;

// A thin page-level bar. Rendered in App.tsx between the route content and
// the footer on every public page, so the user always has a way to share
// (and earn 2 pts doing it).
export const PageShareBar: React.FC = () => (
  <div className="w-full border-t border-[#3A251E]/5 dark:border-white/5 bg-[#F4E7DD] dark:bg-[#2E1A14]">
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-6 flex flex-wrap items-center justify-between gap-4">
      <p className="text-xs uppercase tracking-[0.25em] font-bold text-[#3A251E]/60 dark:text-white/60">
        <i className="fa-solid fa-seedling text-[#B8532F] mr-2" />
        Inspirata Ayurveda
      </p>
      <ShareButtons />
    </div>
  </div>
);
