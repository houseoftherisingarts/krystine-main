import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

// ─── Transport SMTP partagé ──────────────────────────────────────────────────
// Un seul endroit pour les secrets et la fabrique du transporteur, réutilisé par
// l'envoi d'infolettre, le courriel de bienvenue et les rappels du direct.
// Depuis le 26 août 2026 : Resend par SMTP (domaine krystinestlaurent.ca
// vérifié par DKIM + SPF chez Netlify DNS). Aucune boîte Google à toucher :
// l'expéditeur est infolettre@krystinestlaurent.ca, les réponses vont à
// Krystine. Secrets :
//   firebase functions:secrets:set RESEND_API_KEY
//   firebase functions:secrets:set NEWSLETTER_POSTAL_ADDRESS   (adresse LCAP)
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
export const NEWSLETTER_POSTAL_ADDRESS = defineSecret('NEWSLETTER_POSTAL_ADDRESS');
export const MAIL_SECRETS = [RESEND_API_KEY, NEWSLETTER_POSTAL_ADDRESS];

export const PUBLIC_BASE_URL = 'https://www.krystinestlaurent.ca';
export const BRAND_LOGO_URL = 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png';
export const SENDER_EMAIL = 'infolettre@krystinestlaurent.ca';
export const REPLY_TO = 'krystine@inspiratanature.com';

export function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: RESEND_API_KEY.value() },
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
  });
}

export function fromAddr(name = 'Krystine St-Laurent'): string {
  return `"${name}" <${SENDER_EMAIL}>`;
}

export function unsubscribeUrl(token: string): string {
  return `${PUBLIC_BASE_URL}/desinscription?t=${encodeURIComponent(token)}`;
}
