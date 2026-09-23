// Le plan du mois (22 septembre au 22 octobre 2026) : trois chantiers dictés
// par Alex, découpés en étapes qui se cochent, avec qui fait quoi, la date du
// geste et une note. Les textes viennent de src/lib/planMois.ts, l'état de
// Firestore (planAutomne/mois-2026-10). Le deuxième chantier porte les trois
// boutons de dépôt des livres en PDF. Le plan garde ses couleurs en clair
// comme en sombre : c'est un document, pas une page de l'admin.
import React, { useEffect, useMemo, useState } from 'react';
import EtapeCochable from './plan-mois/EtapeCochable';
import LivresSources from './plan-mois/LivresSources';
import { CHANTIERS, ENTETE, PIED_DE_PAGE, TOUTES_LES_ETAPES, type ChantierMois } from '../../../lib/planMois';
import {
  cocherEtape, ecouterPlanMois, noterEtape, type EtapePlanMois, type EtatPlanMois,
} from '../../../firebase/planMois';

const ENCRE = '#1c1712';
const BRUN = '#34241a';

const pourcent = (part: number, tout: number): number => (tout === 0 ? 0 : Math.round((part / tout) * 100));

const Barre: React.FC<{ label: string; part: number; tout: number; couleur: string; epaisse?: boolean }> = ({ label, part, tout, couleur, epaisse }) => (
  <div className="min-w-0 flex-1">
    <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
      <span className="text-[13px] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-white/75">{label}</span>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">
        {pourcent(part, tout)} % <span className="text-[13px] font-normal text-white/60">· {part} sur {tout}</span>
      </span>
    </div>
    <div className={`w-full overflow-hidden rounded-full bg-white/15 ${epaisse ? 'h-2' : 'h-[5px]'}`}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pourcent(part, tout)}%`, backgroundColor: couleur }} />
    </div>
  </div>
);

const PlanMoisSection: React.FC = () => {
  const [distant, setDistant] = useState<EtatPlanMois>({ items: {}, livres: {} });
  const [local, setLocal] = useState<Record<string, EtapePlanMois>>({});
  const [refus, setRefus] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);

  useEffect(() => ecouterPlanMois(setDistant, setRefus), []);

  const items = useMemo<Record<string, EtapePlanMois>>(() => {
    const fusion = { ...distant.items };
    for (const [id, morceau] of Object.entries(local)) fusion[id] = { ...(distant.items[id] ?? { fait: false }), ...morceau };
    return fusion;
  }, [distant, local]);

  // Chaque geste s'affiche tout de suite et part vers Firestore. Si les règles
  // ne sont pas encore en ligne, l'état reste à l'écran et le message le dit.
  const poser = (id: string, morceau: Partial<EtapePlanMois>) =>
    setLocal(l => ({ ...l, [id]: { ...(l[id] ?? { fait: false }), ...morceau } as EtapePlanMois }));

  const surErreur = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    setRefus(code === 'permission-denied'
      ? 'Les règles du plan ne sont pas encore en ligne : vos changements restent à l\'écran, ils seront enregistrés dès la publication.'
      : 'L\'enregistrement n\'a pas passé. Vos changements restent à l\'écran.');
  };

  const cocher = (id: string, fait: boolean) => { poser(id, { fait }); cocherEtape(id, fait).catch(surErreur); };
  const noter = (id: string, note: string) => { poser(id, { note }); noterEtape(id, note).catch(surErreur); };

  const faitsDe = (c: ChantierMois) => c.blocs.flatMap(b => b.etapes).filter(e => items[e.id]?.fait).length;
  const totalDe = (c: ChantierMois) => c.blocs.reduce((n, b) => n + b.etapes.length, 0);
  const faits = TOUTES_LES_ETAPES.filter(e => items[e.id]?.fait).length;

  return (
    <div className="space-y-4">
      {refus && (
        <div className="rounded-[12px] border border-[#e0c39c] bg-[#fdf6ec] px-4 py-3 text-sm leading-relaxed text-[#7a5a2e]">
          <i className="fa-solid fa-circle-info mr-2" />{refus}
        </div>
      )}
      {avis && (
        <div className="flex items-start justify-between gap-3 rounded-[12px] border border-[#eeb9c4] bg-[#fbe3e7] px-4 py-3 text-sm leading-relaxed text-[#9e3d57]">
          <span><i className="fa-solid fa-triangle-exclamation mr-2" />{avis}</span>
          <button type="button" onClick={() => setAvis(null)} className="shrink-0 text-[13px] font-bold uppercase tracking-widest">Fermer</button>
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-[#e6dfd2] bg-[#fdfbf7] shadow-[0_10px_30px_-18px_rgba(28,23,18,0.35)]">

        {/* ── L'en-tête : la marque, le titre, la période, l'intro ── */}
        <div className="grid grid-cols-1 gap-5 bg-[#f4efe6] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#9c7a44]">{ENTETE.marque}</div>
            <h1 className="mt-2 font-serif text-[40px] font-light leading-[0.98] text-[#1c1712] sm:text-[48px]">{ENTETE.titre}</h1>
            <div className="mt-3 text-[13px] tracking-[0.06em] text-[#3a2f23]">{ENTETE.periode}</div>
          </div>
          <p className="text-[14.5px] leading-[1.6] text-[#3a2f23]">{ENTETE.intro}</p>
        </div>

        {/* ── Vue d'ensemble : la barre du tout, et une barre par chantier ── */}
        <div className="px-3 pt-3">
          <div className="rounded-[10px] px-5 py-4" style={{ backgroundColor: ENCRE }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-serif text-[15px] font-semibold uppercase tracking-[0.14em] text-white">Vue d'ensemble</h2>
              <span className="rounded-[4px] bg-white/10 px-2 py-[3px] text-[13px] font-medium tracking-[0.04em] text-white/85">{TOUTES_LES_ETAPES.length} étapes</span>
            </div>
            <div className="mt-3"><Barre label="Fait" part={faits} tout={TOUTES_LES_ETAPES.length} couleur="#4fae7c" epaisse /></div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
              {CHANTIERS.map(c => <Barre key={c.id} label={`${c.numero} · ${c.titre}`} part={faitsDe(c)} tout={totalDe(c)} couleur={c.couleurs.accent} />)}
            </div>
          </div>
        </div>

        {/* ── Les trois chantiers, l'un sous l'autre ── */}
        <div className="space-y-3 px-3 py-3">
          {CHANTIERS.map(c => (
            <section key={c.id} className="overflow-hidden rounded-[10px] border" style={{ borderColor: c.couleurs.bord }}>
              <header className="flex flex-col gap-3 px-5 py-4 text-white sm:flex-row sm:items-start sm:gap-5" style={{ backgroundColor: c.couleurs.accent }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-serif text-[22px] font-semibold">{c.numero}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[24px] font-light leading-[1.1] sm:text-[28px]">{c.titre}</h3>
                  <p className="mt-1 text-[13px] text-white/85">{c.sousTitre}</p>
                  <p className="mt-2.5 max-w-3xl text-[13.5px] leading-[1.55] text-white/90">{c.devise}</p>
                </div>
                <i className={`fa-solid ${c.icone} hidden text-[26px] text-white/60 sm:block`} aria-hidden />
              </header>

              <div className="px-3 py-3" style={{ backgroundColor: c.couleurs.tint }}>
                <div className="rounded-[8px] bg-white/60 px-4 py-3">
                  <h4 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: c.couleurs.encre }}>Ce que le mois doit donner</h4>
                  <ul className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-3">
                    {c.objectifs.map(o => (
                      <li key={o} className="flex gap-2 text-[13px] leading-snug text-[#1c1712]">
                        <span className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full" style={{ backgroundColor: c.couleurs.accent }} />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {c.id === 'c2' && (
                  <div className="mt-3">
                    <LivresSources livres={distant.livres} accent={c.couleurs.accent} encre={c.couleurs.encre} onErreur={setAvis} />
                  </div>
                )}

                <div className="mt-3 gap-3 md:columns-2 xl:columns-3">
                  {c.blocs.map(b => {
                    const faitsBloc = b.etapes.filter(e => items[e.id]?.fait).length;
                    return (
                      <div key={b.lettre} className="mb-3 break-inside-avoid rounded-[8px] bg-white/70 px-4 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-serif text-[16px] text-[#1c1712]">
                            <span className="mr-2 font-semibold" style={{ color: c.couleurs.encre }}>{b.lettre}</span>{b.titre}
                          </h4>
                          <span className="shrink-0 text-[13px] tabular-nums text-[#7a7f76]">{faitsBloc}/{b.etapes.length}</span>
                        </div>
                        <ul className="mt-3 space-y-3">
                          {b.etapes.map(e => (
                            <EtapeCochable
                              key={e.id}
                              etape={e}
                              etat={items[e.id]}
                              accent={c.couleurs.accent}
                              encre={c.couleurs.encre}
                              lectureSeule={refus !== null}
                              onCocher={f => cocher(e.id, f)}
                              onNoter={n => noter(e.id, n)}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-start gap-1.5 px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-white sm:flex-row sm:items-center sm:justify-between sm:gap-2" style={{ backgroundColor: c.couleurs.accent }}>
                <span className="min-w-0 leading-[1.35]">Chantier {c.numero} · {c.titre}</span>
                <span className="shrink-0 rounded-full bg-white/20 px-2 py-[2px] tabular-nums">{faitsDe(c)} sur {totalDe(c)} · {pourcent(faitsDe(c), totalDe(c))} %</span>
              </div>
            </section>
          ))}
        </div>

        {/* ── Le pied du plan ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-white" style={{ backgroundColor: BRUN }}>
          <span className="font-serif text-[20px] font-light">{PIED_DE_PAGE.marque}</span>
          <p className="text-[13px] text-white/80">{PIED_DE_PAGE.phrase}</p>
          <span className="text-[13px] tracking-[0.1em] text-white/60">{PIED_DE_PAGE.periode}</span>
        </div>
      </div>
    </div>
  );
};

export default PlanMoisSection;
