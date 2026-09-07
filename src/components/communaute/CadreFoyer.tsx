import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { type MemberDoc } from '../../firebase/firestore';
import { logout } from '../../firebase/auth';
import { subscribeToMemberPoints, type PointsBalance, DEFAULT_POINTS_BALANCE } from '../../firebase/points';
import { niskas, skinParCle } from '../../lib/pointsConfig';
import EffetsSkin from '../client/skins/EffetsSkin';
import MotifsSkin from '../client/skins/MotifsSkin';
import PieceNiska from '../client/PieceNiska';
import ClientParrainage from '../../pages/client/ClientParrainage';
import { useCercleDuFoyer, useMembreDuFoyer } from './ReserveAuFoyer';
import CarteSociale, { RangeePersonne } from './CarteSociale';
import { CHEMINS_FOYER } from './chemins';
import '../client/skins.css';

// ─── La coquille du Foyer social ─────────────────────────────────────────────
// Copie fidèle de la coquille de l'espace client (src/pages/ClientPortal.tsx,
// section « return » de la ligne 534) : même enveloppe crème avec le skin de
// la membre, même bannière pleine largeur avec l'avatar qui la chevauche, même
// rangée d'onglets, mêmes gouttières. Une seule signalétique en plus : la
// pastille laiton « Foyer d'Origine » près du nom et le filet laiton sous les
// onglets. Alex, 6 septembre 2026 : « la même chose, juste dans un espace
// différent, un espace exclusif ».
//
// Sous les onglets, la structure de Facebook : une colonne étroite de
// raccourcis à gauche, la page au centre, le cercle et le parrainage à droite.
// Sous lg, les trois colonnes s'empilent dans l'ordre naturel; les raccourcis
// deviennent une rangée de pastilles qui défile.
//
// Chaque classe de couleur est une classe que skins.css repeint (voir
// docs/canon-espace-client.md, § 15). Jamais de `lg:bg-…` sur une couleur : les
// variantes responsives ne sont pas repeintes.

export type OngletFoyer = 'programme' | 'fil' | 'membres' | 'messages' | 'profil';
// 'profil' n'a plus d'onglet ni de raccourci : la fiche d'une membre s'ouvre
// depuis la liste, et chacune modifie la sienne dans /compte. La valeur reste
// pour que la fiche sache qu'aucun onglet n'est allumé.

interface Props {
  /** L'onglet allumé. Aucun sur la fiche d'une autre membre. */
  onglet?: OngletFoyer;
  /** Vrai par défaut : sans achat du Foyer, la page entière renvoie à la vente. */
  garde?: boolean;
  /** L'entrée de la formation : le centre prend toute la largeur restante, sans
   *  carte de verre autour (la page apporte ses propres surfaces) et sans
   *  colonne de droite. Les onglets et la colonne de gauche restent. */
  large?: boolean;
  /** La fiche publique d'une autre membre : la bannière montre cette personne, comme la couverture d'un profil Facebook. */
  personne?: MemberDoc | null;
  /** Remplace la colonne de droite (cercle + parrainage). */
  droite?: React.ReactNode;
  children: React.ReactNode;
}

