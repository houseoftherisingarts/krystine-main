// Le logbook des mises en ligne : chaque publication faite avec scripts/publier.sh,
// de l'ordinateur de Krystine ou de celui d'Alex, avec son heure, son commit et
// ses fichiers. La liste vit dans /journal-publications.json, déployée avec le site.
import React, { useEffect, useMemo, useState } from 'react';

interface Publication {
  quand: string;
  qui: string;
  machine?: string;
  commit: string;
  message: string;
  cibles?: string[];
  fichiers?: string[];
}

type Auteur = 'krystine' | 'alex';
type Filtre = 'tous' | Auteur;

const auteurDe = (p: Publication): Auteur => (/krystine/i.test(`${p.qui} ${p.machine || ''}`) ? 'krystine' : 'alex');
const NOMS: Record<Auteur, string> = { krystine: 'Krystine', alex: 'Alex · Vexel' };

const TZ = 'America/Toronto';
const jourDe = (iso: string) => new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(iso));
const heureDe = (iso: string) => new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(new Date(iso)).replace(/[  ]/g, ' ').replace(' h ', ' h ');
const cleJour = (iso: string) => new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(new Date(iso));

const PublicationsSection: React.FC = () => {
  const [liste, setListe] = useState<Publication[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  useEffect(() => {
    fetch('/journal-publications.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : []))
      .then((j: Publication[]) => setListe(Array.isArray(j) ? j : []))
      .catch(() => setListe([]));
  }, []);

  const triees = useMemo(() => (liste || []).slice().sort((a, b) => b.quand.localeCompare(a.quand)), [liste]);
  const visibles = useMemo(() => triees.filter(p => filtre === 'tous' || auteurDe(p) === filtre), [triees, filtre]);
  const compte = useMemo(() => ({
    krystine: triees.filter(p => auteurDe(p) === 'krystine').length,
    alex: triees.filter(p => auteurDe(p) === 'alex').length,
  }), [triees]);

  const jours = useMemo(() => {
    const groupes: { cle: string; titre: string; items: Publication[] }[] = [];
    for (const p of visibles) {
      const cle = cleJour(p.quand);
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.cle === cle) dernier.items.push(p);
      else groupes.push({ cle, titre: jourDe(p.quand), items: [p] });
    }
    return groupes;
  }, [visibles]);

  const copier = async (texte: string, cle: string) => {
    try { await navigator.clipboard.writeText(texte); setCopie(cle); window.setTimeout(() => setCopie(null), 1600); } catch { /* le presse-papiers peut être refusé */ }
  };

  const filtres: { id: Filtre; label: string; n: number }[] = [
    { id: 'tous', label: 'Tout', n: triees.length },
    { id: 'krystine', label: 'Krystine', n: compte.krystine },
    { id: 'alex', label: 'Alex · Vexel', n: compte.alex },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-[#293027] dark:text-white">Publications</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Chaque mise en ligne du site, à l’heure près : celles faites depuis votre ordinateur et celles
          de Vexel, avec le repère qui permet de revenir en arrière si quelque chose a mal tourné.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[20px] bg-[#BA7B39] px-6 py-8 text-[#1a1410] md:px-10 md:py-10">
        <div>
          <div className="font-serif text-6xl leading-none md:text-7xl">{compte.krystine}</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
            {compte.krystine === 1 ? 'publication de Krystine' : 'publications de Krystine'}
          </div>
        </div>
        <div className="hidden w-px self-stretch bg-[#1a1410]/20 md:block" />
        <div>
          <div className="font-serif text-6xl leading-none md:text-7xl">{compte.alex}</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
            {compte.alex === 1 ? 'publication de Vexel' : 'publications de Vexel'}
          </div>
        </div>
        <p className="max-w-sm text-sm leading-relaxed opacity-80">
          Une entrée s’écrit d’elle-même à chaque mise en ligne faite avec la commande de publication, depuis l’un ou l’autre ordinateur.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtres.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltre(f.id)}
            className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${
              filtre === f.id
                ? 'border-[#BA7B39] bg-[#BA7B39] text-[#1a1410]'
                : 'border-[#38403a]/20 text-[#38403a]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">{f.n}</span>
          </button>
        ))}
      </div>

      {liste === null && <p className="text-sm text-[#38403a]/60 dark:text-white/60">Chargement du journal…</p>}
      {liste !== null && visibles.length === 0 && (
        <p className="text-sm text-[#38403a]/60 dark:text-white/60">Aucune publication encore dans cette liste.</p>
      )}

      <div className="space-y-10">
        {jours.map(jour => (
          <section key={jour.cle}>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{jour.titre}</h2>
            <ol className="relative ml-2 space-y-4 border-l border-[#38403a]/15 md:ml-3 dark:border-white/10">
              {jour.items.map(p => {
                const auteur = auteurDe(p);
                const cle = `${p.commit}-${p.quand}`;
                const estOuvert = ouvert === cle;
                return (
                  <li key={cle} className="relative pl-6 md:pl-10">
                    <span
                      aria-hidden
                      className={`absolute -left-[7px] top-6 h-3.5 w-3.5 rounded-full border-2 border-[#EEE7DB] dark:border-[#151d19] ${
                        auteur === 'krystine' ? 'bg-[#BA7B39]' : 'bg-[#38403a]/60 dark:bg-white/40'
                      }`}
                    />
                    <article className="rounded-[20px] border border-white/60 bg-white/55 p-5 backdrop-blur-md md:p-6 dark:border-white/10 dark:bg-[#293027]/55">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span className="font-serif text-lg text-[#293027] dark:text-white">{heureDe(p.quand)}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                            auteur === 'krystine'
                              ? 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'
                              : 'bg-[#38403a]/10 text-[#38403a]/80 dark:bg-white/10 dark:text-white/70'
                          }`}
                        >
                          {NOMS[auteur]}
                        </span>
                        {p.machine && <span className="text-[10px] uppercase tracking-[0.18em] text-[#38403a]/45 dark:text-white/40">{p.machine}</span>}
                        <button
                          type="button"
                          onClick={() => copier(p.commit, cle)}
                          title="Copier le repère du commit"
                          className="ml-auto rounded-full border border-[#38403a]/15 px-2.5 py-[3px] font-mono text-[11px] text-[#38403a]/70 transition-colors hover:border-[#BA7B39] dark:border-white/15 dark:text-white/60"
                        >
                          {copie === cle ? 'copié' : p.commit}
                        </button>
                      </div>
                      <p className="leading-relaxed text-[#38403a]/85 dark:text-white/80">{p.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#38403a]/55 dark:text-white/50">
                        {p.cibles?.length ? <span>En ligne : {p.cibles.join(', ')}</span> : null}
                        {p.fichiers?.length ? (
                          <button type="button" onClick={() => setOuvert(estOuvert ? null : cle)} className="underline-offset-2 hover:underline">
                            {p.fichiers.length} {p.fichiers.length === 1 ? 'fichier' : 'fichiers'} {estOuvert ? '▴' : '▾'}
                          </button>
                        ) : null}
                      </div>
                      {estOuvert && p.fichiers?.length ? (
                        <ul className="mt-3 space-y-1 font-mono text-[11px] text-[#38403a]/70 dark:text-white/60">
                          {p.fichiers.map(f => <li key={f}>{f}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="rounded-[20px] border border-[#38403a]/10 bg-white/40 p-5 text-sm leading-relaxed text-[#38403a]/75 dark:border-white/10 dark:bg-[#293027]/40 dark:text-white/70">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">Revenir en arrière</p>
        <p>
          Le repère à côté de l’heure est le commit de la publication. Depuis le dossier du site, dans le Terminal :
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-[#1a1410] p-3 font-mono text-[11px] text-[#EEE7DB]">{'git revert <commit> --no-edit\nscripts/publier.sh "Retour arrière : la raison"'}</pre>
        <p className="mt-2">
          Pour un retour immédiat sans toucher au code, l’historique des versions de l’hébergement (console Firebase › Hosting) remet la version précédente en ligne en un clic.
        </p>
      </div>
    </div>
  );
};

export default PublicationsSection;
