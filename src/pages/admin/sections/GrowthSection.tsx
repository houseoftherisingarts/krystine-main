// Le Growth module, lu comme un parcours en quatre temps : où chercher, qui
// rejoindre, quoi proposer, comment le dire. Puis on lance, et chaque recherche
// revient en fiche (segments, associations, pitchs, offres, campagne, sources).
// Tout reste brouillon; rien ne part d'ici.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Input, Textarea, Label } from '../primitives';
import Spotlight, { type EtapeSpotlight } from '../../../components/admin/Spotlight';
import {
  ESPACES, INTENTIONS, JALONS_PLAN, PLAFOND_JOUR,
  getPresets, savePreset, deletePreset, getCatalogue, saveProduit, semerDepart, ecouterRuns, supprimerRun, compterAujourdhui,
  lancerRecherche, envoyerVersGabarit,
  type Espace, type Intention, type Preset, type PresetAudience, type PresetFormat, type ProduitCatalogue, type GrowthRun, type Pitch,
} from '../../../firebase/growth';

const TZ = 'America/Toronto';
const quand = (t?: { toDate: () => Date } | null) => t ? new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: TZ }).format(t.toDate()) : '';
const ecoule = (debut?: { toDate: () => Date } | null, fin?: { toDate: () => Date } | null) => {
  if (!debut) return '';
  const s = Math.max(0, Math.round(((fin ? fin.toDate() : new Date()).getTime() - debut.toDate().getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};
// Les chiffres se lisent en français : virgule décimale et espace pour les milliers.
const dollars = (n: number) => `${new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} $`;
const nombre = (n: number) => new Intl.NumberFormat('fr-CA').format(n);
const COLONNES: Record<ProduitCatalogue['colonne'], string> ={ entree: 'Entrée gratuite', A: 'Cœur, colonne A (Krystine présente)', B: 'Cœur, colonne B (rapporte sans elle)', suite: 'Suite' };
const ETATS: Record<GrowthRun['statut'], { label: string; classe: string }> = {
  en_attente: { label: 'En file', classe: 'bg-[#38403a]/10 text-[#38403a]/80 dark:bg-white/10 dark:text-white/70' },
  en_cours: { label: 'En cours', classe: 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' },
  termine: { label: 'Terminé', classe: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  erreur: { label: 'Erreur', classe: 'bg-red-600/10 text-red-800 dark:text-red-300' },
};

// Les jalons vivent dans growth.ts et nomment leurs dates en français. Ces fins
// de phase servent seulement à savoir laquelle est en cours aujourd'hui.
const FINS_DE_PHASE = ['2026-09-27', '2026-10-11', '2026-10-25', '2026-11-08', '2026-11-22', '2026-11-27', '2026-12-01'];
const jalonEnCours = (): string => {
  const jour = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(new Date());
  const i = FINS_DE_PHASE.findIndex(f => jour <= f);
  return JALONS_PLAN[i < 0 ? FINS_DE_PHASE.length - 1 : i];
};

const CLE_VISITE = 'growth.spotlight.vu';
const VISITE: EtapeSpotlight[] = [
  { cible: 'espaces', titre: 'Où chercher', texte: 'Le module travaille dans deux espaces séparés, la francophonie et l\'anglophonie, et chacun garde ses audiences, ses formats et son propre historique. Commencez par celui que vous visez aujourd\'hui, vous pourrez passer à l\'autre sans rien perdre.' },
  { cible: 'audiences', titre: 'Qui rejoindre', texte: 'Une audience décrit les femmes que vous voulez rejoindre : leur pays, leur âge, leurs affinités et les mots qu\'elles emploient. Choisissez celle qui colle à votre intention, ou modifiez-la pour l\'affiner. C\'est de là que la recherche part.' },
  { cible: 'produits', titre: 'Quoi proposer', texte: 'Cochez ce que la recherche a le droit de proposer, de l\'extrait gratuit jusqu\'aux programmes et aux conférences. Le module relie ensuite chaque produit au segment qui lui convient, et il ne parle jamais de ce qui reste décoché.' },
  { cible: 'formats', titre: 'Comment le dire', texte: 'Le format décide de la forme de l\'annonce, de sa durée et de son coût : un court vertical, une annonce avant une vidéo, ou une vignette dans le fil. Les chiffres affichés sont indicatifs pour 2026 et servent à comparer, pas à engager une dépense.' },
  { cible: 'lancer', titre: 'Lancer la recherche', texte: 'Dites ce que vous voulez obtenir, puis lancez. La recherche tourne une à trois minutes dans le Cloud et vous pouvez quitter la page, elle continue sans vous. Rien ne part vers personne : tout revient en brouillon, à relire.' },
  { cible: 'historique', titre: 'Vos recherches', texte: 'Chaque recherche se range ici, la plus récente en haut, avec son intention, son audience, son coût et son état. Un clic ouvre sa fiche complète, et une recherche dont vous n\'avez plus besoin se retire depuis cette fiche.' },
  { cible: 'plan', titre: 'Le plan qui guide tout', texte: 'Cette ligne rappelle la phase du plan d\'automne en cours et le nombre de recherches déjà faites aujourd\'hui, sur vingt. Le module connaît ces jalons et s\'en sert pour relier ses idées d\'offres à ce qui s\'en vient vraiment.' },
];

const SECTIONS_RESULTAT = [
  { cle: 'segments', titre: 'Segments', aide: 'Le portrait des groupes de femmes que la recherche a trouvés, avec leurs mots à elles et une estimation de leur taille.' },
  { cle: 'associations', titre: 'Produits et segments', aide: 'Quel produit parler à quel segment, de l\'entrée gratuite jusqu\'à la suite, avec la raison derrière chaque rapprochement.' },
  { cle: 'pitchs', titre: 'Pitchs', aide: 'Un brouillon par segment, dans votre voix, à relire avant tout envoi; un clic le dépose dans vos gabarits d\'infolettre.' },
  { cle: 'offres', titre: 'Offres', aide: 'Des pistes d\'offres classées selon qu\'elles demandent votre présence ou qu\'elles rapportent sans vous, chacune reliée à un jalon du plan.' },
  { cle: 'campagne', titre: 'Campagne YouTube', aide: 'De quoi poser une campagne dans Google Ads : audiences, formats, budget indicatif, accroches, scripts et ce qu\'il ne faut pas écrire.' },
  { cle: 'sources', titre: 'Sources', aide: 'Les pages que la recherche a lues pour arriver là, à ouvrir quand vous voulez vérifier un chiffre.' },
] as const;
type CleSection = typeof SECTIONS_RESULTAT[number]['cle'];
const SECTION_PAR_INTENTION: Record<Intention, CleSection> = { segments: 'segments', pitchs: 'pitchs', offres: 'offres', campagne: 'campagne' };

const Puce: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>{children}</span>
);
const Titre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{children}</h3>
);
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
  const [etape, setEtape] = useState<1 | 2 | 3 | 4 | null>(1);
  const [edition, setEdition] = useState<Preset | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aujourdhui, setAujourdhui] = useState(0);
  const [visite, setVisite] = useState(false);
  const [, battement] = useState(0);

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
  ].filter(Boolean) as string[];
  const phraseManque = manque.length
    ? `Il manque ${manque.length > 1 ? `${manque.slice(0, -1).join(', ')} et ${manque[manque.length - 1]}` : manque[0]}.`
    : null;
  const plafondAtteint = aujourdhui >= PLAFOND_JOUR;

  const lancer = async () => {
    setMessage(null); setOccupe(true);
    try {
      await lancerRecherche({ espace, intention, audienceId, produitIds, formatId: formatId || null });
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

  const basculer = (n: 1 | 2 | 3 | 4) => setEtape(e => (e === n ? null : n));

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
        <Resultat run={runOuvert} onFermer={() => setOuvert(null)} onMessage={setMessage} />
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
                      <button type="button" onClick={() => setEdition(a)} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </label>
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
                      <input type="radio" name="format" checked={formatId === f.id} onChange={() => { setFormatId(f.id!); setEtape(null); }} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-[#293027] dark:text-white">{f.nom} <span className="text-xs font-normal text-[#38403a]/55 dark:text-white/50">{f.duree}</span></span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#38403a]/75 dark:text-white/70">{f.description}</span>
                        <span className="mt-2 block text-[11px] text-[#38403a]/55 dark:text-white/50">{f.budgetJour} · {f.cout}</span>
                      </span>
                      <button type="button" onClick={() => setEdition(f)} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">Modifier</button>
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setEdition(nouveau('format'))} className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#38403a]/55 transition-colors hover:text-[#8B4A2F] dark:text-white/50">
                <i className="fa-solid fa-plus mr-2" aria-hidden="true" /> Nouveau format
              </button>
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

          {/* L'historique, en colonne étroite */}
          <div data-spotlight="historique" className="min-w-0">
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

// ─── La fiche d'une recherche ────────────────────────────────────────────────
const Resultat: React.FC<{ run: GrowthRun; onFermer: () => void; onMessage: (m: string | null) => void }> = ({ run, onFermer, onMessage }) => {
  const [occupe, setOccupe] = useState<number | null>(null);
  const [copie, setCopie] = useState<number | null>(null);
  const [deplie, setDeplie] = useState<CleSection | null>(SECTION_PAR_INTENTION[run.intention] || 'segments');
  const [confirme, setConfirme] = useState(false);
  const ancres = useRef<Partial<Record<CleSection, HTMLDivElement | null>>>({});
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
  const aller = (cle: CleSection) => {
    setDeplie(cle);
    window.setTimeout(() => ancres.current[cle]?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 40);
  };

  const compte: Record<CleSection, number> = {
    segments: r?.segments?.length || 0,
    associations: r?.associations?.length || 0,
    pitchs: r?.pitchs?.length || 0,
    offres: r?.offres?.length || 0,
    campagne: r?.campagne ? 1 : 0,
    sources: r?.sources?.length || 0,
  };

  const Section: React.FC<{ cle: CleSection; children: React.ReactNode }> = ({ cle, children }) => {
    const def = SECTIONS_RESULTAT.find(s => s.cle === cle)!;
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
          <h2 className="mt-1.5 font-serif text-2xl leading-snug text-[#293027] dark:text-white">{INTENTIONS[run.intention]?.label} · {run.audience?.nom}</h2>
        </div>
        <GhostButton type="button" onClick={onFermer}>Fermer</GhostButton>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-xs leading-relaxed sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Espace', ESPACES[run.espace].label],
          ['Format', run.format?.nom || 'Aucun'],
          ['Produits', `${run.produits?.length || 0} retenu${(run.produits?.length || 0) > 1 ? 's' : ''}`],
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

          {/* Le sommaire ancré */}
          <div className="-mx-5 mt-5 overflow-x-auto px-5 md:-mx-7 md:px-7">
            <div className="flex w-max gap-2 pb-1">
              {SECTIONS_RESULTAT.map(s => (
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
                {r.pitchs?.map((p, i) => (
                  <article key={i} className="rounded-2xl border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#38403a]/50 dark:text-white/40">{p.segment}</div>
                    <h4 className="mt-1 font-serif text-lg leading-snug text-[#293027] dark:text-white">{p.titre}</h4>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[#8B4A2F] dark:text-[#d9a05b]">{p.accroches.map((a, j) => <li key={j}>« {a} »</li>)}</ul>
                    <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#38403a]/85 dark:text-white/75">{p.texte}</div>
                    {p.script15s && <p className="mt-3 rounded-xl bg-[#1a1410] p-3 text-xs leading-relaxed text-[#EEE7DB]"><span className="font-bold uppercase tracking-[0.18em] opacity-70">Script 15 s · </span>{p.script15s}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <GhostButton type="button" disabled={occupe === i} onClick={() => gabarit(i)}>{occupe === i ? 'Dépôt…' : 'Envoyer vers les gabarits'}</GhostButton>
                      <GhostButton type="button" onClick={() => copier(p, i)}>{copie === i ? 'Copié' : 'Copier'}</GhostButton>
                    </div>
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

export default GrowthSection;
