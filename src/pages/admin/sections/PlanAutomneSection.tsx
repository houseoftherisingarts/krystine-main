// Le plan d'automne 2026, repris de l'infographie de Krystine et rendu vivant :
// chaque action se coche, chaque case porte sa mesure de succès, et la ligne
// « Vue d'ensemble » montre d'un coup ce qui est fait et ce dont l'impact est
// vérifié. Les textes viennent de src/lib/planAutomne.ts, l'état de Firestore
// (planAutomne/2026). Le plan garde les couleurs de l'infographie en clair
// comme en sombre : c'est un document, pas une page de l'admin.
import React, { useEffect, useMemo, useState } from 'react';
import ItemCochable from './plan-automne/ItemCochable';
import {
  AXES, CALENDRIER, CHANTIERS, ENTETE, EQUIPE, EQUIPE_TITRE, MESURES_DEFAUT, PARKE, PARKE_TITRE,
  PHASES, PIED_DE_PAGE, SOURCES_MESURES, TOURNEE_FRISE, TOURNEE_TITRE, TOURNEE_ZONES,
  TOUS_LES_ITEMS, VUE_ENSEMBLE,
} from '../../../lib/planAutomne';
import {
  cocherItem, ecouterPlan, majItem, type EtatPlan, type ItemPlan,
} from '../../../firebase/planAutomne';

const ENCRE = '#18374b';
const CHEVRON = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';

const pourcent = (part: number, tout: number): number => (tout === 0 ? 0 : Math.round((part / tout) * 100));

// La barre de progression de la ligne « Vue d'ensemble ». Deux barres y vivent :
// la verte compte ce qui est fait, l'or compte ce dont l'impact est confirmé.
const Barre: React.FC<{
  label: string; part: number; tout: number; couleur: string; epaisse?: boolean; suffixe: string;
}> = ({ label, part, tout, couleur, epaisse, suffixe }) => (
  <div className="min-w-0 flex-1">
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/70">{label}</span>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-white">
        {pourcent(part, tout)} % <span className="text-[9.5px] font-normal text-white/55">· {part} {suffixe}</span>
      </span>
    </div>
    <div className={`w-full overflow-hidden rounded-full bg-white/15 ${epaisse ? 'h-2' : 'h-[5px]'}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pourcent(part, tout)}%`, backgroundColor: couleur }}
      />
    </div>
  </div>
);

