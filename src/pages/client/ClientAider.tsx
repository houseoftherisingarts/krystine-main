import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getSondagesActifs, suivreSondagesFaits, type Sondage, type ThemeSondage } from '../../firebase/sondages';
import { PETITES_CAPITALES } from '../../components/communaute/CarteSociale';
import PieceNiska from '../../components/client/PieceNiska';
import SondageForm from '../../components/client/SondageForm';

// L'onglet « Aider » : les sondages que Krystine ajoute de temps en temps.
// Répondre retire le sondage de l'espace pour toujours et verse dix niskas
// (functions/src/sondages.ts, repondreSondage). Patron repris de
// ClientRediffusions : une liste, puis une vue « ouverte » qui la remplace.

const LIBELLES_THEME: Record<ThemeSondage, { fr: string; en: string }> = {
  technique: { fr: 'Technique', en: 'Technical' },
  formation: { fr: 'Formations', en: 'Programs' },
  accompagnement: { fr: 'Accompagnement', en: 'Support' },
};

const ClientAider: React.FC = () => {
  const { user, lang } = useApp();
  const fr = lang === 'FR';
  const [sondages, setSondages] = useState<Sondage[]>([]);
  const [faits, setFaits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [ouvert, setOuvert] = useState<Sondage | null>(null);
  const [justFait, setJustFait] = useState<{ id: string; niskas: number } | null>(null);
  const minuterie = useRef<number>();

  useEffect(() => {
    getSondagesActifs().then(setSondages).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    return suivreSondagesFaits(user.uid, setFaits);
  }, [user]);
  useEffect(() => () => window.clearTimeout(minuterie.current), []);

  const termine = (sondage: Sondage, niskas: number) => {
    setOuvert(null);
    setJustFait({ id: sondage.id, niskas });
    minuterie.current = window.setTimeout(() => setJustFait(null), 3200);
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;
  if (ouvert) return <SondageForm sondage={ouvert} lang={lang} onTermine={(n) => termine(ouvert, n)} onRetour={() => setOuvert(null)} />;

  const visibles = sondages.filter((s) => !faits.has(s.id) || justFait?.id === s.id);

  return (
    <section>
      <p className={PETITES_CAPITALES}>
        <i className="fa-solid fa-hand-holding-heart mr-1" /> {fr ? 'Aider' : 'Help'}
      </p>
      <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#293027]/60 dark:text-white/60">
        {fr
          ? 'Vos réponses nous aident à mieux servir. Chaque sondage complété vous donne 10 niskas.'
          : 'Your answers help us serve you better. Each completed survey gives you 10 niskas.'}
      </p>

      {visibles.length === 0 ? (
        <div className="mt-6 rounded-[15px] bg-[#BA7B39]/8 py-10 text-center dark:bg-white/5">
          <i className="fa-solid fa-hand-holding-heart mb-3 block text-2xl text-[#BA7B39]/60" />
          <p className="font-serif text-lg text-[#293027] dark:text-white">
            {fr ? 'Aucun sondage pour le moment' : 'No survey right now'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#293027]/50 dark:text-white/50">
            {fr
              ? 'Merci pour votre aide : il en arrive de nouveaux de temps en temps.'
              : 'Thank you for your help: new ones arrive from time to time.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {visibles.map((s) => {
            const fini = justFait?.id === s.id;
            const theme = LIBELLES_THEME[s.theme] || LIBELLES_THEME.technique;
            return (
              <li key={s.id} className="rounded-[15px] border border-[#38403a]/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                {fini ? (
                  <div className="flex h-full min-h-[9rem] flex-col items-center justify-center text-center">
                    <PieceNiska size={28} className="mb-2" />
                    <p className="font-serif text-lg text-[#293027] dark:text-white">
                      {fr ? 'Merci.' : 'Thank you.'} +{justFait.niskas} {fr ? 'niskas' : 'niskas'}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#BA7B39]">
                      {fr ? theme.fr : theme.en}
                    </p>
                    <h3 className="mt-1.5 font-serif text-xl leading-snug text-[#293027] dark:text-white">{s.titre}</h3>
                    {s.sousTitre && (
                      <p className="mt-1.5 text-sm leading-relaxed text-[#293027]/60 dark:text-white/60">{s.sousTitre}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#293027]/45 dark:text-white/45">
                        {s.questions?.length || 0} {fr ? 'questions' : 'questions'} · <PieceNiska size={12} className="mr-0.5 inline-block align-[-2px]" />{s.recompense || 10} {fr ? 'niskas' : 'niskas'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOuvert(s)}
                        className="shrink-0 rounded-full bg-[#BA7B39] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#9c6630]"
                      >
                        {fr ? 'Répondre' : 'Answer'}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ClientAider;
