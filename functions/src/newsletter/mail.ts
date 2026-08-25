import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

// ─── Transport SMTP partagé ──────────────────────────────────────────────────
// Un seul endroit pour les secrets et la fabrique du transporteur, réutilisé par
// l'envoi d'infolettre (send.ts) et le courriel de bienvenue (welcome.ts).
// L'envoi passe par la boîte Google Workspace de Krystine (Gmail SMTP) : pas
// d'ESP tiers, pas de DNS à configurer, inspiratanature.com porte déjà le
// SPF/DKIM de Google. Secrets à poser avec :
//   firebase functions:secrets:set GMAIL_USER              (krystine@inspiratanature.com)
//   firebase functions:secrets:set GMAIL_APP_PASSWORD      (mot de passe d'application Google, 16 caractères)
//   firebase functions:secrets:set NEWSLETTER_POSTAL_ADDRESS
// NEWSLETTER_POSTAL_ADDRESS est l'adresse postale exigée par la LCAP, rendue
// dans le pied de chaque courriel.
export const GMAIL_USER = defineSecret('GMAIL_USER');
export const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
export const NEWSLETTER_POSTAL_ADDRESS = defineSecret('NEWSLETTER_POSTAL_ADDRESS');
export const MAIL_SECRETS = [GMAIL_USER, GMAIL_APP_PASSWORD, NEWSLETTER_POSTAL_ADDRESS];

export const PUBLIC_BASE_URL = 'https://www.krystinestlaurent.ca';
export const BRAND_LOGO_URL = 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png';

// Transport Gmail en pool : plusieurs messages sur quelques connexions.
export function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
}

// Gmail exige que le From soit la boîte authentifiée (ou un alias configuré);
// seul le nom d'affichage est libre.
export function fromAddr(name = 'Krystine St-Laurent'): string {
  return `"${name}" <${GMAIL_USER.value()}>`;
}

export function unsubscribeUrl(token: string): string {
  return `${PUBLIC_BASE_URL}/desinscription?t=${encodeURIComponent(token)}`;
}
