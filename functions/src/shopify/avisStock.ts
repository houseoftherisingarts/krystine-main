import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { limiterParIp, MESSAGE_CADENCE } from '../newsletter/robots';
import { MAIL_SECRETS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr } from '../newsletter/mail';
import { SECRETS_SHOPIFY, jetonShopify } from './jeton';

// ─── « M'aviser » : le retour en stock d'un produit épuisé (8 oct. 2026) ────
// Krystine : les chandelles sont épuisées mais reviennent bientôt. Sur la
// fiche et les cartes d'un produit en rupture, la cliente laisse son
// courriel (demanderAvisStock). Chaque heure, avisStockRetours regarde dans
// Shopify si un produit attendu est revenu et envoie UN courriel à chacune,
// avec le lien vers la fiche. Rien ne part tant que
// settings/boutique.avisStockActif n'est pas à true (le texte doit d'abord
// être approuvé par Krystine).

/**
 * Le courriel envoyé au retour d'un produit. À modifier ici seulement.
 * {titre} : le nom du produit dans Shopify. {prenom} : « Bonjour Marie, »
 * ou « Bonjour, » quand le prénom manque. {lien} : la fiche du produit.
 */
export const COURRIEL_AVIS_STOCK = {
  sujet: '{titre} est de retour',
  paragraphes: [
    'Bonjour{prenom},',
    'Vous nous aviez demandé de vous écrire lorsque {titre} serait de retour. Il est de nouveau disponible dans notre boutique.',
    'Le voir et le commander : {lien}',
    'Ce courriel est le seul que nous vous envoyons à ce sujet.',
    'Notre équipe est là pour vous.',
    "L'équipe bienveillante TeamKsl",
  ],
  bouton: 'Voir le produit',
};

const SHOPIFY_API_VERSION = '2026-07';
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RX = /^[a-z0-9][a-z0-9-]{0,120}$/;

const empreinte = (email: string) => crypto.createHash('sha256').update(email).digest('hex').slice(0, 32);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lienProduit = (handle: string) => `${PUBLIC_BASE_URL}/boutique/produit/${handle}`;

export const demanderAvisStock = onCall(
  { region: 'us-central1', cors: true },
  async (req) => {
    const d = (req.data || {}) as Record<string, unknown>;
    // Le pot de miel, comme inscrireInfolettre : refusé avant la cadence.
    if (String(d.site ?? '').trim()) {
      console.warn('[avisStock] refus : pot de miel rempli');
      throw new HttpsError('invalid-argument', "Cette demande n'a pas pu être enregistrée.");
    }
    const handle = String(d.handle ?? '').trim().toLowerCase();
    const email = String(d.email ?? '').trim().toLowerCase().slice(0, 200);
    if (!HANDLE_RX.test(handle)) throw new HttpsError('invalid-argument', 'Produit inconnu.');
    if (!EMAIL_RX.test(email)) throw new HttpsError('invalid-argument', 'Entrez une adresse courriel valide.');
    if (d.consentement !== true) throw new HttpsError('invalid-argument', 'Cochez la case pour recevoir le courriel.');

    if (!(await limiterParIp(req.rawRequest?.ip, 'avis-stock', 10))) {
      console.warn('[avisStock] cadence dépassée');
      throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
    }

    const ref = getFirestore().collection('avisStock').doc(`${handle}__${empreinte(email)}`);
    const snap = await ref.get();
    // Déjà en attente : rien à refaire. Déjà avisée d'un retour passé : la
    // demande repart pour la prochaine rupture.
    if (snap.exists && snap.data()?.statut === 'attente') return { ok: true };
    await ref.set({
      handle,
      titre: String(d.titre ?? '').trim().slice(0, 200),
      email,
      prenom: String(d.prenom ?? '').trim().slice(0, 80),
      cree: FieldValue.serverTimestamp(),
      statut: 'attente',
    });
    return { ok: true };
  },
);

interface ProduitShopify { handle: string; title: string; status: string; variants: { nodes: { availableForSale: boolean }[] } }

