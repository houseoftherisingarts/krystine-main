// Le Growth module, lu comme un parcours en cinq temps : où chercher, qui
// rejoindre, quoi proposer, comment le dire, quel registre. Puis on lance, et
// chaque recherche revient en fiche (src/pages/admin/sections/growth).
// Tout reste brouillon; rien ne part d'ici.
import React, { useEffect, useMemo, useState } from 'react';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Textarea, Label } from '../primitives';
import Spotlight, { type EtapeSpotlight } from '../../../components/admin/Spotlight';
import FicheResultat, { Puce, Titre, ETATS, quand, ecoule, dollars } from './growth/FicheResultat';
import {
  ESPACES, INTENTIONS, JALONS_PLAN, PLAFOND_JOUR, REGISTRES,
  getPresets, savePreset, deletePreset, getCatalogue, saveProduit, semerDepart, ecouterRuns, compterAujourdhui,
  lancerRecherche,
  type Espace, type Intention, type Preset, type PresetAudience, type PresetFormat, type ProduitCatalogue, type Registre, type GrowthRun,
} from '../../../firebase/growth';

const COLONNES: Record<ProduitCatalogue['colonne'], string> = { entree: 'Entrée gratuite', A: 'Cœur, colonne A (Krystine présente)', B: 'Cœur, colonne B (rapporte sans elle)', suite: 'Suite' };
const CLES_REGISTRES = Object.keys(REGISTRES) as Registre[];

// Les jalons vivent dans growth.ts et nomment leurs dates en français. Ces fins
// de phase servent seulement à savoir laquelle est en cours aujourd'hui.
const FINS_DE_PHASE = ['2026-09-27', '2026-10-11', '2026-10-25', '2026-11-08', '2026-11-22', '2026-11-27', '2026-12-01'];
const jalonEnCours = (): string => {
  const jour = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Toronto' }).format(new Date());
  const i = FINS_DE_PHASE.findIndex(f => jour <= f);
  return JALONS_PLAN[i < 0 ? FINS_DE_PHASE.length - 1 : i];
};

const CLE_VISITE = 'growth.spotlight.vu';
const CLE_REGISTRES = 'growth.registres';
const VISITE: EtapeSpotlight[] = [
  { cible: 'espaces', titre: 'Où chercher', texte: 'Le module travaille dans deux espaces séparés, la francophonie et l\'anglophonie, et chacun garde ses audiences, ses formats et son propre historique. Commencez par celui que vous visez aujourd\'hui, vous pourrez passer à l\'autre sans rien perdre.' },
  { cible: 'audiences', titre: 'Qui rejoindre', texte: 'Une audience décrit les femmes que vous voulez rejoindre : leur pays, leur âge, leurs affinités et les mots qu\'elles emploient. Choisissez celle qui colle à votre intention, ou modifiez-la pour l\'affiner. C\'est de là que la recherche part.' },
  { cible: 'produits', titre: 'Quoi proposer', texte: 'Cochez ce que la recherche a le droit de proposer, de l\'extrait gratuit jusqu\'aux programmes et aux conférences. Le module relie ensuite chaque produit au segment qui lui convient, et il ne parle jamais de ce qui reste décoché.' },
  { cible: 'formats', titre: 'Comment le dire', texte: 'Le format décide de la forme de l\'annonce, de sa durée et de son coût : un court vertical, une annonce avant une vidéo, ou une vignette dans le fil. Les chiffres affichés sont indicatifs pour 2026 et servent à comparer, pas à engager une dépense.' },
  { cible: 'registres', titre: 'Quel registre', texte: 'Une audience fidèle se construit avec quatre registres : ce qu\'elle apprend, ce qui l\'inspire, ce que vous racontez de votre parcours, et la preuve que ça fonctionne. Gardez les quatre cochés, et nommez celui qui mène ce cycle-ci.' },
  { cible: 'lancer', titre: 'Lancer la recherche', texte: 'Dites ce que vous voulez obtenir, puis lancez. La recherche tourne une à trois minutes dans le Cloud et vous pouvez quitter la page, elle continue sans vous. Rien ne part vers personne : tout revient en brouillon, à relire.' },
  { cible: 'historique', titre: 'Vos recherches', texte: 'Chaque recherche se range ici, la plus récente en haut, avec son intention, son audience, son coût et son état. Un clic ouvre sa fiche complète, et une recherche dont vous n\'avez plus besoin se retire depuis cette fiche.' },
  { cible: 'plan', titre: 'Le plan qui guide tout', texte: 'Cette ligne rappelle la phase du plan d\'automne en cours et le nombre de recherches déjà faites aujourd\'hui, sur vingt. Le module connaît ces jalons et s\'en sert pour relier ses idées d\'offres à ce qui s\'en vient vraiment.' },
];

