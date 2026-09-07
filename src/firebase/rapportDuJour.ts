import { collection, getCountFromServer, getDocs, query, where, Timestamp, type QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { getCommandesStripe, type CommandeStripe } from './commandes';
import { journee, veilleDe } from '../lib/pointsConfig';

// Le rapport du jour du tableau de bord admin (Alex, 7 septembre 2026) :
// nouveaux contacts, comptes, désabonnements, billets du mur et coffres
// bêta, pour aujourd'hui, hier ou une date choisie. Chaque chiffre vient
// d'une requête d'agrégation bornée par date (`where` sur le champ de date),
// jamais d'une lecture complète — la collection `newsletter` compte à elle
// seule 33 000 documents (voir countNewsletterSubscribers, firestore.ts).
// Les ventes Stripe font exception : elles réemploient getCommandesStripe
// (déjà une lecture complète, approuvée pour la carte « Ventes Stripe »
// juste au-dessus) plutôt que de la dédoubler; le composant l'appelle une
// seule fois et filtre par jour côté client à chaque changement de date.
//
// Les « nouveaux messages à l'Équipe KSL » manquent volontairement : un
// message de la messagerie (dms/{fil}/messages) ne porte pas son
// destinataire, seulement son expéditeur — l'isoler demande de lire chaque
// fil un par un, jamais une seule requête bornée. Omis plutôt que de lire
// une collection en entier pour un seul chiffre.

export { journee, veilleDe };

/** Minuit à minuit du jour civil de Montréal (l'Est reste à -04:00 de
 *  septembre à début novembre, la fenêtre bêta au complet). */
function bornesDuJour(jour: string): [Date, Date] {
  const debut = new Date(`${jour}T00:00:00-04:00`);
  return [debut, new Date(debut.getTime() + 86_400_000)];
}

async function compteBorne(col: string, champDate: string, jour: string, egalite?: [string, unknown]): Promise<number> {
  if (!db) return 0;
  const [debut, fin] = bornesDuJour(jour);
  const clauses: QueryConstraint[] = [];
  if (egalite) clauses.push(where(egalite[0], '==', egalite[1]));
  clauses.push(where(champDate, '>=', Timestamp.fromDate(debut)), where(champDate, '<', Timestamp.fromDate(fin)));
  const snap = await getCountFromServer(query(collection(db, col), ...clauses));
  return snap.data().count;
}

export interface RapportBornes {
  jour: string;
  nouveauxAbonnes: number;
  nouveauxComptes: number;
  desabonnements: number;
  nouveauxBillets: number;
  coffresBeta: number;
}

/** Les cinq compteurs bornés par date, sûrs à relancer à chaque changement
 *  de date (chacun est une agrégation, jamais une liste de documents). */
export async function getRapportBornes(jour: string): Promise<RapportBornes> {
  const [nouveauxAbonnes, nouveauxComptes, desabonnements, nouveauxBillets, coffresBeta] = await Promise.all([
    compteBorne('newsletter', 'subscribedAt', jour),
    compteBorne('members', 'joinedAt', jour),
    compteBorne('newsletter', 'unsubscribedAt', jour),
    compteBorne('mur', 'creeLe', jour),
    compteBorne('pointsEvents', 'at', jour, ['kind', 'coffre-beta']),
  ]);
  return { jour, nouveauxAbonnes, nouveauxComptes, desabonnements, nouveauxBillets, coffresBeta };
}

/** Les commandes Stripe d'un jour civil, tirées d'une liste déjà en main
 *  (getCommandesStripe, appelée une seule fois par le composant). */
export function ventesDuJour(commandes: CommandeStripe[], jour: string): { n: number; total: number } {
  const [debut, fin] = bornesDuJour(jour);
  const duJour = commandes.filter((c) => {
    const t = c.date?.toMillis();
    return t !== undefined && t >= debut.getTime() && t < fin.getTime();
  });
  return { n: duJour.length, total: duJour.reduce((s, c) => s + c.total, 0) };
}

export interface JourMembres { jour: string; n: number }

/** Les nouveaux comptes par jour civil de Montréal sur les `nbJours`
 *  derniers jours, aujourd'hui compris, les jours vides à zéro pour que
 *  l'axe du temps ne mente pas (Krystine, 7 septembre 2026). Une seule
 *  requête bornée sur members.joinedAt : quelques dizaines de fiches par
 *  mois, jamais la collection entière. Les fiches importées sans joinedAt
 *  n'y figurent pas. */
export async function getNouveauxMembresParJour(nbJours: number): Promise<JourMembres[]> {
  const jours: JourMembres[] = [];
  for (let j = journee(), i = 0; i < nbJours; i++, j = veilleDe(j)) jours.unshift({ jour: j, n: 0 });
  if (!db) return jours;
  const [debut] = bornesDuJour(jours[0].jour);
  const snap = await getDocs(query(collection(db, 'members'), where('joinedAt', '>=', Timestamp.fromDate(debut))));
  const parJour = new Map(jours.map((x) => [x.jour, x]));
  snap.forEach((d) => {
    const t = d.get('joinedAt') as Timestamp | undefined;
    const x = t && parJour.get(journee(t.toMillis()));
    if (x) x.n++;
  });
  return jours;
}
