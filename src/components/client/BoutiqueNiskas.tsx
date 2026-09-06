import React, { useEffect, useMemo, useState } from 'react';
import { CATALOGUE_VIDEOS, COUT_ACCES_VIDEOS, PAQUETS_NISKAS, dureeLisible, vignetteYoutube, type CatalogueVideos, type VideoKrystine } from '../../lib/pointsConfig';
import { useApp } from '../../contexts/AppContext';
import { updateMember } from '../../firebase/firestore';
import { getLecons, type Lecon } from '../../firebase/formations';
import { acheterAvecNiskas, acheterNiskas, subscribeToMemberPoints, suivreBoutique, type PointsBalance } from '../../firebase/points';
import {
  CATEGORIES_BOUTIQUE, skinParCle, banniereParCle,
  BANNIERE_NATURE, BOUTIQUE, COUT_COSMETIQUE, COUT_EPISODE, COUT_SAISON, SAISONS_SANTE_LA_VIE, PAQUET_NISKAS, SANTE_LA_VIE_ID, niskas,
} from '../../lib/pointsConfig';
import { COFFRES } from '../../lib/coffresConfig';
import PieceNiska from './PieceNiska';
import Coffres from './Coffres';
import FondEcran from './FondEcran';
import ApercuImage from './ApercuImage';
import { AvecSignature, telechargerImage } from './Signature';
import '../bouton-compte.css';

