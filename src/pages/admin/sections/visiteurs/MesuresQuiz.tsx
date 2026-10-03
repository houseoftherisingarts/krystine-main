import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../primitives';
import { Barres, Courbe, TEINTES } from './graphiques';
import { chargerChiffresQuiz, chargerSessions, dateCourte, nb, pct, type ChiffresQuiz, type Resume, type Session } from './donnees';
import type { Periode } from '../VisiteursSection';

// ─── Le quiz, les connexions et le fuseau horaire ───────────────────────────
// L'entonnoir du quiz : ceux qui cliquent sur Commencer, ceux qui vont au bout,
// ceux qui laissent leur courriel, ceux qui vont voir VATA, ceux qui achètent.
// Les trois premiers viennent du traceur (objectifs nommés quiz_*), le courriel
// des résultats enregistrés, l'achat de la source « quiz » posée par le
// webhook. Aucune donnée personnelle ne passe ici : que des comptes.

const Titre: React.FC<{ children: React.ReactNode; note?: string }> = ({ children, note }) => (
  <div className="mb-4">
    <h3 className="font-serif text-lg text-[#293027] dark:text-white">{children}</h3>
    {note && <p className="text-[12px] text-[#38403a]/60 dark:text-white/50">{note}</p>}
  </div>
);

const REGION: Record<string, string> = {
  'America/Toronto': 'Est (Québec, Ontario)', 'America/Montreal': 'Est (Québec)', 'America/Vancouver': 'Pacifique (Colombie-Britannique)',
  'America/Edmonton': 'Montagnes (Alberta)', 'America/Winnipeg': 'Centre (Manitoba)', 'America/Halifax': 'Atlantique',
  'Europe/Paris': 'France', 'Europe/Brussels': 'Belgique', 'Europe/Zurich': 'Suisse', 'Africa/Casablanca': 'Maroc',
};

