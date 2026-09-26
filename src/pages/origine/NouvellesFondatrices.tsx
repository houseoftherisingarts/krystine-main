import React, { useState } from 'react';
import { addGuideResponse } from '../../firebase/firestore';
import { motion, useReducedMotion } from 'framer-motion';

// /origine/nouvelles : la page que Krystine envoie aux fondatrices de la
// première Expérience Origine (été 2026), quelques mois après la fin du
// parcours. Trois questions ouvertes; les réponses tombent dans
// guideResponses (source « fondatrices-origine ») et s'affichent dans
// l'admin, section Formulaires.

const SOURCE = 'fondatrices-origine';

const QUESTIONS = [
  {
    qid: 'q1-change',
    titre: 'Qu’est-ce qui vous fait du bien ces temps-ci?',
    aide: 'Un plaisir retrouvé, une habitude, un moment où vous avez réagi autrement… Peut-être qu’une découverte faite ensemble vous accompagne encore, ou que vos envies sont ailleurs aujourd’hui.',
  },
  {
    qid: 'q2-manque',
    titre: 'Qu’est-ce qui vous manque, ou reste difficile?',
    aide: 'Dans quelles situations aimeriez-vous avoir davantage de repères ou de soutien?',
  },
  {
    qid: 'q3-souhait',
    titre: 'Qu’aimeriez-vous vivre dans les mois qui viennent?',
    aide: 'Qu’est-ce que cela changerait pour vous, concrètement?',
  },
];

// L'ambiance de « La Lettre de Krystine », sans son en-tête (functions/src/newsletter/renderer.ts) :
// crème #EEE7DB, papier #f8f6f2, encre #292b20, nuit #141311, or #e0b060.
const serif = { fontFamily: '"Cormorant Garamond", Georgia, serif' };
const champ = 'w-full rounded-[12px] bg-[#f8f6f2] border border-[#293027]/15 px-5 py-4 text-[0.95rem] leading-[1.75] text-[#292b20] placeholder-[#293027]/35 outline-none transition-colors duration-300 focus:border-[#BA7B39]';
const libelle = 'block text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330] mb-2.5';

