// SalonContactCard — modal opened from the footer's "Plateforme développée
// par Le Salon des Inconnus" link. Replaces the prior outbound link to
// www.lesalondesinconnus.com with an in-place contact card so curious
// visitors can either reach Alex directly or fill in the website-needs
// form on the back. Submissions land in the `vexelInquiries` collection
// and are visible from the hidden /vexel inbox.
//
// Visual language: parchment + copper accents matching the host site.
// The Salon's gold gradient lives only on the wordmark, the studio mark,
// and (subtly) the footer link that opens the card.
//
// Interaction model — flip card:
//   ▸ Front face: vertical hero image + studio identity + "Je veux un
//     site personnalisé" CTA. Everything fits without scroll.
//   ▸ Back face: same vertical hero on the left, full inquiry form on
//     the right. A "Retour" arrow flips back.
//   ▸ Implementation: 3D rotateY on the inner card via framer-motion;
//     each face uses `backface-visibility: hidden` so only the
//     forward-facing side paints during the rotation. The outer card
//     is fixed-height so both faces share the same frame and the
//     rounded corners clip both consistently.

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { addVexelInquiry } from '../firebase/firestore';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Which site the lead came from — written into the inquiry payload so
   *  Alex can segment leads by referring property in the /vexel inbox. */
  sourceSite?: string;
}

const PROJECT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'site-vitrine',  label: 'Site vitrine'                },
  { value: 'e-commerce',    label: 'E-commerce / boutique'       },
  { value: 'sur-mesure',    label: 'Plateforme sur mesure'       },
  { value: 'refonte',       label: 'Refonte d\'un site existant' },
  { value: 'autre',         label: 'Autre · à discuter'          },
];

const BUDGET_BANDS: Array<{ value: string; label: string }> = [
  { value: '<5k',     label: 'Moins de 5 000 $'   },
  { value: '5-15k',   label: '5 000 – 15 000 $'   },
  { value: '15-30k',  label: '15 000 – 30 000 $'  },
  { value: '30k+',    label: 'Plus de 30 000 $'   },
  { value: 'discuss', label: 'À discuter ensemble' },
];

