import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react';
import { StyleV2, Kicker, Masthead, GOUTTIERE } from '../components/v2/Magazine';
import { addTemoignageConference } from '../firebase/firestore';

// ─── Laisser un mot sur une conférence (/conferenciere/temoignage) ──────────
// Les personnes qui ont vu Krystine sur scène y déposent leurs paroles. Rien
// ne paraît sur /conferenciere sans leur autorisation et sans l'accord de
// Krystine dans l'admin (Événements & Conférences › Témoignages reçus).

const CHAMP =
  'w-full bg-transparent border-b border-[#1c1712]/20 px-1 py-2.5 text-[0.95rem] text-[#1c1712] placeholder:text-[#1c1712]/40 focus:outline-none focus:border-[#9c7a44] transition-colors duration-300';

const TemoignageConference: React.FC = () => {
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('');
  const [evenement, setEvenement] = useState('');
  const [texte, setTexte] = useState('');
  const [courriel, setCourriel] = useState('');
  const [autorise, setAutorise] = useState(true);
  const [etat, setEtat] = useState<'libre' | 'envoi' | 'merci' | 'erreur'>('libre');

  const pret = nom.trim() && evenement.trim() && texte.trim().length >= 10;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pret || etat === 'envoi') return;
    setEtat('envoi');
    try {
      await addTemoignageConference({
        nom: nom.trim().slice(0, 80),
        evenement: evenement.trim().slice(0, 160),
        texte: texte.trim().slice(0, 1500),
        autorisePublication: autorise,
        ...(role.trim() ? { role: role.trim().slice(0, 120) } : {}),
        ...(courriel.trim() ? { courriel: courriel.trim().slice(0, 200) } : {}),
      });
      setEtat('merci');
    } catch {
      setEtat('erreur');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />
      <section className={`${GOUTTIERE} pt-[clamp(6.5rem,14vh,9rem)] pb-[clamp(5rem,12vh,8rem)]`}>
        <Masthead gauche="N° 01 · Conférences" droite="Québec · MMXXVI" />

        <div className="mt-[clamp(2.5rem,7vh,4.5rem)] grid gap-[clamp(2.5rem,6vw,6rem)] lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Kicker className="mb-5">Après une conférence</Kicker>
            <h1 className="v2-serif font-light leading-[1.02] text-[clamp(2.4rem,5.4vw,4.4rem)]">
              Laissez-nous un mot
            </h1>
            <div className="mt-8 h-px w-16 bg-[#9c7a44]" aria-hidden />
            <p className="mt-8 max-w-[46ch] text-[0.98rem] leading-[1.85] text-[#3a2f23]">
              Vous avez assisté à une conférence de Krystine, dans un salon, une bibliothèque, une entreprise ou un festival ?
              Racontez-nous ce que vous en avez retenu. Vos mots aident les organisatrices et les organisateurs à imaginer
              ce que sa venue peut apporter à leur public.
            </p>
            <p className="mt-5 max-w-[46ch] text-[0.85rem] leading-[1.8] text-[#3a2f23]/75">
              Rien n'est publié sans votre accord, et votre courriel ne paraît jamais.
            </p>
          </div>

          <div>
            {etat === 'merci' ? (
              <div className="border-t border-[#9c7a44]/40 pt-10" role="status">
                <CheckCircle size={34} weight="light" className="text-[#7d6330]" />
                <p className="mt-5 v2-serif text-[clamp(1.6rem,2.8vw,2.2rem)] font-light leading-[1.2]">Merci de tout cœur.</p>
                <p className="mt-4 max-w-[44ch] text-[0.95rem] leading-[1.8] text-[#3a2f23]">
                  Votre mot est bien reçu. Krystine le lira avec attention.
                </p>
                <Link to="/conferenciere" className="mt-8 inline-flex items-center gap-2 border-b border-[#1c1712] pb-1 text-[0.66rem] uppercase tracking-[0.2em] hover:border-[#9c7a44] hover:text-[#7d6330]">
                  Retour aux conférences <ArrowUpRight size={13} />
                </Link>
              </div>
            ) : (
              <form onSubmit={envoyer} className="space-y-8 border-t border-[#9c7a44]/40 pt-10" noValidate>
                <label className="block">
                  <span className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">Votre mot *</span>
                  <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    rows={6}
                    maxLength={1500}
                    required
                    placeholder="Ce que la conférence vous a fait, ce que vous en avez gardé…"
                    className={`${CHAMP} resize-y leading-[1.7]`}
                  />
                </label>
                <div className="grid gap-8 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">Votre nom, tel qu'il paraîtra *</span>
                    <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} required placeholder="Ex. Julie Tremblay ou Julie T." className={CHAMP} autoComplete="name" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">Ce que vous faites, votre ville</span>
                    <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Ex. enseignante, Lévis" className={CHAMP} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">Où avez-vous vu Krystine ? *</span>
                    <input value={evenement} onChange={(e) => setEvenement(e.target.value)} maxLength={160} required placeholder="Ex. Salon Expo Manger Santé, Montréal, 2024" className={CHAMP} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/55">Votre courriel (jamais affiché)</span>
                    <input type="email" value={courriel} onChange={(e) => setCourriel(e.target.value)} maxLength={200} placeholder="Pour vous remercier, si vous le souhaitez" className={CHAMP} autoComplete="email" />
                  </label>
                </div>
                <label className="flex cursor-pointer items-start gap-3 text-[0.9rem] leading-[1.6] text-[#3a2f23]">
                  <input type="checkbox" checked={autorise} onChange={(e) => setAutorise(e.target.checked)} className="mt-1 h-4 w-4 accent-[#7d6330]" />
                  <span>J'autorise la publication de mon mot, avec mon nom, sur le site de Krystine St-Laurent.</span>
                </label>
                {etat === 'erreur' && (
                  <p className="text-[0.9rem] text-[#8B4A2F]" role="alert">L'envoi n'a pas fonctionné. Veuillez réessayer dans un instant.</p>
                )}
                <button
                  type="submit"
                  disabled={!pret || etat === 'envoi'}
                  className="inline-flex items-center gap-3 bg-[#1c1712] px-8 py-4 text-[0.66rem] uppercase tracking-[0.22em] text-[#f4efe6] transition-colors hover:bg-[#3a2f23] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {etat === 'envoi' ? 'Envoi…' : 'Envoyer mon mot'} <ArrowUpRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default TemoignageConference;
