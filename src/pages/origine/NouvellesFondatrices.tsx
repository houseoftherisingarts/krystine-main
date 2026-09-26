import React, { useRef, useState } from 'react';
import { addGuideResponse } from '../../firebase/firestore';
import { StyleV2, Masthead, TitreV2, Kicker, GOUTTIERE, useMotionV2 } from '../../components/v2/Magazine';

// /origine/nouvelles : la page que Krystine envoie aux fondatrices de la
// première Expérience Origine (été 2026), quelques mois après la fin du
// parcours. Trois questions ouvertes; les réponses tombent dans
// guideResponses (source « fondatrices-origine ») et s'affichent dans
// l'admin, section Formulaires.

const SOURCE = 'fondatrices-origine';

const QUESTIONS = [
  {
    qid: 'q1-change',
    titre: 'Depuis la fin du parcours, qu’est-ce qui a changé concrètement dans votre quotidien?',
    aide: 'Un moment où vous avez réagi autrement, une habitude, un plaisir retrouvé, une découverte… Qu’est-ce qui vous vient? Vous pouvez aussi nous dire si vous constatez peu de changement.',
  },
  {
    qid: 'q2-manque',
    titre: 'Qu’est-ce qui reste difficile ou vous manque pour poursuivre ce que vous aviez commencé?',
    aide: 'Dans quelles situations aimeriez-vous avoir davantage de repères ou de soutien?',
  },
  {
    qid: 'q3-souhait',
    titre: 'Aujourd’hui, qu’aimeriez-vous retrouver ou faire davantage dans votre vie?',
    aide: 'Qu’est-ce que cela changerait pour vous, concrètement?',
  },
];

const champ = 'w-full bg-[#faf6ee] border border-[#1c1712]/20 px-5 py-4 text-[0.95rem] leading-[1.75] text-[#1c1712] placeholder-[#1c1712]/35 outline-none transition-colors duration-300 focus:border-[#9c7a44]';
const libelle = 'block text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330] mb-2.5';

const NouvellesFondatrices: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  useMotionV2(root);
  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

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
    <div ref={root} className="min-h-screen w-full bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />
      <section data-hero className={`${GOUTTIERE} pt-[clamp(7rem,16vh,10rem)] pb-[clamp(3rem,8vh,5rem)]`}>
        <div className="mx-auto max-w-[1100px]">
          <Masthead gauche={<>Expérience Origine &middot; Les fondatrices</>} />
          <div className="mt-[clamp(2.5rem,7vh,4.5rem)]">
            <Kicker className="mb-6">{fait ? 'Merci' : 'Trois questions'}</Kicker>
            <TitreV2
              lignes={fait ? ['Vos nouvelles', 'sont arrivées'] : ['Depuis Origine,', 'où en êtes-vous?']}
              className="text-[clamp(2.8rem,7.6vw,6.8rem)] max-w-[16ch]"
            />
          </div>
          {fait && (
            <p data-fade className="mt-8 v2-serif text-[clamp(1.2rem,2.2vw,1.7rem)] font-light leading-[1.4] text-[#3a2f23] max-w-[42ch]">
              Merci pour ce bout de chemin partagé et pour les nouvelles que vous avez pris le temps de confier.
            </p>
          )}
        </div>
      </section>

      {!fait && (
        <section className={`${GOUTTIERE} pb-[clamp(5rem,12vh,8rem)]`}>
          <form onSubmit={envoyer} className="mx-auto max-w-[1100px] border-t border-[#1c1712]/15 pt-[clamp(2.5rem,6vh,4rem)]">
            <div className="grid gap-6 sm:grid-cols-2 max-w-[760px]">
              <label className="block">
                <span className={libelle}>Votre prénom</span>
                <input value={prenom} onChange={e => setPrenom(e.target.value)} maxLength={80} autoComplete="given-name" className={champ} />
              </label>
              <label className="block">
                <span className={libelle}>Votre courriel</span>
                <input type="email" value={courriel} onChange={e => setCourriel(e.target.value)} maxLength={200} autoComplete="email" className={champ} />
              </label>
            </div>

            <ol className="mt-[clamp(3rem,7vh,4.5rem)] space-y-[clamp(3rem,7vh,4.5rem)]">
              {QUESTIONS.map((q, i) => (
                <li key={q.qid} className="grid gap-6 md:grid-cols-[5rem_1fr]">
                  <span className="v2-serif font-light text-[2.6rem] leading-none text-[#9c7a44]">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h2 className="v2-serif font-light text-[clamp(1.45rem,2.6vw,2.1rem)] leading-[1.22] text-[#1c1712] max-w-[34ch]">{q.titre}</h2>
                    <p className="mt-3 text-[0.93rem] leading-[1.85] text-[#3a2f23]/80 max-w-[62ch]">{q.aide}</p>
                    <textarea
                      rows={6}
                      value={reponses[q.qid] || ''}
                      onChange={e => setReponses(r => ({ ...r, [q.qid]: e.target.value }))}
                      maxLength={6000}
                      aria-label={q.titre}
                      className={`${champ} mt-5 resize-y`}
                    />
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-[clamp(3rem,7vh,4.5rem)] md:pl-[6.5rem] flex flex-wrap items-center gap-6">
              <button
                type="submit"
                disabled={envoi}
                className="inline-flex min-h-[46px] items-center justify-center gap-2.5 bg-[#1c1712] px-8 py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-50"
              >
                {envoi ? 'Envoi…' : 'Envoyer mes réponses'}
              </button>
              {erreur && <p className="text-sm text-[#8B4A2F]">{erreur}</p>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default NouvellesFondatrices;
