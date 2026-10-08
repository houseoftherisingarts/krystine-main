import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { limiterParIp, MESSAGE_CADENCE } from './newsletter/robots';
import { MAIL_SECRETS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr } from './newsletter/mail';
import { TEAM_EMAIL } from './newsletter/reponse';
import { assertAdmin } from './newsletter/send';

// ─── Le kit de presse sur demande (Krystine, 8 oct. 2026) ───────────────────
// « On ne devrait pas télécharger des photos de moi, voyons. On doit avoir un
// contrôle sur qui télécharge. » La salle de presse (/presse) ne montre plus
// que les visuels. Une journaliste remplit « Demander le kit de presse »
// (demanderKitPresse) : la demande va dans demandesPresse/{id}, statut
// 'attente', et l'équipe en est avisée. Dans l'admin (Demandes), Krystine
// clique Accepter ou Refuser (deciderDemandePresse). Accepter fabrique un
// jeton aléatoire valable 7 jours et envoie à la personne son lien
// /presse/kit#k=<jeton>; cette page n'affiche les téléchargements qu'après
// verifierAccesPresse. Refuser n'envoie rien.
//
// Seule l'empreinte du jeton est gardée dans Firestore : une fuite de la
// collection ne donne aucun lien valide.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUREE_MS = 7 * 24 * 60 * 60 * 1000;
const empreinte = (jeton: string) => crypto.createHash('sha256').update(jeton).digest('hex');
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const texte = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
// Pour tout champ qui peut entrer dans un en-tête de courriel (sujet, nom) : une seule ligne, aucun caractère de contrôle.
const ligne = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * Le courriel envoyé à la personne lorsque Krystine accepte. À modifier ici
 * seulement. {nom} : le nom donné dans la demande. {lien} : le lien personnel.
 */
export const COURRIEL_ACCES_PRESSE = {
  FR: {
    sujet: 'Votre accès au kit de presse de Krystine St-Laurent',
    paragraphes: [
      'Bonjour {nom},',
      'Votre demande d’accès au kit de presse de Krystine St-Laurent est acceptée. Voici votre lien personnel :',
      '{lien}',
      'Il reste valable sept jours. Vous y trouverez les visuels, les portraits et les biographies en haute définition, à publier en créditant Krystine St-Laurent.',
      'Pour un format qui manque ou une autre demande, répondez simplement à ce courriel.',
      'Notre équipe est là pour vous.',
      'L’équipe',
    ],
    bouton: 'Ouvrir le kit de presse',
  },
  EN: {
    sujet: 'Your access to the Krystine St-Laurent press kit',
    paragraphes: [
      'Hello {nom},',
      'Your request for the Krystine St-Laurent press kit has been accepted. Here is your personal link:',
      '{lien}',
      'It stays valid for seven days. It holds the visuals, the portraits and the biographies in high definition, to publish with credit to Krystine St-Laurent.',
      'If a format is missing or you need anything else, simply reply to this email.',
      'Our team is here for you.',
      'The team',
    ],
    bouton: 'Open the press kit',
  },
};

