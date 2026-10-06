import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO, PUBLIC_BASE_URL } from './newsletter/mail';

// ─── La relance du paiement commencé (Krystine, 4 oct. 2026) ────────────────
// Analyse du tunnel selon Brunson : quatre paiements de VATA commencés depuis
// le 21 sept., aucun fini, et personne ne leur écrivait. Toutes les 30 min,
// ce filet lit dans Stripe les caisses de formation ouvertes depuis plus d'une
// heure ou expirées, sans paiement. La personne reçoit une lettre (lettre 1),
// puis une seconde le lendemain (lettre 2, VATA seulement), seulement si
// elle n'a toujours pas acheté. Jamais plus de deux lettres par caisse, jamais à une adresse
// désabonnée de nos lettres, jamais pour un essai à petit prix.
// Interrupteur : reglages/relancePaiement.actif (éteint tant que Krystine n'a
// pas approuvé les deux lettres). La mesure : relancesPaiement/{session}.

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const HEURE = 3600_000;

const LETTRES: Record<1 | 2, (prenom: string, titre: string, lien: string) => { sujet: string; texte: string }> = {
  1: (prenom, titre, lien) => ({
    sujet: `Votre place dans ${titre}`,
    texte: `Bonjour${prenom ? ' ' + prenom : ''},

Vous avez commencé votre inscription à ${titre} sans aller jusqu'au bout. Il arrive qu'une page se ferme, qu'un appel interrompe, qu'une question reste en suspens.

Votre place vous attend ici : ${lien}

Si une question vous retient, répondez à ce courriel : nous vous répondons personnellement.

Notre équipe est là pour vous : teamksl@inspiratanature.com

L'équipe`,
  }),
  2: (prenom, titre, lien) => ({
    sujet: 'Une question avant de commencer ?',
    texte: `Bonjour${prenom ? ' ' + prenom : ''},

Avant de commencer ${titre}, trois questions reviennent souvent.

Le temps : les capsules durent de 5 à 15 minutes, et s'écoutent comme un balado, même écran verrouillé.

L'Ayurveda : nul besoin de la connaître. Krystine rend chaque notion claire et concrète.

Et si cela ne vous convient pas : la garantie cœur léger vous rembourse dans les 15 jours suivant l'achat.

Votre inscription vous attend ici : ${lien}

Notre équipe est là pour vous : teamksl@inspiratanature.com

L'équipe`,
  }),
};

async function stripe(path: string, cle: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${cle}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return r.json() as Promise<any>;
}

async function aDejaAchete(email: string, uid: string, formationId: string): Promise<boolean> {
  const db = getFirestore();
  let id = uid;
  if (!id) id = await getAuth().getUserByEmail(email).then((u) => u.uid).catch(() => '');
  if (!id) return false;
  return (await db.doc(`achatsFormations/${id}/formations/${formationId}`).get()).exists;
}

async function estDesabonnee(email: string): Promise<boolean> {
  const snap = await getFirestore().collection('newsletter').where('email', '==', email).limit(10).get();
  return snap.docs.some((d) => ['unsubscribed', 'bounced'].includes(String(d.get('status'))));
}

function lienDe(formationId: string): string {
  return formationId === 'kajabi-2148687644' ? `${PUBLIC_BASE_URL}/paiement/vata` : `${PUBLIC_BASE_URL}/paiement/${encodeURIComponent(formationId)}`;
}