// La petite boutique, dans l'onglet Téléchargements. Quatre façons de
// personnaliser son espace pour cinq niskas chacune (une bannière, la
// musique d'Origine, les skins Medzo Café et Nuit), toutes les vidéos de
// Krystine pour dix niskas (une fois), les intégrales de Santé la vie à
// cent niskas l'émission, et l'échelle des paquets de niskas (Stripe).
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
  const [paquetsOuverts, setPaquetsOuverts] = useState(false);
  const [message, setMessage] = useState<{ ton: 'ok' | 'err'; texte: string } | null>(null);
  const [fondOuvert, setFondOuvert] = useState<string | null>(null); // la clé de la bannière dont on montre le fond d'écran
  const [apercuOuvert, setApercuOuvert] = useState<string | null>(null); // la clé de la bannière en aperçu plein écran (avant achat aussi)
  // La signature de Krystine reste sur une bannière tant que sa version sans
  // signature (cinq niskas) n'a pas été prise; la bannière d'origine est à tous.
  const possedeBanniere = (cle: string) => cle === 'defaut' || !!possede[`banniere-${cle}`];
  const signee = (cle: string) => !possede[`sanslogo-${cle}`];
  const telecharger = async (cle: string) => {
    const b = banniereParCle(cle);
    if (!b || occupe) return;
    setOccupe(`telecharger-${cle}`);
    try {
      await telechargerImage(b.image, `${(fr ? b.nomFR : b.nomEN).replace(/^Bannière\s+|\s+banner$/i, '').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.webp`, signee(cle));
    } catch {
      dire('err', fr ? 'Le téléchargement n’a pas fonctionné. Réessayez dans un instant.' : 'The download did not work. Try again in a moment.');
    } finally {
      setOccupe(null);
    }
  };

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

  const paquet = async (id: string) => {
    if (!user || occupe) return;
    setOccupe('paquet');
    try {
      window.location.href = await acheterNiskas(id);
    } catch {
      dire('err', fr ? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' : 'The payment could not start. Try again in a moment.');
      setOccupe(null);
    }
  };

  const perso = member?.personnalisation || {};
  const aMusique = !!possede['musique-origine'] || possedeMusiqueDeja;
  const aAccesVideos = !!possede['acces-videos'];

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
      onMouseEnter={id.startsWith('skin-') ? () => apercu(id.slice(5)) : undefined}
      onMouseLeave={id.startsWith('skin-') ? () => apercu(null) : undefined}
    >
      {enfant}
    </div>
  );

  // `or` : le bouton or métallique (même habit que « Créer mon compte ») pour
  // une saison complète de Santé la vie (Alex, 6 sept. 2026).
  const boutonAchat = (article: string, nom: string, cout: number, or = false) => {
    const manque = cout - solde.balance;
    return (
      <button
        type="button"
        onClick={() => acheter(article, nom)}
        disabled={occupe !== null || manque > 0}
        title={manque > 0 ? (fr ? `Il vous manque ${niskas(manque, 'FR')}.` : `You need ${niskas(manque, 'EN')} more.`) : undefined}
        className={or
          ? 'bouton-compte inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40'
          : 'inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]'}
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
            onClick={() => setPaquetsOuverts((o) => !o)}
            disabled={occupe !== null}
            aria-expanded={paquetsOuverts}
            className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#d9a05b] disabled:opacity-50"
          >
            <i className="fa-solid fa-bag-shopping" /> {fr ? 'Acheter des niskas' : 'Buy niskas'}
          </button>
        </div>
      </div>

      {/* L'échelle des paquets : de cent pour dix dollars à dix mille pour cinq cents. */}
      {paquetsOuverts && (
        <div id="paquets-niskas" className="mt-6 rounded-[18px] border border-[#BA7B39]/40 bg-white/60 p-5 dark:border-[#BA7B39]/40 dark:bg-white/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les paquets de niskas' : 'Niska packs'}</p>
          <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
            {fr ? 'Plus le paquet est gros, plus le niska est doux. Le paiement passe par Stripe et les niskas tombent dans votre bourse au retour.' : 'The bigger the pack, the gentler the niska. Payment goes through Stripe and the niskas land in your purse when you come back.'}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PAQUETS_NISKAS.map((pq, i) => {
              const parDollar = (pq.niskas / pq.prix).toFixed(0);
              const phare = i === PAQUETS_NISKAS.length - 1;
              return (
                <li key={pq.id} className={`flex flex-col rounded-[14px] border p-4 ${phare ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#293027]/10 bg-white/50 dark:border-white/10 dark:bg-white/5'}`}>
                  <span className="inline-flex items-center gap-2 font-serif text-2xl text-[#293027] dark:text-white"><PieceNiska size={18} /> {pq.niskas.toLocaleString('fr-CA')}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">{fr ? `${parDollar} niskas par dollar` : `${parDollar} niskas per dollar`}</span>
                  <button
                    type="button"
                    onClick={() => paquet(pq.id)}
                    disabled={occupe !== null}
                    className="mt-4 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
                  >
                    {occupe === 'paquet' ? (fr ? 'Un instant' : 'One moment') : `${pq.prix} $`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && (
        <p className={`mt-4 rounded-[14px] px-4 py-3 text-sm ${message.ton === 'ok' ? 'bg-[#BA7B39]/15 text-[#293027] dark:text-white' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'}`}>
          {message.texte}
        </p>
      )}

      {CATEGORIES_BOUTIQUE.map((cat) => (
      <div key={cat.id} className="mt-8" id={`boutique-${cat.id}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]"><i className={`fa-solid ${cat.icone}`} /></span>
          <div>
            <h4 className="font-serif text-xl text-[#293027] dark:text-white">{fr ? cat.titreFR : cat.titreEN}</h4>
            <p className="mt-1 max-w-2xl text-sm text-[#293027]/65 dark:text-white/65">{fr ? cat.texteFR : cat.texteEN}</p>
          </div>
        </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BOUTIQUE.filter((a) => a.categorie === cat.id).map((a) => {
          const nom = fr ? a.nomFR : a.nomEN;
          const desc = fr ? a.descFR : a.descEN;
          let visuel: React.ReactNode;
          let etat: React.ReactNode;
          if (a.categorie === 'banniere') {
            const b = banniereParCle(a.id.slice(9));
            const cleB = b?.cle || '';
            // Un clic sur l'image ouvre l'aperçu plein écran, avant même l'achat.
            visuel = (
              <button type="button" onClick={() => b && setApercuOuvert(b.cle)} className="group/img relative block w-full overflow-hidden text-left" aria-label={fr ? `Voir ${nom} en plein écran` : `See ${nom} full screen`}>
                <AvecSignature signe={signee(cleB)}>
                  <img src={b?.image || BANNIERE_NATURE} alt="" className="h-28 w-full object-cover transition-transform duration-500 group-hover/img:scale-[1.03]" loading="lazy" />
                </AvecSignature>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#151d19]/0 transition-colors group-hover/img:bg-[#151d19]/30">
                  <span className="translate-y-1 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#293027] opacity-0 shadow transition-all group-hover/img:translate-y-0 group-hover/img:opacity-100"><i className="fa-solid fa-expand mr-1 text-[9px]" /> {fr ? 'Aperçu' : 'Preview'}</span>
                </span>
              </button>
            );
            const boutonSecondaire = 'inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:opacity-50 dark:border-white/15 dark:text-white/70';
            etat = b && possedeBanniere(b.cle)
              ? (
                <div className="flex flex-wrap gap-2">
                  {bascule(perso.banniere === b.cle || (b.cle === 'defaut' && (!perso.banniere || perso.banniere === 'defaut')), () => activer({ banniere: perso.banniere === b.cle ? 'defaut' : b.cle }), fr ? 'En place' : 'In place', fr ? 'Mettre en bannière' : 'Set as banner')}
                  <button type="button" onClick={() => telecharger(b.cle)} disabled={occupe !== null} className={boutonSecondaire}>
                    <i className={`fa-solid ${occupe === `telecharger-${b.cle}` ? 'fa-circle-notch fa-spin' : 'fa-download'} text-[9px]`} /> {fr ? 'Télécharger' : 'Download'}
                  </button>
                  {b.fond && (
                    <button type="button" onClick={() => setFondOuvert(b.cle)} className={boutonSecondaire}>
                      <i className="fa-solid fa-desktop text-[9px]" /> {fr ? 'Fond d’écran' : 'Wallpaper'}
                    </button>
                  )}
                  {signee(b.cle)
                    ? (
                      <button
                        type="button"
                        onClick={() => acheter(`sanslogo-${b.cle}`, fr ? 'La version sans signature' : 'The signature-free version')}
                        disabled={occupe !== null || solde.balance < COUT_COSMETIQUE}
                        title={fr ? 'Retire la signature de Krystine en bas à droite, sur la bannière et le fond d’écran.' : 'Removes Krystine’s signature bottom right, on the banner and the wallpaper.'}
                        className={`${boutonSecondaire} whitespace-nowrap`}
                      >
                        <i className="fa-solid fa-signature text-[9px]" /> {fr ? 'Sans signature' : 'No signature'} <PieceNiska size={12} /> {COUT_COSMETIQUE}
                      </button>
                    )
                    : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39] bg-[#BA7B39]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-check text-[9px]" /> {fr ? 'Sans signature' : 'No signature'}</span>
                    )}
                </div>
              )
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
            // Un skin : l'aperçu miniature se dessine depuis sa palette (bannière,
            // puces, deux cartes). Un skin rare ne s'achète pas : il montre le coffre
            // où il se trouve, et le bouton d'activation dès qu'il est à vous.
            const k = skinParCle(a.id.slice(5));
            const pal = k?.palette;
            visuel = pal ? (
              <div className="h-28 overflow-hidden p-3" style={{ background: pal.fond }} aria-hidden="true">
                <div className="h-7 rounded-md" style={{ background: `linear-gradient(90deg, ${pal.sombre ? pal.panneau : pal.encre}, ${pal.accent})` }} />
                <div className="mt-1.5 flex gap-1.5">
                  <span className="h-2 w-10 rounded-full" style={{ background: pal.accent }} /><span className="h-2 w-6 rounded-full" style={{ background: pal.encre, opacity: 0.3 }} /><span className="h-2 w-6 rounded-full" style={{ background: pal.encre, opacity: 0.3 }} />
                </div>
                <div className="mt-2 grid grid-cols-[1fr_60px] gap-1.5">
                  <div className="h-9 rounded-md" style={{ background: pal.panneau, opacity: pal.sombre ? 1 : 0.75 }} /><div className="h-9 rounded-md" style={{ background: pal.panneau, opacity: pal.sombre ? 1 : 0.75 }} />
                </div>
              </div>
            ) : null;
            const cle = a.id.slice(5);
            etat = possede[a.id]
              ? bascule(perso.skin === cle, () => activer({ skin: perso.skin === cle ? '' : cle }), fr ? 'Skin actif' : 'Skin on', fr ? 'Activer le skin' : 'Turn the skin on')
              : k && k.cout === null
                ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#38403a]/25 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:border-white/25 dark:text-white/60" title={fr ? 'Ce skin ne s’achète pas : il se trouve dans un coffre.' : 'This skin cannot be bought: it is found in a chest.'}>
                    <i className="fa-solid fa-lock text-[9px]" /> {fr ? `Dans le ${COFFRES[k.coffre || 'or'].nomFR.toLowerCase()}` : `In the ${COFFRES[k.coffre || 'or'].nomEN.toLowerCase()}`}
                  </span>
                )
                : boutonAchat(a.id, nom, a.cout);
          }
          return carte(a.id, (
            <>
              {visuel}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className={`fa-solid ${a.icone} mr-1`} /> {a.categorie === 'skin' && skinParCle(a.id.slice(5))?.cout === null ? (skinParCle(a.id.slice(5))?.rarete === 'legendaire' ? (fr ? 'Légendaire · coffre d’or' : 'Legendary · gold chest') : (fr ? `Rare · coffre ${skinParCle(a.id.slice(5))?.coffre === 'argent' ? 'd’argent' : 'd’or'}` : `Rare · ${skinParCle(a.id.slice(5))?.coffre} chest`)) : a.cout === 0 ? (fr ? 'Offerte' : 'Included') : niskas(a.cout, lang)}</p>
                <p className="mt-1 font-serif text-lg text-[#293027] dark:text-white">{nom}</p>
                <p className="mt-1 flex-1 text-sm text-[#293027]/60 dark:text-white/60">{desc}</p>
                <div className="mt-4">{etat}</div>
              </div>
            </>
          ));
        })}
      </div>
      </div>
      ))}

      {fondOuvert && banniereParCle(fondOuvert)?.fond && (
        <FondEcran ouvert onFermer={() => setFondOuvert(null)} image={banniereParCle(fondOuvert)!.fond!} nom={fr ? banniereParCle(fondOuvert)!.nomFR : banniereParCle(fondOuvert)!.nomEN} lang={lang} signe={signee(fondOuvert)} />
      )}
      {(() => {
        const b = apercuOuvert ? banniereParCle(apercuOuvert) : undefined;
        const vues = b ? [
          { cle: 'banniere', image: b.image, libelle: fr ? 'Bannière' : 'Banner', ratio: '1440 / 608' },
          ...(b.fond ? [{ cle: 'fond', image: b.fond, libelle: fr ? 'Fond d’écran' : 'Wallpaper', ratio: '16 / 9' }] : []),
        ] : [];
        return <ApercuImage ouvert={!!b} onFermer={() => setApercuOuvert(null)} vues={vues} titre={b ? (fr ? b.nomFR : b.nomEN).replace(/^Bannière\s+|\s+banner$/i, '') : ''} signe={b ? signee(b.cle) : true} lang={lang} />;
      })()}

      <Coffres solde={solde.balance} onChange={onAchat} />


      <div className="mt-10 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-[18px]">
          <img src="/sante-la-vie.jpg" alt="Krystine St-Laurent sur le plateau de Santé la vie" className="h-full w-full object-cover" style={{ objectPosition: '63% 38%' }} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les intégrales' : 'The full episodes'}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">Santé la vie</h3>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
            {fr
              ? `Les émissions complètes, telles que diffusées sur MAtv, en deux saisons. Chaque émission coûte ${niskas(COUT_EPISODE, 'FR')}, une saison complète ${niskas(COUT_SAISON, 'FR')}, et tout rejoint vos téléchargements pour de bon.`
              : `The complete shows, as aired on MAtv, in two seasons. Each one costs ${niskas(COUT_EPISODE, 'EN')}, a full season ${niskas(COUT_SAISON, 'EN')}, and everything joins your downloads for good.`}
          </p>
          {episodesTries.length === 0 && (
            <p className="mt-4 text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Les émissions arrivent.' : 'The shows are on their way.'}</p>
          )}
          {Object.entries(SAISONS_SANTE_LA_VIE).map(([cle, sais]) => {
            const eps = episodesTries.filter((l) => l.moduleNom === sais.module);
            if (eps.length === 0) return null;
            const touteLaSaison = eps.every((l) => episodesPossedes.has(l.id));
            return (
              <div key={cle} className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-serif text-lg text-[#293027] dark:text-white"><i className="fa-solid fa-clapperboard mr-2 text-[#BA7B39]" />{fr ? `Saison ${sais.n}` : `Season ${sais.n}`} <span className="text-sm text-[#293027]/50 dark:text-white/50">· {eps.length} {fr ? 'émissions' : 'shows'}</span></p>
                  {touteLaSaison
                    ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className="fa-solid fa-check mr-1" />{fr ? 'Saison complète à vous' : 'Whole season yours'}</span>
                    : <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">{fr ? 'Toute la saison' : 'Whole season'} {boutonAchat(`saison:${cle}`, fr ? `Santé la vie · saison ${sais.n}` : `Santé la vie · season ${sais.n}`, COUT_SAISON, true)}</span>}
                </div>
                <ul className="mt-2 divide-y divide-[#293027]/10 rounded-[16px] border border-[#293027]/10 bg-white/50 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
                  {eps.map((l) => {
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
            );
          })}
        </div>
      </div>

      {/* Les vidéos publiques de Krystine : gratuites, une fois la section ouverte pour trente niskas */}
      <div className="mt-10" id="videos-krystine">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les vidéos publiques de Krystine' : 'Krystine’s public videos'}</p>
        <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{fr ? 'Toutes ses vidéos, dans votre espace' : 'All her videos, in your space'}</h3>
        <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
          {fr
            ? `${catalogue ? catalogue.videos.length : ''} vidéos, directs et capsules de Krystine. Les vidéos sont gratuites : ouvrir la section coûte ${niskas(COUT_ACCES_VIDEOS, 'FR')}, une seule fois, et tout se regarde ensuite dans « Mes vidéos ».`
            : `${catalogue ? catalogue.videos.length : ''} videos, lives and capsules by Krystine. The videos are free: opening the section costs ${niskas(COUT_ACCES_VIDEOS, 'EN')}, once, and everything then plays in “My videos”.`}
        </p>
        {!aAccesVideos && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border-2 border-[#BA7B39] bg-[#BA7B39]/15 p-5 shadow-[0_18px_40px_-24px_rgba(139,74,47,0.6)]">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#293027] text-[#d9a05b] dark:bg-[#BA7B39] dark:text-[#293027]"><i className="fa-solid fa-lock text-lg" /></span>
              <div>
              <p className="font-serif text-xl text-[#293027] dark:text-white">{fr ? `Cette section est fermée : ouvrez-la pour ${niskas(COUT_ACCES_VIDEOS, 'FR')}` : `This section is locked: open it for ${niskas(COUT_ACCES_VIDEOS, 'EN')}`}</p>
              <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">{fr ? 'Une seule fois, pour toutes les vidéos, celles d’aujourd’hui et celles qui viendront.' : 'Once, for every video, today’s and the ones to come.'}</p>
              </div>
            </div>
            {boutonAchat('acces-videos', fr ? 'Les vidéos publiques de Krystine' : 'Krystine’s public videos', COUT_ACCES_VIDEOS)}
          </div>
        )}
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
        <div className="relative">
        {!aAccesVideos && (
          <div className="absolute inset-0 z-[3] flex items-start justify-center rounded-[16px] bg-[#EEE7DB]/55 pt-16 backdrop-blur-[2px] dark:bg-[#151d19]/55">
            <div className="rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] shadow-2xl dark:bg-[#BA7B39] dark:text-[#293027]">
              <i className="fa-solid fa-lock mr-2" />{fr ? `Ouvrir la section · ${niskas(COUT_ACCES_VIDEOS, 'FR')}` : `Open the section · ${niskas(COUT_ACCES_VIDEOS, 'EN')}`}
            </div>
          </div>
        )}
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
                    {(aMoi || aAccesVideos)
                      ? (
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('krystine:regarder-video', { detail: v.id }))}
                          className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
                        >
                          <i className="fa-solid fa-play text-[9px]" /> {fr ? 'Regarder' : 'Watch'}
                        </button>
                      )
                      : <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#293027]/40 dark:text-white/40"><i className="fa-solid fa-lock text-[9px]" /> {fr ? 'Section fermée' : 'Section closed'}</span>}
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
      </div>
    </section>
  );
};

export default BoutiqueNiskas;
