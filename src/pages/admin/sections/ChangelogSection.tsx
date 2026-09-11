// Le journal des changements, tel que Krystine le lit. Le contenu vit dans
// src/lib/changelog.ts et s'ajoute en tête à chaque journée de travail.
import React from 'react';
import { Link } from 'react-router-dom';
import { JOURNAL, nombreEtapes, type Etape } from '../../../lib/changelog';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 21 avril 2026 », sans passer par Date pour éviter le décalage de fuseau. */
const enLettres = (iso: string): string => {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j} ${MOIS[(m || 1) - 1]} ${a}`;
};

const ChangelogSection: React.FC = () => {
  const journees = JOURNAL.length;
  const premiere = JOURNAL[JOURNAL.length - 1];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-[#293027] dark:text-white">Journal des changements</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Tout ce qui a été bâti sur votre site depuis le premier jour, une journée à la fois, de la
          plus récente à la plus ancienne.
        </p>
      </div>

      {/* La seule rupture de la page : le compte, en gros, avant la frise. */}
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[20px] bg-[#BA7B39] px-6 py-8 text-[#1a1410] md:px-10 md:py-10">
        <div>
          <div className="font-serif text-6xl leading-none md:text-7xl">{journees}</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
            {journees === 1 ? 'journée de travail' : 'journées de travail'}
          </div>
        </div>
        <div className="hidden w-px self-stretch bg-[#1a1410]/20 md:block" />
        <div className="max-w-md">
          <p className="font-serif text-xl leading-snug">
            {nombreEtapes()} changements livrés depuis le {enLettres(premiere.date)}.
          </p>
          <p className="mt-2 text-sm leading-relaxed opacity-75">
            Chaque nouvelle journée de travail s’ajoute ici d’elle-même, en haut de la liste.
          </p>
        </div>
      </div>

      <ol className="relative ml-2 space-y-8 border-l border-[#38403a]/15 md:ml-3 dark:border-white/10">
        {JOURNAL.map((entree, i) => (
          <li key={entree.date} className="relative pl-6 md:pl-10">
            <span
              aria-hidden
              className={`absolute -left-[7px] top-7 h-3.5 w-3.5 rounded-full border-2 border-[#EEE7DB] dark:border-[#151d19] ${
                i === 0 ? 'bg-[#BA7B39]' : 'bg-[#38403a]/35 dark:bg-white/25'
              }`}
            />
            <article className="rounded-[20px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-[#293027]/55">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
                  {enLettres(entree.date)}
                </span>
                {i === 0 && (
                  <span className="rounded-full bg-[#BA7B39]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">
                    Dernière livraison
                  </span>
                )}
              </div>

              <h2 className="mb-3 font-serif text-xl leading-snug text-[#293027] md:text-2xl dark:text-white">{entree.titre}</h2>
              <p className="mb-6 leading-relaxed text-[#38403a]/80 dark:text-white/75">{entree.intro}</p>

              <ul className="space-y-3">
                {entree.etapes.map((etape: Etape, j) => {
                  const texte = typeof etape === 'string' ? etape : etape.texte;
                  const ou = typeof etape === 'string' ? null : etape.ou;
                  return (
                    <li key={j} className="flex gap-3 text-sm leading-relaxed text-[#38403a]/85 md:text-[15px] dark:text-white/75">
                      <i className="fa-solid fa-check mt-1 shrink-0 text-[#BA7B39]" aria-hidden="true" />
                      <span>
                        {texte}
                        {ou && (
                          <Link
                            to={ou}
                            className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#BA7B39]/35 px-2.5 py-[3px] align-middle text-[11px] font-bold text-[#8B4A2F] transition-colors hover:border-[#BA7B39] hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                            {(typeof etape === 'string' ? '' : etape.libelle) || 'Voir'}
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-2 pl-2 text-sm text-[#38403a]/55 dark:text-white/50">
        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
        Une question sur l’une de ces journées se pose dans l’onglet « Demander un changement ».
      </p>
    </div>
  );
};

export default ChangelogSection;
