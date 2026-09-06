import React, { useEffect, useMemo, useState } from 'react';
import { CATALOGUE_VIDEOS, COUT_VIDEO, dureeLisible, vignetteYoutube, type CatalogueVideos, type VideoKrystine } from '../../lib/pointsConfig';
import { useApp } from '../../contexts/AppContext';
import { updateMember } from '../../firebase/firestore';
import { getLecons, type Lecon } from '../../firebase/formations';
import { acheterAvecNiskas, acheterNiskas, subscribeToMemberPoints, suivreBoutique, type PointsBalance } from '../../firebase/points';
import {
  BANNIERE_NATURE, BOUTIQUE, COUT_EPISODE, PAQUET_NISKAS, SANTE_LA_VIE_ID, niskas,
} from '../../lib/pointsConfig';
import PieceNiska from './PieceNiska';

// La petite boutique, dans l'onglet Téléchargements. Trois façons de
// personnaliser son espace pour cinq niskas chacune (une bannière, la
// musique d'Origine, le skin Medzo Café), les intégrales de Santé la vie à
// cent niskas l'émission, et le paquet de cent niskas pour dix dollars.
// Le serveur seul débite (acheterAvecNiskas); ici, on montre et on active.

interface Props {
  possedeMusiqueDeja: boolean;   // la musique déjà offerte par le Foyer
  episodesPossedes: Set<string>;
  onAchat?: () => void;
}