const Aide: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm leading-relaxed text-[#38403a]/60 dark:text-white/50">{children}</p>
);

// Une étape du parcours : numérotée, dépliée une seule à la fois, et repliée
// elle ne montre plus que ce qui est choisi.
const Etape: React.FC<{
  n: number; titre: string; resume: string; spotlight: string;
  ouvert: boolean; onBasculer: () => void; children: React.ReactNode;
}> = ({ n, titre, resume, spotlight, ouvert, onBasculer, children }) => (
  <div data-spotlight={spotlight}>
    <Card>
      <button type="button" onClick={onBasculer} aria-expanded={ouvert} className="flex w-full items-center gap-4 px-5 py-4 text-left md:px-6">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-lg ${ouvert ? 'bg-[#BA7B39]/20 text-[#8B4A2F] dark:text-[#d9a05b]' : 'bg-[#38403a]/8 text-[#38403a]/60 dark:bg-white/10 dark:text-white/60'}`}>{n}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg leading-snug text-[#293027] dark:text-white">{titre}</span>
          {!ouvert && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-[#38403a]/70 dark:text-white/60">{resume}</span>}
        </span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">{ouvert ? 'Replier' : 'Changer'}</span>
      </button>
      {ouvert && <div className="border-t border-[#38403a]/10 px-5 py-5 md:px-6 dark:border-white/10">{children}</div>}
    </Card>
  </div>
);

const lireRegistres = (): { choisis: Registre[]; dominant: Registre | null } => {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_REGISTRES) || 'null');
    if (v && Array.isArray(v.choisis)) {
      const choisis = v.choisis.filter((r: string) => CLES_REGISTRES.includes(r as Registre));
      if (choisis.length) return { choisis, dominant: CLES_REGISTRES.includes(v.dominant) ? v.dominant : null };
    }
  } catch { /* navigation privée */ }
  return { choisis: [...CLES_REGISTRES], dominant: null };
};

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
  const [etape, setEtape] = useState<1 | 2 | 3 | 4 | 5 | null>(1);
  const [edition, setEdition] = useState<Preset | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aujourdhui, setAujourdhui] = useState(0);
  const [visite, setVisite] = useState(false);
  const [registres, setRegistres] = useState<Registre[]>(() => lireRegistres().choisis);
  const [dominant, setDominant] = useState<Registre | null>(() => lireRegistres().dominant);
  const [, battement] = useState(0);

  // Le choix des registres se garde pour la fois suivante.
  useEffect(() => {
    try { localStorage.setItem(CLE_REGISTRES, JSON.stringify({ choisis: registres, dominant })); } catch { /* navigation privée */ }
  }, [registres, dominant]);

  const charger = async () => {
    setChargement(true);
    try {
      await semerDepart();
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

  // La visite : le bouton de la barre de section l'appelle, et elle se joue
  // d'elle-même à la toute première ouverture de Growth.
  useEffect(() => {
    const ouvrir = () => setVisite(true);
    window.addEventListener('growth:spotlight', ouvrir);
    return () => window.removeEventListener('growth:spotlight', ouvrir);
  }, []);
  useEffect(() => {
    try { if (!localStorage.getItem(CLE_VISITE)) { setVisite(true); localStorage.setItem(CLE_VISITE, '1'); } } catch { /* navigation privée */ }
  }, []);

  const audiences = useMemo(() => presets.filter((p): p is PresetAudience => p.type === 'audience'), [presets]);
  const formats = useMemo(() => presets.filter((p): p is PresetFormat => p.type === 'format'), [presets]);
  const runOuvert = runs.find(r => r.id === ouvert) || null;
  const enVol = runs.find(r => r.statut === 'en_attente' || r.statut === 'en_cours') || null;
  const audience = audiences.find(a => a.id === audienceId) || null;
  const format = formats.find(f => f.id === formatId) || null;

  // Le temps écoulé d'une recherche en vol s'affiche à la seconde.
  useEffect(() => {
    if (!enVol) return;
    const t = window.setInterval(() => battement(n => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [enVol?.id]);

  const manque = [
    !audienceId && 'une audience',
    !produitIds.length && 'au moins un produit',
    !formatId && 'un format',
    !registres.length && 'au moins un registre',
  ].filter(Boolean) as string[];
  const phraseManque = manque.length
    ? `Il manque ${manque.length > 1 ? `${manque.slice(0, -1).join(', ')} et ${manque[manque.length - 1]}` : manque[0]}.`
    : null;
  const plafondAtteint = aujourdhui >= PLAFOND_JOUR;

  const lancer = async () => {
    setMessage(null); setOccupe(true);
    try {
      await lancerRecherche({ espace, intention, audienceId, produitIds, formatId: formatId || null, registres, registreDominant: dominant });
      setAujourdhui(n => n + 1);
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

  const basculer = (n: 1 | 2 | 3 | 4 | 5) => setEtape(e => (e === n ? null : n));
  const resumeRegistres = `${registres.length} registre${registres.length > 1 ? 's' : ''}${dominant ? ` · dominant : ${REGISTRES[dominant].label.toLowerCase()}` : ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-[#293027] dark:text-white">Growth</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Trouvez les femmes à rejoindre, reliez vos produits à chacune, et repartez avec des brouillons prêts à relire. Rien ne part d’ici.
        </p>
      </div>

      {/* La ligne de contexte : ce qui reste aujourd'hui, et la phase du plan. */}
      <div data-spotlight="plan" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-[20px] border border-white/60 bg-white/55 px-5 py-3.5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          Aujourd’hui : {aujourdhui} recherche{aujourdhui > 1 ? 's' : ''} sur {PLAFOND_JOUR}
        </span>
        <span className="min-w-0 flex-1 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/60">{jalonEnCours()}</span>
      </div>

      {message && <p className="rounded-xl border border-[#BA7B39]/40 bg-[#BA7B39]/10 px-4 py-3 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">{message}</p>}

      {runOuvert ? (
        <FicheResultat run={runOuvert} onFermer={() => setOuvert(null)} onMessage={setMessage} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Le parcours, puis la carte qui lance. min-w-0 : sans lui, le résumé
              tronqué d'une étape impose sa largeur entière à la colonne. */}
          <div className="min-w-0 space-y-3">
            <Etape n={1} titre="Où chercher" spotlight="espaces" ouvert={etape === 1} onBasculer={() => basculer(1)}
              resume={`${ESPACES[espace].label} · ${ESPACES[espace].pays}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(ESPACES) as Espace[]).map(e => (
                  <button key={e} type="button"
                    onClick={() => { setEspace(e); setOuvert(null); setEdition(null); setEtape(2); }}
                    className={`rounded-2xl border p-4 text-left transition-colors ${espace === e ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/15 hover:border-[#BA7B39]/60 dark:border-white/10'}`}>
                    <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">{ESPACES[e].label}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/65">{ESPACES[e].pays}</span>
                  </button>
                ))}
              </div>
            </Etape>

            <Etape n={2} titre="Qui rejoindre" spotlight="audiences" ouvert={etape === 2} onBasculer={() => basculer(2)}
              resume={audience?.nom || 'Aucune audience choisie'}>
              <ul className="space-y-2">
                {chargement && !audiences.length && <li className="text-sm text-[#38403a]/60 dark:text-white/60">Chargement…</li>}
                {audiences.map(a => (
                  <li key={a.id} className={`rounded-2xl border p-4 ${audienceId === a.id ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="radio" name="audience" checked={audienceId === a.id} onChange={() => { setAudienceId(a.id!); setEtape(3); }} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#293027] dark:text-white">{a.nom}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/70">{a.description}</span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {[a.pays, a.ages, a.affinites].filter(Boolean).map(t => (
                            <span key={t} className="rounded-full bg-[#38403a]/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#38403a]/60 dark:bg-white/10 dark:text-white/55">{t}</span>
                          ))}
                        </span>
                      </span>
                    </label>
                    {/* « Modifier » sur sa propre ligne : à côté du texte, il
                        étranglait la colonne sur un téléphone. */}
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={() => setEdition(a)} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setEdition(nouveau('audience'))} className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/55 transition-colors hover:text-[#8B4A2F] dark:text-white/50">
                <i className="fa-solid fa-plus mr-2" aria-hidden="true" /> Nouvelle audience
              </button>
            </Etape>

            <Etape n={3} titre="Quoi proposer" spotlight="produits" ouvert={etape === 3} onBasculer={() => basculer(3)}
              resume={`${produitIds.length} produit${produitIds.length > 1 ? 's' : ''} sur ${catalogue.length}`}>
              <Aide>Cochez ce que la recherche a le droit de proposer. Un produit retiré du catalogue reste dans la liste, décoché et grisé, et les prix affichés sont ceux du site.</Aide>
              <div className="mt-4 space-y-4">
                {(['entree', 'A', 'B', 'suite'] as const).map(col => (
                  <div key={col}>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{COLONNES[col]}</div>
                    {catalogue.filter(p => p.colonne === col).map(p => (
                      <div key={p.id} className={`flex items-start gap-3 rounded-xl px-1 py-1.5 ${p.actif ? '' : 'opacity-50'}`}>
                        <input type="checkbox" disabled={!p.actif} checked={produitIds.includes(p.id)} onChange={e => setProduitIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(i => i !== p.id))} className="mt-1 accent-[#BA7B39]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#293027] dark:text-white">{p.nom}{p.prix != null && <span className="ml-2 text-xs text-[#38403a]/55 dark:text-white/50">{p.prix === 0 ? 'gratuit' : `${p.prix} $`}</span>}</div>
                          <div className="text-xs leading-relaxed text-[#38403a]/70 dark:text-white/60">{p.description}</div>
                        </div>
                        <button type="button" onClick={() => basculerProduit(p, !p.actif)} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">{p.actif ? 'Retirer' : 'Remettre'}</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <GhostButton type="button" className="mt-4" onClick={() => setEtape(4)}>Continuer</GhostButton>
            </Etape>

            <Etape n={4} titre="Comment le dire" spotlight="formats" ouvert={etape === 4} onBasculer={() => basculer(4)}
              resume={format?.nom || 'Aucun format choisi'}>
              <ul className="space-y-2">
                {formats.map(f => (
                  <li key={f.id} className={`rounded-2xl border p-4 ${formatId === f.id ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="radio" name="format" checked={formatId === f.id} onChange={() => { setFormatId(f.id!); setEtape(5); }} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#293027] dark:text-white">{f.nom} <span className="text-xs font-normal text-[#38403a]/55 dark:text-white/50">{f.duree}</span></span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/70">{f.description}</span>
                        <span className="mt-2 block text-[11px] text-[#38403a]/55 dark:text-white/50">{f.budgetJour} · {f.cout}</span>
                      </span>
                    </label>
                    <div className="mt-2 flex justify-end">
                      <button type="button" onClick={() => setEdition(f)} className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setEdition(nouveau('format'))} className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/55 transition-colors hover:text-[#8B4A2F] dark:text-white/50">
                <i className="fa-solid fa-plus mr-2" aria-hidden="true" /> Nouveau format
              </button>
            </Etape>

            <Etape n={5} titre="Quel registre" spotlight="registres" ouvert={etape === 5} onBasculer={() => basculer(5)}
              resume={resumeRegistres}>
              <Aide>Une audience fidèle se construit avec les quatre registres; n’en publier qu’un seul fait plafonner.</Aide>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {CLES_REGISTRES.map(k => (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${registres.includes(k) ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                    <input type="checkbox" checked={registres.includes(k)} className="mt-1 accent-[#BA7B39]"
                      onChange={e => {
                        setRegistres(l => e.target.checked ? [...CLES_REGISTRES.filter(x => l.includes(x) || x === k)] : l.filter(x => x !== k));
                        if (!e.target.checked && dominant === k) setDominant(null);
                      }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#293027] dark:text-white">{REGISTRES[k].label}</span>
                      <span className="block text-xs leading-relaxed text-[#38403a]/65 dark:text-white/60">{REGISTRES[k].definition}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">Registre dominant, celui qui mène ce cycle (facultatif)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDominant(null)}
                    className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${dominant === null ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/55'}`}>
                    Aucun
                  </button>
                  {registres.map(k => (
                    <button key={k} type="button" onClick={() => setDominant(k)}
                      className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${dominant === k ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/55'}`}>
                      {REGISTRES[k].label}
                    </button>
                  ))}
                </div>
              </div>
            </Etape>

            {/* Lancer */}
            <div data-spotlight="lancer" className="pt-3">
              <Card className="border-[#BA7B39]/40 p-5 md:p-6">
                <Titre>Lancer une recherche</Titre>
                <p className="mt-2 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/60">Ce que vous voulez obtenir en premier. Le résultat rend toujours chaque partie, en soignant celle que vous choisissez ici.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(Object.keys(INTENTIONS) as Intention[]).map(i => (
                    <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${intention === i ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#38403a]/10 dark:border-white/10'}`}>
                      <input type="radio" name="intention" checked={intention === i} onChange={() => setIntention(i)} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0"><span className="block text-sm font-medium text-[#293027] dark:text-white">{INTENTIONS[i].label}</span><span className="block text-xs leading-relaxed text-[#38403a]/65 dark:text-white/60">{INTENTIONS[i].aide}</span></span>
                    </label>
                  ))}
                </div>
                <div className="mt-5">
                  <PrimaryButton type="button" disabled={occupe || manque.length > 0 || plafondAtteint} onClick={lancer}>
                    {occupe ? 'Envoi…' : 'Lancer la recherche'}
                  </PrimaryButton>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">
                    {plafondAtteint
                      ? `Les ${PLAFOND_JOUR} recherches de la journée sont faites. La prochaine repart demain.`
                      : phraseManque || 'Une à trois minutes dans le Cloud. Coût estimé de 0,50 $ à 2,50 $, le chiffre exact s’affiche ensuite.'}
                  </p>
                </div>

                {enVol && (
                  <div className="mt-5 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/10 p-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {['Demande envoyée', 'Recherche en cours', 'Résultat prêt'].map((t, n) => {
                        const fait = enVol.statut === 'en_cours' ? n <= 1 : n === 0;
                        const actif = enVol.statut === 'en_cours' ? n === 1 : n === 0;
                        return (
                          <span key={t} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] ${fait ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#38403a]/40 dark:text-white/35'}`}>
                            <i className={`fa-solid ${actif ? 'fa-circle-notch fa-spin' : fait ? 'fa-circle-check' : 'fa-circle'} text-[10px]`} aria-hidden="true" />
                            {t}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#8B4A2F] dark:text-[#d9a05b]">
                      {enVol.progression || 'La recherche tourne dans le Cloud.'} {ecoule(enVol.creeLe)} écoulées. Cette page se met à jour d’elle-même, même si vous la quittez.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* L'historique, en colonne étroite. self-start : sans lui la colonne
              s'étire sur toute la rangée et le projecteur éclaire du vide. */}
          <div data-spotlight="historique" className="min-w-0 self-start">
            <Card className="p-5">
              <Titre>Vos recherches · {ESPACES[espace].label}</Titre>
              {!runs.length ? (
                <div className="mt-2"><EmptyState icon="fa-rocket">Aucune recherche encore. Commencez par l’étape 1.</EmptyState></div>
              ) : (
                <ul className="mt-2 divide-y divide-[#38403a]/10 dark:divide-white/10">
                  {runs.map(r => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setOuvert(r.id)} className="w-full py-3 text-left transition-opacity hover:opacity-70">
                        <div className="flex items-center gap-2">
                          <Puce className={ETATS[r.statut].classe}>{ETATS[r.statut].label}</Puce>
                          <span className="truncate text-[11px] text-[#38403a]/55 dark:text-white/50">{quand(r.creeLe)}</span>
                        </div>
                        <div className="mt-1.5 text-sm font-medium leading-snug text-[#293027] dark:text-white">{INTENTIONS[r.intention]?.label || r.intention}</div>
                        <div className="text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">
                          {r.audience?.nom}{r.cout ? ` · ${dollars(r.cout.dollars)}` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Fiche d'édition d'un preset */}
      {edition && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2a2015]/50 p-4 backdrop-blur-sm" onClick={() => setEdition(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] bg-[#f6f3ee] p-6 shadow-2xl dark:bg-[#1f2a25]" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif text-xl text-[#293027] dark:text-white">{edition.type === 'audience' ? 'Audience' : 'Format publicitaire'}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">{edition.type === 'audience' ? 'Démographie, affinités, contextes et mots du quotidien. Jamais un symptôme ni un état de santé comme critère : Google le refuse.' : 'Le format tel que Google Ads le nomme, sa durée, son budget d’essai et l’accroche qui lui convient.'}</p>
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

      {visite && <Spotlight etapes={VISITE} onFermer={() => setVisite(false)} />}
    </div>
  );
};

export default GrowthSection;
