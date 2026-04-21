import { Timestamp } from 'firebase-admin/firestore';
import type { ShopifyOrderPayload, FirestoreShopifyOrder } from './types';

const toDate = (s?: string | null) => s ? Timestamp.fromDate(new Date(s)) : null;
const num = (s: string | undefined | null) => s ? parseFloat(s) : 0;

export function normalizeOrder(p: ShopifyOrderPayload): FirestoreShopifyOrder {
  return {
    id: String(p.id),
    orderNumber: p.order_number,
    name: p.name,
    email: p.email,
    phone: p.phone,
    customer: {
      id: p.customer?.id ? String(p.customer.id) : null,
      email: p.customer?.email ?? null,
      firstName: p.customer?.first_name ?? null,
      lastName: p.customer?.last_name ?? null,
      name: p.customer
        ? [p.customer.first_name, p.customer.last_name].filter(Boolean).join(' ') || null
        : null,
    },
    currency: p.currency,
    totalPrice: num(p.total_price),
    subtotalPrice: num(p.subtotal_price),
    totalTax: num(p.total_tax),
    totalDiscounts: num(p.total_discounts),
    totalShipping: num(p.total_shipping_price_set?.shop_money.amount),
    financialStatus: p.financial_status,
    fulfillmentStatus: p.fulfillment_status,
    tags: p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    lineItems: (p.line_items || []).map(li => ({
      id: String(li.id),
      productId: li.product_id ? String(li.product_id) : null,
      variantId: li.variant_id ? String(li.variant_id) : null,
      title: li.title,
      variantTitle: li.variant_title,
      quantity: li.quantity,
      price: num(li.price),
      sku: li.sku,
    })),
    shippingCity: p.shipping_address?.city ?? null,
    shippingProvince: p.shipping_address?.province ?? null,
    shippingCountry: p.shipping_address?.country ?? null,
    createdAt: toDate(p.created_at) || Timestamp.now(),
    processedAt: toDate(p.processed_at),
    cancelledAt: toDate(p.cancelled_at),
    updatedAt: toDate(p.updated_at) || Timestamp.now(),
    ingestedAt: Timestamp.now(),
  };
}
