// Les rendez-vous de Krystine, fondus en une seule liste pour la page du
// calendrier (refonte du 11 septembre 2026). Deux sources : la collection
// Firestore `events`, que l'admin publie, et la programmation curée de
// liveEvents.ts. Un rendez-vous présent des deux côtés (le lancement de
// L'Anglicane) ne s'affiche qu'une fois, et la version Firestore l'emporte.

import { enVente, type EventDoc } from '../firebase/firestore';
import { LIVE_EVENTS, type LiveEvent } from './liveEvents';
import type { WaitlistTarget } from '../components/WaitlistModal';

export type Nature =
  | 'lancement' | 'livre' | 'retraite' | 'conference' | 'enLigne'
  | 'programme' | 'tournee' | 'scene' | 'rencontre';

export interface Geste {
  type: 'reserver' | 'lien' | 'interne' | 'liste' | 'tournee' | 'complet' | 'bientot';
  href?: string;
  liste?: WaitlistTarget;
  libelle: { fr: string; en: string };
}

export interface RendezVous {
  cle: string;
  /** La date ISO qui sert au tri; absente pour un rendez-vous sans date. */
  iso?: string;
  /** La fin, pour un parcours de plusieurs semaines. */
  fin?: string;
  /** « 24 » quand le jour est connu; sinon le mois seul porte la date. */
  jour?: string;
  mois: { fr: string; en: string };
  annee?: string;
  quand: { fr: string; en: string };
  titre: { fr: string; en: string };
  sousTitre?: { fr: string; en: string };
  lieu?: { fr: string; en: string };
  nature: Nature;
  image?: string;
  geste: Geste;
  brouillon?: boolean;
  vedette?: boolean;
}

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const deux = (n: number) => String(n).padStart(2, '0');
export const aujourdhui = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
};

export function natureDe(e: EventDoc): Nature {
  const s = `${e.title} ${e.subtitle || ''}`.toLowerCase();
  if (/ligne|online|zoom/.test((e.location || '').toLowerCase())) return 'enLigne';
  if (/lancement|launch|livre|book/.test(s)) return 'lancement';
  if (/retraite|retreat/.test(s)) return 'retraite';
  if (/conf[eé]rence|talk|expo/.test(s)) return 'conference';
  return 'rencontre';
}

function depuisFirestore(e: EventDoc, admin: boolean): RendezVous {
  const [a, m, j] = e.date.split('-');
  const mois = { fr: MOIS_FR[Number(m) - 1] || m, en: MOIS_EN[Number(m) - 1] || m };
  const brouillon = e.isPublished === false;
  const ouverts = enVente(e);
  let geste: Geste;
  if (e.billetterie && e.slug && (ouverts || (brouillon && admin))) {
    geste = { type: 'reserver', href: `/evenement/${e.slug}${brouillon ? '?apercu=1' : ''}`, libelle: { fr: 'Réserver ma place', en: 'Reserve my seat' } };
  } else if (e.billetterie && e.slug) {
    geste = { type: 'complet', href: `/evenement/${e.slug}`, libelle: { fr: 'Complet', en: 'Sold out' } };
  } else if (e.registrationLink) {
    geste = { type: 'lien', href: e.registrationLink, libelle: { fr: 'M’inscrire', en: 'Register' } };
  } else {
    geste = { type: 'bientot', libelle: { fr: 'Inscription bientôt', en: 'Registration soon' } };
  }
  const heure = e.heure ? ` · ${e.heure}` : '';
  return {
    cle: `fs-${e.id || e.slug || e.title}`,
    iso: e.date,
    jour: String(Number(j)),
    mois,
    annee: a,
    quand: { fr: `${Number(j)} ${mois.fr} ${a}${heure}`, en: `${mois.en} ${Number(j)}, ${a}${heure}` },
    titre: { fr: e.title, en: e.title },
    sousTitre: e.subtitle ? { fr: e.subtitle, en: e.subtitle } : undefined,
    lieu: e.location ? { fr: e.location, en: e.location } : undefined,
    nature: natureDe(e),
    image: e.imageUrl || e.imageHero,
    geste,
    brouillon,
    vedette: !!e.isFeatured,
  };
}

