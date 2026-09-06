import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { loginWithGoogle } from '../firebase/auth';
import { addNewsletterSubscriber, getMember, updateMember } from '../firebase/firestore';
import { points } from '../firebase/points';
import CompteUpsell from './CompteUpsell';

type Variant = 'dark' | 'light';
type Status = 'idle' | 'sending' | 'email-success' | 'google-success' | 'error';

interface Props {
  /**
   * CRM tag — the source string stored on each subscriber so Krystine can
   * filter the admin list by which form filled the entry. REQUIRED: no
   * silent default, so a forgotten prop shows up as a type error rather
   * than as generic "site" mystery entries in the CRM.
   */
  source: string;
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
  /** Étiquettes CRM posées sur l'inscrit (défaut : [source]). */
  tags?: string[];
  /** Demander le prénom avant le courriel. */
  askFirstName?: boolean;
  /** Champ facultatif « votre question » (direct du podcast). */
  askQuestion?: { placeholder: string; hint?: string };
  /** Écran de succès sur mesure (titre + phrase), à la place du message infolettre. */
  success?: { title: string; body: string };
  /** Ligne secondaire « Créer mon compte » sous le formulaire. Par défaut affichée ;
   * mise à false pour les listes d'attente d'événement (ex. LiveSignup), qui ne sont pas l'infolettre. */
  accountUpsell?: boolean;
}

