import React, { useEffect, useRef, useState } from 'react';
import type { Question, Sondage, ValeurReponse } from '../../firebase/sondages';
import { repondreSondage } from '../../firebase/sondages';

// Le formulaire d'un sondage : une question à la fois, barre d'avancement
// fine en laiton, Précédent / Suivant, « Envoyer » sur la dernière question.
// Le crédit de niskas et le retrait de la liste se font côté serveur
// (repondreSondage) : ce composant ne fait que poser les questions et
// remonter le résultat à ClientAider une fois l'envoi confirmé.

type Lang = 'FR' | 'EN';

interface Props {
  sondage: Sondage;
  lang: Lang;
  onTermine: (niskas: number) => void;
  onRetour: () => void;
}

const pastille = (actif: boolean) =>
  `rounded-full border px-4 py-2.5 text-sm text-left transition-colors ${
    actif
      ? 'border-[#BA7B39] bg-[#BA7B39] text-[#293027] font-bold'
      : 'border-[#38403a]/15 bg-white/60 text-[#293027] hover:border-[#BA7B39]/60 dark:border-white/15 dark:bg-white/5 dark:text-white'
  }`;

const QuestionVue: React.FC<{ q: Question; valeur: ValeurReponse | undefined; onChange: (v: ValeurReponse) => void; lang: Lang }> = ({ q, valeur, onChange, lang }) => {
  const fr = lang === 'FR';
  if (q.type === 'choix') {
    return (
      <div className="flex flex-wrap gap-2.5">
        {(q.options || []).map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)} className={pastille(valeur === opt)}>
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'multi') {
    const choisies = Array.isArray(valeur) ? valeur : [];
    const basculer = (opt: string) => onChange(choisies.includes(opt) ? choisies.filter((o) => o !== opt) : [...choisies, opt]);
    return (
      <div className="flex flex-wrap gap-2.5">
        {(q.options || []).map((opt) => (
          <button key={opt} type="button" onClick={() => basculer(opt)} className={pastille(choisies.includes(opt))}>
            <i className={`fa-solid ${choisies.includes(opt) ? 'fa-square-check' : 'fa-square'} mr-2 opacity-70`} />
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'echelle') {
    const min = q.min ?? 1;
    const max = q.max ?? 5;
    const echelons = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        <div className="flex flex-wrap gap-2.5">
          {echelons.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                valeur === n
                  ? 'border-[#BA7B39] bg-[#BA7B39] text-[#293027]'
                  : 'border-[#38403a]/15 bg-white/60 text-[#293027] hover:border-[#BA7B39]/60 dark:border-white/15 dark:bg-white/5 dark:text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {q.etiquettes && (
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
            <span>{q.etiquettes[0]}</span>
            <span>{q.etiquettes[1]}</span>
          </div>
        )}
      </div>
    );
  }
  // texte
  const texte = typeof valeur === 'string' ? valeur : '';
  return (
    <div>
      <textarea
        value={texte}
        onChange={(e) => onChange(e.target.value.slice(0, 1000))}
        rows={4}
        placeholder={fr ? 'Votre réponse (facultatif)' : 'Your answer (optional)'}
        className="w-full resize-y rounded-[15px] border border-[#38403a]/15 bg-white/60 px-4 py-3 text-sm text-[#293027] outline-none transition-colors focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
      />
      <p className="mt-1.5 text-right text-[10px] text-[#293027]/40 dark:text-white/40">{texte.length} / 1000</p>
    </div>
  );
};

const SondageForm: React.FC<Props> = ({ sondage, lang, onTermine, onRetour }) => {
  const fr = lang === 'FR';
  const questions = sondage.questions || [];
  const [etape, setEtape] = useState(0);
  const [reponses, setReponses] = useState<Record<string, ValeurReponse>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const q = questions[etape];
  const derniere = etape === questions.length - 1;
  const valeur = reponses[q?.id];
  const repondue = valeur !== undefined && valeur !== '' && !(Array.isArray(valeur) && valeur.length === 0);
  const bloquee = q?.obligatoire && !repondue;

  const changer = (v: ValeurReponse) => setReponses((r) => ({ ...r, [q.id]: v }));

  const suivant = async () => {
    if (bloquee) return;
    if (!derniere) { setEtape((e) => e + 1); return; }
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await repondreSondage(sondage.id, reponses);
      onTermine(res.niskas);
    } catch (e: any) {
      setErreur(fr ? 'L’envoi a échoué. Réessayez dans un instant.' : 'Sending failed. Try again in a moment.');
      console.warn('[SondageForm] repondreSondage failed', e);
    } finally {
      setEnvoi(false);
    }
  };

  // À l'ouverture, remonter la carte en haut du viewport : sur mobile, le
  // bandeau au-dessus est haut, et sans ce recentrage les pastilles de la
  // première question finissent sous le bouton fixe « Problème technique »
  // (bas-gauche, sitewide). Une seule fois par sondage ouvert, pas à chaque
  // question : l'utilisateur qui a déjà scrollé garde sa position.
  const racine = useRef<HTMLElement>(null);
  useEffect(() => { racine.current?.scrollIntoView({ block: 'start' }); }, [sondage.id]);

  if (!q) return null;

  return (
    <section ref={racine}>
      <button type="button" onClick={onRetour} className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline dark:text-[#d9a05b]">
        <i className="fa-solid fa-arrow-left mr-2" />{fr ? 'Tous les sondages' : 'All surveys'}
      </button>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#38403a]/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-[#BA7B39] transition-[width] duration-300 ease-out"
          style={{ width: `${((etape + 1) / questions.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
        {fr ? `Question ${etape + 1} sur ${questions.length}` : `Question ${etape + 1} of ${questions.length}`}
      </p>

      {/* L'erreur se montre ici, juste sous l'avancement : en bas de carte,
          sur une question courte, elle finirait cachée derrière le bouton
          fixe « Problème technique » (bas-gauche de l'écran, sitewide). */}
      {erreur && <p className="mt-3 text-xs text-red-500">{erreur}</p>}

      <h2 className="mt-3 max-w-2xl font-serif text-2xl leading-snug text-[#293027] dark:text-white">
        {q.texte}
        {!q.obligatoire && <span className="ml-2 text-sm font-sans text-[#293027]/40 dark:text-white/40">({fr ? 'facultatif' : 'optional'})</span>}
      </h2>

      <div className="mt-6">
        <QuestionVue q={q} valeur={valeur} onChange={changer} lang={lang} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setEtape((e) => Math.max(0, e - 1))}
          disabled={etape === 0}
          className="rounded-full border border-[#38403a]/15 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#293027]/60 transition-colors hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/15 dark:text-white/60"
        >
          {fr ? 'Précédent' : 'Back'}
        </button>
        <button
          type="button"
          onClick={suivant}
          disabled={bloquee || envoi}
          className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-8 py-3 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_10px_28px_-10px_rgba(186,123,57,0.8)] transition-[background-color,transform] hover:bg-[#9c6630] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {envoi ? (fr ? 'Envoi…' : 'Sending…') : derniere ? (fr ? 'Envoyer' : 'Send') : (fr ? 'Suivant' : 'Next')}
          {!derniere && !envoi && <i className="fa-solid fa-arrow-right" />}
        </button>
      </div>
    </section>
  );
};

export default SondageForm;
