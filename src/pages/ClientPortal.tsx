import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { suivrePublicationsDe, type PostMur } from '../firebase/mur';
import { retenirCodeDepuisUrl, reclamerCodeRetenu } from '../firebase/parrainage';
import ClientParrainage from './client/ClientParrainage';
import Composeur from '../components/communaute/Composeur';
import { getBadgesDe, CATALOGUE_BADGES } from '../firebase/badgesCatalogue';
import { suivreMesAmities, accepterAmitie, refuserAmitie, type Amitie } from '../firebase/amities';
import { getMember, type MemberDoc } from '../firebase/firestore';
import { logout } from '../firebase/auth';
import { updateMember, getClientOrdersForMember, getDoshaResultsForMember, getGuideResponsesForMember, type ClientOrder, type DoshaResult, type GuideResponse } from '../firebase/firestore';
import { uploadImage } from '../firebase/storage';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { findOilForDosha } from '../lib/shopifyOil';
import { ritualForDosha } from '../lib/doshaRituals';
import { jsPDF } from 'jspdf';
import ClientMessagerie from './client/ClientMessagerie';
import ClientArchives from './client/ClientArchives';
import ClientLoyalty from './client/ClientLoyalty';
import ClientFormations from './client/ClientFormations';
import ClientTelechargements from './client/ClientTelechargements';
import ClientRediffusions from './client/ClientRediffusions';
import ProblemeTechnique from '../components/client/ProblemeTechnique';
import ClientPreferences from './client/ClientPreferences';
import { subscribeToMemberPoints, suivreBoutique, points, type PointsBalance, DEFAULT_POINTS_BALANCE } from '../firebase/points';
import { BANNIERE_DEFAUT, BANNIERE_NATURE, FACONS_DE_GAGNER, niskas } from '../lib/pointsConfig';
import PieceNiska from '../components/client/PieceNiska';
import RoueQuotidienne from '../components/client/RoueQuotidienne';
import BienvenueJeu from '../components/client/BienvenueJeu';
import CadeauCarte from '../components/client/CadeauCarte';
import { suivreMesCadeaux, type Cadeau } from '../firebase/cadeaux';
import '../components/client/skins.css';

// Le texte du niṣka, écrit par Alex le 6 septembre 2026, lu sous la bourse.
const HISTOIRE_NISKA_FR = [
  'Bien avant que la monnaie prenne la forme que nous lui connaissons, l’Inde ancienne possédait déjà une manière singulière de représenter la valeur.',
  'On l’appelait le niṣka.',
  'Le niṣka était fait d’or. Il pouvait être porté autour du cou, transmis, offert ou échangé. Il n’était pas encore une pièce frappée d’un chiffre ou du visage d’un souverain. Sa valeur ne venait pas d’une inscription. Elle résidait dans la matière elle-même et dans ce qu’elle représentait.',
  'Dans les textes védiques, recevoir des niṣkas témoignait de la reconnaissance accordée à une personne. Posséder un niṣka, c’était porter avec soi quelque chose de précieux, acquis ou transmis.',
  'C’est cette ancienne idée que nous avons choisi de faire renaître ici.',
  'Au fil de votre exploration, vous recueillerez des niṣkas.',
  'Non pas pour vous pousser à accumuler davantage.',
  'Mais pour rendre visible ce que vous aurez pris le temps de découvrir, de reconnaître et de relier.',
  'Chaque niṣka marque un passage.',
  'Une question rencontrée.',
  'Un repère retrouvé.',
  'Une porte ouverte dans l’œuvre.',
  'Car toute richesse ne se mesure pas à ce que l’on possède.',
  'Certaines richesses apparaissent dans la manière dont nous regardons, discernons et choisissons.',
];
const HISTOIRE_NISKA_EN = [
  'Long before money took the shape we know, ancient India already had a singular way of representing value.',
  'It was called the niṣka.',
  'The niṣka was made of gold. It could be worn around the neck, handed down, offered or exchanged. It was not yet a coin struck with a number or a sovereign’s face. Its value did not come from an inscription. It lay in the material itself and in what it stood for.',
  'In the Vedic texts, receiving niṣkas showed the recognition granted to a person. To own a niṣka was to carry something precious with you, earned or handed down.',
  'It is this ancient idea we have chosen to bring back to life here.',
  'As you explore, you will gather niṣkas.',
  'Not to push you to accumulate more.',
  'But to make visible what you will have taken the time to discover, to recognise and to connect.',
  'Each niṣka marks a passage.',
  'A question met.',
  'A bearing found again.',
  'A door opened in the work.',
  'For not all wealth is measured by what we own.',
  'Some wealth appears in the way we look, discern and choose.',
];

type Tab = 'profile' | 'amis' | 'orders' | 'formations' | 'rediffusions' | 'telechargements' | 'loyalty' | 'dosha' | 'archives' | 'messagerie';

