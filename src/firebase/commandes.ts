import { db } from '../firebase';
import { collection, collectionGroup, getDocs, query, where, Timestamp } from 'firebase/firestore';

// Les trois ventes Stripe du site (formations natives dont Foyer et Origine,
// paquets de niskas achetés en argent, pourboires du direct) rassemblées en
// une liste unique pour le tableau de bord admin. Chaque commande porte son
// détail de taxes (TPS + TVQ du Québec, ajouté 2026-09-07) en cents CAD; une
// commande d'avant cette date n'a pas ce détail : elle compte taxes = 0 et
// se marque `sansTaxes`, jamais une taxe recalculée après coup.

export interface CommandeStripe {
  id: string;
  source: 'formation' | 'niskas' | 'pourboire';
  libelle: string;
  date?: Timestamp;
  montantHT: number; // cents CAD, hors taxes
  tps: number;        // cents CAD
  tvq: number;         // cents CAD
  taxes: number;       // cents CAD (tps + tvq)
  total: number;        // cents CAD, taxes comprises
  sansTaxes: boolean;
}

interface DetailTaxes { montantHT?: number; tps?: number; tvq?: number; taxes?: number; total?: number }

/** Normalise un document dont le détail de taxes peut être absent (commande
 * antérieure à l'ajout des taxes) : dans ce cas, HT = le montant déjà connu
 * en dollars, taxes = 0. */
function normaliserTaxes(d: DetailTaxes, montantDollarsLegacy: number): Pick<CommandeStripe, 'montantHT' | 'tps' | 'tvq' | 'taxes' | 'total' | 'sansTaxes'> {
  if (typeof d.montantHT === 'number' && typeof d.taxes === 'number' && typeof d.total === 'number') {
    return { montantHT: d.montantHT, tps: d.tps || 0, tvq: d.tvq || 0, taxes: d.taxes, total: d.total, sansTaxes: false };
  }
  const cents = Math.round((montantDollarsLegacy || 0) * 100);
  return { montantHT: cents, tps: 0, tvq: 0, taxes: 0, total: cents, sansTaxes: true };
}

export async function getCommandesStripe(): Promise<CommandeStripe[]> {
  if (!db) return [];

  const [formationsSnap, niskasSnap, pourboiresSnap] = await Promise.all([
    // collectionGroup('formations') attrape aussi la collection racine
    // `formations`; on ne garde que ce qui vit sous achatsFormations/{uid}/formations.
    getDocs(collectionGroup(db, 'formations')),
    getDocs(query(collection(db, 'pointsEvents'), where('kind', '==', 'achat-niskas'))),
    getDocs(collection(db, 'pourboires')),
  ]);

  const achats: CommandeStripe[] = formationsSnap.docs
    .filter(d => d.ref.parent.parent?.parent.id === 'achatsFormations')
    .map(d => {
      const data = d.data() as DetailTaxes & { titre?: string; montant?: number; acheteLe?: Timestamp; sessionId?: string };
      return {
        id: data.sessionId || d.id,
        source: 'formation' as const,
        libelle: data.titre || d.id,
        date: data.acheteLe,
        ...normaliserTaxes(data, data.montant || 0),
      };
    });

  const niskas: CommandeStripe[] = niskasSnap.docs.map(d => {
    const data = d.data() as { amount?: number; meta?: DetailTaxes & { montant?: number }; at?: Timestamp };
    const meta = data.meta || {};
    return {
      id: d.id,
      source: 'niskas' as const,
      libelle: `${data.amount || 0} niskas`,
      date: data.at,
      ...normaliserTaxes(meta, meta.montant || 0),
    };
  });

  const pourboires: CommandeStripe[] = pourboiresSnap.docs.map(d => {
    const data = d.data() as DetailTaxes & { nom?: string; montant?: number; at?: Timestamp };
    return {
      id: d.id,
      source: 'pourboire' as const,
      libelle: `Pourboire · ${data.nom || 'Une auditrice'}`,
      date: data.at,
      ...normaliserTaxes(data, data.montant || 0),
    };
  });

  return [...achats, ...niskas, ...pourboires].sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));
}
