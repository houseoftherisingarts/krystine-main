// Shapes returned by the Shopify Admin API `/orders.json` REST endpoint.
// We only keep the fields we care about for analytics.

export interface ShopifyLineItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  title: string;
  variant_title: string | null;
  quantity: number;
  price: string;            // decimal string
  sku: string | null;
  vendor: string | null;
}

export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  name?: string;
  city?: string;
  province?: string;
  country?: string;
  country_code?: string;
  zip?: string;
}

export interface ShopifyOrderPayload {
  id: number;
  admin_graphql_api_id?: string;
  order_number: number;
  name: string;              // e.g. "#1023"
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  cancelled_at: string | null;
  currency: string;
  total_price: string;       // decimal string
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set?: { shop_money: { amount: string; currency_code: string } };
  financial_status: string;   // paid, refunded, voided, partially_paid, pending, authorized, partially_refunded
  fulfillment_status: string | null; // fulfilled, partial, restocked, null
  tags: string;
  customer?: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    orders_count?: number;
  } | null;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress | null;
  billing_address?: ShopifyAddress | null;
}

// What we store in Firestore — normalized + typed numerics.
export interface FirestoreShopifyOrder {
  id: string;                       // Shopify numeric id as string
  orderNumber: number;
  name: string;
  email: string | null;
  phone: string | null;
  customer: {
    id: string | null;
    name: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  currency: string;
  totalPrice: number;
  subtotalPrice: number;
  totalTax: number;
  totalDiscounts: number;
  totalShipping: number;
  financialStatus: string;
  fulfillmentStatus: string | null;
  tags: string[];
  lineItems: {
    id: string;
    productId: string | null;
    variantId: string | null;
    title: string;
    variantTitle: string | null;
    quantity: number;
    price: number;
    sku: string | null;
  }[];
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingCountry: string | null;
  createdAt: FirebaseFirestore.Timestamp | Date;
  processedAt: FirebaseFirestore.Timestamp | Date | null;
  cancelledAt: FirebaseFirestore.Timestamp | Date | null;
  updatedAt: FirebaseFirestore.Timestamp | Date;
  ingestedAt: FirebaseFirestore.Timestamp | Date;
}
