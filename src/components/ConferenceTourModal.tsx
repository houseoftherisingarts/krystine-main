import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { addBookingRequest } from '../firebase/firestore';

// "Demander une tournée de conférences" form.
// ─────────────────────────────────────────────────────────────────────────────
// Writes to the `bookingRequests` collection with source 'conference-tour'
// so the existing admin Demandes view picks it up automatically. The form
// distinguishes passive requests ("j'aimerais la voir dans ma région") from
// serious hosts ("je peux fournir le lieu + la logistique") via a single
// dropdown — lets Krystine triage without a follow-up call.

interface Props {
  open: boolean;
  onClose: () => void;
}

type HostCap = 'request-only' | 'know-venue' | 'can-venue' | 'can-organize' | 'venue-and-organize';

const HOST_OPTIONS: { id: HostCap; fr: string; en: string }[] = [
  { id: 'request-only',
    fr: 'Je demande simplement · je souhaite la voir dans ma région.',
    en: "I'm just asking — I'd love to see her in my region." },
  { id: 'know-venue',
    fr: "Je connais un lieu qui pourrait l'accueillir.",
    en: 'I know of a venue that could host her.' },
  { id: 'can-venue',
    fr: 'Je peux fournir le lieu.',
    en: 'I can provide the venue.' },
  { id: 'can-organize',
    fr: "Je peux aider à l'organisation locale.",
    en: 'I can help with local organization.' },
  { id: 'venue-and-organize',
    fr: "Je peux fournir à la fois le lieu et l'assistance logistique.",
    en: 'I can provide both the venue and the logistical support.' },
];

const ConferenceTourModal: React.FC<Props> = ({ open, onClose }) => {
  const { lang, user, member } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [hostCapability, setHostCapability] = useState<HostCap>('request-only');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Pre-fill from signed-in member if possible.
  React.useEffect(() => {
    if (!open) return;
    if (user) {
      setName(prev => prev || member?.displayName || user.displayName || '');
      setEmail(prev => prev || user.email || '');
      setPhone(prev => prev || member?.phone || '');
    }
  }, [open, user, member]);

  if (!open) return null;

  const close = () => {
    onClose();
    // Reset briefly after close (the modal is unmounted via !open).
    setTimeout(() => {
      setName(''); setEmail(''); setPhone(''); setCity(''); setRegion('');
      setHostCapability('request-only'); setMessage('');
      setErr(null); setDone(false); setBusy(false);
    }, 300);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !email.trim() || !city.trim()) {
      setErr(lang === 'FR' ? 'Nom, courriel et ville sont requis.' : 'Name, email and city are required.');
      return;
    }
    setBusy(true);
    try {
      await addBookingRequest({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        city: city.trim(),
        region: region.trim() || undefined,
        hostCapability,
        message: message.trim() || undefined,
        source: 'conference-tour',
        tags: ['conference-tour', `host-${hostCapability}`],
      });
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || (lang === 'FR' ? 'Une erreur est survenue.' : 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#3A251E]/60 backdrop-blur-md overflow-y-auto" onClick={close}>
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#3A251E] rounded-[30px] shadow-2xl border border-[#B8532F]/20 p-8 md:p-10 my-8"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label={lang === 'FR' ? 'Fermer' : 'Close'}
          className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#3A251E]/40 dark:text-white/40 hover:text-[#3A251E] dark:hover:text-white"
        >
          <i className="fa-solid fa-times text-lg" />
        </button>

        <span className="text-[#B8532F] uppercase tracking-[0.3em] text-[10px] font-bold block mb-3">
          {lang === 'FR' ? 'Tournée de conférences' : 'Conference tour'}
        </span>
        <h2 className="font-serif text-2xl md:text-3xl text-[#3A251E] dark:text-white mb-2">
          {lang === 'FR' ? 'Demander une tournée de conférences' : 'Request a conference tour'}
        </h2>
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60 font-serif italic mb-6 leading-relaxed">
          {lang === 'FR'
            ? "Krystine prépare une tournée à travers le Québec et ailleurs. Dites-nous où vous aimeriez la recevoir — et si vous pouvez contribuer à l'organiser."
            : 'Krystine is preparing a conference tour across Quebec and beyond. Tell us where you\'d like to receive her — and whether you can help organize.'}
        </p>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#B8532F]/15 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-[#B8532F] text-xl" />
            </div>
            <p className="font-serif italic text-[#3A251E] dark:text-white mb-6">
              {lang === 'FR'
                ? "Merci. Votre demande est transmise à l'équipe — elle guide le choix des prochaines villes."
                : 'Thank you. Your request is with the team — it helps guide the next tour stops.'}
            </p>
            <button
              onClick={close}
              className="inline-flex items-center gap-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors"
            >
              {lang === 'FR' ? 'Fermer' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={lang === 'FR' ? 'Prénom et nom *' : 'Full name *'}
                  required
                  className={FIELD_CLASS}
                />
              </Field>
              <Field>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={lang === 'FR' ? 'Courriel *' : 'Email *'}
                  required
                  className={FIELD_CLASS}
                />
              </Field>
            </div>
            <Field>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={lang === 'FR' ? 'Téléphone (facultatif)' : 'Phone (optional)'}
                className={FIELD_CLASS}
              />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder={lang === 'FR' ? 'Ville *' : 'City *'}
                  required
                  className={FIELD_CLASS}
                />
              </Field>
              <Field>
                <input
                  type="text"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  placeholder={lang === 'FR' ? 'Région / province' : 'Region / province'}
                  className={FIELD_CLASS}
                />
              </Field>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 font-bold mb-2 mt-2">
                {lang === 'FR' ? 'Votre rôle possible' : 'Your potential role'}
              </label>
              <select
                value={hostCapability}
                onChange={e => setHostCapability(e.target.value as HostCap)}
                className={`${FIELD_CLASS} pr-10 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat`}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' stroke='%238B6F47' fill='none' stroke-width='1.5'/></svg>\")",
                }}
              >
                {HOST_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>
                    {lang === 'FR' ? o.fr : o.en}
                  </option>
                ))}
              </select>
            </div>

            <Field>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={lang === 'FR'
                  ? 'Un mot sur votre contexte, le type de salle, la communauté, etc. (facultatif)'
                  : 'A note about your context, the type of venue, your community… (optional)'}
                rows={3}
                className={`${FIELD_CLASS} resize-none`}
              />
            </Field>

            {err && <p className="text-center text-sm text-red-600">{err}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors disabled:opacity-60 mt-2"
            >
              {busy
                ? <i className="fa-solid fa-circle-notch fa-spin" />
                : (lang === 'FR' ? 'Envoyer ma demande' : 'Send my request')}
            </button>
            <p className="text-[10px] text-center text-[#3A251E]/50 dark:text-white/50 pt-1">
              {lang === 'FR'
                ? "Votre demande oriente le choix des prochaines villes. L'équipe vous écrit si une étape se confirme près de chez vous."
                : "Your request guides the choice of upcoming cities. The team will reach out if a stop lands near you."}
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

// Tiny wrapper so every field shares the same visual rhythm.
const Field: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

const FIELD_CLASS =
  "w-full px-4 py-3 rounded-xl border border-[#3A251E]/15 dark:border-white/15 bg-white dark:bg-white/5 text-sm text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#B8532F]";

export default ConferenceTourModal;
