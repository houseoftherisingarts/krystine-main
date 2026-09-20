// Le Growth module : deux espaces (Francophonie, Anglophonie), trois tiroirs de
// presets (audiences, produits et offres, formats), un bouton Lancer, et les
// résultats de chaque recherche (segments, associations, pitchs, offres,
// campagne YouTube, sources). Tout est brouillon; rien ne part d'ici.
import React, { useEffect, useMemo, useState } from 'react';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Textarea, Label } from '../primitives';
import {
  ESPACES, INTENTIONS, JALONS_PLAN, PLAFOND_JOUR,
  getPresets, savePreset, deletePreset, getCatalogue, saveProduit, semerDepart, ecouterRuns, supprimerRun, compterAujourdhui,
  lancerRecherche, envoyerVersGabarit,
  type Espace, type Intention, type Preset, type PresetAudience, type PresetFormat, type ProduitCatalogue, type GrowthRun, type Pitch,
} from '../../../firebase/growth';

const TZ = 'America/Toronto';
const quand = (t?: { toDate: () => Date } | null) => t ? new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(t.toDate()) : '';
const COLONNES: Record<ProduitCatalogue['colonne'], string> = { entree: 'Entrée gratuite', A: 'Cœur, colonne A (Krystine présente)', B: 'Cœur, colonne B (rapporte sans elle)', suite: 'Suite' };
const ETATS: Record<GrowthRun['statut'], { label: string; classe: string }> = {
  en_attente: { label: 'En file', classe: 'bg-[#38403a]/10 text-[#38403a]/80 dark:bg-white/10 dark:text-white/70' },
  en_cours: { label: 'En cours', classe: 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' },
  termine: { label: 'Terminé', classe: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  erreur: { label: 'Erreur', classe: 'bg-red-600/10 text-red-800 dark:text-red-300' },
};

const Puce: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>{children}</span>
);
const Titre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{children}</h3>
);

