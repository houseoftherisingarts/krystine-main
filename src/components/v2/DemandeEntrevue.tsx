import React, { useState } from 'react';
import { addBookingRequest } from '../../firebase/firestore';

// La demande d'entrevue des médias (Krystine, 9 oct. 2026) : une productrice
// ne cherche pas une conférence, elle cherche un sujet à programmer. Formulaire
// court, distinct de « Faire une demande » de /conferenciere. Il range la
// demande dans la même boîte (bookingRequests), marquée source « medias-entrevue ».

const SUJETS = [
  'Pourquoi ce qui fonctionne pour quelqu’un peut ne pas fonctionner pour vous ?',
  'Pourquoi suivons-nous autant de conseils qui ne nous conviennent pas ?',
  'Le corps sait-il quelque chose que nous n’écoutons plus ?',
  'Un autre sujet',
];

const champ = 'w-full border-0 border-b border-[#1c1712]/30 bg-transparent px-0 py-2.5 text-[1rem] text-[#1c1712] placeholder:text-[#1c1712]/45 focus:border-[#1c1712] focus:outline-none focus:ring-0';
const libelle = 'block text-[0.66rem] uppercase tracking-[0.2em] text-[#7d6330]';

const DemandeEntrevue: React.FC = () => {
  const [f, setF] = useState({ name: '', email: '', media: '', date: '', sujet: SUJETS[0], message: '' });
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'ok' | 'erreur'>('repos');
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim() || !f.media.trim()) return;
    setEtat('envoi');
    try {
      await addBookingRequest({
        name: f.name.trim(),
        email: f.email.trim(),
        organization: f.media.trim(),
        preferredDate: f.date.trim() || undefined,
        eventType: 'Entrevue média',
        message: `Sujet : ${f.sujet}${f.message.trim() ? `\n\n${f.message.trim()}` : ''}`,
        source: 'medias-entrevue',
        tags: ['entrevue', 'medias'],
      });
      setEtat('ok');
    } catch {
      setEtat('erreur');
    }
  };

  if (etat === 'ok') {
    return (
      <div className="max-w-[46ch]">
        <p className="v2-serif font-light text-[1.5rem] leading-[1.35] text-[#1c1712]">Merci, votre demande est bien reçue.</p>
        <p className="mt-4 text-base leading-[1.8] text-[#3a2f23]">L’équipe revient vers vous sous 48 h ouvrables.</p>
      </div>
    );
  }

  return (
    <form onSubmit={envoyer} className="grid w-full max-w-[560px] gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block"><span className={libelle}>Votre nom *</span><input required className={champ} value={f.name} onChange={maj('name')} autoComplete="name" /></label>
        <label className="block"><span className={libelle}>Courriel *</span><input required type="email" className={champ} value={f.email} onChange={maj('email')} autoComplete="email" /></label>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block"><span className={libelle}>Média ou émission *</span><input required className={champ} value={f.media} onChange={maj('media')} placeholder="Podcast, radio, télé, magazine" /></label>
        <label className="block"><span className={libelle}>Date souhaitée</span><input className={champ} value={f.date} onChange={maj('date')} placeholder="Ex. semaine du 2 novembre" /></label>
      </div>
      <label className="block"><span className={libelle}>Sujet</span>
        <select className={`${champ} pr-6`} value={f.sujet} onChange={maj('sujet')}>
          {SUJETS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="block"><span className={libelle}>Un mot sur votre auditoire</span><textarea rows={3} className={`${champ} resize-y`} value={f.message} onChange={maj('message')} /></label>
      {etat === 'erreur' && <p className="text-[0.9rem] text-[#8B4A2F]">L’envoi n’a pas fonctionné. Réessayez, ou écrivez à teamksl@inspiratanature.com.</p>}
      <button type="submit" disabled={etat === 'envoi'} className="inline-flex w-fit items-center gap-2.5 bg-[#1c1712] px-7 py-3.5 text-[0.72rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-opacity hover:opacity-85 disabled:opacity-60">
        {etat === 'envoi' ? 'Envoi…' : 'Demander une entrevue'} <span aria-hidden>→</span>
      </button>
    </form>
  );
};

export default DemandeEntrevue;
