import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';

// ─── La carte du Foyer social ────────────────────────────────────────────────
// La brique de tout écran social du Foyer d'Origine (fil, membres, fiche,
// messagerie, groupes). Deux habits, tous deux copiés du canon de /compte
// (docs/canon-espace-client.md) : la carte de la boutique par défaut, le
// panneau de verre des rails quand `panneau` est posé. L'en-tête est le titre
// en petites capitales laiton de tous les onglets de l'espace client.
//
// Toutes les classes de couleur sont celles que skins.css repeint : un skin
// habille cette carte comme il habille /compte. Ne jamais y glisser une autre
// crème, un autre laiton ni un `lg:bg-…` (les variantes responsives ne sont
// pas repeintes).

const CARTE = 'rounded-[18px] border border-[#293027]/10 bg-white/60 p-5 md:p-6 dark:border-white/10 dark:bg-white/5';
const PANNEAU = 'rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55';

/** Le titre de section en petites capitales, tel quel dans tous les onglets de /compte. */
export const PETITES_CAPITALES = 'text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]';

const CarteSociale: React.FC<{
  titre?: string;
  /** Un lien ou un bouton à droite du titre (« Toutes », « Voir »). */
  action?: React.ReactNode;
  /** Le panneau de verre des rails (ClientParrainage) plutôt que la carte de la boutique. */
  panneau?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ titre, action, panneau, id, className = '', children }) => (
  <section id={id} className={`${panneau ? PANNEAU : CARTE} ${className}`}>
    {(titre || action) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        {titre ? <p className={PETITES_CAPITALES}>{titre}</p> : <span />}
        {action}
      </div>
    )}
    {children}
  </section>
);

export default CarteSociale;

// ─── La rangée de personne ───────────────────────────────────────────────────
// La rangée d'ami de l'onglet Amis (ClientPortal.tsx:202-213), avec le
// médaillon partagé (Avatar.tsx) à la place du rond à `bg-cover`. Sert à
// l'annuaire, aux amies, aux membres d'un groupe et au rail « Autour du feu ».
// `compact` retire la bordure pour une liste serrée dans un rail.
export const RangeePersonne: React.FC<{
  uid: string;
  nom: string;
  photo?: string;
  verifie?: boolean;
  /** Une ligne discrète sous le nom : le dosha, la date, le badge en vedette. */
  sousTitre?: React.ReactNode;
  /** Le geste à droite : « Écrire », « Accepter », une icône ronde. */
  action?: React.ReactNode;
  compact?: boolean;
}> = ({ uid, nom, photo, verifie, sousTitre, action, compact }) => (
  <div className={`flex items-center gap-3 ${compact ? 'rounded-[12px] px-2 py-2 transition-colors hover:bg-[#BA7B39]/8' : 'rounded-[15px] border border-[#38403a]/10 p-3 dark:border-white/10'}`}>
    <Link to={`/membre/${uid}`} className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar nom={nom} url={photo} taille={compact ? 36 : 40} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-[#293027] dark:text-white">
          <span className="truncate">{nom}</span>
          {verifie && <i className="fa-solid fa-circle-check shrink-0 text-[12px] text-[#3b82f6]" />}
        </span>
        {sousTitre && <span className="mt-0.5 block truncate text-[10px] uppercase tracking-widest text-[#38403a]/50 dark:text-white/50">{sousTitre}</span>}
      </span>
    </Link>
    {action}
  </div>
);