const NewsletterSignup: React.FC<Props> = ({
  source,
  variant = 'dark',
  ctaLabel,
  placeholder,
  className = '',
  emailOnly = false,
  tags,
  askFirstName = false,
  askQuestion,
  success,
  accountUpsell = true,
}) => {
  const { lang, user } = useApp();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion();

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
      await addNewsletterSubscriber({
        email: email.trim(),
        firstName: askFirstName ? firstName.trim() || undefined : undefined,
        question: askQuestion ? question.trim().slice(0, 1000) || undefined : undefined,
        source,
        tags: tags || [source],
      });
      // Loyalty — 5 pts for newsletter subscribe, once per member (keyed on
      // uid so anonymous signups don't earn points until the user signs in).
      if (user?.uid) {
        try { await points.newsletterSigned(user.uid, source); } catch { /* non-fatal */ }
      }
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
              tags: [...(tags || [source]), `${source}_google`],
            });
            try {
              await updateMember(cred.user.uid, {
                newsletterSubscribed: true,
                newsletterSource: `${source}_google`,
              });
            } catch { /* non-fatal */ }
            try { await points.newsletterSigned(cred.user.uid, `${source}_google`); } catch { /* non-fatal */ }
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

  // ── Écran de confirmation ──
  // Une vraie scène : l'image du livre aux fleurs séchées (public/foyer), le
  // titre en Cormorant, une phrase qui dit ce qui arrive ensuite. Carte crème,
  // coins 15 px, entrée lente et feutrée (reduced-motion respecté).
  if (done) {
    const isGoogle = status === 'google-success';
    const title = success ? success.title : isGoogle
      ? (lang === 'FR' ? 'Bienvenue dans le fil' : 'Welcome to the thread')
      : (lang === 'FR' ? 'Vous êtes bien inscrit·e' : 'You are on the list');
    const body = success ? success.body : isGoogle
      ? (lang === 'FR'
          ? 'Votre espace client Inspirata est prêt et un premier mot de bienvenue arrive dans votre boîte.'
          : 'Your Inspirata client space is ready and a first welcome note is on its way to your inbox.')
      : (lang === 'FR'
          ? 'Vous êtes maintenant inscrit·e à l\'infolettre, ce courrier que nous envoyons au rythme des saisons. Vous y trouverez à l\'occasion des rituels ou des lectures à emporter avec vous, ainsi que d\'autres petits trésors. Vous n\'avez rien d\'autre à faire pour le moment. La prochaine infolettre arrivera dans votre boîte.'
          : 'You are now on the newsletter, the letter we send with the seasons. In it you will find, now and then, rituals or readings to take with you, along with a few other small treasures. There is nothing else to do for now. The next newsletter will arrive in your inbox.');
    const ease = [0.16, 0.8, 0.24, 1] as const;
    const fade = (delay: number) => ({
      initial: reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
      transition: { duration: 1, delay, ease },
    });

    return (
      <motion.div
        role="status"
        aria-live="polite"
        className={`w-full max-w-2xl mx-auto overflow-hidden rounded-[15px] bg-[#f6f3ee] text-[#2a2015] shadow-[0_18px_50px_rgba(42,32,21,0.18)] ${className}`}
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease }}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <motion.img
            src="/foyer/livre-fleurs.webp"
            alt={lang === 'FR' ? 'Un livre ouvert, quelques roses séchées entre les pages' : 'An open book with a few dried roses between the pages'}
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduce ? false : { scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease }}
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#f6f3ee] to-transparent" />
        </div>
        <div className="px-8 pb-10 pt-2 text-center md:px-12 md:pb-12">
          <motion.div aria-hidden className="mx-auto mb-6 h-px w-16 bg-[#bb9a5e]" {...fade(0.25)} />
          <motion.h3
            className="font-serif font-medium text-[clamp(2rem,4.5vw,2.9rem)] leading-[1.05]"
            {...fade(0.35)}
          >
            {title}
          </motion.h3>
          <motion.p className="mx-auto mt-5 max-w-md text-[0.95rem] leading-[1.75] text-[#2a2015]/70" {...fade(0.5)}>
            {body}
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // ── Styles ──
  // Sur fond sombre, les champs deviennent des surfaces claires : Krystine a
  // vu le formulaire du direct « trop foncé, pas assez blanc » (2026-08-28).
  const inputClass = isDark
    ? 'rounded-md bg-[#f6f1e7] border border-transparent text-[#2a2015] placeholder:text-[#2a2015]/55 focus:border-[#bb9a5e] px-4'
    : 'bg-transparent border-b border-[#2a2015]/20 text-[#2a2015] placeholder:text-[#2a2015]/40 focus:border-[#bb9a5e]';

  const googleBtnClass = isDark
    ? 'bg-white/5 border border-white/15 text-white hover:border-[#bb9a5e] hover:bg-white/10'
    : 'bg-white border border-[#2a2015]/10 text-[#2a2015] hover:border-[#bb9a5e]';

  const dividerClass = isDark ? 'text-white/40' : 'text-[#2a2015]/40';
  const dividerLineClass = isDark ? 'bg-white/10' : 'bg-[#2a2015]/10';
  const fineprintClass = isDark ? 'text-white/60' : 'text-[#2a2015]/40';

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

      <form onSubmit={handleEmailSubmit} className={askFirstName ? 'grid gap-4 sm:grid-cols-2' : 'flex flex-col md:flex-row gap-4 items-center'}>
        {askFirstName && (
          <input
            type="text"
            autoComplete="given-name"
            placeholder={lang === 'FR' ? 'Votre prénom' : 'Your first name'}
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className={`w-full px-2 py-3 outline-none transition-colors text-center md:text-left tracking-wide ${inputClass}`}
          />
        )}
        <input
          type="email"
          required
          autoComplete="email"
          placeholder={labelPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={`flex-1 w-full px-2 py-3 outline-none transition-colors text-center md:text-left tracking-wide ${inputClass}`}
        />
        {askQuestion && (
          <div className="sm:col-span-2">
            <textarea
              rows={3}
              maxLength={1000}
              placeholder={askQuestion.placeholder}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className={`w-full resize-none px-2 py-3 outline-none transition-colors tracking-wide ${inputClass}`}
            />
            {askQuestion.hint && <p className={`mt-2 text-xs ${fineprintClass}`}>{askQuestion.hint}</p>}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className={`bg-[#bb9a5e] text-[#2a2015] font-bold uppercase tracking-widest text-xs px-10 py-4 rounded-full hover:bg-white transition-colors whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2 ${askFirstName ? 'sm:col-span-2 w-full mt-2' : ''}`}
        >
          {busy ? <i className="fa-solid fa-circle-notch fa-spin" /> : labelCta}
        </button>
      </form>

      {status === 'error' && error && (
        <p className={`mt-4 text-sm text-center ${isDark ? 'text-red-400' : 'text-red-600'} font-mono`}>{error}</p>
      )}

      <p className={`mt-6 text-sm italic text-center tracking-wide ${fineprintClass}`}>
        {lang === 'FR'
          ? 'Désabonnement en un clic. Votre adresse n\'est jamais revendue.'
          : 'One-click unsubscribe. Your email is never resold.'}
      </p>

      {accountUpsell && <CompteUpsell variant={variant} className="mt-6 pt-6 text-center" />}
    </div>
  );
};

export default NewsletterSignup;
