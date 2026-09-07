import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

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
// Les réponses vont à la boîte d'équipe, jamais à la boîte personnelle de
// Krystine (ordre d'Alex, 2026-09-02). Le From passera aussi à teamksl@
// dès que les 3 DNS Resend d'inspiratanature.com seront posés chez rapidenet.
export const REPLY_TO = 'teamksl@inspiratanature.com';

export function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: RESEND_API_KEY.value() },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
}

export function fromAddr(name = 'Krystine St-Laurent'): string {
  return `"${name}" <${SENDER_EMAIL}>`;
}

// Aucun courriel réel ne part avec un jeton vide : s'il manque sur la fiche,
// on le fabrique et on l'écrit avant d'envoyer (cas vu le 7 septembre 2026).
export async function assurerJeton(ref: { update: (d: Record<string, unknown>) => Promise<unknown> } | null, actuel?: string | null): Promise<string> {
  if (actuel) return actuel;
  const jeton = randomBytes(18).toString('base64url');
  if (ref) { try { await ref.update({ unsubscribeToken: jeton }); } catch (e) { console.warn('[assurerJeton]', e); } }
  return jeton;
}

export function unsubscribeUrl(token: string): string {
  return `${PUBLIC_BASE_URL}/desinscription?t=${encodeURIComponent(token)}`;
}

// L'en-tête List-Unsubscribe (un clic dans Gmail, Yahoo, Apple Mail) est un
// POST sans page : il doit viser la fonction elle-même, pas la page du site,
// qui répondait 200 sans rien désabonner (vérifié le 7 septembre 2026).
export function unsubscribeOneClickUrl(token: string): string {
  return `https://us-central1-${process.env.GCLOUD_PROJECT || 'krystinestlaurent-87566'}.cloudfunctions.net/unsubscribeByToken?t=${encodeURIComponent(token)}`;
}
