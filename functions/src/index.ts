import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { shopifyWebhook } from './shopify/webhook';
export { shopifyBackfill } from './shopify/backfill';
export { sendNewsletter } from './newsletter/send';
export { unsubscribeByToken } from './newsletter/unsubscribe';
export { sendWelcomeEmail } from './newsletter/welcome';
export { sendLiveReminders } from './newsletter/live';
export { sendScheduledNewsletters, previewNewsletter } from './newsletter/send';
export { newsletterAssistant } from './newsletter/assistant';
export { verifierCaptcha } from './captcha';
export { creerSessionPaiement, stripeWebhook, obtenirLecon } from './paiements';
export { murVoteBillet, murVoteCommentaire, murCommentaireCompte } from './mur';
export { badgeAchatFormation, badgePremierBillet, badgeAmitieAcceptee } from './badges';
