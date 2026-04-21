import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { shopifyWebhook } from './shopify/webhook';
export { shopifyBackfill } from './shopify/backfill';
export { sendNewsletter } from './newsletter/send';
export { unsubscribeByToken } from './newsletter/unsubscribe';
