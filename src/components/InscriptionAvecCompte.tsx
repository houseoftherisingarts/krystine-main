import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { addNewsletterSubscriber, updateMember } from '../firebase/firestore';
import { points } from '../firebase/points';
import { trackLead } from '../lib/track';

interface Props {
  /** Clé CRM de la liste rejointe, ex. "waitlist-pitta". */
  sourceTag: string;
  /** Appelé après l'écriture réussie — le parent bascule vers son propre état "merci". */
  onSuccess: () => void;
  /** "pill" pour les cartes rondes (WaitlistModal), "editorial" pour le
   *  formulaire encadré de /liste-attente. */
  variant?: 'pill' | 'editorial';
}

/**
 * Remplace le formulaire à champs pour une membre déjà connectée : ses
 * coordonnées viennent de son compte, elle n'a qu'à cocher et confirmer.
 * Composant partagé entre WaitlistModal et ListeAttenteLoeuvre pour que
 * toute liste d'attente du site profite du même geste.
 */
const InscriptionAvecCompte: React.FC<Props> = ({ sourceTag, onSuccess, variant = 'pill' }) => {
  const { lang, user, member } = useApp();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!user) return null;

  const dejaInscrite = !!member?.waitlists?.includes(sourceTag);
  const displayName = (member?.displayName || user.displayName || '').trim();
  const [prenom, ...resteDuNom] = displayName.split(/\s+/).filter(Boolean);
  const nom = resteDuNom.join(' ');
  const email = member?.email || user.email || '';

  const submit = async () => {
    if (!checked || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await addNewsletterSubscriber({
        email,
        firstName: prenom || undefined,
        lastName: nom || undefined,
        phone: member?.phone || undefined,
        lang: lang === 'FR' ? 'fr' : 'en',
        uid: user.uid,
        source: 'compte',
        tags: [sourceTag, 'compte'],
        status: 'active',
        consentement: true,
      });
      await updateMember(user.uid, { waitlists: [...(member?.waitlists || []), sourceTag] });
      try { await points.newsletterSigned(user.uid, sourceTag); } catch { /* non-fatal */ }
      trackLead(sourceTag);
      onSuccess();
    } catch (e: any) {
      setErr(e?.message || (lang === 'FR' ? 'Une erreur est survenue.' : 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const isEditorial = variant === 'editorial';
  const cardCls = isEditorial
    ? 'border border-[#9c7a44]/35 bg-[#f4efe6] p-6'
    : 'rounded-2xl border border-[#2a2015]/15 dark:border-white/15 bg-[#2a2015]/[0.03] dark:bg-white/[0.04] p-6';
  const kickerCls = isEditorial
    ? 'text-[0.62rem] uppercase tracking-[0.28em] text-[#7d6330]'
    : 'text-[10px] uppercase tracking-[0.25em] font-bold text-[#7d6330]';
  const nameCls = isEditorial
    ? 'v2-serif font-light text-[#1c1712] text-lg mt-2'
    : 'font-serif text-[#2a2015] dark:text-white text-lg mt-2';
  const emailCls = isEditorial
    ? 'text-[0.85rem] text-[#3a2f23]/70'
    : 'text-sm text-[#2a2015]/60 dark:text-white/60';
  const buttonCls = isEditorial
    ? 'group w-full mt-6 inline-flex items-center justify-center gap-3 bg-[#1c1712] py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]'
    : 'w-full mt-6 bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  if (dejaInscrite) {
    return (
      <div className={cardCls}>
        <p className={kickerCls}>{lang === 'FR' ? "Liste d'attente" : 'Waitlist'}</p>
        <p className={nameCls}>{lang === 'FR' ? 'Vous êtes déjà sur cette liste.' : 'You are already on this list.'}</p>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <p className={kickerCls}>{lang === 'FR' ? 'Vos informations' : 'Your details'}</p>
      <p className={nameCls}>{displayName || email}</p>
      {displayName && <p className={emailCls}>{email}</p>}

      <label className="mt-5 flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-1 w-4 h-4 shrink-0 accent-[#9c7a44]"
        />
        <span className={isEditorial ? 'text-[0.88rem] leading-[1.6] text-[#3a2f23]' : 'text-sm leading-relaxed text-[#2a2015]/80 dark:text-white/80'}>
          {lang === 'FR'
            ? "Je m'inscris avec les informations de mon compte et je consens à faire partie de cette liste."
            : 'Sign me up with my account details; I consent to join this list.'}
        </span>
      </label>

      <button type="button" onClick={submit} disabled={!checked || busy} className={buttonCls}>
        {busy
          ? (lang === 'FR' ? 'Inscription…' : 'Signing up…')
          : (lang === 'FR' ? "M'inscrire" : 'Sign me up')}
      </button>

      {err && <p className="mt-3 text-center text-xs text-red-600">{err}</p>}
    </div>
  );
};

export default InscriptionAvecCompte;