// L'onglet Profil en lecture : la fiche (courriel, téléphone, dosha, badges)
// et surtout LE MUR de la personne. L'édition s'ouvre en cliquant sur la
// photo de la bannière.
const ProfilVue: React.FC<{ uid: string; member: MemberDoc | null; email: string; lang: string; solde: PointsBalance; onBoutique: () => void }> = ({ uid, member, email, lang, solde, onBoutique }) => {
  const [posts, setPosts] = useState<PostMur[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  useEffect(() => suivrePublicationsDe(uid, setPosts), [uid]);
  useEffect(() => { getBadgesDe(uid).then(setBadges).catch(() => {}); }, [uid]);
  return (
    <div className="space-y-8">
      <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        <p className="text-[#38403a]/70 dark:text-white/70"><span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">Courriel</span>{email}</p>
        {member?.phone && <p className="text-[#38403a]/70 dark:text-white/70"><span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">Téléphone</span>{member.phone}</p>}
        {member?.dosha && <p className="text-[#38403a]/70 dark:text-white/70"><span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">Dosha</span><span className="capitalize">{member.dosha}</span></p>}
      </div>
      {/* Les niskas : le solde, la porte de la boutique, et toutes les façons d'en gagner */}
      <div className="rounded-[20px] border border-[#BA7B39]/30 bg-gradient-to-br from-[#BA7B39]/15 to-transparent p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Vos niskas' : 'Your niskas'}</p>
            <p className="mt-1 flex items-center gap-3 font-serif text-4xl text-[#293027] dark:text-white">
              <PieceNiska size={34} /> {solde.balance}
              <span className="text-base text-[#293027]/50 dark:text-white/50">{lang === 'FR' ? `· ${solde.lifetime} gagnés en tout` : `· ${solde.lifetime} earned overall`}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBoutique} className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
              <i className="fa-solid fa-bag-shopping" /> {lang === 'FR' ? 'La petite boutique' : 'The little shop'}
            </button>
            <a href="/compte/comment-gagner-des-niskas.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70">
              <i className="fa-solid fa-file-pdf" /> PDF
            </a>
            <button type="button" onClick={() => window.dispatchEvent(new Event('krystine:ouvrir-jeu'))} className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]">
              <i className="fa-solid fa-circle-question" /> {lang === 'FR' ? 'Revoir les explications' : 'Review the explanations'}
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#293027]/70 dark:text-white/70">
          {lang === 'FR'
            ? 'Le niska est la monnaie de votre espace. Chaque compte s’ouvre avec vingt niskas, et la bourse grossit à mesure que vous revenez et que vous participez. Voici tout ce qui en donne.'
            : 'The niska is the currency of your space. Every account opens with twenty niskas, and the purse grows as you come back and take part. Here is everything that earns some.'}
        </p>
        <details className="mt-4 rounded-[14px] border border-[#BA7B39]/25 bg-white/40 px-4 py-3 dark:bg-white/5">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F] dark:text-[#d9a05b]">
            {lang === 'FR' ? 'Le niṣka : une valeur que l’on emportait avec soi' : 'The niṣka: a value you carried with you'}
          </summary>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#293027]/75 dark:text-white/75">
            {(lang === 'FR' ? HISTOIRE_NISKA_FR : HISTOIRE_NISKA_EN).map((par) => <p key={par.slice(0, 24)}>{par}</p>)}
          </div>
        </details>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {FACONS_DE_GAGNER.map((f) => (
            <li key={f.fr} className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-right font-serif font-bold text-[#8B4A2F] dark:text-[#d9a05b]">+{f.pts}</span>
              <span className="text-[#293027]/85 dark:text-white/85">{lang === 'FR' ? f.fr : f.en}</span>
              {(lang === 'FR' ? f.noteFR : f.noteEN) && <span className="text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">{lang === 'FR' ? f.noteFR : f.noteEN}</span>}
            </li>
          ))}
        </ul>
      </div>
      {badges.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Badges</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map(id => (
              <span key={id} className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 bg-[#BA7B39]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">
                <i className={`fa-solid ${CATALOGUE_BADGES[id].icone}`} /> {CATALOGUE_BADGES[id].nom}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Mon mur' : 'My wall'}</p>
        </div>
        <div className="mt-3">
          <Composeur fil="communaute" compact contexte="monmur" />
        </div>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-[#38403a]/50 dark:text-white/50">
            {lang === 'FR' ? 'Vous n\'avez encore rien publié. Ce que vous publiez ici paraît sur votre mur, et sur le feed quand Krystine l\'ouvre aux membres.' : 'Nothing posted yet. What you post here also appears on the feed.'}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {posts.map(p => (
              <div key={p.id} className="rounded-[15px] border border-[#38403a]/10 p-4 dark:border-white/10">
                <p className="whitespace-pre-line text-sm text-[#293027] dark:text-white">{p.texte}</p>
                {p.photoUrl && <img src={p.photoUrl} alt="" className="mt-3 max-h-72 rounded-[12px] object-cover" />}
                {p.videoUrl && <video src={p.videoUrl} controls playsInline preload="metadata" className="mt-3 max-h-72 w-full rounded-[12px] bg-black" />}
                <p className="mt-2 text-[11px] text-[#38403a]/40 dark:text-white/40">
                  {p.creeLe?.toDate?.().toLocaleDateString('fr-CA')} · {(p.pour || 0)} <i className="fa-solid fa-heart text-[#BA7B39]" /> · {p.nbCommentaires || 0} <i className="fa-solid fa-comment" />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <ClientPreferences uid={uid} member={member} lang={lang} />
    </div>
  );
};

// L'onglet Amis : les demandes reçues à accepter, puis le cercle.
const ClientAmis: React.FC<{ uid: string; lang: string }> = ({ uid, lang }) => {
  const [liens, setLiens] = useState<Amitie[]>([]);
  const [fiches, setFiches] = useState<Record<string, MemberDoc | null>>({});
  useEffect(() => suivreMesAmities(uid, setLiens), [uid]);
  useEffect(() => {
    const autres = [...new Set(liens.map(l => l.paire.find(u => u !== uid)!).filter(Boolean))];
    autres.forEach(autre => {
      if (fiches[autre] !== undefined) return;
      getMember(autre).then(m => setFiches(f => ({ ...f, [autre]: m }))).catch(() => {});
    });
  }, [liens, uid]);

  const ligne = (l: Amitie) => {
    const autre = l.paire.find(u => u !== uid)!;
    const m = fiches[autre];
    const nom = m?.displayName || m?.email?.split('@')[0] || '…';
    return { autre, m, nom };
  };
  const recues = liens.filter(l => l.statut === 'demande' && l.de !== uid);
  const envoyees = liens.filter(l => l.statut === 'demande' && l.de === uid);
  const amis = liens.filter(l => l.statut === 'amis');

  const Rangee: React.FC<{ autre: string; nom: string; m: MemberDoc | null; enfant?: React.ReactNode }> = ({ autre, nom, m, enfant }) => (
    <div className="flex items-center gap-3 rounded-[15px] border border-[#38403a]/10 p-3 dark:border-white/10">
      <Link to={`/membre/${autre}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center bg-[#BA7B39]/15" style={{ backgroundImage: m?.photoURL ? `url(${m.photoURL})` : undefined }}>
          {!m?.photoURL && <div className="flex h-full w-full items-center justify-center text-[#8B4A2F]"><i className="fa-solid fa-user text-sm" /></div>}
        </div>
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-[#293027] dark:text-white">
          <span className="truncate">{nom}</span>
          {m?.verifie && <i className="fa-solid fa-circle-check shrink-0 text-[12px] text-[#3b82f6]" />}
        </span>
      </Link>
      {enfant}
    </div>
  );

  return (
    <div className="space-y-8">
      {recues.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Demandes reçues' : 'Requests received'}</p>
          <div className="mt-3 space-y-2">
            {recues.map(l => { const { autre, nom, m } = ligne(l); return (
              <Rangee key={autre} autre={autre} nom={nom} m={m ?? null} enfant={
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => accepterAmitie(uid, autre)} className="rounded-full bg-[#BA7B39] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]">{lang === 'FR' ? 'Accepter' : 'Accept'}</button>
                  <button onClick={() => refuserAmitie(uid, autre)} className="rounded-full border border-[#38403a]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/50 hover:text-red-500 dark:border-white/15 dark:text-white/50">{lang === 'FR' ? 'Refuser' : 'Decline'}</button>
                </div>
              } />
            ); })}
          </div>
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Mes amis' : 'My friends'} ({amis.length})</p>
        {amis.length === 0 ? (
          <p className="mt-3 text-sm text-[#38403a]/50 dark:text-white/50">
            {lang === 'FR' ? 'Votre cercle commence dans l\'annuaire de la communauté.' : 'Your circle begins in the community directory.'}
            {' '}<Link to="/membres" className="text-[#8B4A2F] underline-offset-2 hover:underline">{lang === 'FR' ? 'Voir les membres' : 'See members'}</Link>
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {amis.map(l => { const { autre, nom, m } = ligne(l); return <Rangee key={autre} autre={autre} nom={nom} m={m ?? null} />; })}
          </div>
        )}
      </div>
      {envoyees.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Demandes envoyées' : 'Requests sent'}</p>
          <div className="mt-3 space-y-2">
            {envoyees.map(l => { const { autre, nom, m } = ligne(l); return <Rangee key={autre} autre={autre} nom={nom} m={m ?? null} enfant={<span className="text-[10px] uppercase tracking-widest text-[#38403a]/40 dark:text-white/40">{lang === 'FR' ? 'En attente' : 'Pending'}</span>} />; })}
          </div>
        </div>
      )}
    </div>
  );
};

// Le bouton discret en haut à droite de la bannière : téléverser la sienne.
// Il flashe une fois — trois pulsations dorées — la toute première fois que
// la personne ouvre son espace avec la bannière par défaut, puis plus jamais
// (clé localStorage, jamais si une bannière personnelle est déjà en place).
const FLASH_KEY = 'krystine-banniere-flash-vu';
const BanniereChoix: React.FC<{
  uid: string;
  isDefaultBanner?: boolean;
  perso: NonNullable<MemberDoc['personnalisation']>;
  possedeNature: boolean;
  aPhoto: boolean;
  lang: string;
}> = ({ uid, isDefaultBanner, perso, possedeNature, aPhoto, lang }) => {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const fr = lang === 'FR';
  useEffect(() => {
    if (!isDefaultBanner) return;
    try {
      if (localStorage.getItem(FLASH_KEY)) return;
      setFlash(true);
      localStorage.setItem(FLASH_KEY, '1');
    } catch { /* stockage indisponible, tant pis pour le flash */ }
  }, [isDefaultBanner]);
  const choisir = async (banniere: 'defaut' | 'nature' | 'photo') => {
    setOuvert(false);
    await updateMember(uid, { personnalisation: { ...perso, banniere } });
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadImage(file, 'bannieres');
      await updateMember(uid, { bannerURL: url, personnalisation: { ...perso, banniere: 'photo' } });
      setOuvert(false);
    } finally { setBusy(false); }
  };
  const actif = perso.banniere || (aPhoto ? 'photo' : 'defaut');
  const ligne = 'flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-xs text-[#293027] transition-colors hover:bg-[#BA7B39]/15 dark:text-white';
  const coche = (b: string) => <i className={`fa-solid ${actif === b ? 'fa-circle-check text-[#8B4A2F]' : 'fa-circle text-[#293027]/20 dark:text-white/20'} text-sm`} />;
  return (
    <div className="absolute right-4 top-4 z-[5]">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className={`inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#151d19]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-[#151d19]/60 ${flash ? 'banniere-flash' : ''}`}
      >
        <i className="fa-solid fa-image" />
        {busy ? (fr ? 'Téléversement…' : 'Uploading…') : (fr ? 'Changer la bannière' : 'Change the banner')}
      </button>
      {ouvert && (
        <div className="mt-2 w-72 rounded-[16px] border border-white/60 bg-[#EEE7DB] p-2 shadow-2xl dark:border-white/10 dark:bg-[#293027]" onMouseLeave={() => setOuvert(false)}>
          <label className={`${ligne} cursor-pointer`}>
            <i className="fa-solid fa-upload text-sm text-[#8B4A2F]" />
            <span className="flex-1">{fr ? 'Téléverser ma photo' : 'Upload my photo'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
          </label>
          {aPhoto && (
            <button type="button" className={ligne} onClick={() => choisir('photo')}>
              {coche('photo')}<span className="flex-1">{fr ? 'Ma photo' : 'My photo'}</span>
            </button>
          )}
          <button type="button" className={ligne} onClick={() => choisir('defaut')}>
            {coche('defaut')}<span className="flex-1">{fr ? 'Féminité & Ayurveda (bannière d’origine)' : 'Féminité & Ayurveda (original banner)'}</span>
          </button>
          {possedeNature ? (
            <button type="button" className={ligne} onClick={() => choisir('nature')}>
              {coche('nature')}<span className="flex-1">Nature & Ayurveda</span>
            </button>
          ) : (
            <button type="button" className={ligne} onClick={() => { setOuvert(false); window.dispatchEvent(new Event('krystine:ouvrir-boutique')); }}>
              <i className="fa-solid fa-lock text-sm text-[#293027]/30 dark:text-white/30" />
              <span className="flex-1">Nature & Ayurveda <span className="text-[#293027]/50 dark:text-white/50">· {fr ? '5 niskas à la petite boutique' : '5 niskas at the little shop'}</span></span>
            </button>
          )}
        </div>
      )}
      {flash && (
        <style>{`
          @keyframes banniere-flash-ring {
            0%   { box-shadow: 0 0 0 0 rgba(186,123,57,0.65); }
            70%  { box-shadow: 0 0 0 14px rgba(186,123,57,0); }
            100% { box-shadow: 0 0 0 0 rgba(186,123,57,0); }
          }
          .banniere-flash { animation: banniere-flash-ring 0.8s ease-out 3; }
          @media (prefers-reduced-motion: reduce) {
            .banniere-flash { animation: none; }
          }
        `}</style>
      )}
    </div>
  );
};

// Le rail droit : les raccourcis et le parrainage. Le feed de la communauté
// n'entre pas ici : le fil participatif vit seulement au Foyer d'Origine
// (/cours/foyer), et la vie publique de Krystine sur /espace.
const RailCommunaute: React.FC<{ lang: string; uid: string }> = ({ lang, uid }) => {
  return (
    <aside className="space-y-4">
      <div className="rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {lang === 'FR' ? 'Raccourcis' : 'Shortcuts'}
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <Link to="/cours" className="flex items-center gap-3 text-[#38403a]/80 hover:text-[#8B4A2F] dark:text-white/80"><i className="fa-solid fa-graduation-cap w-4 text-[#8B4A2F]" />{lang === 'FR' ? 'Les formations' : 'Courses'}</Link>
          <Link to="/membres" className="flex items-center gap-3 text-[#38403a]/80 hover:text-[#8B4A2F] dark:text-white/80"><i className="fa-solid fa-users w-4 text-[#8B4A2F]" />{lang === 'FR' ? 'Voir la communauté' : 'See the community'}</Link>
          <Link to="/messages" className="flex items-center gap-3 text-[#38403a]/80 hover:text-[#8B4A2F] dark:text-white/80"><i className="fa-solid fa-envelope w-4 text-[#8B4A2F]" />{lang === 'FR' ? 'Mes messages' : 'My messages'}</Link>
        </div>
      </div>
      <ClientParrainage uid={uid} lang={lang} />
    </aside>
  );
};

const ClientPortal: React.FC = () => {
  const { user, member, isAdmin, setSignInOpen, lang } = useApp();
  // Par défaut, l'espace s'ouvre sur les formations : le fil participatif vit au Foyer d'Origine.
  const [tab, setTab] = useState<Tab>('formations');
  // Une carte « Lettre d'or » dans la messagerie mène à l'onglet Lettres.
  useEffect(() => {
    const aller = () => setTab('archives');
    window.addEventListener('ksl:ouvrir-lettres', aller);
    return () => window.removeEventListener('ksl:ouvrir-lettres', aller);
  }, []);
  const [editOuvert, setEditOuvert] = useState(false);
  const [possedeNature, setPossedeNature] = useState(false);
  // L'aperçu d'un skin, le temps d'un survol dans la petite boutique.
  const [apercuSkin, setApercuSkin] = useState<string | null>(null);
  // Les cadeaux de Krystine encore à utiliser : en bannière, sur tous les onglets.
  const [cadeaux, setCadeaux] = useState<Cadeau[]>([]);
  useEffect(() => (user ? suivreMesCadeaux(user.uid, setCadeaux) : undefined), [user]);
  useEffect(() => {
    const onApercu = (e: Event) => setApercuSkin((e as CustomEvent<string | null>).detail);
    window.addEventListener('krystine:apercu-skin', onApercu);
    return () => window.removeEventListener('krystine:apercu-skin', onApercu);
  }, []);
  useEffect(() => {
    if (!user) return;
    return suivreBoutique(user.uid, (p) => setPossedeNature(!!p.possede['banniere-nature']));
  }, [user]);
  // Profil complété (photo, nom, dosha) : cinq niskas, une fois.
  useEffect(() => {
    if (user && member?.photoURL && member?.displayName && member?.dosha) points.profilComplete(user.uid).catch(() => {});
  }, [user, member?.photoURL, member?.displayName, member?.dosha]);

  // « Acheter des niskas » (onglet Points) mène à la petite boutique.
  useEffect(() => {
    const ouvrir = () => { setTab('telechargements'); window.setTimeout(() => document.getElementById('boutique')?.scrollIntoView({ behavior: 'smooth' }), 150); };
    window.addEventListener('krystine:ouvrir-boutique', ouvrir);
    return () => window.removeEventListener('krystine:ouvrir-boutique', ouvrir);
  }, []);

  // Retour de Stripe : le paquet de niskas arrive par le webhook, on le dit.
  const [merciNiskas, setMerciNiskas] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).get('niskas') === 'ok') {
        window.history.replaceState(null, '', window.location.pathname);
        return true;
      }
    } catch { /* noop */ }
    return false;
  });
  // Live points balance for the header chip. Subscribed here once so all
  // tabs share the same stream rather than each re-subscribing.
  const [pointsBalance, setPointsBalance] = useState<PointsBalance>(DEFAULT_POINTS_BALANCE);
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMemberPoints(user.uid, setPointsBalance);
    return unsub;
  }, [user]);

  // Parrainage : retenir le code du lien d'invitation, puis le réclamer une
  // fois connecté (une seule fois, jamais soi-même).
  useEffect(() => { retenirCodeDepuisUrl(); }, []);
  useEffect(() => { if (user) reclamerCodeRetenu(user.uid, user.displayName || '').catch(() => {}); }, [user]);

  if (!user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6 pb-24 pt-32 dark:bg-[#151d19]"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(250,247,240,0.95), transparent 60%), #EEE7DB' }}
      >
        <div className="w-full max-w-md rounded-[24px] border border-white/60 bg-white/55 px-8 py-12 text-center shadow-[0_30px_80px_-30px_rgba(41,48,39,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#293027]/55">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F] dark:text-[#d9a05b]">Inspirata</p>
          <h1 className="mt-3 font-serif text-3xl text-[#293027] dark:text-white" style={{ letterSpacing: '-0.01em' }}>
            {lang === 'FR' ? 'Votre espace' : 'Your space'}
          </h1>
          <div className="mx-auto mt-5 h-px w-16 bg-[#BA7B39]" aria-hidden="true" />
          <p className="mt-5 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/65">
            {lang === 'FR'
              ? 'Vos formations, vos messages, vos vidéos et vos cadeaux de parrainage vous attendent de l\'autre côté.'
              : 'Your courses, your messages, your videos, and your referral gifts are waiting on the other side.'}
          </p>
          <button
            onClick={() => setSignInOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-10 py-4 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_10px_28px_-10px_rgba(186,123,57,0.8)] transition-[background-color,transform] hover:bg-[#9c6630] active:scale-[0.98]"
          >
            <i className="fa-solid fa-arrow-right-to-bracket" /> {lang === 'FR' ? 'Se connecter' : 'Sign in'}
          </button>
          <p className="mt-4 text-xs text-[#38403a]/50 dark:text-white/45">
            {lang === 'FR' ? 'Le compte se crée en une minute, au même endroit.' : 'Creating an account takes a minute, in the same place.'}
          </p>
        </div>
      </div>
    );
  }

  // Un compte admin vit dans le portail client comme tout le monde : ça lui
  // montre exactement ce que les clientes voient. L'espace admin ne s'atteint
  // que par /admin (ou le lien discret dans l'en-tête ci-dessous).

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile',  label: lang === 'FR' ? 'Profil' : 'Profile', icon: 'fa-user' },
    { id: 'amis',     label: lang === 'FR' ? 'Amis' : 'Friends', icon: 'fa-user-group' },
    { id: 'orders',   label: lang === 'FR' ? 'Commandes' : 'Orders', icon: 'fa-box' },
    { id: 'formations', label: lang === 'FR' ? 'Mes formations' : 'My courses', icon: 'fa-graduation-cap' },
    { id: 'rediffusions', label: lang === 'FR' ? 'Rediffusions' : 'Replays', icon: 'fa-circle-play' },
    { id: 'telechargements', label: lang === 'FR' ? 'Téléchargements' : 'Downloads', icon: 'fa-download' },
    { id: 'loyalty',  label: lang === 'FR' ? 'Points' : 'Points', icon: 'fa-seedling' },
    { id: 'dosha',    label: lang === 'FR' ? 'Dosha' : 'Dosha', icon: 'fa-circle-nodes' },
    { id: 'archives', label: lang === 'FR' ? 'Lettres' : 'Letters', icon: 'fa-envelope-open-text' },
    { id: 'messagerie', label: lang === 'FR' ? 'Messagerie' : 'Messages', icon: 'fa-comments' },
  ];

  const perso = member?.personnalisation || {};
  const banniere = perso.banniere === 'nature' ? BANNIERE_NATURE : perso.banniere === 'defaut' ? BANNIERE_DEFAUT : (member?.bannerURL || BANNIERE_DEFAUT);
  const skinActif = apercuSkin || perso.skin || '';
  const skin = skinActif === 'medzo' ? 'skin-medzo' : skinActif === 'nuit' ? 'skin-nuit' : '';


  return (
    <div className={`min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24 ${skin}`}>
      {/* La bannière pleine largeur, l'avatar qui la chevauche, le nom et les
          points par-dessus la photo : le patron du FMM et de la référence
          d'Alex, dans le canon L'Œuvre. */}
      <div className="relative h-64 w-full overflow-hidden md:h-80">
        <img src={banniere} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#151d19]/75 via-[#151d19]/20 to-transparent" />
        {!member?.bannerURL && (
          <div className="absolute left-6 top-5 md:left-8 md:top-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>
              {lang === 'FR' ? 'Votre espace' : 'Your space'}
            </p>
            <p className="mt-1 font-serif text-xl text-[#EEE7DB] md:text-2xl" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}>
              {lang === 'FR' ? 'Bienvenue dans votre espace' : 'Welcome to your space'}
            </p>
          </div>
        )}
        <BanniereChoix uid={user.uid} isDefaultBanner={!member?.bannerURL && perso.banniere !== 'nature'} perso={perso} possedeNature={possedeNature} aPhoto={!!member?.bannerURL} lang={lang} />
        <div className="absolute inset-x-0 bottom-0">
          <div className="flex items-end gap-5 px-6 pb-5 md:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => setEditOuvert(true)}
              title={lang === 'FR' ? 'Modifier mon profil' : 'Edit my profile'}
              className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[#EEE7DB] bg-cover bg-center bg-[#EEE7DB] shadow-xl md:h-32 md:w-32 dark:border-[#151d19]"
              style={{ backgroundImage: (member?.photoURL || user.photoURL) ? `url(${member?.photoURL || user.photoURL})` : undefined }}
            >
              {!member?.photoURL && !user.photoURL && (
                <div className="flex h-full w-full items-center justify-center text-[#293027]/30">
                  <i className="fa-solid fa-user text-3xl" />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-[#151d19]/50 opacity-0 transition-opacity group-hover:opacity-100">
                <i className="fa-solid fa-pen text-white" />
              </span>
            </button>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-2.5 truncate font-serif text-3xl text-white md:text-4xl" style={{ letterSpacing: '-0.01em', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>
                <span className="truncate">{member?.displayName || user.displayName || user.email?.split('@')[0]}</span>
                {(member?.verifie || isAdmin) && (
                  <i className="fa-solid fa-circle-check shrink-0 text-xl text-[#4da3ff]" title={lang === 'FR' ? 'Profil vérifié' : 'Verified profile'} />
                )}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {member?.dosha && (
                  <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    <i className="fa-solid fa-circle-nodes mr-1" /> {member.dosha}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setTab('loyalty')}
                  className="rounded-full bg-[#BA7B39] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#293027] transition-colors hover:bg-[#d9a05b]"
                >
                  <PieceNiska size={14} className="mr-1 inline-block align-[-2px]" />
                  {niskas(pointsBalance.balance, lang)}
                </button>
                <span className="hidden truncate text-xs text-white/70 sm:inline">{user.email}</span>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-4 pb-2 md:flex">
              {isAdmin && (
                <a href="/admin" className="text-xs uppercase tracking-widest text-[#d9a05b] hover:text-white">
                  <i className="fa-solid fa-gauge-high mr-2" />{lang === 'FR' ? 'Espace admin' : 'Admin space'}
                </a>
              )}
              <button onClick={logout} className="text-xs uppercase tracking-widest text-white/60 hover:text-red-300">
                <i className="fa-solid fa-right-from-bracket mr-2" />{lang === 'FR' ? 'Déconnexion' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Les onglets, pleine largeur sous la bannière — une seule rangée qui
          défile plutôt que de tomber sur deux lignes. */}
      <div className="border-b border-[#38403a]/10 bg-white/45 backdrop-blur-xl dark:border-white/10 dark:bg-[#293027]/45">
        <div className="flex flex-nowrap gap-1 overflow-x-auto px-6 md:px-8 lg:px-10">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3.5 text-[10px] font-bold uppercase tracking-wide transition-colors 2xl:px-3 2xl:text-[11px] 2xl:tracking-wider ${
                tab === t.id
                  ? 'border-[#BA7B39] text-[#8B4A2F] dark:text-[#d9a05b]'
                  : 'border-transparent text-[#38403a]/55 hover:text-[#8B4A2F] dark:text-white/55 dark:hover:text-[#d9a05b]'
              }`}
            >
              <i className={`fa-solid ${t.icon} hidden 2xl:inline`} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Le contenu en deux colonnes : l'onglet à gauche, les raccourcis et le parrainage à droite */}
      <div className="mt-8 grid w-full gap-6 px-6 md:px-8 lg:px-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-[#293027]/55">
          {cadeaux.map(c => <div key={c.id} className="mb-5"><CadeauCarte cadeau={c} lang={lang} /></div>)}
          {merciNiskas && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-[16px] border border-[#BA7B39]/40 bg-[#BA7B39]/15 px-4 py-3 text-sm text-[#293027] dark:text-white">
              <span><PieceNiska size={16} className="mr-2 inline-block align-[-3px]" />{lang === 'FR' ? 'Merci. Vos cent niskas arrivent dans votre bourse d’ici une minute.' : 'Thank you. Your hundred niskas land in your purse within a minute.'}</span>
              <button type="button" onClick={() => setMerciNiskas(false)} aria-label={lang === 'FR' ? 'Fermer' : 'Close'} className="text-[#293027]/50 hover:text-[#293027] dark:text-white/50"><i className="fa-solid fa-times" /></button>
            </div>
          )}
          {tab === 'profile'  && <ProfilVue uid={user.uid} member={member} email={user.email || ''} lang={lang} solde={pointsBalance} onBoutique={() => { setTab('telechargements'); window.setTimeout(() => document.getElementById('boutique')?.scrollIntoView({ behavior: 'smooth' }), 150); }} />}
          {tab === 'amis'     && <ClientAmis uid={user.uid} lang={lang} />}
          {tab === 'orders'   && <OrdersTab />}
          {tab === 'formations' && <ClientFormations />}
          {tab === 'rediffusions' && <ClientRediffusions />}
          {tab === 'telechargements' && <ClientTelechargements />}
          {tab === 'loyalty'  && <ClientLoyalty />}
          {tab === 'dosha'    && <DoshaTab />}
          {tab === 'archives' && <ClientArchives />}
          {tab === 'messagerie' && <ClientMessagerie />}
        </div>
        <RailCommunaute lang={lang} uid={user.uid} />
      </div>

      {/* Le bouton « Problème technique », fixe en bas à droite, et sa fenêtre */}
      <ProblemeTechnique uid={user.uid} nom={member?.displayName || user.displayName || ''} courriel={user.email || ''} lang={lang} />
      <RoueQuotidienne uid={user.uid} lang={lang} />
      <BienvenueJeu lang={lang} />

      {/* Le module d'édition du profil, ouvert par la photo de la bannière */}
      {editOuvert && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#151d19]/60 p-4 backdrop-blur-sm" onClick={() => setEditOuvert(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 md:p-8 dark:border-white/10 dark:bg-[#293027]" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl text-[#293027] dark:text-white">{lang === 'FR' ? 'Modifier mon profil' : 'Edit my profile'}</h2>
              <button onClick={() => setEditOuvert(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#293027]/40 hover:text-[#293027] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-lg" />
              </button>
            </div>
            <ProfileTab />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Profile tab ──────────────────────────────────────────────────────────────
const ProfileTab: React.FC = () => {
  const { user, member, lang } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(member?.displayName || user?.displayName || '');
    setPhone(member?.phone || '');
  }, [member, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true); setSaved(false);
    try {
      await updateMember(user.uid, { displayName: displayName.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, `members/${user.uid}`);
      await updateMember(user.uid, { photoURL: url });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <label className="block text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-3">Photo</label>
        <div className="relative w-40 h-40 rounded-full overflow-hidden bg-[#EEE7DB] dark:bg-white/5 border-2 border-[#BA7B39]/30 bg-cover bg-center" style={{ backgroundImage: member?.photoURL ? `url(${member.photoURL})` : (user?.photoURL ? `url(${user.photoURL})` : undefined) }}>
          {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-white text-xl" /></div>}
        </div>
        <label className="inline-block mt-3 text-xs uppercase tracking-widest text-[#8B4A2F] hover:underline cursor-pointer">
          <i className="fa-solid fa-camera mr-2" />{lang === 'FR' ? 'Changer la photo' : 'Change photo'}
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </label>
      </div>
      <div className="md:col-span-2 space-y-5">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Nom' : 'Name'}</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Courriel' : 'Email'}</label>
          <input value={user?.email || ''} disabled className="w-full px-4 py-3 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027]/60 dark:text-white/60 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Téléphone' : 'Phone'}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 …" className="w-full px-4 py-3 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]" />
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button onClick={save} disabled={saving} className="bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-50">
            {saving ? (lang === 'FR' ? 'Enregistrement…' : 'Saving…') : (lang === 'FR' ? 'Enregistrer' : 'Save')}
          </button>
          {saved && <span className="text-xs text-green-600 uppercase tracking-widest"><i className="fa-solid fa-check mr-1" />{lang === 'FR' ? 'Enregistré' : 'Saved'}</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Orders tab ──────────────────────────────────────────────────────────────
const STATUS_LABELS_FR: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payé',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
};
const STATUS_LABELS_EN: Record<string, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-50 text-yellow-600',
  paid: 'bg-blue-50 text-blue-600',
  shipped: 'bg-indigo-50 text-indigo-600',
  delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500',
};

const OrdersTab: React.FC = () => {
  const { user, lang } = useApp();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getClientOrdersForMember(user.uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;
  if (!orders.length) {
    return (
      <div className="text-center py-12">
        <i className="fa-regular fa-box text-4xl text-[#293027]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#293027]/60 dark:text-white/60 font-serif italic">
          {lang === 'FR' ? 'Aucune commande pour l\'instant.' : 'No orders yet.'}
        </p>
      </div>
    );
  }

  const labels = lang === 'FR' ? STATUS_LABELS_FR : STATUS_LABELS_EN;
  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div key={o.id} className="border border-[#293027]/5 dark:border-white/5 rounded-[20px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#293027]/40 dark:text-white/40">
                {o.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || '—'}
              </p>
              <p className="text-sm font-mono text-[#293027]/60 dark:text-white/60">#{o.id?.slice(0, 8)}</p>
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-[#293027]/5 text-[#293027]/60'}`}>
              {labels[o.status] || o.status}
            </span>
          </div>
          <ul className="space-y-1 mb-3">
            {o.items.map((it, i) => (
              <li key={i} className="text-sm text-[#293027]/80 dark:text-white/80 flex justify-between">
                <span>{it.quantity}× {it.title}</span>
                {it.price && <span className="text-[#293027]/60 dark:text-white/60">{it.price}</span>}
              </li>
            ))}
          </ul>
          {o.subtotal && <p className="text-sm font-bold text-[#8B4A2F] mb-2">Total: {o.subtotal}</p>}
          {o.trackingNumber && (
            <div className="mt-3 pt-3 border-t border-[#293027]/5 dark:border-white/5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-1">
                {lang === 'FR' ? 'Numéro de suivi' : 'Tracking number'}
              </p>
              {o.trackingUrl ? (
                <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-[#8B4A2F] underline hover:text-[#293027] dark:hover:text-white">{o.trackingNumber}</a>
              ) : (
                <p className="text-sm font-mono text-[#293027] dark:text-white">{o.trackingNumber}</p>
              )}
            </div>
          )}
          {o.checkoutUrl && o.status === 'pending_payment' && (
            <a href={o.checkoutUrl} className="inline-block mt-3 text-xs text-[#8B4A2F] hover:underline">
              <i className="fa-solid fa-arrow-right mr-1" />{lang === 'FR' ? 'Finaliser le paiement' : 'Complete payment'}
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Dosha tab ───────────────────────────────────────────────────────────────
const DoshaTab: React.FC = () => {
  const { user, member, lang, addToCart } = useApp();
  const [results, setResults] = useState<DoshaResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [guideResponses, setGuideResponses] = useState<GuideResponse[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDoshaResultsForMember(user.uid)
      .then(setResults)
      .finally(() => setLoading(false));
    getGuideResponsesForMember(user.uid).then(setGuideResponses).catch(() => setGuideResponses([]));
  }, [user]);

  // Pull the Shopify catalog so we can surface the oil matching the member's
  // dominant dosha. Failures are silent — the recommendation simply falls
  // back to a link to the body-oils collection.
  useEffect(() => {
    if (!isShopifyConfigured) return;
    getProducts(50, lang).then(setProducts).catch(() => setProducts([]));
  }, [lang]);

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  // Latest saved result drives the % breakdown. Older results fall into the
  // history list below.
  const latest = results[0];
  const dominant = latest?.dominant || member?.dosha || '';

  // Rank the three doshas by percentage. Used to surface a "second dominant"
  // oil recommendation when the runner-up is meaningful (≥ 30%).
  const rankedDoshas: Array<{ name: string; pct: number }> = latest
    ? (['vata', 'pitta', 'kapha'] as const)
        .map(d => ({ name: d.charAt(0).toUpperCase() + d.slice(1), pct: latest[d] || 0 }))
        .sort((a, b) => b.pct - a.pct)
    : [];
  const SECONDARY_THRESHOLD = 30;
  const secondary = rankedDoshas[1] && rankedDoshas[1].pct >= SECONDARY_THRESHOLD
    ? rankedDoshas[1]
    : null;

  const addOilToCart = (product: ShopifyProduct) => {
    const variant = product.variants.find(v => v.availableForSale) || product.variants[0];
    if (!variant) return;
    addToCart({
      id: product.id,
      variantId: variant.id,
      title: product.title,
      type: product.productType || 'Huile Corporelle',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: product.featuredImage?.url,
    });
  };

  // Ayurvedic action phrase per dosha — drives the copy above the oil
  // recommendation so it reads as guidance, not a product pitch.
  const doshaGuidance: Record<string, { fr: string; en: string; color: string }> = {
    Vata:  { fr: 'Enraciner · Réchauffer · Apaiser',  en: 'Ground · Warm · Soothe',        color: '#8F9779' },
    Pitta: { fr: 'Rafraîchir · Apaiser · Adoucir',    en: 'Cool · Soothe · Soften',        color: '#BC4A3C' },
    Kapha: { fr: 'Activer · Alléger · Stimuler',      en: 'Activate · Lighten · Stimulate', color: '#4A7C9D' },
  };
  const guidance = doshaGuidance[dominant as keyof typeof doshaGuidance];

  return (
    <div>
      {latest || member?.dosha ? (
        <>
          {/* Headline: dominant dosha + accent color */}
          <div
            className="text-center rounded-[20px] p-8 md:p-10 mb-6 border"
            style={{
              borderColor: guidance ? `${guidance.color}55` : 'rgba(187, 154, 94,0.2)',
              background: guidance
                ? `linear-gradient(135deg, ${guidance.color}22 0%, ${guidance.color}0A 100%)`
                : 'linear-gradient(135deg, rgba(187, 154, 94,0.1), rgba(187, 154, 94,0.05))',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B4A2F] font-bold mb-3">
              {lang === 'FR' ? 'Votre dominance' : 'Your dominance'}
            </p>
            <h2 className="text-5xl font-serif text-[#293027] dark:text-white mb-2">{dominant}</h2>
            {guidance && (
              <p className="font-serif italic text-[#293027]/70 dark:text-white/70">
                {lang === 'FR' ? guidance.fr : guidance.en}
              </p>
            )}
          </div>

          {/* Percentages — three big numbers with proportional bars. Built
              straight from the latest DoshaResult, which stores percentages,
              not raw scores. */}
          {latest && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(['vata', 'pitta', 'kapha'] as const).map(d => {
                const pct = latest[d] || 0;
                const label = d.charAt(0).toUpperCase() + d.slice(1);
                const color = doshaGuidance[label]?.color || '#BA7B39';
                const isDominant = label.toLowerCase() === dominant.toLowerCase();
                return (
                  <div
                    key={d}
                    className={`rounded-2xl p-5 border transition-colors ${
                      isDominant
                        ? 'border-[#BA7B39]/50 bg-[#BA7B39]/5 dark:bg-[#BA7B39]/10'
                        : 'border-[#293027]/10 dark:border-white/10 bg-white dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#293027]/70 dark:text-white/70">{label}</span>
                      <span className="text-3xl md:text-4xl font-serif text-[#293027] dark:text-white">
                        {pct}<span className="text-base text-[#293027]/50 dark:text-white/50">%</span>
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-[#293027]/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rituals — primary (dominant) + runner-up when ≥ 30%. Same
              card renderer for both; each carries its own PDF download. */}
          {(() => {
            const memberName = member?.displayName || user?.displayName || user?.email?.split('@')[0] || '';

            const downloadPdf = (doshaName: string) => {
              const r = ritualForDosha(doshaName);
              if (!r) return;
              const title = lang === 'FR' ? r.titleFR : r.titleEN;
              const subtitle = lang === 'FR' ? r.subtitleFR : r.subtitleEN;
              const moment = lang === 'FR' ? r.momentFR : r.momentEN;
              const steps = lang === 'FR' ? r.stepsFR : r.stepsEN;
              // 1-page A4 branded PDF. Helvetica avoids font-embedding weight.
              const doc = new jsPDF({ unit: 'pt', format: 'a4' });
              const W = doc.internal.pageSize.getWidth();
              const margin = 56;
              let y = margin;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(3);
              doc.line(margin, y, margin + 72, y); y += 24;
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.setTextColor(212, 175, 55);
              doc.text((lang === 'FR' ? 'VOTRE RITUEL · ' : 'YOUR RITUAL · ') + doshaName.toUpperCase(), margin, y);
              y += 28;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(28);
              doc.setTextColor(11, 26, 54); doc.text(title, margin, y); y += 22;
              doc.setFont('helvetica', 'italic'); doc.setFontSize(13);
              doc.setTextColor(90, 90, 100);
              const subLines = doc.splitTextToSize(subtitle, W - margin * 2);
              doc.text(subLines, margin, y); y += subLines.length * 18 + 8;
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.setTextColor(11, 26, 54); doc.text(moment.toUpperCase(), margin, y); y += 24;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.6);
              doc.line(margin, y, W - margin, y); y += 24;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
              doc.setTextColor(20, 20, 30);
              steps.forEach((step, i) => {
                const prefix = `${i + 1}.  `;
                const prefixWidth = doc.getTextWidth(prefix);
                doc.setFont('helvetica', 'bold'); doc.setTextColor(212, 175, 55);
                doc.text(prefix, margin, y);
                doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 30);
                const lines = doc.splitTextToSize(step, W - margin * 2 - prefixWidth);
                doc.text(lines, margin + prefixWidth, y);
                y += lines.length * 16 + 10;
              });
              y = doc.internal.pageSize.getHeight() - margin;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.5);
              doc.line(margin, y - 20, margin + 72, y - 20);
              doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
              doc.setTextColor(130, 130, 140);
              doc.text(
                (memberName ? `${memberName} · ` : '')
                  + `Krystine St-Laurent · Inspirata Ayurveda · ${new Date().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA')}`,
                margin, y);
              const safeName = (memberName || 'mon-rituel').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              doc.save(`rituel-${doshaName.toLowerCase()}-${safeName}.pdf`);
            };

            const renderRitualCard = (doshaName: string, variant: 'primary' | 'secondary', pct: number | null) => {
              const r = ritualForDosha(doshaName);
              if (!r) return null;
              return (
                <div
                  key={`${variant}-${doshaName}`}
                  className="rounded-[20px] p-6 md:p-8 mb-6 border"
                  style={{
                    borderColor: `${r.accent}55`,
                    background: `linear-gradient(135deg, ${r.accent}18 0%, ${r.accent}06 100%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: r.accent }}>
                        {variant === 'primary'
                          ? (lang === 'FR' ? 'Votre rituel' : 'Your ritual')
                          : (lang === 'FR' ? 'En accompagnement · second dosha' : 'As a companion · second dosha')}
                        <span className="ml-2 text-[#293027]/50 dark:text-white/50 font-normal tracking-normal normal-case">
                          · {doshaName}{pct !== null ? ` ${pct}%` : ''}
                        </span>
                      </p>
                      <h3 className="font-serif text-2xl md:text-3xl text-[#293027] dark:text-white mb-1">
                        {lang === 'FR' ? r.titleFR : r.titleEN}
                      </h3>
                      <p className="font-serif italic text-[#293027]/75 dark:text-white/75">
                        {lang === 'FR' ? r.subtitleFR : r.subtitleEN}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadPdf(doshaName)}
                      className="inline-flex items-center gap-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors shadow-md"
                    >
                      <i className="fa-solid fa-file-pdf" />
                      {lang === 'FR' ? 'Télécharger' : 'Download'}
                    </button>
                  </div>
                  <p className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 text-[#293027]/70 dark:text-white/70 mb-5">
                    <i className="fa-regular fa-clock mr-1.5" />
                    {lang === 'FR' ? r.momentFR : r.momentEN}
                  </p>
                  <ol className="space-y-3 text-sm text-[#293027]/85 dark:text-white/85 leading-relaxed">
                    {(lang === 'FR' ? r.stepsFR : r.stepsEN).map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-serif"
                          style={{ backgroundColor: `${r.accent}22`, color: r.accent }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            };

            const primaryPct = latest ? (latest[dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha'] ?? null) : null;
            return (
              <div className={`mb-4 ${secondary ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3' : ''}`}>
                {renderRitualCard(dominant, 'primary', primaryPct)}
                {secondary && renderRitualCard(secondary.name, 'secondary', secondary.pct)}
              </div>
            );
          })()}

          {/* Oil recommendation(s). Always render the primary (dominant).
              Also render the runner-up when it's ≥ 30% — a true bi-doshic
              profile benefits from both oils. Same card renderer for both;
              the only differences are the kicker label and the percentage
              shown under the name. */}
          {(() => {
            const renderOilCard = (
              doshaName: string,
              kickerFR: string,
              kickerEN: string,
              pct: number | null,
              mb: string,
            ) => {
              const product = doshaName ? findOilForDosha(products, doshaName) : undefined;
              const variant = product?.variants.find(v => v.availableForSale) || product?.variants[0];
              const priceText = variant ? formatMoney(variant.price, lang) : '';
              const soldOut = product ? !product.availableForSale : false;
              return (
                <div className={`rounded-[20px] border border-[#293027]/10 dark:border-white/10 bg-white dark:bg-white/5 p-6 md:p-8 ${mb}`}>
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    {/* Image */}
                    <div
                      className="w-32 h-40 md:w-36 md:h-48 rounded-xl bg-cover bg-center shrink-0 bg-[#EEE7DB] dark:bg-[#293027] border border-[#293027]/5 dark:border-white/10"
                      style={{ backgroundImage: product?.featuredImage?.url ? `url(${product.featuredImage.url})` : undefined }}
                    />
                    {/* Copy */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B4A2F] font-bold mb-2">
                        {lang === 'FR' ? kickerFR : kickerEN}
                        {pct !== null && <span className="text-[#293027]/50 dark:text-white/50 font-normal tracking-normal normal-case ml-2">· {doshaName} {pct}%</span>}
                      </p>
                      {product ? (
                        <>
                          <h3 className="text-xl md:text-2xl font-serif text-[#293027] dark:text-white mb-1">{product.title}</h3>
                          {product.productType && (
                            <p className="text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 mb-3">{product.productType}</p>
                          )}
                          <p className="text-lg font-serif text-[#8B4A2F] mb-4">{priceText}</p>
                          <div className="flex flex-wrap gap-3">
                            {!soldOut && variant ? (
                              <button
                                type="button"
                                onClick={() => addOilToCart(product)}
                                className="inline-flex items-center gap-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors shadow-md"
                              >
                                <i className="fa-solid fa-basket-shopping text-[10px]" />
                                {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#293027]/10 dark:bg-white/10 text-[#293027]/60 dark:text-white/60">
                                {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                              </span>
                            )}
                            <a
                              href="/boutique/huiles-corporelles"
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#293027]/15 dark:border-white/15 text-[#293027]/70 dark:text-white/70 font-bold uppercase tracking-widest text-[11px] hover:border-[#BA7B39] hover:text-[#8B4A2F] transition-colors"
                            >
                              {lang === 'FR' ? 'Voir la collection' : 'View the collection'}
                              <i className="fa-solid fa-arrow-right text-[9px]" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl md:text-2xl font-serif text-[#293027] dark:text-white mb-2">
                            {lang === 'FR' ? `Huile Corporelle ${doshaName}` : `${doshaName} Body Oil`}
                          </h3>
                          <p className="text-[#293027]/60 dark:text-white/60 mb-4 font-serif italic text-sm">
                            {lang === 'FR'
                              ? "La formule qui correspond à cette dominance est bientôt en ligne — explorez la collection pour choisir celle qui vous appelle."
                              : 'The matching formula is coming online soon — explore the collection to choose the one that calls to you.'}
                          </p>
                          <a
                            href="/boutique/huiles-corporelles"
                            className="inline-flex items-center gap-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors"
                          >
                            {lang === 'FR' ? 'Voir les huiles corporelles' : 'View body oils'}
                            <i className="fa-solid fa-arrow-right text-[9px]" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            const primaryPct = latest ? (latest[dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha'] ?? null) : null;
            return (
              <div className={secondary ? 'grid gap-6 mb-10 md:grid-cols-2 xl:grid-cols-3' : ''}>
                {renderOilCard(
                  dominant,
                  'Huile recommandée pour vous',
                  'Oil recommended for you',
                  primaryPct,
                  secondary ? '' : 'mb-10',
                )}
                {secondary && renderOilCard(
                  secondary.name,
                  'En accompagnement · votre second dosha',
                  'As a companion · your second dosha',
                  secondary.pct,
                  '',
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="text-center py-12 mb-4">
          <i className="fa-solid fa-circle-nodes text-4xl text-[#293027]/30 dark:text-white/30 mb-4 block" />
          <p className="text-[#293027]/60 dark:text-white/60 font-serif italic mb-6">
            {lang === 'FR' ? 'Vous n\'avez pas encore complété le Quiz Dosha.' : "You haven't taken the Dosha Quiz yet."}
          </p>
          <a href="/quiz" className="inline-flex items-center gap-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#BA7B39] hover:text-[#293027] transition-colors">
            {lang === 'FR' ? 'Faire le quiz' : 'Take the quiz'} <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      )}

      {results.length > 0 && (
        <>
          <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">
            {lang === 'FR' ? 'Historique des résultats' : 'Results history'}
          </h3>
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.id} className="border border-[#293027]/5 dark:border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#293027] dark:text-white">
                    <span className="text-[#8B4A2F] font-bold capitalize">{r.dominant}</span>
                    <span className="text-[#293027]/50 dark:text-white/50 ml-3 text-xs font-mono">V{r.vata}%·P{r.pitta}%·K{r.kapha}%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">
                    {r.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Past "Laissez-vous guider" routings — surfaced here so the member's
          self-knowledge journey lives in one place. */}
      {guideResponses.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">
            <i className="fa-solid fa-compass text-[#8B4A2F] mr-2" />
            {lang === 'FR' ? 'Vos parcours suggérés' : 'Your suggested paths'}
          </h3>
          <div className="space-y-3">
            {guideResponses.map(g => (
              <div key={g.id} className="border border-[#293027]/5 dark:border-white/5 rounded-xl p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-sm text-[#293027] dark:text-white">
                    <span className="text-[#8B4A2F] font-bold">{g.recommendationLabel || g.recommendationId}</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">
                    {g.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </p>
                </div>
                {g.answers?.length > 0 && (
                  <details className="text-xs text-[#293027]/60 dark:text-white/60">
                    <summary className="cursor-pointer hover:text-[#8B4A2F] transition-colors">
                      {lang === 'FR' ? 'Voir les réponses' : 'View answers'}
                    </summary>
                    <ul className="mt-2 space-y-1.5 pl-4 list-disc">
                      {g.answers.map((a, i) => (
                        <li key={i}>
                          <span className="font-bold">{a.questionLabel || a.qid}</span>
                          {' — '}
                          <span className="italic">{a.optionLabel || a.optionId}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
