import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { loginWithGoogle } from '../firebase/auth';
import { addNewsletterSubscriber, getMember, updateMember } from '../firebase/firestore';

type Variant = 'dark' | 'light';
type Status = 'idle' | 'sending' | 'email-success' | 'google-success' | 'error';

interface Props {
  /** CRM tag — e.g. "krystine", "podcast", "footer". */
  source?: string;
  /** "dark" for navy backgrounds, "light" for cream/white. */
  variant?: Variant;
  /** Override the email submit button label. */
  ctaLabel?: string;
  /** Override the email input placeholder. */
  placeholder?: string;
  /** Extra wrapper classes. */
  className?: string;
  /** If true, skip the Google primary path and only show the email form. */
  emailOnly?: boolean;
}

const NewsletterSignup: React.FC<Props> = ({
  source = 'site',
  variant = 'dark',
  ctaLabel,
  placeholder,
  className = '',
  emailOnly = false,
}) => {
  const { lang, setSignInOpen } = useApp();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const isDark = variant === 'dark';
  const busy = status === 'sending';
  const done = status === 'email-success' || status === 'google-success';

  const labelCta = ctaLabel || (lang === 'FR' ? 'Rejoindre le fil' : 'Join the thread');
  const labelPlaceholder = placeholder || (lang === 'FR' ? 'Votre adresse email' : 'Your email address');

  const reset = () => { setError(null); };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    reset();
    setStatus('sending');
    try {
      await addNewsletterSubscriber({ email: email.trim(), source });
      setStatus('email-success');
      setEmail('');
    } catch (err: any) {
      setError(err?.message || (lang === 'FR' ? 'Échec de l\'inscription' : 'Subscription failed'));
      setStatus('error');
    }
  };

  const handleGoogle = async () => {
    reset();
    setStatus('sending');
    try {
      const cred = await loginWithGoogle();
      const gEmail = cred.user.email || '';
      const gName = cred.user.displayName || '';
      const [firstName, ...rest] = gName ? gName.split(/\s+/) : [''];
      const lastName = rest.join(' ');

      if (gEmail) {
        // Don't duplicate CRM entries for returning members already on the list.
        let alreadyOnList = false;
        try {
          const m = await getMember(cred.user.uid);
          alreadyOnList = !!m?.newsletterSubscribed;
        } catch { /* non-fatal */ }

        if (!alreadyOnList) {
          try {
            await addNewsletterSubscriber({
              email: gEmail,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              uid: cred.user.uid,
              source: `${source}_google`,
            });
            try {
              await updateMember(cred.user.uid, {
                newsletterSubscribed: true,
                newsletterSource: `${source}_google`,
              });
            } catch { /* non-fatal */ }
          } catch { /* non-fatal — signup succeeded even if CRM write fails */ }
        }
      }
      setStatus('google-success');
    } catch (err: any) {
      // Popup closed by user is not a real error.
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setStatus('idle');
        return;
      }
      setError(err?.message || (lang === 'FR' ? 'Connexion Google échouée' : 'Google sign-in failed'));
      setStatus('error');
    }
  };

  // ── Success states ──
  if (done) {
    const isGoogle = status === 'google-success';
    const title = isGoogle
      ? (lang === 'FR' ? 'Bienvenue dans le fil' : 'Welcome to the thread')
      : (lang === 'FR' ? 'Merci, vous êtes inscrit·e' : 'Thank you, you\'re subscribed');
    const body = isGoogle
      ? (lang === 'FR'
          ? 'Votre espace client Inspirata est prêt. Nous vous écrirons bientôt.'
          : 'Your Inspirata client space is ready. We\'ll be in touch soon.')
      : (lang === 'FR'
          ? 'Vous recevrez bientôt le fil. Créez votre espace client pour accéder à vos rituels et résultats.'
          : 'The thread is on its way. Create a client space to access your rituals and results.');

    return (
      <div className={`text-center ${className}`}>
        <div className={`inline-flex items-center gap-3 mb-5 ${isDark ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`}>
          <i className="fa-solid fa-check-circle text-2xl" />
          <span className="font-serif italic text-xl md:text-2xl">{title}</span>
        </div>
        <p className={`text-sm leading-relaxed max-w-md mx-auto ${isDark ? 'text-white/60' : 'text-[#0B1A36]/60'}`}>
          {body}
        </p>
        {!isGoogle && (
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="mt-6 inline-flex items-center gap-2 text-[#D4AF37] hover:text-white uppercase tracking-widest text-[11px] font-bold border-b border-[#D4AF37]/40 hover:border-[#D4AF37] pb-1 transition-colors"
          >
            {lang === 'FR' ? 'Créer mon espace client' : 'Create my client space'}
            <i className="fa-solid fa-arrow-right text-[9px]" />
          </button>
        )}
      </div>
    );
  }

  // ── Styles ──
  const inputClass = isDark
    ? 'bg-transparent border-b border-white/20 text-white placeholder:text-white/30 focus:border-[#D4AF37]'
    : 'bg-transparent border-b border-[#0B1A36]/20 text-[#0B1A36] placeholder:text-[#0B1A36]/40 focus:border-[#D4AF37]';

  const googleBtnClass = isDark
    ? 'bg-white/5 border border-white/15 text-white hover:border-[#D4AF37] hover:bg-white/10'
    : 'bg-white border border-[#0B1A36]/10 text-[#0B1A36] hover:border-[#D4AF37]';

  const dividerClass = isDark ? 'text-white/40' : 'text-[#0B1A36]/40';
  const dividerLineClass = isDark ? 'bg-white/10' : 'bg-[#0B1A36]/10';
  const fineprintClass = isDark ? 'text-white/30' : 'text-[#0B1A36]/40';

  return (
    <div className={className}>
      {!emailOnly && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs mb-5 transition-colors disabled:opacity-50 ${googleBtnClass}`}
          >
            <i className="fa-brands fa-google text-sm" />
            {lang === 'FR' ? 'Continuer avec Google' : 'Continue with Google'}
          </button>

          <div className={`flex items-center gap-3 mb-5 text-[10px] uppercase tracking-[0.25em] ${dividerClass}`}>
            <span className={`flex-1 h-px ${dividerLineClass}`} />
            <span>{lang === 'FR' ? 'ou par courriel' : 'or by email'}</span>
            <span className={`flex-1 h-px ${dividerLineClass}`} />
          </div>
        </>
      )}

      <form onSubmit={handleEmailSubmit} className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder={labelPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={`flex-1 w-full px-2 py-3 outline-none transition-colors text-center md:text-left tracking-wide ${inputClass}`}
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-[#D4AF37] text-[#0B1A36] font-bold uppercase tracking-widest text-xs px-10 py-4 rounded-full hover:bg-white transition-colors whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <i className="fa-solid fa-circle-notch fa-spin" /> : labelCta}
        </button>
      </form>

      {status === 'error' && error && (
        <p className={`mt-4 text-xs text-center ${isDark ? 'text-red-400' : 'text-red-600'} font-mono`}>{error}</p>
      )}

      <p className={`mt-6 text-[10px] italic text-center tracking-wide ${fineprintClass}`}>
        {lang === 'FR'
          ? 'Désabonnement en un clic. Votre adresse n\'est jamais revendue.'
          : 'One-click unsubscribe. Your email is never resold.'}
      </p>
    </div>
  );
};

export default NewsletterSignup;
