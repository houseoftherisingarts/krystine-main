import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { suivreLeMur, suivrePublicationsDe, type PostMur } from '../firebase/mur';
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
import MurSocial from '../components/communaute/MurSocial';
import ClientArchives from './client/ClientArchives';
import ClientLoyalty from './client/ClientLoyalty';
import ClientFormations from './client/ClientFormations';
import ClientTelechargements from './client/ClientTelechargements';
import ClientRediffusions from './client/ClientRediffusions';
import ProblemeTechnique from '../components/client/ProblemeTechnique';
import ClientPreferences from './client/ClientPreferences';
import { subscribeToMemberPoints, type PointsBalance, DEFAULT_POINTS_BALANCE } from '../firebase/points';

type Tab = 'feed' | 'profile' | 'amis' | 'orders' | 'formations' | 'rediffusions' | 'telechargements' | 'loyalty' | 'dosha' | 'archives' | 'messagerie';

// L'onglet Profil en lecture : la fiche (courriel, téléphone, dosha, badges)
// et surtout LE MUR de la personne. L'édition s'ouvre en cliquant sur la
// photo de la bannière.
const ProfilVue: React.FC<{ uid: string; member: MemberDoc | null; email: string; lang: string }> = ({ uid, member, email, lang }) => {
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
const BanniereUpload: React.FC<{ uid: string; isDefaultBanner?: boolean }> = ({ uid, isDefaultBanner }) => {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!isDefaultBanner) return;
    try {
      if (localStorage.getItem(FLASH_KEY)) return;
      setFlash(true);
      localStorage.setItem(FLASH_KEY, '1');
    } catch { /* stockage indisponible, tant pis pour le flash */ }
  }, [isDefaultBanner]);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadImage(file, 'bannieres');
      await updateMember(uid, { bannerURL: url });
      window.location.reload();
    } finally { setBusy(false); }
  };
  return (
    <label className={`absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/30 bg-[#151d19]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-[#151d19]/60 ${flash ? 'banniere-flash' : ''}`}>
      <i className="fa-solid fa-image" />
      {busy ? 'Téléversement…' : 'Changer la bannière'}
      <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
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
    </label>
  );
};

// Le rail droit : la vie de la communauté entre dans l'espace personnel.
const RailCommunaute: React.FC<{ lang: string; uid: string }> = ({ lang, uid }) => {
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => suivreLeMur('communaute', p => setPosts(p.slice(0, 5)), 5), []);
  return (
    <aside className="space-y-4">
      <div className="rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {lang === 'FR' ? 'La communauté' : 'Community'}
        </p>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-[#38403a]/50 dark:text-white/50">
            {lang === 'FR' ? 'Les premières publications arrivent bientôt.' : 'First posts coming soon.'}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {posts.map(p => (
              <Link key={p.id} to="/espace" className="block rounded-[14px] bg-white/50 p-3 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
                <p className="text-xs font-semibold text-[#293027] dark:text-white">{p.nom}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#38403a]/60 dark:text-white/60">{p.texte}</p>
              </Link>
            ))}
          </div>
        )}
        <Link to="/espace" className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:text-[#BA7B39]">
          {lang === 'FR' ? 'Voir le feed' : 'See the feed'} <i className="fa-solid fa-arrow-right" />
        </Link>
      </div>
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
  // Par défaut, l'espace s'ouvre sur le feed de la communauté, pas sur le mur personnel.
  const [tab, setTab] = useState<Tab>('feed');
  const [editOuvert, setEditOuvert] = useState(false);
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
              ? 'Le feed de la communauté, vos formations, vos messages et vos cadeaux de parrainage vous attendent de l\'autre côté.'
              : 'The community feed, your courses, your messages, and your referral gifts are waiting on the other side.'}
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
    { id: 'feed',     label: 'Feed', icon: 'fa-newspaper' },
    { id: 'profile',  label: lang === 'FR' ? 'Profil' : 'Profile', icon: 'fa-user' },
    { id: 'amis',     label: lang === 'FR' ? 'Amis' : 'Friends', icon: 'fa-user-group' },
    { id: 'orders',   label: lang === 'FR' ? 'Commandes' : 'Orders', icon: 'fa-box' },
    { id: 'formations', label: lang === 'FR' ? 'Mes formations' : 'My courses', icon: 'fa-graduation-cap' },
    { id: 'rediffusions', label: lang === 'FR' ? 'Rediffusions' : 'Replays', icon: 'fa-circle-play' },
    { id: 'telechargements', label: lang === 'FR' ? 'Téléchargements' : 'Downloads', icon: 'fa-download' },
    { id: 'loyalty',  label: lang === 'FR' ? 'Points' : 'Points', icon: 'fa-seedling' },
    { id: 'dosha',    label: lang === 'FR' ? 'Dosha' : 'Dosha', icon: 'fa-circle-nodes' },
    { id: 'archives', label: lang === 'FR' ? 'Infolettres' : 'Newsletters', icon: 'fa-envelope-open-text' },
    { id: 'messagerie', label: lang === 'FR' ? 'Messagerie' : 'Messages', icon: 'fa-comments' },
  ];

  const banniere = member?.bannerURL || '/compte/bienvenue-bureau.webp';

  return (
    <div className="min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24">
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
        <BanniereUpload uid={user.uid} isDefaultBanner={!member?.bannerURL} />
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
                  <i className="fa-solid fa-seedling mr-1" />
                  {pointsBalance.balance} {lang === 'FR' ? 'points' : 'points'}
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
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? 'border-[#BA7B39] text-[#8B4A2F] dark:text-[#d9a05b]'
                  : 'border-transparent text-[#38403a]/55 hover:text-[#8B4A2F] dark:text-white/55 dark:hover:text-[#d9a05b]'
              }`}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Le contenu en deux colonnes : l'onglet à gauche, le rail vivant à droite */}
      <div className="mt-8 grid w-full gap-6 px-6 md:px-8 lg:px-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-[#293027]/55">
          {tab === 'feed'     && <MurSocial fil="communaute" titre="Feed" />}
          {tab === 'profile'  && <ProfilVue uid={user.uid} member={member} email={user.email || ''} lang={lang} />}
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
              <>
                {renderOilCard(
                  dominant,
                  'Huile recommandée pour vous',
                  'Oil recommended for you',
                  primaryPct,
                  secondary ? 'mb-4' : 'mb-10',
                )}
                {secondary && renderOilCard(
                  secondary.name,
                  'En accompagnement · votre second dosha',
                  'As a companion · your second dosha',
                  secondary.pct,
                  'mb-10',
                )}
              </>
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