const BoutiqueNiskas: React.FC<Props> = ({ possedeMusiqueDeja, episodesPossedes, onAchat }) => {
  const { user, member, lang } = useApp();
  const fr = lang === 'FR';
  const [solde, setSolde] = useState<PointsBalance>({ balance: 0, lifetime: 0 });
  const [possede, setPossede] = useState<Record<string, unknown>>({});
  const [episodes, setEpisodes] = useState<Lecon[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueVideos | null>(null);
  const [liste, setListe] = useState<string>('');
  const [recherche, setRecherche] = useState('');
  const [nbVisibles, setNbVisibles] = useState(12);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: 'ok' | 'err'; texte: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const a = subscribeToMemberPoints(user.uid, setSolde);
    const b = suivreBoutique(user.uid, (p) => setPossede(p.possede));
    getLecons(SANTE_LA_VIE_ID).then(setEpisodes).catch(() => setEpisodes([]));
    fetch(CATALOGUE_VIDEOS).then((r) => r.json()).then(setCatalogue).catch(() => setCatalogue(null));
    return () => { a(); b(); };
  }, [user]);

  const dire = (ton: 'ok' | 'err', texte: string) => {
    setMessage({ ton, texte });
    window.setTimeout(() => setMessage(null), 5000);
  };

  const acheter = async (article: string, nom: string) => {
    if (!user || occupe) return;
    setOccupe(article);
    try {
      const r = await acheterAvecNiskas(article);
      dire('ok', fr ? `${nom} est à vous. Il vous reste ${niskas(r.solde, 'FR')}.` : `${nom} is yours. You have ${niskas(r.solde, 'EN')} left.`);
      onAchat?.();
    } catch (e) {
      const m = (e as { message?: string }).message || '';
      dire('err', m.replace(/^.*?:\s*/, '') || (fr ? 'L’achat n’a pas fonctionné.' : 'The purchase did not go through.'));
    } finally {
      setOccupe(null);
    }
  };

  const paquet = async () => {
    if (!user || occupe) return;
    setOccupe('paquet');
    try {
      window.location.href = await acheterNiskas();
    } catch {
      dire('err', fr ? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' : 'The payment could not start. Try again in a moment.');
      setOccupe(null);
    }
  };

  const perso = member?.personnalisation || {};
  const aBanniere = !!possede['banniere-nature'];
  const aMusique = !!possede['musique-origine'] || possedeMusiqueDeja;
  const aSkin = !!possede['skin-medzo'];

  const activer = async (patch: NonNullable<typeof member>['personnalisation']) => {
    if (!user) return;
    await updateMember(user.uid, { personnalisation: { ...perso, ...patch } });
  };

  const episodesTries = useMemo(() => episodes.slice().sort((a, b) => a.ordre - b.ordre), [episodes]);

  // Les vidéos de la chaîne, filtrées par liste et par mot, les plus récentes d'abord.
  const videosVisibles = useMemo(() => {
    if (!catalogue) return [] as VideoKrystine[];
    const mot = recherche.trim().toLowerCase();
    return catalogue.videos.filter((v) =>
      (!liste || (liste === 'directs' ? v.onglet === 'streams' : liste === 'courts' ? v.onglet === 'shorts' : v.listes.includes(liste)))
      && (!mot || v.titre.toLowerCase().includes(mot)));
  }, [catalogue, liste, recherche]);
  useEffect(() => { setNbVisibles(12); }, [liste, recherche]);

  // La carte du skin habille tout l'espace le temps du survol : l'aperçu, c'est
  // l'espace lui-même. Le portail écoute l'événement et pose la classe.
  const apercu = (skin: string | null) => window.dispatchEvent(new CustomEvent('krystine:apercu-skin', { detail: skin }));
  const carte = (id: string, enfant: React.ReactNode) => (
    <div
      key={id}
      className="flex flex-col overflow-hidden rounded-[18px] border border-[#293027]/10 bg-white/60 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(41,48,39,0.5)] dark:border-white/10 dark:bg-white/5"
      onMouseEnter={id === 'skin-medzo' ? () => apercu('medzo') : undefined}
      onMouseLeave={id === 'skin-medzo' ? () => apercu(null) : undefined}
    >
      {enfant}
    </div>
  );

  const boutonAchat = (article: string, nom: string, cout: number) => {
    const manque = cout - solde.balance;
    return (
      <button
        type="button"
        onClick={() => acheter(article, nom)}
        disabled={occupe !== null || manque > 0}
        title={manque > 0 ? (fr ? `Il vous manque ${niskas(manque, 'FR')}.` : `You need ${niskas(manque, 'EN')} more.`) : undefined}
        className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
      >
        <PieceNiska size={16} />
        {occupe === article ? (fr ? 'Un instant' : 'One moment') : `${cout}`}
      </button>
    );
  };

  const bascule = (actif: boolean, onClick: () => void, libelleOn: string, libelleOff: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
        actif
          ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'
          : 'border-[#38403a]/15 text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70'
      }`}
    >
      <i className={`fa-solid ${actif ? 'fa-check' : 'fa-circle'} text-[9px]`} /> {actif ? libelleOn : libelleOff}
    </button>
  );

  return (
    <section className="mt-10" id="boutique">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'La petite boutique' : 'The little shop'}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{fr ? 'Personnalisez votre espace' : 'Personalise your space'}</h3>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
            {fr
              ? `Chaque objet se paie en niskas, la monnaie de votre espace. Vous en gagnez en revenant, en participant et en invitant vos amies. Quand la bourse est courte, un paquet de ${PAQUET_NISKAS.niskas} niskas coûte ${PAQUET_NISKAS.prix} $.`
              : `Everything here is paid in niskas, the currency of your space. You earn them by coming back, taking part and inviting friends. When the purse runs low, a pack of ${PAQUET_NISKAS.niskas} niskas costs $${PAQUET_NISKAS.prix}.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 bg-white/60 px-4 py-2 font-serif text-lg text-[#293027] dark:bg-white/10 dark:text-white">
            <PieceNiska size={20} /> {solde.balance}
          </span>
          <button
            type="button"
            onClick={paquet}
            disabled={occupe !== null}
            className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#d9a05b] disabled:opacity-50"
          >
            <i className="fa-solid fa-bag-shopping" /> {fr ? 'Acheter des niskas' : 'Buy niskas'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`mt-4 rounded-[14px] px-4 py-3 text-sm ${message.ton === 'ok' ? 'bg-[#BA7B39]/15 text-[#293027] dark:text-white' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'}`}>
          {message.texte}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {BOUTIQUE.map((a) => {
          const nom = fr ? a.nomFR : a.nomEN;
          const desc = fr ? a.descFR : a.descEN;
          let visuel: React.ReactNode;
          let etat: React.ReactNode;
          if (a.id === 'banniere-nature') {
            visuel = <img src={BANNIERE_NATURE} alt="" className="h-28 w-full object-cover" />;
            etat = aBanniere
              ? bascule(perso.banniere === 'nature', () => activer({ banniere: perso.banniere === 'nature' ? 'defaut' : 'nature' }), fr ? 'En place' : 'In place', fr ? 'Mettre en bannière' : 'Set as banner')
              : boutonAchat(a.id, nom, a.cout);
          } else if (a.id === 'musique-origine') {
            visuel = (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#293027] to-[#4a5a4a] text-[#d9a05b]">
                <i className="fa-solid fa-music text-3xl" />
              </div>
            );
            etat = aMusique
              ? (
                <div className="flex flex-wrap gap-2">
                  {bascule(!!perso.musiqueSite, () => activer({ musiqueSite: !perso.musiqueSite }), fr ? 'Musique du site' : 'Site music', fr ? 'Activer sur le site' : 'Use on the site')}
                  <a href="#telechargements" className="inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70">
                    <i className="fa-solid fa-download text-[9px]" /> {fr ? 'Télécharger' : 'Download'}
                  </a>
                </div>
              )
              : boutonAchat(a.id, nom, a.cout);
          } else {
            // Un aperçu miniature de l'espace en Medzo Café : bannière, puce, onglets, carte.
            visuel = (
              <div className="h-28 overflow-hidden bg-[#e6d7c3] p-3" aria-hidden="true">
                <div className="h-7 rounded-md bg-gradient-to-r from-[#3b2417] to-[#8a5a2b]" />
                <div className="mt-1.5 flex gap-1.5">
                  <span className="h-2 w-10 rounded-full bg-[#8a5a2b]" /><span className="h-2 w-6 rounded-full bg-[#3b2417]/40" /><span className="h-2 w-6 rounded-full bg-[#3b2417]/40" />
                </div>
                <div className="mt-2 grid grid-cols-[1fr_60px] gap-1.5">
                  <div className="h-9 rounded-md bg-[#faf3e8]/70" /><div className="h-9 rounded-md bg-[#faf3e8]/70" />
                </div>
              </div>
            );
            etat = aSkin
              ? bascule(perso.skin === 'medzo', () => activer({ skin: perso.skin === 'medzo' ? '' : 'medzo' }), fr ? 'Skin actif' : 'Skin on', fr ? 'Activer le skin' : 'Turn the skin on')
              : boutonAchat(a.id, nom, a.cout);
          }
          return carte(a.id, (
            <>
              {visuel}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className={`fa-solid ${a.icone} mr-1`} /> {niskas(a.cout, lang)}</p>
                <p className="mt-1 font-serif text-lg text-[#293027] dark:text-white">{nom}</p>
                <p className="mt-1 flex-1 text-sm text-[#293027]/60 dark:text-white/60">{desc}</p>
                <div className="mt-4">{etat}</div>
              </div>
            </>
          ));
        })}
      </div>

      {/* Les vidéos de la chaîne YouTube : tout le contenu de Krystine, à dix niskas la vidéo */}
      <div className="mt-10" id="videos-krystine">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les vidéos de Krystine' : 'Krystine’s videos'}</p>
        <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{fr ? 'Toute la chaîne, dans vos vidéos' : 'The whole channel, in your videos'}</h3>
        <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
          {fr
            ? `${catalogue ? catalogue.videos.length : ''} vidéos, directs et capsules de la chaîne de Krystine. Chaque vidéo coûte ${niskas(COUT_VIDEO, 'FR')} et rejoint vos vidéos avec son lecteur, pour la revoir sans chercher.`
            : `${catalogue ? catalogue.videos.length : ''} videos, lives and capsules from Krystine’s channel. Each one costs ${niskas(COUT_VIDEO, 'EN')} and joins your videos with its player, to watch again without searching.`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[{ id: '', t: fr ? 'Toutes' : 'All' }, { id: 'directs', t: fr ? 'Les directs' : 'Lives' }, { id: 'courts', t: fr ? 'Les capsules' : 'Shorts' }, ...(catalogue?.listes || []).filter((l) => l.nb > 0).map((l) => ({ id: l.id, t: l.titre }))].map((l) => (
            <button
              key={l.id || 'toutes'}
              type="button"
              onClick={() => setListe(l.id)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${liste === l.id ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/60'}`}
            >
              {l.t.toLowerCase()}
            </button>
          ))}
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={fr ? 'Chercher un titre' : 'Search a title'}
            className="ml-auto w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] sm:w-56 dark:border-white/15 dark:bg-white/10 dark:text-white"
          />
        </div>
        {!catalogue && <p className="mt-4 text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Le catalogue arrive.' : 'The catalogue is on its way.'}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videosVisibles.slice(0, nbVisibles).map((v) => {
            const aMoi = !!possede[`video:${v.id}`];
            return (
              <div key={v.id} className="flex flex-col overflow-hidden rounded-[16px] border border-[#293027]/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
                <div className="relative aspect-video bg-[#293027]/10">
                  <img src={vignetteYoutube(v.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {v.duree > 0 && <span className="absolute bottom-2 right-2 rounded-full bg-[#151d19]/75 px-2 py-0.5 text-[10px] font-bold text-white">{dureeLisible(v.duree)}</span>}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 flex-1 text-sm text-[#293027] dark:text-white" title={v.titre}>{v.titre}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">{v.publieLe}</span>
                    {aMoi
                      ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className="fa-solid fa-check mr-1" />{fr ? 'Dans vos vidéos' : 'In your videos'}</span>
                      : boutonAchat(`video:${v.id}`, v.titre, COUT_VIDEO)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {videosVisibles.length > nbVisibles && (
          <div className="mt-4 text-center">
            <button type="button" onClick={() => setNbVisibles((n) => n + 24)} className="rounded-full border border-[#38403a]/15 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70">
              {fr ? `Voir plus (${videosVisibles.length - nbVisibles} autres)` : `See more (${videosVisibles.length - nbVisibles} more)`}
            </button>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-[18px]">
          <img src="/sante-la-vie.jpg" alt="Krystine St-Laurent sur le plateau de Santé la vie" className="h-full w-full object-cover" style={{ objectPosition: '63% 38%' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les intégrales' : 'The full episodes'}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">Santé la vie</h3>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
            {fr
              ? `Les émissions complètes, telles que diffusées sur MAtv. Chaque émission coûte ${niskas(COUT_EPISODE, 'FR')} et rejoint vos téléchargements pour de bon.`
              : `The complete shows, as aired on MAtv. Each one costs ${niskas(COUT_EPISODE, 'EN')} and joins your downloads for good.`}
          </p>
          <ul className="mt-4 divide-y divide-[#293027]/10 rounded-[16px] border border-[#293027]/10 bg-white/50 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {episodesTries.length === 0 && (
              <li className="px-4 py-3 text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Les émissions arrivent.' : 'The shows are on their way.'}</li>
            )}
            {episodesTries.map((l) => {
              const aMoi = episodesPossedes.has(l.id);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 text-sm text-[#293027]/85 dark:text-white/85">
                    <i className="fa-solid fa-tv mr-2 text-[#BA7B39]" />{l.titre}
                  </span>
                  {aMoi
                    ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className="fa-solid fa-check mr-1" />{fr ? 'Dans vos téléchargements' : 'In your downloads'}</span>
                    : boutonAchat(`episode:${l.id}`, l.titre, COUT_EPISODE)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BoutiqueNiskas;