// ─── La demande, côté public ────────────────────────────────────────────────
export const demanderKitPresse = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS, cors: true, timeoutSeconds: 60 },
  async (req) => {
    const d = (req.data || {}) as Record<string, unknown>;
    // Le pot de miel, comme inscrireInfolettre et demanderAvisStock : refusé avant la cadence.
    if (texte(d.site, 400)) {
      console.warn('[presse] refus : pot de miel rempli');
      throw new HttpsError('invalid-argument', "Cette demande n'a pas pu être enregistrée.");
    }
    const nom = ligne(d.nom, 120);
    const media = ligne(d.media, 160);
    const email = ligne(d.email, 200).toLowerCase();
    const usage = texte(d.usage, 2000);
    const datePublication = ligne(d.datePublication, 40);
    const lang = d.lang === 'EN' ? 'EN' : 'FR';
    if (!nom) throw new HttpsError('invalid-argument', 'Indiquez votre nom.');
    if (!media) throw new HttpsError('invalid-argument', 'Indiquez votre média ou votre organisation.');
    if (!EMAIL_RX.test(email)) throw new HttpsError('invalid-argument', 'Entrez une adresse courriel valide.');
    if (!usage) throw new HttpsError('invalid-argument', 'Dites-nous pourquoi vous souhaitez le kit.');

    if (!(await limiterParIp(req.rawRequest?.ip, 'kit-presse', 5))) {
      console.warn('[presse] cadence dépassée');
      throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
    }

    await getFirestore().collection('demandesPresse').add({
      nom, media, email, usage, datePublication, lang,
      statut: 'attente',
      cree: FieldValue.serverTimestamp(),
    });

    // L'avis à l'équipe ne doit jamais faire échouer la demande elle-même.
    const adminUrl = `${PUBLIC_BASE_URL}/admin/demandes`;
    const entete = `${nom} · ${media} (${email})`;
    const text = [
      'Nouvelle demande de kit de presse', '', entete,
      datePublication ? `Publication prévue : ${datePublication}` : '', '',
      usage, '', `Pour accepter ou refuser : ${adminUrl}`,
    ].join('\n');
    const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#f6f3ee;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2015;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:15px;padding:32px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7d6330;font-weight:600;">Kit de presse</p>
        <h1 style="margin:0 0 18px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:26px;line-height:1.15;">${esc(nom)} demande le kit de presse</h1>
        <p style="margin:0 0 14px;font-size:13px;color:rgba(42,32,21,.6);">${esc([media, email, datePublication && `publication prévue : ${datePublication}`].filter(Boolean).join(' · '))}</p>
        <div style="margin:0 0 22px;padding:14px 18px;background:#f6f3ee;border-radius:12px;font-size:15px;line-height:1.65;white-space:pre-wrap;">${esc(usage)}</div>
        <a href="${adminUrl}" style="display:inline-block;background:#bb9a5e;color:#2a2015;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:12px 22px;border-radius:999px;">Accepter ou refuser dans l'admin</a>
      </div></body></html>`;
    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr('Site krystinestlaurent.ca'),
        to: TEAM_EMAIL,
        replyTo: email,
        subject: `Kit de presse · ${nom} · ${media}`,
        text,
        html,
      });
    } catch (err) {
      console.error('[presse] avis à l’équipe impossible', err);
    } finally {
      transporter.close();
    }
    return { ok: true };
  },
);

// ─── La décision de Krystine, depuis l'admin ────────────────────────────────
export const deciderDemandePresse = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS, timeoutSeconds: 60 },
  async (req) => {
    const admin = assertAdmin(req);
    const id = String(req.data?.id || '').trim();
    const decision = req.data?.decision;
    if (!id) throw new HttpsError('invalid-argument', 'Demande manquante.');
    if (decision !== 'accepter' && decision !== 'refuser') throw new HttpsError('invalid-argument', 'Décision inconnue.');

    const ref = getFirestore().doc(`demandesPresse/${id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Demande introuvable.');
    const d = snap.data() as Record<string, unknown>;

    if (decision === 'refuser') {
      await ref.update({ statut: 'refusee', decideLe: FieldValue.serverTimestamp(), decidePar: admin });
      return { ok: true };
    }

    const email = String(d.email || '');
    if (!EMAIL_RX.test(email)) throw new HttpsError('failed-precondition', 'Courriel invalide : envoi impossible.');
    const jeton = crypto.randomBytes(24).toString('base64url');
    const expire = Timestamp.fromMillis(Date.now() + DUREE_MS);
    // Le jeton voyage dans le fragment (#k=) : un fragment ne part jamais au serveur,
    // n'entre pas dans les journaux d'hébergement et ne fuit pas par l'en-tête Referer.
    const lien = `${PUBLIC_BASE_URL}/presse/kit#k=${jeton}`;
    const gabarit = COURRIEL_ACCES_PRESSE[d.lang === 'EN' ? 'EN' : 'FR'];
    const remplir = (s: string) => s.replace('{nom}', String(d.nom || '').trim() || '').replace('{lien}', lien);
    const paragraphes = gabarit.paragraphes.map(remplir).map(p => p.replace(/ ,/, ','));

    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1712;">
      <div style="max-width:560px;margin:0 auto;background:#faf6ee;border:1px solid rgba(156,122,68,.35);padding:36px;">
        ${paragraphes.map(p => p === lien
          ? `<p style="margin:0 0 18px;"><a href="${esc(lien)}" style="display:inline-block;background:#1c1712;color:#f4efe6;text-decoration:none;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:14px 24px;">${esc(gabarit.bouton)}</a></p>`
          : `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${esc(p)}</p>`).join('\n')}
      </div></body></html>`;

    // Le jeton n'est écrit qu'après l'envoi réussi : un courriel qui échoue ne laisse pas de lien orphelin valide.
    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        from: fromAddr("L'équipe Krystine St-Laurent"),
        to: email,
        replyTo: REPLY_TO,
        subject: gabarit.sujet,
        text: paragraphes.join('\n\n'),
        html,
      });
    } catch (err) {
      throw new HttpsError('internal', `Envoi impossible : ${(err as Error).message}`);
    } finally {
      transporter.close();
    }

    await ref.update({
      statut: 'acceptee',
      jetonEmpreinte: empreinte(jeton),
      jetonExpire: expire,
      decideLe: FieldValue.serverTimestamp(),
      decidePar: admin,
    });
    return { ok: true, expire: expire.toMillis() };
  },
);

// ─── Le lien personnel, vérifié côté serveur ────────────────────────────────
export const verifierAccesPresse = onCall(
  { region: 'us-central1', cors: true },
  async (req) => {
    const jeton = String(req.data?.k || '').trim();
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(jeton)) throw new HttpsError('permission-denied', 'Lien invalide.');
    if (!(await limiterParIp(req.rawRequest?.ip, 'kit-presse-lien', 60))) {
      throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
    }
    const q = await getFirestore().collection('demandesPresse')
      .where('jetonEmpreinte', '==', empreinte(jeton)).limit(1).get();
    const doc = q.docs[0];
    const d = doc?.data();
    if (!doc || d?.statut !== 'acceptee') throw new HttpsError('permission-denied', 'Lien invalide.');
    const expire = (d.jetonExpire as Timestamp | undefined)?.toMillis() ?? 0;
    if (expire < Date.now()) throw new HttpsError('deadline-exceeded', 'Ce lien a expiré.');
    await doc.ref.update({ ouvertures: FieldValue.increment(1), derniereOuverture: FieldValue.serverTimestamp() });
    return { ok: true, nom: String(d.nom || ''), expire };
  },
);