export const relancerPaiements = onSchedule(
  { schedule: 'every 30 minutes', timeZone: 'America/Toronto', region: 'us-central1', timeoutSeconds: 300, secrets: [STRIPE_SECRET_KEY, ...MAIL_SECRETS] },
  async () => {
    const db = getFirestore();
    const reglage = await db.doc('reglages/relancePaiement').get();
    if (reglage.get('actif') !== true) return;
    const cle = STRIPE_SECRET_KEY.value();
    const maintenant = Date.now();
    const transporter = createTransporter();

    // Lettre 1 : les caisses de formation des trois derniers jours, ouvertes
    // depuis plus d'une heure ou expirées, jamais payées.
    const depuis = Math.floor((maintenant - 72 * HEURE) / 1000);
    const liste = await stripe(`checkout/sessions?limit=100&created[gte]=${depuis}`, cle);
    for (const s of liste.data || []) {
      const formationId = String(s.metadata?.formationId || '');
      if (!formationId || s.status === 'complete' || s.payment_status === 'paid') continue;
      if (s.status === 'open' && maintenant - s.created * 1000 < HEURE) continue;
      if ((s.amount_total || 0) < 2000) continue; // les essais à 1 $ ne se relancent pas
      const ref = db.doc(`relancesPaiement/${s.id}`);
      if ((await ref.get()).exists) continue;
      const uid = String(s.metadata?.uid || '');
      let email = String(s.customer_details?.email || s.customer_email || '').trim().toLowerCase();
      if (!email && uid) email = await getAuth().getUser(uid).then((u) => (u.email || '').toLowerCase()).catch(() => '');
      if (!email) continue; // la personne n'a jamais donné son adresse : rien à relancer
      // Une seule relance par adresse et par formation, même si elle a ouvert plusieurs caisses.
      const deja = await db.collection('relancesPaiement').where('email', '==', email).where('formationId', '==', formationId).limit(1).get();
      if (!deja.empty || await estDesabonnee(email) || await aDejaAchete(email, uid, formationId)) {
        await ref.set({ email, formationId, uid, ignoree: true, le: FieldValue.serverTimestamp() });
        continue;
      }
      const f = await db.doc(`formations/${formationId}`).get();
      // Le titre officiel en entier : « L'Expérience Ayurveda · VATA Essentiel » (Krystine, 6 oct. 2026).
      const titre = String(f.get('titre') || 'votre formation');
      const prenom = String(s.customer_details?.name || '').trim().split(/\s+/)[0] || '';
      const l = LETTRES[1](prenom, titre, lienDe(formationId));
      await transporter.sendMail({ from: fromAddr(), replyTo: REPLY_TO, to: email, subject: l.sujet, text: l.texte });
      await ref.set({ email, formationId, uid, prenom, titre, lettre1Le: FieldValue.serverTimestamp(), etape: 1 });
      console.log(`[relancerPaiements] lettre 1 · ${formationId}`);
    }

    // Lettre 2 : le lendemain de la lettre 1 (22 h plus tard au moins), si
    // l'achat n'a toujours pas eu lieu.
    const avant = Timestamp.fromMillis(maintenant - 22 * HEURE);
    const aSuivre = await db.collection('relancesPaiement').where('etape', '==', 1).where('lettre1Le', '<=', avant).limit(50).get();
    for (const d of aSuivre.docs) {
      const r = d.data() as { email: string; formationId: string; uid?: string; prenom?: string; titre?: string };
      // La lettre 2 décrit des capsules à écouter : elle est réservée à VATA
      // (Krystine, 6 oct. 2026). Les Rituels vivants (vidéos) et les autres
      // formations s'arrêtent à la lettre 1.
      if (r.formationId !== 'kajabi-2148687644') {
        await d.ref.update({ etape: 'sans-lettre-2', fermeeLe: FieldValue.serverTimestamp() });
        continue;
      }
      if (await estDesabonnee(r.email) || await aDejaAchete(r.email, r.uid || '', r.formationId)) {
        await d.ref.update({ etape: 'achetee-ou-sortie', fermeeLe: FieldValue.serverTimestamp() });
        continue;
      }
      const l = LETTRES[2](r.prenom || '', r.titre || 'votre formation', lienDe(r.formationId));
      await transporter.sendMail({ from: fromAddr(), replyTo: REPLY_TO, to: r.email, subject: l.sujet, text: l.texte });
      await d.ref.update({ etape: 2, lettre2Le: FieldValue.serverTimestamp() });
      console.log(`[relancerPaiements] lettre 2 · ${r.formationId}`);
    }
  },
);
