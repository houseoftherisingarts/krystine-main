import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  getMesFormations, getLecons, getProgression,
  type AchatFormation,
} from '../../firebase/formations';
import { estTelechargement } from '../../firebase/musique';
import Diplome, { type DiplomeInfos } from '../../components/cours/Diplome';
import { telechargerDiplome } from '../../lib/diplomePdf';
import { cheminCours } from '../../lib/cheminCours';

// « Mes diplômes » : les parcours menés jusqu'au bout. Un diplôme ne se range
// pas dans une collection à part, il se déduit de la progression : quand
// toutes les leçons d'une formation sont fermées, le parchemin existe. La
// date vient du champ termineeLe, écrit le jour où la dernière leçon s'achève.

interface Obtenu {
  formation: AchatFormation;
  infos: DiplomeInfos;
}

const ClientDiplomes: React.FC = () => {
  const { user, lang } = useApp();
  const [obtenus, setObtenus] = useState<Obtenu[]>([]);
  const [enCours, setEnCours] = useState<{ titre: string; id: string; faites: number; total: number }[]>([]);
  const [charge, setCharge] = useState(true);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const fr = lang === 'FR';

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    (async () => {
      try {
        const achats = (await getMesFormations(user.uid)).filter(a => !estTelechargement(a));
        const lus = await Promise.all(achats.map(async a => {
          const [lecons, prog] = await Promise.all([getLecons(a.id), getProgression(user.uid, a.id)]);
          const faites = lecons.filter(l => prog.terminees?.[l.id]).length;
          return { a, total: lecons.length, faites, termineeLe: prog.termineeLe };
        }));
        if (!vivant) return;
        const finis: Obtenu[] = [];
        const restants: typeof enCours = [];
        for (const { a, total, faites, termineeLe } of lus) {
          if (total > 0 && faites >= total) {
            finis.push({
              formation: a,
              infos: {
                nom: user.displayName || user.email || (fr ? 'Membre' : 'Member'),
                programme: a.titre,
                accompli: fr ? `${total} leçons` : `${total} lessons`,
                date: termineeLe || new Date().toISOString().slice(0, 10),
                numero: `${a.id.slice(-6).toUpperCase()} · ${user.uid.slice(0, 6).toUpperCase()}`,
              },
            });
          } else if (total > 0) {
            restants.push({ titre: a.titre, id: a.id, faites, total });
          }
        }
        setObtenus(finis);
        setEnCours(restants);
      } finally {
        if (vivant) setCharge(false);
      }
    })();
    return () => { vivant = false; };
  }, [user, fr]);

  if (charge) {
    return <p className="text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Chargement…' : 'Loading…'}</p>;
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {fr ? 'Vos diplômes' : 'Your certificates'}
        </p>

        {obtenus.length === 0 ? (
          <div className="mt-4 rounded-[15px] bg-[#BA7B39]/8 py-10 text-center dark:bg-white/5">
            <i className="fa-solid fa-award mb-3 block text-3xl text-[#BA7B39]/60" />
            <p className="font-serif text-lg text-[#293027] dark:text-white">
              {fr ? 'Votre premier parchemin vous attend' : 'Your first certificate awaits'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[#293027]/55 dark:text-white/50">
              {fr
                ? 'Terminez toutes les leçons d’un parcours et votre diplôme se déroule ici, signé de la main de Krystine, prêt à imprimer.'
                : 'Finish every lesson of a program and your certificate unrolls here, signed by Krystine, ready to print.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-8">
            {obtenus.map(({ formation, infos }) => (
              <article key={formation.id} className="rounded-[20px] border border-[#BA7B39]/25 bg-white/60 p-4 md:p-6 dark:border-white/10 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setOuvert(o => (o === formation.id ? null : formation.id))}
                  className="block w-full overflow-hidden rounded-[10px] shadow-[0_18px_40px_-22px_rgba(41,48,39,0.55)] transition-transform hover:scale-[1.006]"
                  aria-label={fr ? 'Agrandir le diplôme' : 'Enlarge the certificate'}
                >
                  <Diplome infos={infos} lang={lang} />
                </button>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-lg leading-snug text-[#293027] dark:text-white">{formation.titre}</p>
                    <p className="mt-0.5 text-[13px] text-[#38403a]/65 dark:text-white/55">
                      {fr ? `Terminé le ${infos.date}` : `Completed on ${infos.date}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => telechargerDiplome(infos, lang)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#151d19] transition-colors hover:bg-[#d9a05b]"
                  >
                    <i className="fa-solid fa-file-arrow-down" />
                    {fr ? 'Prendre le PDF' : 'Download the PDF'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {enCours.length > 0 && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
            {fr ? 'En chemin' : 'On the way'}
          </p>
          <div className="mt-4 space-y-3">
            {enCours.map(p => (
              <Link
                key={p.id}
                to={cheminCours(p.id)}
                className="flex items-center gap-4 rounded-[15px] border border-[#38403a]/10 bg-white/55 px-5 py-4 transition-colors hover:border-[#BA7B39]/50 dark:border-white/10 dark:bg-white/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[17px] text-[#293027] dark:text-white">{p.titre}</span>
                  <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#38403a]/12 dark:bg-white/10">
                    <span className="block h-full rounded-full bg-[#BA7B39]" style={{ width: `${Math.round((p.faites / p.total) * 100)}%` }} />
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-[#38403a]/60 dark:text-white/50">
                  {p.faites}/{p.total}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Le parchemin en grand, par-dessus la page */}
      {ouvert && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-[#151d19]/85 p-4 backdrop-blur-sm"
          onClick={() => setOuvert(null)}
          role="presentation"
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-[10px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <Diplome infos={obtenus.find(o => o.formation.id === ouvert)!.infos} lang={lang} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDiplomes;