const NouvellesFondatrices: React.FC = () => {
  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (envoi) return;
    if (!prenom.trim() || !/^\S+@\S+\.\S+$/.test(courriel.trim())) {
      setErreur('Il manque votre prénom ou votre courriel.');
      return;
    }
    if (!QUESTIONS.some(q => (reponses[q.qid] || '').trim())) {
      setErreur('Répondez à au moins une des trois questions.');
      return;
    }
    setEnvoi(true); setErreur(null);
    const ref = await addGuideResponse({
      firstName: prenom.trim().slice(0, 80),
      email: courriel.trim().toLowerCase().slice(0, 200),
      answers: QUESTIONS.map(q => ({
        qid: q.qid,
        questionLabel: q.titre,
        optionId: 'texte',
        optionLabel: (reponses[q.qid] || '').trim().slice(0, 6000),
      })),
      recommendationId: SOURCE,
      recommendationLabel: 'Nouvelles des fondatrices d’Origine',
      source: SOURCE,
      tags: [SOURCE, 'origine-cohorte-1'],
    });
    setEnvoi(false);
    if (ref) { setFait(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else setErreur('L’envoi n’a pas fonctionné. Reprenez dans un instant.');
  };

  return (
    <main className="min-h-screen w-full bg-[#EEE7DB] px-4 sm:px-6 pt-[clamp(6rem,14vh,8.5rem)] pb-[clamp(4rem,10vh,7rem)]">
      <motion.article
        initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.1, ease: [0.16, 0.8, 0.24, 1] }}
        className="mx-auto w-full max-w-[880px] rounded-[15px] overflow-hidden shadow-[0_40px_90px_-60px_rgba(41,48,39,0.6)] border border-[#293027]/10"
      >
        {/* L'en-tête : le logo d'Origine et le groupe fondateur */}
        <header className="bg-[#f8f6f2] px-7 sm:px-12 pt-8 pb-7">
          {/* Le logo d'Origine, découpé de la couverture du Guide du Retour à l'Origine, fond crème retiré. */}
          <p className="pl-[0.4rem] text-[#8a6a3c] text-[clamp(0.85rem,1.6vw,1.05rem)] tracking-[0.42em]" style={serif}>EXPÉRIENCE</p>
          <img
            src="/origine/logo-origine.webp"
            alt="Origine"
            className="-mt-1 w-[min(100%,340px)] h-auto"
          />
          <p className="mt-3 text-[0.66rem] uppercase tracking-[0.3em] text-[#5f5c50]">Groupe fondateur</p>
        </header>

        {/* Le bandeau vert profond du gabarit « Groupe fondateur » */}
        <div className="relative overflow-hidden bg-[#28352F] px-7 sm:px-12 pt-9 pb-9">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-[15%] -top-[60%] h-[180%] w-[60%] rounded-full blur-[60px]"
            style={{ background: 'radial-gradient(circle, rgba(186,123,57,.40) 0%, rgba(40,53,47,0) 70%)' }}
          />
          <p className="relative text-[0.66rem] uppercase tracking-[0.3em] font-semibold text-[#e0b060]">Nouvelles des fondatrices</p>
          <h1 className="relative mt-4 text-[#EEE7DB] text-[clamp(1.55rem,4.2vw,2.8rem)] leading-[1.1] font-medium" style={serif}>
            {fait ? 'Vos nouvelles sont arrivées' : 'Depuis EXPÉRIENCE ORIGINE, où en êtes-vous?'}
          </h1>
          <span className="relative mt-6 block h-px w-16 bg-[#e0b060]" aria-hidden />
        </div>

        {/* Le corps */}
        <div className="bg-white px-7 sm:px-12 pt-10 pb-12">
          {fait ? (
            <p className="text-[#292b20] text-[clamp(1.2rem,2.4vw,1.55rem)] leading-[1.5] max-w-[40ch]" style={serif}>
              Merci pour ce bout de chemin partagé et pour les nouvelles que vous avez pris le temps de confier.
            </p>
          ) : (
            <form onSubmit={envoyer}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className={libelle}>Votre prénom</span>
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} maxLength={80} autoComplete="given-name" className={champ} />
                </label>
                <label className="block">
                  <span className={libelle}>Votre courriel</span>
                  <input type="email" value={courriel} onChange={e => setCourriel(e.target.value)} maxLength={200} autoComplete="email" className={champ} />
                </label>
              </div>

              <ol className="mt-12 space-y-12">
                {QUESTIONS.map((q, i) => (
                  <li key={q.qid} className="border-t border-[#293027]/10 pt-9">
                    <div className="flex items-baseline gap-4">
                      <span className="text-[2.2rem] leading-none text-[#BA7B39]" style={serif}>{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="text-[clamp(1.4rem,2.6vw,1.8rem)] leading-[1.25] text-[#292b20] font-medium" style={serif}>{q.titre}</h2>
                    </div>
                    <p className="mt-3 text-[0.93rem] leading-[1.85] text-[#5f5c50]">{q.aide}</p>
                    <textarea
                      rows={6}
                      value={reponses[q.qid] || ''}
                      onChange={e => setReponses(r => ({ ...r, [q.qid]: e.target.value }))}
                      maxLength={6000}
                      aria-label={q.titre}
                      className={`${champ} mt-5 resize-y`}
                    />
                  </li>
                ))}
              </ol>

              <div className="mt-12 flex flex-wrap items-center gap-6">
                <button
                  type="submit"
                  disabled={envoi}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#BA7B39] px-8 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#293027] transition-colors duration-300 hover:bg-[#293027] hover:text-[#e0b060] disabled:opacity-50"
                >
                  {envoi ? 'Envoi…' : 'Envoyer mes réponses'}
                </button>
                {erreur && <p className="text-sm text-[#8B4A2F]">{erreur}</p>}
              </div>
            </form>
          )}

          <img src="/compte/signature-krystine-noire.webp" alt="Krystine St-Laurent" className="mt-12 w-[170px] h-auto" />
        </div>

        {/* Le pied de la lettre */}
        <footer className="bg-[#f8f6f2] px-7 sm:px-12 py-6 text-center text-[0.6rem] uppercase tracking-[0.26em] text-[#5f5c50]">
          Nourrir et soigner &middot; Corps et conscience &middot; Science et sagesses
        </footer>
      </motion.article>
    </main>
  );
};

export default NouvellesFondatrices;