const NATURE_CUREE: Record<LiveEvent['kind'], Nature> = {
  'in-progress': 'programme',
  'ticketed': 'conference',
  'retreat-waitlist': 'retraite',
  'launch-waitlist': 'lancement',
  'tour-request': 'tournee',
  'announcement': 'livre',
};

// Les photos des rendez-vous curés, quand le lieu a la sienne.
const IMAGES_CUREES: Record<string, string> = {
  'lancement-anglicane': '/evenements/anglicane.webp',
};

function depuisCure(ev: LiveEvent): RendezVous {
  // Le jour ne s'affiche en grand que si la date curée le nomme vraiment :
  // « 24 octobre 2026 » oui, « Novembre 2026 · dates à confirmer » non.
  const mj = ev.dateFR.match(/^(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})/i);
  const idx = mj ? MOIS_FR.indexOf(mj[2].toLowerCase()) : -1;
  const iso = ev.startDate;
  let geste: Geste;
  if (ev.registerUrl) geste = { type: 'lien', href: ev.registerUrl, libelle: { fr: ev.ctaLabelFR || 'Billets', en: ev.ctaLabelEN || 'Tickets' } };
  else if (ev.internalHref) geste = { type: 'interne', href: ev.internalHref, libelle: { fr: ev.ctaLabelFR || 'Découvrir', en: ev.ctaLabelEN || 'Discover' } };
  else if (ev.waitlistTarget) geste = { type: 'liste', liste: ev.waitlistTarget, libelle: { fr: ev.ctaLabelFR || 'Liste d’attente', en: ev.ctaLabelEN || 'Waitlist' } };
  else if (ev.triggersTourRequest || ev.kind === 'tour-request') geste = { type: 'tournee', libelle: { fr: ev.ctaLabelFR || 'Demander une date', en: ev.ctaLabelEN || 'Request a date' } };
  else geste = { type: 'bientot', libelle: { fr: 'À suivre', en: 'Stay tuned' } };
  return {
    cle: `cure-${ev.id}`,
    iso,
    fin: ev.endDate,
    jour: mj ? mj[1] : undefined,
    mois: mj ? { fr: mj[2].toLowerCase(), en: idx >= 0 ? MOIS_EN[idx] : mj[2] } : { fr: ev.dateFR, en: ev.dateEN },
    annee: mj ? mj[3] : (iso ? iso.slice(0, 4) : undefined),
    quand: { fr: ev.dateFR, en: ev.dateEN },
    titre: { fr: ev.titleFR, en: ev.titleEN },
    sousTitre: ev.subtitleFR ? { fr: ev.subtitleFR, en: ev.subtitleEN || ev.subtitleFR } : undefined,
    lieu: ev.locationFR ? { fr: ev.locationFR, en: ev.locationEN || ev.locationFR } : undefined,
    nature: ev.id === 'tedx' ? 'scene' : NATURE_CUREE[ev.kind] || 'rencontre',
    image: IMAGES_CUREES[ev.id],
    geste,
    vedette: !!ev.featured,
  };
}

/** Les deux sources fondues et triées : à venir (datés d'abord), puis passés. */
export function fondre(firestore: EventDoc[], admin = false): { aVenir: RendezVous[]; passes: RendezVous[]; vedette?: RendezVous } {
  const jour = aujourdhui();
  const fs = firestore.map(e => depuisFirestore(e, admin));
  const cles = new Set(firestore.flatMap(e => [e.slug, e.id].filter(Boolean) as string[]));
  const cure = LIVE_EVENTS.filter(ev => !cles.has(ev.id)).map(depuisCure);
  const tous = [...fs, ...cure];
  const estPasse = (r: RendezVous) => !!r.iso && (r.fin || r.iso) < jour;
  const aVenir = tous.filter(r => !estPasse(r)).sort((a, b) => {
    if (a.iso && b.iso) return a.iso.localeCompare(b.iso);
    if (a.iso) return -1;
    if (b.iso) return 1;
    return 0;
  });
  const passes = tous.filter(estPasse).sort((a, b) => (b.iso || '').localeCompare(a.iso || ''));
  const vedette = aVenir.find(r => r.vedette && r.iso) || aVenir.find(r => !!r.iso);
  return { aVenir, passes, vedette };
}
