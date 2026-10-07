import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { crediterNiskas } from '../niskas';
import type { ShopifyOrderPayload } from './types';

// La commande payée de la boutique (4 oct. 2026). Avant, le panier du site
// donnait des niskas au clic « Passer la commande » et créait une commande
// « en attente » à chaque clic, payée ou non. Maintenant, c'est Shopify qui
// confirme le paiement (orders/paid, ou orders/create déjà payée) : on
// retrouve la membre par son courriel, on lui verse ses niskas une seule fois
// par commande (clé order:shopify:{id} dans pointsEvents) et on pose la
// commande dans son espace client (clientOrders/shopify-{id}).

/** Jumeau de POINTS.orderPerItem (src/lib/pointsConfig.ts) : 10 niskas par article. */
const NISKAS_PAR_ARTICLE = 10;

export function estPayee(o: ShopifyOrderPayload): boolean {
  return o.financial_status === 'paid' && !o.cancelled_at;
}

async function uidParCourriel(courriel: string): Promise<string | null> {
  try {
    return (await getAuth().getUserByEmail(courriel)).uid;
  } catch {
    return null; // aucune membre avec ce courriel : une cliente de la boutique seulement
  }
}

const argent = (montant: string | undefined, devise: string) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: devise || 'CAD' }).format(parseFloat(montant || '0') || 0);

/** Retourne ce qui a été fait, pour le journal. Ne lève jamais : le webhook doit répondre 200. */
export async function traiterCommandePayee(o: ShopifyOrderPayload): Promise<string> {
  const courriel = (o.email || o.customer?.email || '').trim().toLowerCase();
  if (!courriel) return 'sans courriel';
  const uid = await uidParCourriel(courriel);
  if (!uid) return 'aucune membre';

  const id = String(o.id);
  const articles = (o.line_items || []).reduce((n, li) => n + (li.quantity || 0), 0);
  const devise = o.currency || 'CAD';

  await getFirestore().doc(`clientOrders/shopify-${id}`).set({
    uid,
    email: courriel,
    shopifyOrderId: id,
    shopifyOrderName: o.name,
    items: (o.line_items || []).map(li => ({
      title: [li.title, li.variant_title].filter(Boolean).join(' · '),
      price: argent(li.price, devise),
      quantity: li.quantity,
      ...(li.variant_id ? { variantId: `gid://shopify/ProductVariant/${li.variant_id}` } : {}),
    })),
    subtotal: argent(o.subtotal_price, devise),
    currency: devise,
    status: 'paid',
    createdAt: o.created_at ? Timestamp.fromDate(new Date(o.created_at)) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  if (articles <= 0) return `membre ${uid}, aucun article`;
  const verse = await crediterNiskas(
    uid, 'order', NISKAS_PAR_ARTICLE * articles, `order:shopify:${id}`,
    { shopifyOrderId: id, commande: o.name, articles },
  );
  return verse ? `membre ${uid}, ${NISKAS_PAR_ARTICLE * articles} niskas` : `membre ${uid}, niskas déjà versés`;
}
