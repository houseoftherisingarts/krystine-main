// La fiche d'une recherche Growth : l'en-tête récapitulatif, un sommaire ancré,
// puis sept sections en accordéon dont une seule est ouverte au départ, celle
// que l'intention du run désigne. Tout est brouillon; rien ne part d'ici.
import React, { useRef, useState } from 'react';
import { Card, GhostButton, DangerButton } from '../../primitives';
import {
  ESPACES, INTENTIONS, REGISTRES,
  supprimerRun, envoyerVersGabarit,
  type Intention, type GrowthRun, type Pitch, type Registre,
} from '../../../../firebase/growth';

// ─── Les petites pièces partagées avec la section ────────────────────────────
const TZ = 'America/Toronto';
export const quand = (t?: { toDate: () => Date } | null) => t ? new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(t.toDate()) : '';
export const ecoule = (debut?: { toDate: () => Date } | null, fin?: { toDate: () => Date } | null) => {
  if (!debut) return '';
  const s = Math.max(0, Math.round(((fin ? fin.toDate() : new Date()).getTime() - debut.toDate().getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};
// Les chiffres se lisent en français : virgule décimale et espace pour les milliers.
export const dollars = (n: number) => `${new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} $`;
export const nombre = (n: number) => new Intl.NumberFormat('fr-CA').format(n);

export const ETATS: Record<GrowthRun['statut'], { label: string; classe: string }> = {
  en_attente: { label: 'En file', classe: 'bg-[#38403a]/10 text-[#38403a]/80 dark:bg-white/10 dark:text-white/70' },
  en_cours: { label: 'En cours', classe: 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' },
  termine: { label: 'Terminé', classe: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  erreur: { label: 'Erreur', classe: 'bg-red-600/10 text-red-800 dark:text-red-300' },
};

export const Puce: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>{children}</span>
);
export const Titre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{children}</h3>
);

// ─── Les sept parties du résultat ────────────────────────────────────────────
const SECTIONS = [
  { cle: 'segments', titre: 'Segments', aide: 'Le portrait des groupes de femmes que la recherche a trouvés, avec leurs mots à elles et une estimation de leur taille.' },
  { cle: 'associations', titre: 'Produits et segments', aide: 'Quel produit parler à quel segment, de l\'entrée gratuite jusqu\'à la suite, avec la raison derrière chaque rapprochement.' },
  { cle: 'pitchs', titre: 'Pitchs', aide: 'Un brouillon par segment, dans votre voix, à relire avant tout envoi; un clic le dépose dans vos gabarits d\'infolettre.' },
  { cle: 'contenus', titre: 'Contenus par registre', aide: 'Trois idées par registre pour nourrir la semaine sans plafonner; copiez celle qui vous parle dans votre calendrier.' },
  { cle: 'offres', titre: 'Offres', aide: 'Des pistes d\'offres classées selon qu\'elles demandent votre présence ou qu\'elles rapportent sans vous, chacune reliée à un jalon du plan.' },
  { cle: 'campagne', titre: 'Campagne YouTube', aide: 'De quoi poser une campagne dans Google Ads : audiences, formats, budget indicatif, accroches, scripts et ce qu\'il ne faut pas écrire.' },
  { cle: 'sources', titre: 'Sources', aide: 'Les pages que la recherche a lues pour arriver là, à ouvrir quand vous voulez vérifier un chiffre.' },
] as const;
type CleSection = typeof SECTIONS[number]['cle'];
const PAR_INTENTION: Record<Intention, CleSection> = { segments: 'segments', pitchs: 'pitchs', offres: 'offres', campagne: 'campagne' };
const nomRegistre = (cle: string) => REGISTRES[cle as Registre]?.label || cle;

const FicheResultat: React.FC<{ run: GrowthRun; onFermer: () => void; onMessage: (m: string | null) => void }> = ({ run, onFermer, onMessage }) => {
  const [occupe, setOccupe] = useState<number | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [deplie, setDeplie] = useState<CleSection | null>(PAR_INTENTION[run.intention] || 'segments');
  const [confirme, setConfirme] = useState(false);
  const ancres = useRef<Partial<Record<CleSection, HTMLDivElement | null>>>({});
  const r = run.resultat;

  const copier = async (texte: string, cle: string) => {
    try { await navigator.clipboard.writeText(texte); setCopie(cle); window.setTimeout(() => setCopie(null), 1500); } catch { /* refusé par le navigateur */ }
  };
  const gabarit = async (i: number) => {
    setOccupe(i); onMessage(null);
    try { await envoyerVersGabarit(run.id, i); onMessage('Le pitch est déposé dans Infolettre › Gabarits, catégorie Growth. Rien n’est envoyé.'); }
    catch (e: any) { onMessage(e?.message || 'Le dépôt a échoué.'); }
    finally { setOccupe(null); }
  };
  const aller = (cle: CleSection) => {
    setDeplie(cle);
    window.setTimeout(() => ancres.current[cle]?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 40);
  };

  const compte: Record<CleSection, number> = {
    segments: r?.segments?.length || 0,
    associations: r?.associations?.length || 0,
    pitchs: r?.pitchs?.length || 0,
    contenus: r?.contenus?.length || 0,
    offres: r?.offres?.length || 0,
    campagne: r?.campagne ? 1 : 0,
    sources: r?.sources?.length || 0,
  };

  const Section: React.FC<{ cle: CleSection; children: React.ReactNode }> = ({ cle, children }) => {
    const def = SECTIONS.find(s => s.cle === cle)!;
    const ouvert = deplie === cle;
    return (
      <div ref={el => { ancres.current[cle] = el; }} className="border-t border-[#38403a]/10 dark:border-white/10">
        <button type="button" onClick={() => setDeplie(ouvert ? null : cle)} aria-expanded={ouvert} className="flex w-full items-center gap-3 py-4 text-left">
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg text-[#293027] dark:text-white">{def.titre}</span>
            <span className="mt-0.5 block text-sm leading-relaxed text-[#38403a]/60 dark:text-white/50">{def.aide}</span>
          </span>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#38403a]/45 dark:text-white/40">{compte[cle] || ''}</span>
          <i className={`fa-solid fa-chevron-down shrink-0 text-[10px] text-[#8B4A2F] transition-transform duration-300 dark:text-[#d9a05b] ${ouvert ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {ouvert && <div className="pb-6">{compte[cle] ? children : <p className="text-sm text-[#38403a]/55 dark:text-white/45">Rien dans cette partie pour cette recherche.</p>}</div>}
      </div>
    );
  };

  return (
    <Card className="p-5 md:p-7">
      {/* L'en-tête récapitulatif */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Puce className={ETATS[run.statut].classe}>{ETATS[run.statut].label}</Puce>
            <Titre>Recherche</Titre>
          </div>
          {/* Le titre reste sur une ligne : l'audience descend en sous-titre. */}
          <h2 className="mt-1.5 font-serif text-2xl leading-snug text-[#293027] dark:text-white">{INTENTIONS[run.intention]?.label}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/60">{run.audience?.nom}</p>
        </div>
        <GhostButton type="button" onClick={onFermer}>Fermer</GhostButton>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs leading-relaxed sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Espace', ESPACES[run.espace].label],
          ['Format', run.format?.nom || 'Aucun'],
          ['Produits', `${run.produits?.length || 0} retenu${(run.produits?.length || 0) > 1 ? 's' : ''}`],
          ['Registres', run.registres?.length ? `${run.registres.map(nomRegistre).join(', ')}${run.registreDominant ? ` · dominant : ${nomRegistre(run.registreDominant)}` : ''}` : 'Les quatre'],
          ['Lancée', quand(run.creeLe)],
          ['Durée', ecoule(run.creeLe, run.termineLe) || 'en cours'],
          ['Coût', run.cout ? `${dollars(run.cout.dollars)} (estimation, ${nombre(run.cout.entree + run.cout.sortie)} jetons, ${run.cout.modele})` : 'à venir'],
        ].map(([k, v]) => (
          <div key={k as string}>
            <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/45 dark:text-white/40">{k}</dt>
            <dd className="text-[#38403a]/85 dark:text-white/75">{v}</dd>
          </div>
        ))}
      </dl>

      {run.statut === 'en_attente' || run.statut === 'en_cours' ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/10 p-4 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
          <span>{run.progression || 'La recherche tourne dans le Cloud.'} Cette page se met à jour d’elle-même.</span>
        </div>
      ) : null}
      {run.statut === 'erreur' && <p className="mt-5 rounded-2xl border border-red-600/30 bg-red-600/10 p-4 text-sm text-red-800 dark:text-red-300">{run.erreur || 'La recherche a échoué.'}</p>}

      {r && (
        <>
          {r.avertissements?.length ? (
            <ul className="mt-5 space-y-1 rounded-2xl border border-[#BA7B39]/40 bg-[#BA7B39]/10 p-4 text-sm leading-relaxed text-[#8B4A2F] dark:text-[#d9a05b]">{r.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul>
          ) : null}

          {/* Le sommaire ancré, qui défile à l'horizontale en mobile */}
          <div className="-mx-5 mt-5 overflow-x-auto px-5 md:-mx-7 md:px-7">
            {/* Sept sections : il défile en mobile, il s'enroule sur grand écran. */}
            <div className="flex w-max gap-2 pb-1 md:w-full md:flex-wrap">
              {SECTIONS.map(s => (
                <button key={s.cle} type="button" onClick={() => aller(s.cle)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${deplie === s.cle ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/55'}`}>
                  {s.titre}{compte[s.cle] > 1 ? <span className="ml-1.5 opacity-60">{compte[s.cle]}</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <Section cle="segments">
              <div className="grid gap-3 md:grid-cols-2">
                {r.segments.map((s, i) => (
                  <article key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <h4 className="font-serif text-lg leading-snug text-[#293027] dark:text-white">{s.nom}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-[#38403a]/80 dark:text-white/75">{s.portrait}</p>
                    <dl className="mt-3 space-y-1 text-xs leading-relaxed text-[#38403a]/70 dark:text-white/60">
                      <div><dt className="inline font-bold">Déjà essayé : </dt><dd className="inline">{s.dejaEssaye}</dd></div>
                      <div><dt className="inline font-bold">Ce qui la fait dire oui : </dt><dd className="inline">{s.ceQuiFaitDireOui}</dd></div>
                      <div><dt className="inline font-bold">Taille : </dt><dd className="inline">{s.taille}</dd></div>
                      <div><dt className="inline font-bold">Affinité : </dt><dd className="inline">{s.affinite}</dd></div>
                    </dl>
                    {s.motsTapes?.length ? <div className="mt-3 flex flex-wrap gap-1">{s.motsTapes.map(m => <span key={m} className="rounded-full bg-[#BA7B39]/15 px-2 py-0.5 text-[11px] text-[#8B4A2F] dark:text-[#d9a05b]">{m}</span>)}</div> : null}
                  </article>
                ))}
              </div>
            </Section>

            <Section cle="associations">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-[10px] uppercase tracking-[0.18em] text-[#38403a]/50 dark:text-white/40"><th className="py-2 pr-3">Segment</th><th className="py-2 pr-3">Entrée</th><th className="py-2 pr-3">Cœur</th><th className="py-2 pr-3">Suite</th><th className="py-2">Pourquoi</th></tr></thead>
                  <tbody className="divide-y divide-[#38403a]/10 dark:divide-white/10">
                    {r.associations?.map((a, i) => (
                      <tr key={i} className="align-top text-[#38403a]/85 dark:text-white/75"><td className="py-2 pr-3 font-medium">{a.segment}</td><td className="py-2 pr-3">{a.entree}</td><td className="py-2 pr-3">{a.coeur}</td><td className="py-2 pr-3">{a.suite}</td><td className="py-2 text-xs leading-relaxed">{a.raison}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section cle="pitchs">
              <div className="space-y-3">
                {r.pitchs?.map((p: Pitch, i) => (
                  <article key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{p.segment}</div>
                    <h4 className="mt-1 font-serif text-lg leading-snug text-[#293027] dark:text-white">{p.titre}</h4>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#8B4A2F] dark:text-[#d9a05b]">{p.accroches.map((a, j) => <li key={j}>« {a} »</li>)}</ul>
                    <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#38403a]/85 dark:text-white/75">{p.texte}</div>
                    {p.script15s && <p className="mt-3 rounded-xl bg-[#1a1410] p-3 text-xs leading-relaxed text-[#EEE7DB]"><span className="font-bold uppercase tracking-[0.18em] opacity-70">Script 15 s · </span>{p.script15s}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <GhostButton type="button" disabled={occupe === i} onClick={() => gabarit(i)}>{occupe === i ? 'Dépôt…' : 'Envoyer vers les gabarits'}</GhostButton>
                      <GhostButton type="button" onClick={() => copier(`${p.titre}\n\n${p.texte}`, `p${i}`)}>{copie === `p${i}` ? 'Copié' : 'Copier'}</GhostButton>
                    </div>
                  </article>
                ))}
              </div>
            </Section>

            <Section cle="contenus">
              {r.mixSemaine?.length ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">La semaine</span>
                  {r.mixSemaine.map((j, i) => (
                    <span key={i} title={j.quoi} className="rounded-full bg-[#BA7B39]/15 px-3 py-1 text-[11px] text-[#8B4A2F] dark:text-[#d9a05b]">
                      <b className="font-bold">{j.jour}</b> · {nomRegistre(j.registre)}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {r.contenus?.map(bloc => (
                  <article key={bloc.registre} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <h4 className="font-serif text-lg text-[#293027] dark:text-white">{nomRegistre(bloc.registre)}</h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#38403a]/55 dark:text-white/45">{REGISTRES[bloc.registre as Registre]?.definition}</p>
                    <ul className="mt-3 space-y-3">
                      {bloc.idees?.map((idee, i) => (
                        <li key={i} className="border-t border-[#38403a]/10 pt-3 first:border-0 first:pt-0 dark:border-white/10">
                          <div className="text-sm font-medium leading-snug text-[#293027] dark:text-white">{idee.titre}</div>
                          <p className="mt-1 text-sm leading-relaxed text-[#38403a]/80 dark:text-white/70">{idee.angle}</p>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/50">{idee.format} · {idee.appel}</p>
                          <button type="button"
                            onClick={() => copier(`${idee.titre}\n\n${idee.angle}\n\nFormat : ${idee.format}\nAppel : ${idee.appel}`, `c${bloc.registre}${i}`)}
                            className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">
                            {copie === `c${bloc.registre}${i}` ? 'Copié' : 'Copier'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </Section>

            <Section cle="offres">
              {[...new Set((r.offres || []).map(o => o.marche))].map(m => (
                <div key={m} className="mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{m}</div>
                  <ul className="mt-1.5 space-y-2">
                    {r.offres.filter(o => o.marche === m).map((o, i) => (
                      <li key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-[#293027] dark:text-white">{o.nom}</span><Puce className={o.colonne === 'A' ? 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300'}>Colonne {o.colonne}</Puce></div>
                        <p className="mt-1 leading-relaxed text-[#38403a]/80 dark:text-white/75">{o.description}</p>
                        <p className="mt-2 text-xs leading-relaxed text-[#38403a]/65 dark:text-white/55"><b>Prix observés :</b> {o.prixObserves}</p>
                        <p className="text-xs leading-relaxed text-[#38403a]/65 dark:text-white/55"><b>Jalon du plan :</b> {o.jalon}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Section>

            <Section cle="campagne">
              {r.campagne ? (
                <>
                  <div className="grid gap-3 text-sm leading-relaxed text-[#38403a]/85 md:grid-cols-2 dark:text-white/75">
                    <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Audiences</b><ul className="mt-1 list-disc pl-5">{r.campagne.audiences.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                    <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Formats et budget</b><ul className="mt-1 list-disc pl-5">{r.campagne.formats.map((a, i) => <li key={i}>{a}</li>)}</ul><p className="mt-2 text-xs">{r.campagne.budgetIndicatif}</p></div>
                    <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Accroches</b><ul className="mt-1 space-y-1">{r.campagne.accroches.map((a, i) => <li key={i}>« {a} »</li>)}</ul></div>
                    <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>À ne pas écrire</b><ul className="mt-1 list-disc pl-5 text-xs">{r.campagne.interdits.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {r.campagne.scripts.map((s, i) => <p key={i} className="rounded-xl bg-[#1a1410] p-3 text-xs leading-relaxed text-[#EEE7DB]"><span className="font-bold uppercase tracking-[0.18em] opacity-70">{s.duree} · </span>{s.texte}</p>)}
                  </div>
                  {r.campagne.modeEmploi?.length ? <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[#38403a]/80 dark:text-white/75">{r.campagne.modeEmploi.map((l, i) => <li key={i}>{l}</li>)}</ol> : null}
                </>
              ) : null}
            </Section>

            <Section cle="sources">
              <ul className="space-y-1.5 text-xs leading-relaxed">
                {r.sources?.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8B4A2F] underline-offset-2 hover:underline dark:text-[#d9a05b]">{s.titre || s.url}</a>{s.note ? <span className="text-[#38403a]/55 dark:text-white/45"> · {s.note}</span> : null}</li>)}
              </ul>
            </Section>
          </div>
        </>
      )}

      {/* Retirer la recherche : discret, et la confirmation se fait sur place. */}
      {run.statut !== 'en_cours' && (
        <div className="mt-6 border-t border-[#38403a]/10 pt-4 dark:border-white/10">
          {confirme ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#38403a]/70 dark:text-white/60">Retirer cette recherche et son résultat, sans retour possible ?</span>
              <DangerButton type="button" onClick={async () => { await supprimerRun(run.id); onFermer(); }}>Oui, retirer</DangerButton>
              <button type="button" onClick={() => setConfirme(false)} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/50 hover:text-[#8B4A2F] dark:text-white/50">Annuler</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirme(true)} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/45 transition-colors hover:text-red-500 dark:text-white/40">
              <i className="fa-solid fa-trash mr-2" aria-hidden="true" /> Retirer cette recherche
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export default FicheResultat;