const MesuresQuiz: React.FC<{ resume: Resume; periode: Periode }> = ({ resume, periode }) => {
  const [chiffres, setChiffres] = useState<ChiffresQuiz | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    let vivant = true;
    setChiffres(null); setSessions(null);
    chargerChiffresQuiz(periode.de).then(c => { if (vivant) setChiffres(c); }).catch(() => { if (vivant) setChiffres({ courriels: 0, achatsQuiz: 0, achatsTotal: 0 }); });
    chargerSessions(new Date(periode.de + 'T00:00:00')).then(s => { if (vivant) setSessions(s); }).catch(() => { if (vivant) setSessions([]); });
    return () => { vivant = false; };
  }, [periode]);

  const parNom = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of resume.objectifs) m[o.nom] = o.n;
    return m;
  }, [resume]);

  const commencent = parNom.quiz_commence || 0;
  const finissent = parNom.quiz_resultat_vu || 0;
  const vata = parNom.quiz_clic_vata || 0;
  const huile = parNom.quiz_clic_huile || 0;
  const etapes = [
    { nom: 'Cliquent sur Commencer', n: commencent },
    { nom: 'Répondent à la question 2', n: parNom.quiz_question_2 || 0 },
    { nom: 'Vont au bout (résultat vu)', n: finissent },
    { nom: 'Laissent leur courriel', n: chiffres?.courriels ?? 0 },
    { nom: 'Cliquent vers VATA Essentiel', n: vata },
    { nom: 'Achètent (source quiz)', n: chiffres?.achatsQuiz ?? 0 },
  ];
  const profils = resume.objectifs.filter(o => o.nom.startsWith('quiz_resultat_vu_')).map(o => ({ nom: o.nom.replace('quiz_resultat_vu_', '').replace('_', ' · '), n: o.n }));
  const questions = Array.from({ length: 10 }, (_, i) => ({ nom: `Question ${i + 1}`, n: parNom[`quiz_question_${i + 1}`] || 0 })).filter(q => q.n > 0);
  const totalConnexions = resume.connexions.reduce((n, c) => n + c.n, 0);

  const fuseaux = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sessions || []) if (s.tz) m[s.tz] = (m[s.tz] || 0) + 1;
    return Object.entries(m).map(([tz, n]) => ({ nom: REGION[tz] ? `${tz} · ${REGION[tz]}` : tz, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [sessions]);
  const avecFuseau = (sessions || []).filter(s => s.tz).length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="min-w-0 p-6 lg:col-span-2">
        <Titre note={`Quiz sur ${periode.jours} jours : du clic sur Commencer jusqu'à l'achat. Les courriels et les achats se lisent dans les résultats et les achats enregistrés.`}>Entonnoir du quiz</Titre>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {etapes.map((e, i) => (
            <li key={e.nom} className="rounded-[16px] border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/55">Étape {i + 1}</p>
              <p className="mt-1 font-serif text-2xl tabular-nums text-[#293027] dark:text-white">{nb(e.n)}</p>
              <p className="text-[12px] text-[#38403a]/70 dark:text-white/60">{e.nom}</p>
              {i > 0 && etapes[i - 1].n > 0 && <p className="mt-1 text-[11px] text-[#8B4A2F]">{pct(e.n, etapes[i - 1].n)} % de l'étape précédente</p>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12px] text-[#38403a]/60 dark:text-white/50">
          {chiffres ? `${nb(huile)} clic${huile > 1 ? 's' : ''} vers l'huile INSPIRATA AYURVEDA. ${nb(chiffres.achatsTotal)} achat${chiffres.achatsTotal > 1 ? 's' : ''} de formation au total sur la période.` : 'Lecture des résultats et des achats…'}
          {' '}Un achat porte la source « quiz » seulement si la personne avait lu son résultat dans les trente jours, avec les témoins acceptés.
        </p>
      </Card>

      <Card className="min-w-0 p-6">
        <Titre note="les questions atteintes (une fois par visite)">Où le quiz se perd</Titre>
        {questions.length ? <Barres lignes={questions} unite=" visites" /> : <p className="text-sm text-[#38403a]/55">Aucune question atteinte sur la période (la mesure démarre avec cette version).</p>}
      </Card>

      <Card className="min-w-0 p-6">
        <Titre note="la nature du résultat, puis la dominance">Résultats vus</Titre>
        {profils.length ? <Barres lignes={profils} unite=" fois" couleur={TEINTES.prune} /> : <p className="text-sm text-[#38403a]/55">Aucun résultat vu sur la période.</p>}
      </Card>

      <Card className="min-w-0 p-6">
        <Titre note={`${nb(totalConnexions)} connexion${totalConnexions > 1 ? 's' : ''} sur la période, sans nom ni courriel`}>Connexions à l'espace client</Titre>
        {totalConnexions ? <Courbe nomSerie="connexions" couleur={TEINTES.bleu} points={resume.connexions.map(c => ({ x: dateCourte(c.jour), y: c.n, etiquette: `${dateCourte(c.jour)} : ${c.n}` }))} />
          : <p className="text-sm text-[#38403a]/55">Aucune connexion mesurée encore. Chaque ouverture de session s'ajoute ici, un compte par jour.</p>}
      </Card>

      <Card className="min-w-0 p-6">
        <Titre note="un indice seulement : le fuseau horaire du navigateur, pas la province ni la ville">Fuseau horaire (indice)</Titre>
        {sessions === null ? <p className="text-sm text-[#38403a]/55">Lecture des visites…</p>
          : fuseaux.length ? <Barres lignes={fuseaux} unite=" visites" couleur={TEINTES.encre} />
          : <p className="text-sm text-[#38403a]/55">Aucun fuseau lu encore : il se note à partir des prochaines visites.</p>}
        {avecFuseau > 0 && <p className="mt-3 text-[12px] text-[#38403a]/60 dark:text-white/50">{nb(avecFuseau)} visites sur {nb((sessions || []).length)} portent un fuseau. Le lieu exact n'est jamais gardé.</p>}
      </Card>
    </div>
  );
};

export default MesuresQuiz;