const SalonContactCard: React.FC<Props> = ({ open, onClose, sourceSite = 'krystine' }) => {
  const [flipped, setFlipped] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectType, setProjectType] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ESC closes; lock body scroll while the card is open so the underlying
  // page doesn't move behind the backdrop.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const reset = () => {
    setFlipped(false);
    setName(''); setEmail(''); setPhone(''); setProjectType('');
    setBudget(''); setTimeline(''); setMessage('');
    setErr(null); setDone(false); setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErr('Le nom, le courriel et le téléphone sont requis.');
      return;
    }
    setBusy(true);
    try {
      await addVexelInquiry({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        projectType: projectType || undefined,
        budget: budget || undefined,
        timeline: timeline.trim() || undefined,
        message: message.trim() || undefined,
        sourceSite,
      });
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || 'Une erreur est survenue. Réessayez ou écrivez à alex@lesalondesinconnus.com.');
    } finally {
      setBusy(false);
    }
  };

  // Hero column — same shape on both faces; only the source image
  // changes. Front shows the vanilla-crate SDI mark (the studio's brand
  // surface); back shows the Artistes_Profile photo so visitors land on
  // a more human image as soon as they engage with the form.
  const HeroColumn: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
    <div
      className="relative h-[40vh] md:h-full overflow-hidden border-b md:border-b-0 md:border-r border-[#B8532F]/20"
      style={{ background: 'linear-gradient(180deg, #2E1A14 0%, #3A251E 100%)' }}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="salon-card-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={close}
        className="absolute inset-0 bg-[#1A0E08]/85 backdrop-blur-md cursor-default"
      />

      {/* Perspective wrapper — gives the flip its depth without affecting
          the modal's centering. The flipping card sits inside, and only
          its `transform` animates. */}
      <div
        className="relative w-full max-w-5xl h-auto md:h-[88vh]"
        style={{ perspective: '2200px' }}
      >
        {/* Close — sits on the perspective wrapper so it doesn't flip
            with the card. Always visible, always working. */}
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-[#1A0E08]/55 hover:bg-[#1A0E08]/80 text-[#F4E7DD] flex items-center justify-center transition-colors backdrop-blur"
        >
          <i className="fa-solid fa-times text-base" />
        </button>

        {/* Flipping card — preserves 3D so the back face renders behind
            the front in z-space. `rotateY` animates between 0 and 180 to
            swap which face the viewer sees. */}
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.85, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* ── FRONT FACE · Studio identity + CTA ──────────────────── */}
          <Face>
            <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-0 h-full">
              <HeroColumn src="/salon/hero.jpg" alt="Le Salon des Inconnus" />

              <div className="px-7 md:px-10 py-8 md:py-10 flex flex-col justify-center">
                {/* Logo + wordmark stack — the wordmark and the italic
                    name live in a flex column to the right of the logo
                    so the "A" of "Alex" lands directly under the "L" of
                    "Le Salon des Inconnus" on the same x-axis. */}
                <div className="flex items-center gap-3 md:gap-4 mb-5 justify-center md:justify-start">
                  <img
                    src="/salon/logo.svg"
                    alt=""
                    aria-hidden
                    className="h-12 md:h-14 w-auto flex-shrink-0"
                  />
                  <div className="flex flex-col">
                    <h2
                      id="salon-card-title"
                      className="font-serif text-2xl md:text-3xl leading-tight"
                      style={{
                        backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 75%, #B07A3C 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Le Salon des Inconnus
                    </h2>
                    <p className="font-serif italic text-[#3A251E] text-base md:text-lg leading-tight">
                      Alex&nbsp;T.&nbsp;St-Laurent
                    </p>
                  </div>
                </div>

                <p className="font-serif italic text-[#3A251E]/85 leading-relaxed text-[15px] md:text-base mb-4">
                  Nos plateformes naissent à la croisée du code et de l'Art
                  — celui d'un centre d'artistes en pleine activité. La
                  technologie la plus récente, ramenée à l'essentiel&nbsp;:
                  un site qui raconte votre histoire avec justesse, lenteur
                  et lumière. Pas un gabarit. Une œuvre signée.
                </p>
                <p className="text-[#3A251E]/75 leading-relaxed text-sm md:text-[15px] mb-6">
                  Le Salon des Inconnus est un centre d'artistes perché dans
                  un manoir victorien en pleine nature.
                </p>

                {/* Primary CTA — flips the card to reveal the form */}
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="group inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-full text-[12px] uppercase tracking-[0.25em] font-bold text-[#F4E7DD] mb-5 transition-all hover:shadow-[0_14px_32px_rgba(184,83,47,0.45)] hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(95deg, #6B402F 0%, #B8532F 50%, #6B402F 100%)',
                    border: '1px solid rgba(215,168,88,0.55)',
                  }}
                >
                  <span>Je veux un site personnalisé</span>
                  <i className="fa-solid fa-arrow-right text-[10px] transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                {/* Contact lines */}
                <div className="space-y-2 text-sm">
                  <a
                    href="https://www.lesalondesinconnus.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-[#3A251E] hover:text-[#B8532F] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#3A251E]/8 border border-[#B8532F]/25 flex items-center justify-center">
                      <i className="fa-solid fa-globe text-[#B8532F] text-[10px]" />
                    </span>
                    <span className="font-serif">www.lesalondesinconnus.com</span>
                  </a>
                  <a
                    href="tel:+15144183450"
                    className="flex items-center gap-3 text-[#3A251E] hover:text-[#B8532F] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#3A251E]/8 border border-[#B8532F]/25 flex items-center justify-center">
                      <i className="fa-solid fa-phone text-[#B8532F] text-[10px]" />
                    </span>
                    <span className="font-serif">514&nbsp;418&nbsp;3450</span>
                  </a>
                  <a
                    href="mailto:alex@lesalondesinconnus.com"
                    className="flex items-center gap-3 text-[#3A251E] hover:text-[#B8532F] transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#3A251E]/8 border border-[#B8532F]/25 flex items-center justify-center">
                      <i className="fa-solid fa-envelope text-[#B8532F] text-[10px]" />
                    </span>
                    <span className="font-serif">alex@lesalondesinconnus.com</span>
                  </a>
                </div>
              </div>
            </div>
          </Face>

          {/* ── BACK FACE · Form (or thanks state) ──────────────────── */}
          <Face back>
            <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr] gap-0 h-full">
              <HeroColumn src="/salon/profile.jpg" alt="Alex T. St-Laurent — Le Salon des Inconnus" />

              <div className="px-7 md:px-10 py-7 md:py-9 flex flex-col h-full min-h-0">
                {/* Header row · back arrow + section label */}
                <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setFlipped(false)}
                    className="w-9 h-9 rounded-full border border-[#3A251E]/20 text-[#3A251E] hover:bg-[#3A251E]/5 hover:border-[#B8532F] flex items-center justify-center transition-colors"
                    aria-label="Retour"
                  >
                    <i className="fa-solid fa-arrow-left text-xs" />
                  </button>
                  <div>
                    <span className="block text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F]">Parlons-en</span>
                    <h3 className="font-serif text-xl md:text-2xl text-[#3A251E] leading-tight">L'esquisse de votre site</h3>
                  </div>
                </div>

                {done ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-[#B8532F] text-[#F4E7DD] flex items-center justify-center mb-5 shadow-[0_8px_20px_rgba(184,83,47,0.35)]">
                      <i className="fa-solid fa-check text-lg" />
                    </div>
                    <h3 className="font-serif text-2xl text-[#3A251E] mb-2">Merci.</h3>
                    <p className="font-serif italic text-[#3A251E]/75 max-w-sm">
                      Votre message est arrivé au Salon. Je reviens vers vous
                      dans les jours qui suivent — souvent plus tôt.
                    </p>
                    <button
                      type="button"
                      onClick={close}
                      className="mt-7 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3A251E] text-[#F4E7DD] text-[11px] uppercase tracking-[0.25em] font-bold hover:bg-[#B8532F] transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Nom complet" required>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} autoComplete="name" />
                      </Field>
                      <Field label="Courriel" required>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Téléphone" required>
                        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} autoComplete="tel" />
                      </Field>
                      <Field label="Échéance">
                        <input type="text" placeholder="Automne 2026, …" value={timeline} onChange={e => setTimeline(e.target.value)} className={inputCls} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Type de projet">
                        <select value={projectType} onChange={e => setProjectType(e.target.value)} className={inputCls}>
                          <option value="">— Choisir —</option>
                          {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Budget approximatif">
                        <select value={budget} onChange={e => setBudget(e.target.value)} className={inputCls}>
                          <option value="">— Choisir —</option>
                          {BUDGET_BANDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                      </Field>
                    </div>

                    <Field label="Décrivez votre projet">
                      <textarea
                        rows={3}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Quelques lignes sur votre univers, vos objectifs…"
                        className={`${inputCls} resize-none`}
                      />
                    </Field>

                    {err && <p className="text-sm text-red-700 -mt-1">{err}</p>}

                    <div className="mt-auto pt-1">
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#3A251E] text-[#F4E7DD] hover:bg-[#B8532F] hover:shadow-[0_12px_28px_rgba(184,83,47,0.40)] font-bold uppercase tracking-[0.25em] text-[11px] transition-all disabled:opacity-60"
                      >
                        {busy ? (
                          <><i className="fa-solid fa-circle-notch fa-spin" /> Envoi…</>
                        ) : (
                          <>Envoyer au Salon <i className="fa-solid fa-arrow-right text-[9px]" /></>
                        )}
                      </button>
                      <p className="text-[10px] text-[#3A251E]/50 text-center mt-2">
                        Vos coordonnées ne servent qu'à cette correspondance.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Face>
        </motion.div>
      </div>
    </div>
  );
};

// One face of the flip card. Both faces are absolutely-positioned so they
// share the same frame; `backface-visibility: hidden` ensures only the
// forward-facing one paints during the rotation. The back face starts
// rotated 180° on Y so its content reads correctly to the viewer once
// the parent reaches its 180° flip target.
const Face: React.FC<{ children: React.ReactNode; back?: boolean }> = ({ children, back }) => (
  <div
    className="absolute inset-0 rounded-[24px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)] border border-[#B8532F]/30"
    style={{
      background: 'linear-gradient(160deg, #F4E7DD 0%, #ECD6BE 100%)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      transform: back ? 'rotateY(180deg)' : undefined,
    }}
  >
    {children}
  </div>
);

const inputCls =
  'w-full px-3.5 py-2 rounded-lg border border-[#3A251E]/15 bg-white text-sm text-[#3A251E] placeholder:text-[#3A251E]/40 focus:outline-none focus:border-[#B8532F] focus:shadow-[0_0_0_3px_rgba(184,83,47,0.12)] transition-shadow';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-[0.25em] font-bold text-[#3A251E]/65 mb-1">
      {label}{required && <span className="text-[#B8532F]"> *</span>}
    </span>
    {children}
  </label>
);

export default SalonContactCard;
