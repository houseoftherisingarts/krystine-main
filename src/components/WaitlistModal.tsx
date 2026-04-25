import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { points } from '../firebase/points';

export interface WaitlistTarget {
  id: string;            // stable key, used for source + tag (e.g. "waitlist-pitta")
  labelFR: string;       // e.g. "Programme Pitta"
  labelEN: string;       // e.g. "Pitta Program"
}

interface WaitlistModalProps {
  target: WaitlistTarget | null;
  onClose: () => void;
}

// Waitlist capture for "Coming soon" programmes. Writes to the same `newsletter`
// Firestore collection as every other signup, so Krystine sees the entry in her
// CRM with a source like "waitlist-pitta" that the SubscribersPanel filters on.
const WaitlistModal: React.FC<WaitlistModalProps> = ({ target, onClose }) => {
  const { lang, user } = useApp();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!target) return null;

  const label = lang === 'FR' ? target.labelFR : target.labelEN;
  const sourceTag = `waitlist-${target.id}`;

  const close = () => {
    onClose();
    // Reset after the close animation would settle — simple enough here to
    // just clear on close.
    setEmail(''); setFirstName(''); setErr(null); setDone(false); setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addNewsletterSubscriber({
        email: trimmed,
        firstName: firstName.trim() || undefined,
        source: sourceTag,
        tags: [sourceTag],
        status: 'active',
      });
      if (user?.uid) {
        try { await points.newsletterSigned(user.uid, sourceTag); } catch { /* non-fatal */ }
      }
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || (lang === 'FR' ? 'Une erreur est survenue.' : 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#3A251E]/60 backdrop-blur-md" onClick={close}>
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#3A251E] rounded-[30px] shadow-2xl border border-[#B8532F]/20 p-8 md:p-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#3A251E]/40 dark:text-white/40 hover:text-[#3A251E] dark:hover:text-white"
          aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
        >
          <i className="fa-solid fa-times text-lg" />
        </button>

        <span className="text-[#B8532F] uppercase tracking-[0.3em] text-[10px] font-bold block mb-3">
          {lang === 'FR' ? 'Bientôt disponible' : 'Coming soon'}
        </span>
        <h2 className="font-serif text-3xl text-[#3A251E] dark:text-white mb-2">
          {lang === 'FR' ? "Liste d'attente" : 'Join the waitlist'}
        </h2>
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60 mb-6 font-serif italic">
          {lang === 'FR'
            ? `Soyez avisé·e dès que ${label} ouvre ses portes.`
            : `Be notified as soon as ${label} opens its doors.`}
        </p>

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-[#B8532F]/15 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-[#B8532F] text-xl" />
            </div>
            <p className="font-serif italic text-[#3A251E] dark:text-white">
              {lang === 'FR'
                ? 'Merci. Vous serez parmi les premières à savoir.'
                : 'Thank you. You will be among the first to know.'}
            </p>
            <button
              onClick={close}
              className="mt-6 inline-flex items-center gap-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors"
            >
              {lang === 'FR' ? 'Fermer' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder={lang === 'FR' ? 'Prénom (facultatif)' : 'First name (optional)'}
              className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F]"
            />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={lang === 'FR' ? 'Votre adresse courriel' : 'Your email address'}
              className="w-full px-5 py-3 rounded-full border border-[#3A251E]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F]"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors disabled:opacity-60"
            >
              {busy
                ? <i className="fa-solid fa-circle-notch fa-spin" />
                : (lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist')}
            </button>
            {err && <p className="text-center text-xs text-red-600">{err}</p>}
            <p className="text-[10px] text-center text-[#3A251E]/50 dark:text-white/50 pt-1">
              {lang === 'FR'
                ? "Désabonnement en un clic. Votre adresse n'est jamais revendue."
                : 'Unsubscribe in one click. Your address is never resold.'}
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