const TitreBande: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-t-[8px] px-4 py-2 font-serif text-[13px] font-semibold uppercase tracking-[0.12em] text-white ${className}`}
    style={{ backgroundColor: ENCRE }}
  >
    {children}
  </div>
);

const PlanAutomneSection: React.FC = () => {
  const [distant, setDistant] = useState<EtatPlan>({});
  const [local, setLocal] = useState<EtatPlan>({});
  const [refus, setRefus] = useState<string | null>(null);

  useEffect(() => ecouterPlan(setDistant, setRefus), []);

  const etat = useMemo<EtatPlan>(() => {
    const fusion: EtatPlan = { ...distant };
    for (const [id, morceau] of Object.entries(local)) fusion[id] = { ...(distant[id] ?? { fait: false }), ...morceau };
    return fusion;
  }, [distant, local]);

  // Chaque geste s'affiche tout de suite et part vers Firestore. Si les règles
  // du plan ne sont pas encore en ligne, l'état reste à l'écran et le message
  // le dit, plutôt que de faire disparaître le clic sans explication.
  const poser = (id: string, morceau: Partial<ItemPlan>) =>
    setLocal(l => ({ ...l, [id]: { ...(l[id] ?? { fait: false }), ...morceau } as ItemPlan }));

  const surErreur = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    setRefus(code === 'permission-denied'
      ? 'Les règles du plan ne sont pas encore en ligne : vos changements restent à l\'écran, ils seront enregistrés dès la publication.'
      : 'L\'enregistrement n\'a pas passé. Vos changements restent à l\'écran.');
  };

  const cocher = (id: string, fait: boolean) => { poser(id, { fait }); cocherItem(id, fait).catch(surErreur); };
  const maj = (id: string, morceau: Partial<ItemPlan>) => { poser(id, morceau); majItem(id, morceau).catch(surErreur); };

  const chiffres = useMemo(() => {
    const faits = TOUS_LES_ITEMS.filter(i => etat[i.id]?.fait).length;
    const verifies = TOUS_LES_ITEMS.filter(i => etat[i.id]?.fait && etat[i.id]?.impact === 'oui').length;
    return { total: TOUS_LES_ITEMS.length, faits, verifies };
  }, [etat]);

  const rendreItem = (item: { id: string; texte: string }, accent: string, petit?: boolean) => (
    <ItemCochable
      key={item.id}
      item={item}
      etat={etat[item.id]}
      defaut={MESURES_DEFAUT[item.id] ?? 'À définir : ce qui vous dira que ce geste a vraiment porté.'}
      accent={accent}
      lectureSeule={refus !== null}
      onCocher={f => cocher(item.id, f)}
      onMaj={m => maj(item.id, m)}
      petit={petit}
    />
  );

  return (
    <div className="space-y-4">
      {refus && (
        <div className="rounded-[12px] border border-[#e0c39c] bg-[#fdf6ec] px-4 py-3 text-sm leading-relaxed text-[#7a5a2e]">
          <i className="fa-solid fa-circle-info mr-2" />{refus}
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-[#dfe5ea] bg-[#fdfefe] shadow-[0_10px_30px_-18px_rgba(24,55,75,0.35)]">

        {/* ── L'en-tête : la marque, la phrase, la citation, et la bande photo ── */}
        <div className="relative grid grid-cols-1 gap-4 bg-gradient-to-r from-[#e9eef3] via-[#dfe8f0] to-[#eef2f6] px-5 py-5 lg:grid-cols-[1fr_auto_1.1fr_1fr] lg:items-center lg:gap-6 lg:py-0 lg:pl-6 lg:pr-6">
          <div className="lg:py-5">
            <div className="font-serif text-[40px] font-light leading-none tracking-[0.02em] text-[#20394d]">{ENTETE.marque}</div>
            <div className="mt-1 font-serif text-[15px] tracking-[0.3em] text-[#20394d]">{ENTETE.saison}</div>
            <div className="mt-3 text-[11.5px] font-semibold tracking-[0.16em] text-[#2b4b63]">{ENTETE.devise}</div>
            <div className="mt-1 text-[12px] text-[#33536b]">{ENTETE.sousDevise}</div>
          </div>

          <img
            src={ENTETE.photo}
            alt="Une femme assise devant un lac au lever du jour, une tasse entre les mains"
            className="h-[120px] w-full rounded-[8px] object-cover object-center lg:h-[168px] lg:w-[300px] lg:rounded-none"
          />

          <p className="font-serif text-[20px] leading-[1.28] text-[#1d2f3d] lg:text-center lg:text-[24px]">
            {ENTETE.phrase.map(l => <span key={l} className="block">{l}</span>)}
          </p>

          <div className="lg:py-5 lg:text-right">
            <p className="font-serif text-[18px] leading-tight text-[#20394d]">
              {ENTETE.souffle.map(l => <span key={l} className="block">{l}</span>)}
            </p>
            <p className="mt-2 text-[11.5px] leading-snug text-[#33536b]">{ENTETE.citation}</p>
            <p className="mt-1 text-[11.5px] text-[#33536b]">· {ENTETE.signature}</p>
          </div>
        </div>

        {/* ── Les cinq axes ── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[#e4e9ee] bg-[#fbfcfd] px-5 py-3 sm:grid-cols-3 lg:grid-cols-5">
          {AXES.map(a => (
            <div key={a.titre} className="flex items-center gap-2.5">
              <i className={`fa-solid ${a.icone} text-[17px] text-[#a98254]`} />
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-[0.1em] text-[#20394d]">{a.titre}</div>
                <div className="truncate text-[10.5px] text-[#5d7185]">{a.sousTitre}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Vue d'ensemble : le titre, la période, et les deux barres ── */}
        <div className="px-3 pt-3">
          <div className="rounded-[8px] px-4 py-3" style={{ backgroundColor: ENCRE }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-serif text-[14px] font-semibold uppercase tracking-[0.14em] text-white">{VUE_ENSEMBLE.titre}</h2>
              <span className="rounded-[4px] bg-white/10 px-2 py-[3px] text-[10px] font-medium tracking-[0.06em] text-white/85">{VUE_ENSEMBLE.periode}</span>
              <span className="rounded-[4px] bg-[#ab805e] px-2.5 py-[3px] text-[10px] font-semibold tracking-[0.1em] text-white">{VUE_ENSEMBLE.apres} ›</span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
              <Barre label="Fait" part={chiffres.faits} tout={chiffres.total} couleur="#4fae7c" epaisse suffixe={`sur ${chiffres.total}`} />
              <Barre label="Impact vérifié" part={chiffres.verifies} tout={chiffres.faits} couleur="#c79a5a" suffixe={`sur ${chiffres.faits} fait${chiffres.faits > 1 ? 's' : ''}`} />
            </div>
          </div>
        </div>

        {/* ── Les cinq chantiers ── */}
        <div className="grid grid-cols-1 gap-3 px-3 py-3 md:grid-cols-2 lg:grid-cols-5 lg:gap-2">
          {CHANTIERS.map(c => {
            const faits = c.actions.filter(a => etat[a.id]?.fait).length;
            return (
              <section
                key={c.id}
                className="flex flex-col overflow-hidden rounded-[8px] border"
                style={{ borderColor: c.couleurs.bord, backgroundColor: c.couleurs.tete }}
              >
                <header className="px-3 pb-2.5 pt-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-serif text-[15px] font-semibold text-white"
                      style={{ backgroundColor: c.couleurs.pied }}
                    >
                      {c.numero}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-serif text-[13.5px] font-bold uppercase leading-[1.15] tracking-[0.02em]" style={{ color: c.couleurs.accent }}>{c.titre}</h3>
                      {c.sousTitre && <div className="mt-0.5 text-[11.5px] text-[#3f4a56]">{c.sousTitre}</div>}
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <i className={`fa-solid ${c.icone} shrink-0 text-[15px]`} style={{ color: c.couleurs.pied }} />
                    <p className="text-[11px] leading-snug" style={{ color: c.couleurs.accent }}>{c.devise}</p>
                  </div>
                </header>

                <div className="mx-2 rounded-[6px] px-2.5 py-2.5" style={{ backgroundColor: c.couleurs.carte }}>
                  <h4 className="text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: c.couleurs.accent }}>Objectifs</h4>
                  <ul className="mt-1.5 space-y-[3px]">
                    {c.objectifs.map(o => (
                      <li key={o} className="flex gap-1.5 text-[12px] leading-snug text-[#2b3340]">
                        <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: c.couleurs.pied }} />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="m-2 flex-1 rounded-[6px] px-2.5 py-2.5" style={{ backgroundColor: c.couleurs.carte }}>
                  <h4 className="text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: c.couleurs.accent }}>
                    Actions clés{c.mentionActions && <span className="ml-1 font-normal normal-case tracking-normal text-[#7b8593]">{c.mentionActions}</span>}
                  </h4>
                  <ul className="mt-2 space-y-2.5">
                    {c.actions.map(a => rendreItem(a, c.couleurs.pied))}
                  </ul>
                </div>

                <div
                  className="flex items-center justify-between gap-2 px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white"
                  style={{ backgroundColor: c.couleurs.pied }}
                >
                  <span className="min-w-0">{c.pied}</span>
                  <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-[1px] tabular-nums">{pourcent(faits, c.actions.length)} %</span>
                </div>
              </section>
            );
          })}
        </div>

        {/* ── Le calendrier de lancement ── */}
        <div className="px-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] px-4 py-2.5" style={{ backgroundColor: ENCRE }}>
            <h2 className="font-serif text-[13.5px] font-semibold uppercase tracking-[0.13em] text-white">{CALENDRIER.titre}</h2>
            <p className="text-[11px] text-white/70">{CALENDRIER.citation}</p>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:gap-1.5">
            {PHASES.map(p => (
              <section key={p.id} className="flex flex-col overflow-hidden rounded-[6px]" style={{ backgroundColor: p.couleurs.corps }}>
                <header
                  className="px-2.5 py-2"
                  style={{ backgroundColor: p.couleurs.tete, clipPath: CHEVRON }}
                >
                  <div className="text-[11.5px] font-bold tracking-[0.08em]" style={{ color: p.couleurs.texte }}>{p.titre}</div>
                  <div className="text-[11.5px] font-semibold" style={{ color: p.couleurs.texte }}>{p.dates}</div>
                  <div className="mt-0.5 text-[10.5px] font-semibold text-[#3f4a56]">{p.intention}</div>
                </header>
                <ul className="flex-1 space-y-2.5 px-2.5 py-2.5">
                  {p.puces.map(b => rendreItem(b, p.couleurs.texte, true))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* ── Équipe, tournée, parké ── */}
        <div className="grid grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-[1.05fr_1.1fr_0.75fr] lg:gap-2">
          <section className="overflow-hidden rounded-[8px] border border-[#e4e9ee]">
            <TitreBande>{EQUIPE_TITRE}</TitreBande>
            <div className="divide-y divide-[#eef1f4]">
              {EQUIPE.map(l => (
                <div key={l.nom} className="grid grid-cols-[104px_1fr] items-stretch">
                  <div className="flex items-center gap-1.5 px-2.5 py-2" style={{ backgroundColor: l.couleur }}>
                    <i className="fa-solid fa-user text-[11px] text-[#5d7185]" />
                    <span className="text-[10.5px] font-bold tracking-[0.06em] text-[#20394d]">{l.nom}</span>
                  </div>
                  <p className="bg-[#fafcfd] px-2.5 py-2 text-[11px] leading-snug text-[#2b3340]">{l.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[8px] border border-[#e4e9ee]">
            <TitreBande>{TOURNEE_TITRE}</TitreBande>
            <div className="bg-[#fafcfd] px-3 py-2.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                {TOURNEE_ZONES.map(z => (
                  <div key={z.nom}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]" aria-hidden>{z.drapeau}</span>
                      <span className="text-[10.5px] font-bold tracking-[0.06em] text-[#20394d]">{z.nom}</span>
                    </div>
                    <ul className="mt-1 space-y-[2px]">
                      {z.puces.map(t => (
                        <li key={t} className="flex gap-1.5 text-[11px] leading-snug text-[#2b3340]">
                          <span className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-[#7b8593]" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-[#eef1f4] pt-2.5">
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-1.5">
                  {TOURNEE_FRISE.map(e => rendreItem(e, '#a98254', true))}
                </ul>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[8px] border border-[#e4e9ee]">
            <TitreBande>
              {PARKE_TITRE.map(l => <span key={l} className="block leading-snug">{l}</span>)}
            </TitreBande>
            <ul className="space-y-2.5 bg-[#fafcfd] px-3 py-2.5">
              {PARKE.map(p => rendreItem(p, '#5d7185', true))}
            </ul>
          </section>
        </div>

        {/* ── Le pied de page du plan ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e4e9ee] px-5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[20px] font-light text-[#20394d]">{PIED_DE_PAGE.marque}</span>
            <span className="text-[11px] tracking-[0.14em] text-[#5d7185]">| {PIED_DE_PAGE.nom}</span>
          </div>
          <p className="font-serif text-[13px] text-[#2b3340]">{PIED_DE_PAGE.phrase}</p>
          <span className="text-[11px] tracking-[0.14em] text-[#5d7185]">{PIED_DE_PAGE.saison}</span>
        </div>
      </div>

      {/* ── D'où viennent les mesures proposées ── */}
      <details className="group rounded-[16px] border border-[#dfe5ea] bg-white/70 px-5 py-4 dark:border-white/10 dark:bg-[#293027]/55">
        <summary className="cursor-pointer list-none font-serif text-[15px] text-[#293027] marker:hidden dark:text-white">
          <i className="fa-solid fa-chevron-right mr-2 text-[11px] transition-transform duration-200 group-open:rotate-90" />
          D'où viennent ces mesures
        </summary>
        <p className="mt-3 text-[13px] leading-relaxed text-[#38403a]/75 dark:text-white/65">
          Chaque mesure proposée s'appuie sur un repère public, sauf celles qui portent le mot « proposition » : là, aucun
          chiffre de référence n'existe pour ce geste précis, et la mesure est un point de départ que vous ajustez avec vos
          propres résultats. Vous pouvez réécrire n'importe quelle mesure, et le bouton « Remettre la mesure proposée »
          ramène celle d'origine.
        </p>
        <ul className="mt-3 space-y-2">
          {SOURCES_MESURES.map(s => (
            <li key={s.url} className="text-[12.5px] leading-snug">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-[#8B4A2F] underline-offset-2 hover:underline dark:text-[#d9a05b]">{s.titre}</a>
              <span className="text-[#38403a]/60 dark:text-white/50"> · {s.organisme} · {s.note}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

export default PlanAutomneSection;
