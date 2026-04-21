import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { shopifyWebhook } from './shopify/webhook';
export { shopifyBackfill } from './shopify/backfill';