const CadreFoyer: React.FC<Props> = ({ onglet, garde = true, large, personne, droite, children }) => {
  const { user, member, isAdmin, setSignInOpen, lang } = useApp();
  const fr = lang === 'FR';
  const location = useLocation();
  const reduce = useReducedMotion();
  const foyer = useMembreDuFoyer();
  const [solde, setSolde] = useState<PointsBalance>(DEFAULT_POINTS_BALANCE);
  // Le cercle du Foyer : les acheteuses du Foyer, et personne d'autre.
  const { membres: cercle } = useCercleDuFoyer();

  useEffect(() => { if (!user) return; return subscribeToMemberPoints(user.uid, setSolde); }, [user]);

  if (!user) {
    // La carte « Se connecter » de l'espace client (ClientPortal.tsx:474-500), mot pour mot, avec le nom du lieu.
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6 pb-24 pt-32 dark:bg-[#151d19]"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(250,247,240,0.95), transparent 60%), #EEE7DB' }}
      >
        <div className="w-full max-w-md rounded-[24px] border border-white/60 bg-white/55 px-8 py-12 text-center shadow-[0_30px_80px_-30px_rgba(41,48,39,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#293027]/55">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F] dark:text-[#d9a05b]">{fr ? 'Le Foyer d’Origine' : 'The Origine Hearth'}</p>
          <h1 className="mt-3 font-serif text-3xl text-[#293027] dark:text-white" style={{ letterSpacing: '-0.01em' }}>
            {fr ? 'Autour du feu' : 'Around the fire'}
          </h1>
          <div className="mx-auto mt-5 h-px w-16 bg-[#BA7B39]" aria-hidden="true" />
          <p className="mt-5 text-sm leading-relaxed text-[#38403a]/70 dark:text-white/65">
            {fr ? 'Le fil, les membres, les groupes et vos messages vous attendent de l’autre côté.' : 'The feed, the members, the groups and your messages are waiting on the other side.'}
          </p>
          <button
            onClick={() => setSignInOpen(true)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-10 py-4 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_10px_28px_-10px_rgba(186,123,57,0.8)] transition-[background-color,transform] hover:bg-[#9c6630] active:scale-[0.98]"
          >
            <i className="fa-solid fa-arrow-right-to-bracket" /> {fr ? 'Se connecter' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  // Le paywall, en une porte : une page du Foyer ne s'ouvre pas sans l'achat.
  // On attend de savoir (foyer === null) plutôt que de faire clignoter la
  // page de vente sous les yeux d'une membre.
  if (garde) {
    if (foyer === null) return <div className="min-h-screen bg-[#EEE7DB] dark:bg-[#151d19]" />;
    if (!foyer) return <Navigate to={CHEMINS_FOYER.vente} replace />;
  }

  const moi = user.uid;
  const autre = personne && personne.uid !== moi ? personne : null;
  const fiche = autre ?? member;
  // Le skin est toujours le mien, même sur la fiche d'une autre : c'est mon décor.
  const skinActif = member?.personnalisation?.skin || '';
  const skin = skinActif && skinParCle(skinActif) ? `skin-${skinActif}` : '';
  const nom = fiche?.displayName || (autre ? (fr ? 'Membre' : 'Member') : (user.displayName || user.email?.split('@')[0] || ''));
  const photo = autre ? autre.photoURL : (member?.photoURL || user.photoURL || undefined);
  const auFoyer = autre ? cercle.some(c => c.uid === autre.uid) : (foyer === true || cercle.some(c => c.uid === moi));
  const vue = new URLSearchParams(location.search).get('vue');

  const onglets: Array<{ id: OngletFoyer; label: string; icon: string; to: string }> = [
    { id: 'programme', label: fr ? 'Le programme' : 'The programme', icon: 'fa-book-open', to: CHEMINS_FOYER.programme },
    { id: 'fil',      label: fr ? 'Fil' : 'Feed',            icon: 'fa-newspaper',    to: CHEMINS_FOYER.fil },
    { id: 'membres',  label: fr ? 'Membres' : 'Members',     icon: 'fa-user-group',   to: CHEMINS_FOYER.membres },
    { id: 'messages', label: 'Messages',                     icon: 'fa-comments',     to: CHEMINS_FOYER.messages },
  ];
  const raccourcis: Array<{ cle: string; label: string; icon: string; to: string; actif: boolean }> = [
    { cle: 'amies',    label: fr ? 'Amies' : 'Friends',         icon: 'fa-heart',        to: CHEMINS_FOYER.amies,        actif: onglet === 'membres' && vue === 'amies' },
    { cle: 'messages', label: 'Messages',                       icon: 'fa-comments',     to: CHEMINS_FOYER.messages,     actif: onglet === 'messages' },
    { cle: 'badges',   label: 'Badges',                         icon: 'fa-award',        to: `${CHEMINS_FOYER.profil(moi)}#badges`, actif: false },
  ];
  const ongletClasse = (actif: boolean) => `flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3.5 text-[10px] font-bold uppercase tracking-wide transition-colors 2xl:px-3 2xl:text-[11px] 2xl:tracking-wider ${
    actif ? 'border-[#BA7B39] text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-transparent text-[#38403a]/55 hover:text-[#8B4A2F] dark:text-white/55 dark:hover:text-[#d9a05b]'
  }`;

  const avatarClasse = 'relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#EEE7DB] bg-cover bg-center bg-[#EEE7DB] shadow-xl md:h-32 md:w-32 dark:border-[#151d19]';
  const avatarStyle = photo ? { backgroundImage: `url(${photo})` } : undefined;
  const avatarVide = !photo && <i className="fa-solid fa-user text-3xl text-[#293027]/30" />;

  return (
    <div className={`relative isolate min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24 ${skin}`}>
      {skinActif && <EffetsSkin skin={skinActif} />}
      {skinActif && <MotifsSkin skin={skinActif} />}

      {/* La bannière du Foyer : LE feu du site (la même vidéo que la page de
          vente, /foyer/firepit.mp4 avec son image fixe), la même sur toutes
          les pages du Foyer, quelle que soit la bannière choisie ailleurs.
          Aucun backdrop-blur par-dessus une scène animée : un voile en
          dégradé, du vert profond au noir chaud, porte le nom et les onglets.
          Sous prefers-reduced-motion, l'image fixe remplace la vidéo. */}
      <div className="relative h-80 w-full overflow-hidden md:h-[25rem]">
        {reduce ? (
          <img src="/foyer/firepit-poster.webp" alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            className="h-full w-full object-cover"
            src="/foyer/firepit.mp4"
            poster="/foyer/firepit-poster.webp"
            autoPlay muted loop playsInline preload="metadata"
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(20,19,17,0.9) 0%, rgba(20,19,17,0.68) 28%, rgba(40,53,47,0.42) 60%, rgba(40,53,47,0.58) 100%)' }}
        />
        {!autre && (
          <div className="absolute left-6 top-5 md:left-8 md:top-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>
              {fr ? 'Le Foyer d’Origine' : 'The Origine Hearth'}
            </p>
            <p className="mt-1 font-serif text-xl text-[#EEE7DB] md:text-2xl" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}>
              {fr ? 'Bienvenue autour du feu' : 'Welcome around the fire'}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0">
          <div className="flex items-end gap-5 px-6 pb-5 md:px-8 lg:px-10">
            {autre ? (
              <div className={avatarClasse} style={avatarStyle}>{avatarVide}</div>
            ) : (
              <Link to={CHEMINS_FOYER.profil(moi)} title={fr ? 'Mon profil' : 'My profile'} className={avatarClasse} style={avatarStyle}>{avatarVide}</Link>
            )}
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="flex items-center gap-2.5 truncate font-serif text-3xl text-white md:text-4xl" style={{ letterSpacing: '-0.01em', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>
                <span className="truncate">{nom}</span>
                {(fiche?.verifie || (!autre && isAdmin)) && (
                  <i className="fa-solid fa-circle-check shrink-0 text-xl text-[#4da3ff]" title={fr ? 'Profil vérifié' : 'Verified profile'} />
                )}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {auFoyer && (
                  <span className="rounded-full bg-[#BA7B39] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#293027]">
                    <i className="fa-solid fa-fire mr-1" /> {fr ? 'Foyer d’Origine' : 'Origine Hearth'}
                  </span>
                )}
                {fiche?.dosha && (
                  <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    <i className="fa-solid fa-circle-nodes mr-1" /> {fiche.dosha}
                  </span>
                )}
                {!autre && (
                  <Link
                    to="/compte?onglet=loyalty"
                    className="rounded-full bg-[#BA7B39] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#293027] transition-colors hover:bg-[#d9a05b]"
                  >
                    <PieceNiska size={14} className="mr-1 inline-block align-[-2px]" />
                    {niskas(solde.balance, lang)}
                  </Link>
                )}
                {!autre && <span className="hidden truncate text-xs text-white/70 sm:inline">{user.email}</span>}
              </div>
            </div>
            {!autre && (
              <div className="hidden shrink-0 items-center gap-4 pb-2 md:flex">
                {isAdmin && (
                  <a href="/admin" className="text-xs uppercase tracking-widest text-[#d9a05b] hover:text-white">
                    <i className="fa-solid fa-gauge-high mr-2" />{fr ? 'Espace admin' : 'Admin space'}
                  </a>
                )}
                <button onClick={logout} className="text-xs uppercase tracking-widest text-white/60 hover:text-red-300">
                  <i className="fa-solid fa-right-from-bracket mr-2" />{fr ? 'Déconnexion' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Les onglets du Foyer, une seule rangée qui défile, puis le filet laiton : la signalétique de l'espace exclusif */}
      <div className="border-b border-[#38403a]/10 bg-white/45 backdrop-blur-xl dark:border-white/10 dark:bg-[#293027]/45">
        <div className="flex flex-nowrap gap-1 overflow-x-auto px-6 md:px-8 lg:px-10">
          {onglets.map(t => (
            <Link key={t.id} to={t.to} className={ongletClasse(onglet === t.id)} aria-current={onglet === t.id ? 'page' : undefined}>
              <i className={`fa-solid ${t.icon} hidden 2xl:inline`} /> {t.label}
            </Link>
          ))}
          <Link to="/compte" className={`ml-auto ${ongletClasse(false)}`}>
            <i className="fa-solid fa-arrow-left" /> {fr ? 'Retour au compte' : 'Back to my account'}
          </Link>
        </div>
      </div>
      <div className="h-0.5 w-full bg-[#BA7B39]" aria-hidden="true" />

      {/* La colonne de gauche suit partout : raccourcis puis le cercle. À droite,
          le parrainage, sauf à l'entrée de la formation qui prend la largeur. */}
      <div className={`mt-8 grid w-full gap-6 px-6 md:px-8 lg:px-10 ${large
        ? 'lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]'
        : 'lg:grid-cols-[200px_minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,1fr)_320px]'}`}>
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[24px] border border-white/60 bg-white/55 p-3 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label={fr ? 'Raccourcis du Foyer' : 'Hearth shortcuts'}>
            {raccourcis.map(r => (
              <Link
                key={r.cle}
                to={r.to}
                className={`flex shrink-0 items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[#293027] transition-colors hover:bg-[#BA7B39]/10 dark:text-white ${r.actif ? 'bg-[#BA7B39]/10' : ''}`}
              >
                <span className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-full ${r.actif ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'}`}>
                  <i className={`fa-solid ${r.icon} text-[13px]`} />
                </span>
                {r.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Autour du feu : le cercle du Foyer, sous les raccourcis. Sous lg, la
            colonne devient une rangée de pastilles et le cercle se retire :
            il repousserait la page de deux écrans, et l'onglet Membres, juste
            au-dessus, mène à la liste entière. Le lien « Toutes » se cognait
            au titre dans une colonne de 200 px : l'onglet fait ce travail. */}
        <CarteSociale
            panneau
            className="hidden lg:block"
            titre={fr ? 'Autour du feu' : 'Around the fire'}
          >
            {cercle.length === 0 ? (
              <p className="text-sm text-[#38403a]/50 dark:text-white/50">{fr ? 'Le cercle se forme.' : 'The circle is forming.'}</p>
            ) : (
              <div className="space-y-0.5">
                {cercle.slice(0, 8).map(c => {
                  const nomC = c.nom;
                  return (
                    <RangeePersonne
                      key={c.uid}
                      compact
                      uid={c.uid}
                      nom={nomC}
                      photo={c.photo}
                      verifie={c.verifie}
                      sousTitre={c.espaceOuvert ? undefined : (fr ? 'N’a pas encore ouvert son espace' : 'Has not opened her space yet')}
                      action={c.uid !== moi ? (
                        <Link
                          to={CHEMINS_FOYER.conversation(c.uid)}
                          aria-label={fr ? `Écrire à ${nomC}` : `Write to ${nomC}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B4A2F] transition-colors hover:bg-[#BA7B39]/15 dark:text-[#d9a05b]"
                        >
                          <i className="fa-regular fa-comment" />
                        </Link>
                      ) : undefined}
                    />
                  );
                })}
              </div>
            )}
          </CarteSociale>
        </aside>

        <main className="min-w-0">
          {large ? children : (
            <div className="space-y-4 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-white/5">
              {children}
            </div>
          )}
        </main>

        {!large && (
          <aside className="min-w-0 space-y-4">
            {droite ?? <ClientParrainage uid={moi} lang={lang} />}
          </aside>
        )}
      </div>
    </div>
  );
};

export default CadreFoyer;