/** Les produits revenus en stock parmi `handles`, avec leur titre Shopify. */
async function produitsRevenus(handles: string[]): Promise<Map<string, string>> {
  const { shop, token } = await jetonShopify();
  const revenus = new Map<string, string>();
  for (let i = 0; i < handles.length; i += 25) {
    const lot = handles.slice(i, i + 25);
    const resp = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($q: String!) { products(first: 25, query: $q) { nodes { handle title status variants(first: 50) { nodes { availableForSale } } } } }`,
        variables: { q: lot.map(h => `handle:${h}`).join(' OR ') },
      }),
    });
    if (!resp.ok) throw new Error(`Shopify ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const json = (await resp.json()) as { data?: { products: { nodes: ProduitShopify[] } }; errors?: { message: string }[] };
    if (json.errors?.length) throw new Error(`Shopify : ${json.errors.map(e => e.message).join('; ').slice(0, 300)}`);
    for (const p of json.data?.products.nodes || []) {
      if (lot.includes(p.handle) && p.status === 'ACTIVE' && p.variants.nodes.some(v => v.availableForSale)) {
        revenus.set(p.handle, p.title.replace(/\s+/g, ' ').trim());
      }
    }
  }
  return revenus;
}

function composer(titre: string, prenom: string, handle: string) {
  const lien = lienProduit(handle);
  const remplir = (s: string) => s.replace(/\{titre\}/g, titre).replace(/\{prenom\}/g, prenom ? ` ${prenom}` : '').replace(/\{lien\}/g, lien);
  const text = COURRIEL_AVIS_STOCK.paragraphes.map(remplir).join('\n\n');
  const corps = COURRIEL_AVIS_STOCK.paragraphes
    .filter(p => !p.includes('{lien}'))
    .map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;">${esc(remplir(p))}</p>`);
  // Le bouton prend la place de la ligne du lien, après le premier paragraphe de fond.
  corps.splice(2, 0, `<p style="margin:6px 0 24px;"><a href="${esc(lien)}" style="display:inline-block;background:#1c1712;color:#f4efe6;text-decoration:none;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:14px 24px;">${esc(COURRIEL_AVIS_STOCK.bouton)}</a></p>`);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1712;">
    <div style="max-width:560px;margin:0 auto;background:#faf6ee;border:1px solid rgba(156,122,68,.35);padding:32px;">${corps.join('')}</div></body></html>`;
  return { sujet: remplir(COURRIEL_AVIS_STOCK.sujet), text, html };
}

export const avisStockRetours = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'America/Toronto', region: 'us-central1', secrets: [...SECRETS_SHOPIFY, ...MAIL_SECRETS], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const reglages = await db.doc('settings/boutique').get();
    if (reglages.data()?.avisStockActif !== true) {
      console.log('[avisStock] interrupteur fermé (settings/boutique.avisStockActif) : aucun envoi');
      return;
    }

    const attente = await db.collection('avisStock').where('statut', '==', 'attente').get();
    if (attente.empty) return;
    const parProduit = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
    for (const doc of attente.docs) {
      const h = String(doc.data().handle || '');
      parProduit.set(h, [...(parProduit.get(h) || []), doc]);
    }

    const revenus = await produitsRevenus([...parProduit.keys()]);
    if (!revenus.size) return;

    const transporter = createTransporter();
    let envoyes = 0;
    try {
      for (const [handle, titre] of revenus) {
        for (const doc of parProduit.get(handle) || []) {
          // On prend la demande avant d'envoyer : deux passages qui se
          // chevauchent n'envoient jamais deux fois.
          const prise = await db.runTransaction(async (tx) => {
            const s = await tx.get(doc.ref);
            if (s.data()?.statut !== 'attente') return false;
            tx.update(doc.ref, { statut: 'envoi' });
            return true;
          });
          if (!prise) continue;
          const { email, prenom } = doc.data() as { email: string; prenom?: string };
          const { sujet, text, html } = composer(titre, String(prenom || ''), handle);
          try {
            await transporter.sendMail({ from: fromAddr("L'équipe Krystine St-Laurent"), to: email, replyTo: REPLY_TO, subject: sujet, text, html });
            await doc.ref.update({ statut: 'envoye', envoye: FieldValue.serverTimestamp() });
            envoyes += 1;
          } catch (err) {
            console.error('[avisStock] envoi impossible', doc.id, err);
            await doc.ref.update({ statut: 'attente', erreur: String((err as Error).message || err).slice(0, 300) });
          }
        }
      }
    } finally {
      transporter.close();
    }
    console.log(`[avisStock] ${envoyes} courriel(s) envoyé(s) pour ${revenus.size} produit(s) revenu(s)`);
  },
);
