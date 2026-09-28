import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { journee } from '../lib/pointsConfig';

// ─── Les nouvelles personnes, cible 3 000 avant le 15 décembre 2026 ──────────
// Décision de Krystine du 28 septembre 2026 : la priorité n° 1 est de faire
// entrer du monde. Une « nouvelle personne » est une adresse qui entre dans la
// relation par le site depuis le 28 septembre : une inscription (infolettre,
// liste d'attente, guide, direct du podcast) ou un compte créé. Une même
// adresse ne compte qu'une fois. Ne comptent pas : les imports (Shopify,
// Kajabi, fichiers), les adresses en quarantaine (alias jetables, robots) et
// les adresses déjà connues avant le 28 septembre qui remplissent un nouveau
// formulaire (leur fiche existait, elle ne se recrée pas).
// Deux requêtes bornées sur la date, jamais la collection entière, plus une
// vérification par lots des adresses des nouveaux comptes.

export const DEBUT_CIBLE = '2026-09-28';
export const FIN_CIBLE = '2026-12-15';
export const CIBLE = 3000;

const IMPORT_RX = /import|kajabi|shopify|csv|migration|export/i;

export interface NouvellePersonne { email: string; jour: string; voie: string }
export interface EtatCible {
  personnes: NouvellePersonne[];
  /** Par semaine (lundi de la semaine → nombre), de DEBUT_CIBLE à aujourd'hui. */
  semaines: { lundi: string; n: number }[];
  /** Par voie d'arrivée, du plus grand au plus petit. */
  voies: { voie: string; n: number }[];
}

const lundiDe = (jour: string) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** La voie lisible d'une fiche : provenance marquée, sinon le formulaire. */
function voieDe(v: Record<string, any>): string {
  const p = v.provenance?.source;
  if (p && p !== 'direct') return String(p);
  return `formulaire · ${String(v.source || 'site').replace(/_google$/, '')}`;
}

export async function getEtatCible(): Promise<EtatCible> {
  const vide: EtatCible = { personnes: [], semaines: [], voies: [] };
  if (!db) return vide;
  const debut = Timestamp.fromDate(new Date(`${DEBUT_CIBLE}T00:00:00-04:00`));
  const [abonnees, membres] = await Promise.all([
    getDocs(query(collection(db, 'newsletter'), where('subscribedAt', '>=', debut))),
    getDocs(query(collection(db, 'members'), where('joinedAt', '>=', debut))),
  ]);

  const parEmail = new Map<string, NouvellePersonne>();
  const ajouter = (email: unknown, t: Timestamp | undefined, voie: string) => {
    const e = String(email || '').trim().toLowerCase();
    if (!e || !t) return;
    const jour = journee(t.toMillis());
    const deja = parEmail.get(e);
    if (!deja || jour < deja.jour) parEmail.set(e, { email: e, jour, voie: deja && deja.voie !== 'compte créé' ? deja.voie : voie });
  };
  abonnees.forEach((d) => {
    const v = d.data();
    if (IMPORT_RX.test(String(v.source || ''))) return;
    if (v.status === 'suspect' || v.status === 'bounced') return;
    ajouter(v.email, v.subscribedAt, voieDe(v));
  });
  // Un compte créé par une abonnée de longue date n'est pas une nouvelle
  // personne : son adresse se cherche dans l'infolettre, par lots de 30.
  const aVerifier = membres.docs
    .map((d) => String(d.get('email') || '').trim().toLowerCase())
    .filter((e) => e && !parEmail.has(e));
  const connues = new Set<string>();
  for (let i = 0; i < aVerifier.length; i += 30) {
    const lot = aVerifier.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, 'newsletter'), where('email', 'in', lot)));
    snap.forEach((d) => {
      const t = d.get('subscribedAt') as Timestamp | undefined;
      if (!t || t.toMillis() < debut.toMillis()) connues.add(String(d.get('email')).toLowerCase());
    });
  }
  membres.forEach((d) => {
    const v = d.data();
    if (connues.has(String(v.email || '').trim().toLowerCase())) return;
    ajouter(v.email, v.joinedAt, 'compte créé');
  });

  const personnes = [...parEmail.values()].sort((a, b) => a.jour.localeCompare(b.jour));
  const semaines: { lundi: string; n: number }[] = [];
  for (let l = lundiDe(DEBUT_CIBLE), fin = lundiDe(journee()); l <= fin;) {
    semaines.push({ lundi: l, n: 0 });
    const d = new Date(`${l}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 7); l = d.toISOString().slice(0, 10);
  }
  const idx = new Map(semaines.map((s, i) => [s.lundi, i]));
  const voies = new Map<string, number>();
  for (const p of personnes) {
    const i = idx.get(lundiDe(p.jour)); if (i !== undefined) semaines[i].n++;
    voies.set(p.voie, (voies.get(p.voie) || 0) + 1);
  }
  return {
    personnes, semaines,
    voies: [...voies.entries()].map(([voie, n]) => ({ voie, n })).sort((a, b) => b.n - a.n),
  };
}