const GrowthSection: React.FC = () => {
  const [espace, setEspace] = useState<Espace>('fr');
  const [presets, setPresets] = useState<Preset[]>([]);
  const [catalogue, setCatalogue] = useState<ProduitCatalogue[]>([]);
  const [runs, setRuns] = useState<GrowthRun[]>([]);
  const [chargement, setChargement] = useState(true);
  const [audienceId, setAudienceId] = useState<string>('');
  const [formatId, setFormatId] = useState<string>('');
  const [produitIds, setProduitIds] = useState<string[]>([]);
  const [intention, setIntention] = useState<Intention>('segments');
  const [tiroir, setTiroir] = useState<'audiences' | 'produits' | 'formats' | null>('audiences');
  const [edition, setEdition] = useState<Preset | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aujourdhui, setAujourdhui] = useState(0);

  const charger = async () => {
    setChargement(true);
    try {
      const seme = await semerDepart();
      if (seme.presets || seme.produits) setMessage('Les presets et le catalogue de départ viennent d\'être posés.');
      const [p, c, n] = await Promise.all([getPresets(espace), getCatalogue(), compterAujourdhui()]);
      setPresets(p); setCatalogue(c); setAujourdhui(n);
      const a = p.find(x => x.type === 'audience'); if (a?.id && !p.some(x => x.id === audienceId)) setAudienceId(a.id);
      const f = p.find(x => x.type === 'format'); if (f?.id && !p.some(x => x.id === formatId)) setFormatId(f.id);
      if (!produitIds.length) setProduitIds(c.filter(x => x.actif && x.colonne !== 'suite').map(x => x.id));
    } catch (e: any) { setMessage(/permission/i.test(String(e?.message)) ? 'Les règles du module ne sont pas encore en ligne : la prochaine publication du site les pose, puis cette page se remplit d\'elle-même.' : (e?.message || 'Le chargement a échoué.')); }
    finally { setChargement(false); }
  };
  useEffect(() => { charger(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [espace]);
  useEffect(() => ecouterRuns(espace, setRuns), [espace]);

  const audiences = useMemo(() => presets.filter((p): p is PresetAudience => p.type === 'audience'), [presets]);
  const formats = useMemo(() => presets.filter((p): p is PresetFormat => p.type === 'format'), [presets]);
  const runOuvert = runs.find(r => r.id === ouvert) || null;

  const lancer = async () => {
    setMessage(null); setOccupe(true);
    try {
      const id = await lancerRecherche({ espace, intention, audienceId, produitIds, formatId: formatId || null });
      setOuvert(id); setAujourdhui(n => n + 1);
    } catch (e: any) { setMessage(e?.message || 'La recherche n\'a pas pu partir.'); }
    finally { setOccupe(false); }
  };

  const enregistrerPreset = async () => {
    if (!edition) return;
    setOccupe(true);
    try { await savePreset(edition); setEdition(null); await charger(); }
    catch (e: any) { setMessage(e?.message || 'Enregistrement refusé.'); }
    finally { setOccupe(false); }
  };

  const basculerProduit = async (p: ProduitCatalogue, actif: boolean) => {
    setCatalogue(c => c.map(x => x.id === p.id ? { ...x, actif } : x));
    if (!actif) setProduitIds(ids => ids.filter(i => i !== p.id));
    try { await saveProduit({ ...p, actif }); } catch (e: any) { setMessage(e?.message || 'Le catalogue n\'a pas été enregistré.'); }
  };

  const nouveau = (type: 'audience' | 'format'): Preset => type === 'audience'
    ? { espace, type, nom: '', description: '', pays: '', ages: '45 à 64 ans, femmes', affinites: '', contextes: '', motsCles: '' }
    : { espace, type, nom: '', description: '', duree: '', budgetJour: '', cout: '', accroche: '' };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-[#293027] dark:text-white">Growth</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Cherchez les femmes à rejoindre, en francophonie et en anglophonie, reliez vos produits à chaque segment, et recevez des brouillons de pitch, des idées d’offres et une campagne YouTube prête à poser. Tout reste brouillon : rien ne part d’ici.
        </p>
      </div>

      {/* Bandeau du plan : la raison d'être de chaque recherche */}
      <div className="rounded-[20px] bg-[#BA7B39] px-6 py-6 text-[#1a1410] md:px-10 md:py-8">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <div className="font-serif text-5xl leading-none md:text-6xl">{aujourdhui}<span className="text-2xl opacity-60"> / {PLAFOND_JOUR}</span></div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">recherches aujourd’hui</div>
          </div>
          <div className="max-w-2xl text-sm leading-relaxed opacity-85">
            <p className="font-serif text-lg leading-snug">KSL Automne 2026 · Focus. Impact. Liberté.</p>
            <p className="mt-1">Chaque recherche sert la phase 4 du lancement de l’Expérience Origine 2 (découverte et acquisition, du 26 octobre au 8 novembre), la tournée de conférences et, pour l’anglophonie, le livre anglais de 2027.</p>
          </div>
        </div>
      </div>

      {/* Espaces */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(ESPACES) as Espace[]).map(e => (
          <button key={e} type="button" onClick={() => { setEspace(e); setOuvert(null); setEdition(null); }}
            className={`rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${espace === e ? 'border-[#BA7B39] bg-[#BA7B39] text-[#1a1410]' : 'border-[#38403a]/20 text-[#38403a]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'}`}>
            {ESPACES[e].label} <span className="ml-2 normal-case tracking-normal opacity-60">{ESPACES[e].pays}</span>
          </button>
        ))}
      </div>

      {message && <p className="rounded-xl border border-[#BA7B39]/40 bg-[#BA7B39]/10 px-4 py-3 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">{message}</p>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* Colonne gauche : presets + lancer */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <Titre>Audiences</Titre>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => setEdition(nouveau('audience'))}>Nouvelle audience</GhostButton>
                <GhostButton type="button" onClick={() => setTiroir(tiroir === 'audiences' ? null : 'audiences')}>{tiroir === 'audiences' ? 'Replier' : 'Ouvrir'}</GhostButton>
              </div>
            </div>
            {tiroir === 'audiences' && (
              <ul className="mt-4 space-y-2">
                {chargement && !audiences.length && <li className="text-sm text-[#38403a]/60 dark:text-white/60">Chargement…</li>}
                {audiences.map(a => (
                  <li key={a.id} className={`rounded-2xl border p-4 ${audienceId === a.id ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="radio" name="audience" checked={audienceId === a.id} onChange={() => setAudienceId(a.id!)} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#293027] dark:text-white">{a.nom}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/70">{a.description}</span>
                        <span className="mt-2 block text-[11px] text-[#38403a]/55 dark:text-white/50">{a.pays} · {a.ages}{a.affinites ? ` · ${a.affinites}` : ''}</span>
                      </span>
                      <button type="button" onClick={() => setEdition(a)} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <Titre>Produits et offres</Titre>
              <GhostButton type="button" onClick={() => setTiroir(tiroir === 'produits' ? null : 'produits')}>{tiroir === 'produits' ? 'Replier' : 'Ouvrir'}</GhostButton>
            </div>
            <p className="mt-1 text-xs text-[#38403a]/60 dark:text-white/55">Cochez ce qui entre dans la recherche. Un produit retiré du catalogue reste dans la liste, décoché et grisé. Les prix affichés sont ceux du site; les autres restent vides.</p>
            {tiroir === 'produits' && (
              <ul className="mt-4 space-y-2">
                {(['entree', 'A', 'B', 'suite'] as const).map(col => (
                  <li key={col}>
                    <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{COLONNES[col]}</div>
                    {catalogue.filter(p => p.colonne === col).map(p => (
                      <div key={p.id} className={`flex items-start gap-3 rounded-xl px-3 py-2 ${p.actif ? '' : 'opacity-50'}`}>
                        <input type="checkbox" disabled={!p.actif} checked={produitIds.includes(p.id)} onChange={e => setProduitIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(i => i !== p.id))} className="mt-1 accent-[#BA7B39]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#293027] dark:text-white">{p.nom}{p.prix != null && <span className="ml-2 text-xs text-[#38403a]/55 dark:text-white/50">{p.prix === 0 ? 'gratuit' : `${p.prix} $`}</span>}</div>
                          <div className="text-xs leading-relaxed text-[#38403a]/70 dark:text-white/60">{p.description}</div>
                        </div>
                        <button type="button" onClick={() => basculerProduit(p, !p.actif)} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">{p.actif ? 'Retirer' : 'Remettre'}</button>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <Titre>Formats publicitaires</Titre>
              <div className="flex gap-2">
                <GhostButton type="button" onClick={() => setEdition(nouveau('format'))}>Nouveau format</GhostButton>
                <GhostButton type="button" onClick={() => setTiroir(tiroir === 'formats' ? null : 'formats')}>{tiroir === 'formats' ? 'Replier' : 'Ouvrir'}</GhostButton>
              </div>
            </div>
            {tiroir === 'formats' && (
              <ul className="mt-4 space-y-2">
                {formats.map(f => (
                  <li key={f.id} className={`rounded-2xl border p-4 ${formatId === f.id ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="radio" name="format" checked={formatId === f.id} onChange={() => setFormatId(f.id!)} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#293027] dark:text-white">{f.nom} <span className="text-xs font-normal text-[#38403a]/55 dark:text-white/50">{f.duree}</span></span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/70">{f.description}</span>
                        <span className="mt-2 block text-[11px] text-[#38403a]/55 dark:text-white/50">{f.budgetJour} · {f.cout}</span>
                      </span>
                      <button type="button" onClick={() => setEdition(f)} className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border-[#BA7B39]/40">
            <Titre>Lancer une recherche</Titre>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(INTENTIONS) as Intention[]).map(i => (
                <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${intention === i ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                  <input type="radio" name="intention" checked={intention === i} onChange={() => setIntention(i)} className="mt-1 accent-[#BA7B39]" />
                  <span><span className="block text-sm font-medium text-[#293027] dark:text-white">{INTENTIONS[i].label}</span><span className="block text-xs text-[#38403a]/65 dark:text-white/60">{INTENTIONS[i].aide}</span></span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PrimaryButton type="button" disabled={occupe || !audienceId || !produitIds.length || aujourdhui >= PLAFOND_JOUR} onClick={lancer}>
                {occupe ? 'Envoi…' : 'Lancer la recherche'}
              </PrimaryButton>
              <span className="text-xs text-[#38403a]/60 dark:text-white/55">Une à trois minutes dans le Cloud. Coût estimé de 0,50 $ à 2,50 $ par recherche; le chiffre exact s’affiche ensuite. Le résultat rend chaque partie, en soignant d’abord l’intention choisie.</span>
            </div>
          </Card>
        </div>

        {/* Colonne droite : historique + résultat */}
        <div className="space-y-6">
          <Card>
            <Titre>Historique · {ESPACES[espace].label}</Titre>
            {!runs.length && <div className="mt-3"><EmptyState icon="fa-rocket">Aucune recherche encore dans cet espace. Choisissez une audience et des produits, puis lancez.</EmptyState></div>}
            <ul className="mt-3 divide-y divide-[#38403a]/10 dark:divide-white/10">
              {runs.map(r => (
                <li key={r.id} className={`flex cursor-pointer items-start gap-3 py-3 ${ouvert === r.id ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`} onClick={() => setOuvert(r.id)}>
                  <Puce className={ETATS[r.statut].classe}>{ETATS[r.statut].label}</Puce>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#293027] dark:text-white">{INTENTIONS[r.intention]?.label || r.intention} · {r.audience?.nom}</div>
                    <div className="text-xs text-[#38403a]/60 dark:text-white/55">{quand(r.creeLe)}{r.cout ? ` · ${r.cout.dollars.toFixed(2)} $ (estimation)` : ''}{r.statut !== 'termine' && r.progression ? ` · ${r.progression}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {runOuvert && <Resultat run={runOuvert} onFermer={() => setOuvert(null)} onMessage={setMessage} />}
        </div>
      </div>

      {/* Fiche d'édition d'un preset */}
      {edition && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2a2015]/50 p-4 backdrop-blur-sm" onClick={() => setEdition(null)}>
          <div className="w-full max-w-lg rounded-[20px] bg-[#f6f3ee] p-6 shadow-2xl dark:bg-[#1f2a25]" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-xl text-[#293027] dark:text-white">{edition.type === 'audience' ? 'Audience' : 'Format publicitaire'}</h3>
            <p className="mt-1 text-xs text-[#38403a]/60 dark:text-white/55">{edition.type === 'audience' ? 'Démographie, affinités, contextes et mots du quotidien. Jamais un symptôme ni un état de santé comme critère : Google le refuse.' : 'Le format tel que Google Ads le nomme, sa durée, son budget d’essai et l’accroche qui lui convient.'}</p>
            <div className="mt-4 space-y-3">
              <div><Label>Nom</Label><Input value={edition.nom} onChange={e => setEdition({ ...edition, nom: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={edition.description} onChange={e => setEdition({ ...edition, description: e.target.value })} /></div>
              {edition.type === 'audience' ? (
                <>
                  <div><Label>Pays et langue</Label><Input value={edition.pays} onChange={e => setEdition({ ...edition, pays: e.target.value })} /></div>
                  <div><Label>Âges et genre</Label><Input value={edition.ages} onChange={e => setEdition({ ...edition, ages: e.target.value })} /></div>
                  <div><Label>Affinités et intentions d’achat</Label><Input value={edition.affinites} onChange={e => setEdition({ ...edition, affinites: e.target.value })} /></div>
                  <div><Label>Contextes (chaînes, thèmes)</Label><Input value={edition.contextes} onChange={e => setEdition({ ...edition, contextes: e.target.value })} /></div>
                  <div><Label>Mots du quotidien</Label><Input value={edition.motsCles} onChange={e => setEdition({ ...edition, motsCles: e.target.value })} /></div>
                </>
              ) : (
                <>
                  <div><Label>Durée</Label><Input value={edition.duree} onChange={e => setEdition({ ...edition, duree: e.target.value })} /></div>
                  <div><Label>Budget d’essai par jour</Label><Input value={edition.budgetJour} onChange={e => setEdition({ ...edition, budgetJour: e.target.value })} /></div>
                  <div><Label>Coût indicatif</Label><Input value={edition.cout} onChange={e => setEdition({ ...edition, cout: e.target.value })} /></div>
                  <div><Label>Structure d’accroche</Label><Textarea rows={2} value={edition.accroche} onChange={e => setEdition({ ...edition, accroche: e.target.value })} /></div>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              {edition.id && <DangerButton type="button" onClick={async () => { await deletePreset(edition.id!); setEdition(null); charger(); }}>Retirer</DangerButton>}
              <GhostButton type="button" onClick={() => setEdition(null)}>Annuler</GhostButton>
              <PrimaryButton type="button" disabled={occupe || !edition.nom.trim()} onClick={enregistrerPreset}>Enregistrer</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <details className="text-sm text-[#38403a]/70 dark:text-white/60">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">Les jalons du plan que le module connaît</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{JALONS_PLAN.map(j => <li key={j}>{j}</li>)}</ul>
      </details>
    </div>
  );
};

// ─── Le résultat d'une recherche ─────────────────────────────────────────────
const Resultat: React.FC<{ run: GrowthRun; onFermer: () => void; onMessage: (m: string | null) => void }> = ({ run, onFermer, onMessage }) => {
  const [occupe, setOccupe] = useState<number | null>(null);
  const [copie, setCopie] = useState<number | null>(null);
  const r = run.resultat;

  const copier = async (p: Pitch, i: number) => {
    try { await navigator.clipboard.writeText(`${p.titre}\n\n${p.texte}`); setCopie(i); window.setTimeout(() => setCopie(null), 1500); } catch { /* refusé par le navigateur */ }
  };
  const gabarit = async (i: number) => {
    setOccupe(i); onMessage(null);
    try { await envoyerVersGabarit(run.id, i); onMessage('Le pitch est déposé dans Infolettre › Gabarits, catégorie Growth. Rien n’est envoyé.'); }
    catch (e: any) { onMessage(e?.message || 'Le dépôt a échoué.'); }
    finally { setOccupe(null); }
  };

  return (
    <Card className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Titre>Résultat</Titre>
          <h2 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">{INTENTIONS[run.intention]?.label} · {run.audience?.nom}</h2>
          <p className="text-xs text-[#38403a]/60 dark:text-white/55">
            {quand(run.creeLe)} · {ESPACES[run.espace].label} · {run.produits?.length || 0} produit{(run.produits?.length || 0) > 1 ? 's' : ''}
            {run.cout ? ` · ${run.cout.dollars.toFixed(2)} $ (estimation, ${run.cout.entree + run.cout.sortie} jetons, ${run.cout.recherches} recherches web, ${run.cout.modele})` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <GhostButton type="button" onClick={onFermer}>Fermer</GhostButton>
          {run.statut !== 'en_cours' && <DangerButton type="button" onClick={async () => { await supprimerRun(run.id); onFermer(); }}>Supprimer</DangerButton>}
        </div>
      </div>

      {run.statut === 'en_attente' || run.statut === 'en_cours' ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/10 p-4 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">
          <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
          <span>{run.progression || 'La recherche tourne dans le Cloud.'} Cette page se met à jour d’elle-même.</span>
        </div>
      ) : null}
      {run.statut === 'erreur' && <p className="rounded-2xl border border-red-600/30 bg-red-600/10 p-4 text-sm text-red-800 dark:text-red-300">{run.erreur || 'La recherche a échoué.'}</p>}

      {r && (
        <>
          {r.avertissements?.length ? (
            <ul className="space-y-1 rounded-2xl border border-[#BA7B39]/40 bg-[#BA7B39]/10 p-4 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">{r.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul>
          ) : null}

          <section>
            <Titre>Segments</Titre>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {r.segments.map((s, i) => (
                <article key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <h4 className="font-serif text-lg text-[#293027] dark:text-white">{s.nom}</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#38403a]/80 dark:text-white/75">{s.portrait}</p>
                  <dl className="mt-3 space-y-1 text-xs text-[#38403a]/70 dark:text-white/60">
                    <div><dt className="inline font-bold">Déjà essayé : </dt><dd className="inline">{s.dejaEssaye}</dd></div>
                    <div><dt className="inline font-bold">Ce qui la fait dire oui : </dt><dd className="inline">{s.ceQuiFaitDireOui}</dd></div>
                    <div><dt className="inline font-bold">Taille : </dt><dd className="inline">{s.taille}</dd></div>
                    <div><dt className="inline font-bold">Affinité : </dt><dd className="inline">{s.affinite}</dd></div>
                  </dl>
                  {s.motsTapes?.length ? <div className="mt-3 flex flex-wrap gap-1">{s.motsTapes.map(m => <span key={m} className="rounded-full bg-[#BA7B39]/15 px-2 py-0.5 text-[11px] text-[#8B4A2F] dark:text-[#d9a05b]">{m}</span>)}</div> : null}
                </article>
              ))}
            </div>
          </section>

          {r.associations?.length ? (
            <section>
              <Titre>Produits et segments</Titre>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="text-[10px] uppercase tracking-[0.18em] text-[#38403a]/50 dark:text-white/40"><th className="py-2 pr-3">Segment</th><th className="py-2 pr-3">Entrée</th><th className="py-2 pr-3">Cœur</th><th className="py-2 pr-3">Suite</th><th className="py-2">Pourquoi</th></tr></thead>
                  <tbody className="divide-y divide-[#38403a]/10 dark:divide-white/10">
                    {r.associations.map((a, i) => (
                      <tr key={i} className="align-top text-[#38403a]/85 dark:text-white/75"><td className="py-2 pr-3 font-medium">{a.segment}</td><td className="py-2 pr-3">{a.entree}</td><td className="py-2 pr-3">{a.coeur}</td><td className="py-2 pr-3">{a.suite}</td><td className="py-2 text-xs">{a.raison}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {r.pitchs?.length ? (
            <section>
              <Titre>Brouillons de pitch</Titre>
              <div className="mt-3 space-y-3">
                {r.pitchs.map((p, i) => (
                  <article key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{p.segment}</div>
                    <h4 className="mt-1 font-serif text-lg text-[#293027] dark:text-white">{p.titre}</h4>
                    <ul className="mt-2 space-y-1 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">{p.accroches.map((a, j) => <li key={j}>« {a} »</li>)}</ul>
                    <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#38403a]/85 dark:text-white/75">{p.texte}</div>
                    {p.script15s && <p className="mt-3 rounded-xl bg-[#1a1410] p-3 text-xs leading-relaxed text-[#EEE7DB]"><span className="font-bold uppercase tracking-[0.18em] opacity-70">Script 15 s · </span>{p.script15s}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PrimaryButton type="button" disabled={occupe === i} onClick={() => gabarit(i)}>{occupe === i ? 'Dépôt…' : 'Envoyer vers les gabarits'}</PrimaryButton>
                      <GhostButton type="button" onClick={() => copier(p, i)}>{copie === i ? 'Copié' : 'Copier'}</GhostButton>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {r.offres?.length ? (
            <section>
              <Titre>Idées d’offres</Titre>
              {[...new Set(r.offres.map(o => o.marche))].map(m => (
                <div key={m} className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{m}</div>
                  <ul className="mt-1 space-y-2">
                    {r.offres.filter(o => o.marche === m).map((o, i) => (
                      <li key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-[#293027] dark:text-white">{o.nom}</span><Puce className={o.colonne === 'A' ? 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300'}>Colonne {o.colonne}</Puce></div>
                        <p className="mt-1 leading-relaxed text-[#38403a]/80 dark:text-white/75">{o.description}</p>
                        <p className="mt-2 text-xs text-[#38403a]/65 dark:text-white/55"><b>Prix observés :</b> {o.prixObserves}</p>
                        <p className="text-xs text-[#38403a]/65 dark:text-white/55"><b>Jalon du plan :</b> {o.jalon}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          {r.campagne ? (
            <section>
              <Titre>Campagne YouTube prête à poser</Titre>
              <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-[#38403a]/85 dark:text-white/75">
                <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Audiences</b><ul className="mt-1 list-disc pl-5">{r.campagne.audiences.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
                <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Formats et budget</b><ul className="mt-1 list-disc pl-5">{r.campagne.formats.map((a, i) => <li key={i}>{a}</li>)}</ul><p className="mt-2 text-xs">{r.campagne.budgetIndicatif}</p></div>
                <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>Accroches</b><ul className="mt-1 space-y-1">{r.campagne.accroches.map((a, i) => <li key={i}>« {a} »</li>)}</ul></div>
                <div className="rounded-2xl border border-[#38403a]/10 p-4 dark:border-white/10"><b>À ne pas écrire</b><ul className="mt-1 list-disc pl-5 text-xs">{r.campagne.interdits.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
              </div>
              <div className="mt-3 space-y-2">
                {r.campagne.scripts.map((s, i) => <p key={i} className="rounded-xl bg-[#1a1410] p-3 text-xs leading-relaxed text-[#EEE7DB]"><span className="font-bold uppercase tracking-[0.18em] opacity-70">{s.duree} · </span>{s.texte}</p>)}
              </div>
              {r.campagne.modeEmploi?.length ? <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#38403a]/80 dark:text-white/75">{r.campagne.modeEmploi.map((l, i) => <li key={i}>{l}</li>)}</ol> : null}
            </section>
          ) : null}

          {r.sources?.length ? (
            <section>
              <Titre>Sources</Titre>
              <ul className="mt-2 space-y-1 text-xs">
                {r.sources.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#8B4A2F] underline-offset-2 hover:underline dark:text-[#d9a05b]">{s.titre || s.url}</a>{s.note ? <span className="text-[#38403a]/55 dark:text-white/45"> · {s.note}</span> : null}</li>)}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </Card>
  );
};

export default GrowthSection;
