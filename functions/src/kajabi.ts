import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr } from './newsletter/mail';
import { CHARTE, esc } from './newsletter/renderer';

// Les achats de l'ancien système (Kajabi) retrouvent leur propriétaire sur le
// site, formation par formation, avec un code personnel.
//
//   kajabiRegistre/{stripe_<charge>}  un achat Kajabi (source : Stripe), avec
//                                     emailNormalise, kjbOfferId, statut
//                                     a_restaurer | code_envoye | restaure
//   kajabiOffres/{kjbOfferId}         titre, formationIds[] : la table offre →
//                                     formations, remplie par Krystine dans l'admin
//   kajabiCodes/{code}                le code envoyé à une adresse pour une formation
//   kajabiTentatives/{uid}            compteur d'essais par jour (force brute)
//
// Le registre se remplit par scripts/kajabi/registre.mjs. Quand une formation
// est migrée, l'admin appelle kajabiEmettreCodes : chaque acheteuse de cette
// formation reçoit un code par courriel (et dans sa messagerie si elle a déjà
// un compte). Dans « Mes formations », elle entre le code : kajabiUtiliserCode
// écrit la preuve d'achat dans achatsFormations, comme le ferait un paiement.

const ADMIN_EMAILS = [
  'admin@krystinestlaurent.ca',
  'krystine@inspiratanature.com',
  'alex@lesalondesinconnus.com',
  'krystinestlaurent@gmail.com',
  'houseoftherisingarts@gmail.com',
  'krystinestterredhysope@gmail.com',
];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O ni 1/I
const VALIDITE_JOURS = 180;
const ESSAIS_PAR_JOUR = 10;

const threadId = (a: string, b: string) => [a, b].sort().join('__');
const normaliser = (e: string) => String(e || '').trim().toLowerCase();
const normaliserCode = (c: string) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function nouveauCode(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `KSL-${bloc()}-${bloc()}`;
}

interface Registre { emailNormalise: string; nom?: string; kjbOfferId: string; montant?: number; acheteLe?: string; statut: string }

function courrielHtml(o: { prenom: string; code: string; titre: string; postalAddress: string }): string {
  const p = (t: string) => `<tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.7;color:${CHARTE.espresso};">${t}</td></tr>`;
  const salut = o.prenom ? `Bonjour ${esc(o.prenom)},` : 'Bonjour,';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Votre code pour ${esc(o.titre)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:40px 16px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:15px;overflow:hidden;">
      <tr><td style="padding:40px 40px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 10px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${CHARTE.brassInk};font-weight:600;">Vos formations déménagent</td></tr>
        <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:32px;line-height:1.1;color:${CHARTE.espresso};font-weight:500;">${esc(o.titre)} vous attend</td></tr>
        <tr><td style="padding:0 0 26px;"><div style="height:1px;width:64px;background:${CHARTE.brass};"></div></td></tr>
        ${p(salut)}
        ${p(`Votre formation « ${esc(o.titre)} » vient d'arriver dans sa nouvelle maison, sur krystinestlaurent.ca. Voici votre code personnel pour la retrouver dans votre espace, sans rien repayer.`)}
        <tr><td align="center" style="padding:6px 0 24px;"><div style="display:inline-block;padding:16px 28px;border-radius:15px;background:${CHARTE.cream};font-family:${CHARTE.sans};font-size:26px;letter-spacing:0.18em;font-weight:700;color:${CHARTE.espresso};">${esc(o.code)}</div></td></tr>
        ${p(`Ouvrez votre espace (il se crée en une minute avec votre courriel ou votre compte Google si vous n'en avez pas encore), allez dans « Mes formations » et entrez ce code dans la case « J'ai reçu un code ». Il est valide ${VALIDITE_JOURS} jours et ne sert qu'une fois.`)}
        <tr><td align="center" style="padding:4px 0 28px;"><a href="${PUBLIC_BASE_URL}/compte?onglet=formations" target="_blank" style="display:inline-block;background:${CHARTE.brass};color:#ffffff;font-family:${CHARTE.sans};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:15px 28px;border-radius:999px;">Retrouver ma formation</a></td></tr>
        ${p('Au plaisir de vous retrouver là-bas !<br /><span style="font-family:' + CHARTE.serif + ';font-size:22px;">Krystine</span>')}
      </table></td></tr>
      <tr><td style="padding:24px 40px 30px;border-top:1px solid rgba(42,32,21,0.08);font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(42,32,21,0.55);">${esc(o.postalAddress)}<br />Ce courriel vous est envoyé parce que vous avez acheté cette formation sur l'ancien site (krystinestlaurent.com).</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function courrielTexte(o: { prenom: string; code: string; titre: string }): string {
  return [`${o.prenom ? `Bonjour ${o.prenom},` : 'Bonjour,'}`,
    `Votre formation « ${o.titre} » vient d'arriver dans sa nouvelle maison, sur krystinestlaurent.ca. Voici votre code personnel pour la retrouver dans votre espace, sans rien repayer :`,
    o.code,
    `Ouvrez votre espace sur ${PUBLIC_BASE_URL}/compte?onglet=formations, allez dans « Mes formations » et entrez ce code dans la case « J'ai reçu un code ». Il est valide ${VALIDITE_JOURS} jours et ne sert qu'une fois.`,
    'Au plaisir de vous retrouver là-bas ! Krystine'].join('\n\n');
}

// ── Admin : émettre et envoyer les codes d'une formation migrée ─────────────
export const kajabiEmettreCodes = onCall(
  { region: 'us-central1', secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' },
  async (req) => {
    const adminEmail = normaliser(req.auth?.token?.email || '');
    if (!req.auth || !ADMIN_EMAILS.includes(adminEmail)) throw new HttpsError('permission-denied', 'Réservé à l\'admin.');
    const formationId = String(req.data?.formationId || '');
    const testEmail = normaliser(req.data?.testEmail || '');
    if (!formationId) throw new HttpsError('invalid-argument', 'La formation est requise.');

    const db = getFirestore();
    const fSnap = await db.doc(`formations/${formationId}`).get();
    if (!fSnap.exists) throw new HttpsError('not-found', 'Cette formation n\'existe pas.');
    const titre = String((fSnap.data() as { titre?: string }).titre || formationId);

    const offres = await db.collection('kajabiOffres').where('formationIds', 'array-contains', formationId).get();
    const offerIds = offres.docs.map(d => d.id);
    if (!offerIds.length) throw new HttpsError('failed-precondition', 'Aucune offre Kajabi n\'est reliée à cette formation. Reliez-les d\'abord dans le tableau.');

    // Les achats à restaurer pour ces offres, regroupés par adresse.
    const parEmail = new Map<string, { ids: string[]; nom: string; offres: Set<string> }>();
    for (let i = 0; i < offerIds.length; i += 30) {
      const q = await db.collection('kajabiRegistre').where('kjbOfferId', 'in', offerIds.slice(i, i + 30)).where('statut', '==', 'a_restaurer').get();
      for (const d of q.docs) {
        const r = d.data() as Registre;
        const e = parEmail.get(r.emailNormalise) || { ids: [], nom: '', offres: new Set<string>() };
        e.ids.push(d.id); e.offres.add(r.kjbOfferId); if (r.nom && !e.nom) e.nom = r.nom;
        parEmail.set(r.emailNormalise, e);
      }
    }
    // Une adresse qui a déjà cette formation (achetée ici, ou code déjà utilisé) ne reçoit rien.
    const cibles = testEmail ? [[testEmail, parEmail.get(testEmail) || { ids: [], nom: '', offres: new Set<string>() }] as const] : [...parEmail.entries()];
    if (!cibles.length) return { envoyes: 0, sautes: 0, erreurs: 0, message: 'Toutes les acheteuses de cette formation ont déjà reçu leur code.' };

    const postalAddress = NEWSLETTER_POSTAL_ADDRESS.value();
    const transporter = createTransporter();
    let envoyes = 0, sautes = 0, erreurs = 0;
    try {
      for (const [email, info] of cibles) {
        // Un code actif existe déjà pour cette adresse et cette formation : rien à refaire.
        const existant = await db.collection('kajabiCodes').where('emailNormalise', '==', email).where('formationId', '==', formationId).where('statut', '==', 'actif').limit(1).get();
        if (!existant.empty && !testEmail) { sautes++; continue; }

        let code = nouveauCode();
        while ((await db.doc(`kajabiCodes/${code}`).get()).exists) code = nouveauCode();
        const prenom = (info.nom || '').split(' ')[0] || '';
        const membre = await db.collection('members').where('email', '==', email).limit(1).get();
        const uid = membre.empty ? null : membre.docs[0].id;

        try {
          await transporter.sendMail({
            from: fromAddr(), replyTo: REPLY_TO, to: email,
            subject: `Votre code pour « ${titre} »`,
            html: courrielHtml({ prenom, code, titre, postalAddress }),
            text: courrielTexte({ prenom, code, titre }),
          });
        } catch (err) {
          console.error('[kajabiEmettreCodes] courriel raté', email, err);
          erreurs++;
          continue;
        }

        const lot = db.batch();
        lot.set(db.doc(`kajabiCodes/${code}`), {
          emailNormalise: email, nom: info.nom || '', formationId, formationTitre: titre,
          kjbOfferIds: [...info.offres], registreIds: info.ids, uidPrevu: uid,
          statut: 'actif', creeLe: FieldValue.serverTimestamp(),
          expireLe: Timestamp.fromMillis(Date.now() + VALIDITE_JOURS * 86400e3),
          test: !!testEmail,
        });
        if (!testEmail) for (const id of info.ids) lot.update(db.doc(`kajabiRegistre/${id}`), { statut: 'code_envoye', code, codeEnvoyeLe: FieldValue.serverTimestamp() });
        // La même nouvelle dans sa messagerie sur le site, si elle a déjà un compte.
        if (uid) {
          const id = threadId(req.auth.uid, uid);
          const m = membre.docs[0].data() as { displayName?: string; photoURL?: string };
          const corps = `Votre formation « ${titre} » vient d'arriver dans sa nouvelle maison ! Voici votre code personnel pour la retrouver sans rien repayer : ${code}. Entrez-le dans « Mes formations », sous « J'ai reçu un code ».`;
          lot.set(db.doc(`dms/${id}`), {
            participantUids: [req.auth.uid, uid].sort(),
            participantNames: { [req.auth.uid]: 'Krystine', [uid]: m.displayName || 'Membre' },
            ...(m.photoURL ? { participantPhotos: { [uid]: m.photoURL } } : {}),
            lastMessage: corps.slice(0, 140), lastMessageAt: FieldValue.serverTimestamp(), lastSenderUid: req.auth.uid,
            unread: { [uid]: FieldValue.increment(1) },
          }, { merge: true });
          lot.set(db.collection(`dms/${id}/messages`).doc(), { senderUid: req.auth.uid, senderName: 'Krystine', body: corps, kajabiCode: code, createdAt: FieldValue.serverTimestamp() });
        }
        await lot.commit();
        envoyes++;
        await new Promise(r => setTimeout(r, 150)); // Resend refuse au-delà de 10 requêtes/s
      }
    } finally {
      transporter.close();
    }
    console.log(`[kajabiEmettreCodes] ${formationId} : ${envoyes} envoyés, ${sautes} déjà faits, ${erreurs} erreurs`);
    return { envoyes, sautes, erreurs };
  },
);

// ── Cliente : entrer son code dans « Mes formations » ───────────────────────
export const kajabiUtiliserCode = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous pour entrer votre code.');
    const uid = req.auth.uid;
    const brut = normaliserCode(req.data?.code);
    if (brut.length !== 11 || !brut.startsWith('KSL')) throw new HttpsError('invalid-argument', 'Ce code n\'a pas la bonne forme (KSL-XXXX-XXXX).');
    const code = `KSL-${brut.slice(3, 7)}-${brut.slice(7, 11)}`;
    const db = getFirestore();

    // Dix essais par jour et par compte : un code a 40 bits, personne ne le devine.
    const jour = new Date().toISOString().slice(0, 10);
    const tRef = db.doc(`kajabiTentatives/${uid}`);
    const t = (await tRef.get()).data() as { jour?: string; n?: number } | undefined;
    const n = t?.jour === jour ? (t.n || 0) : 0;
    if (n >= ESSAIS_PAR_JOUR) throw new HttpsError('resource-exhausted', 'Trop d\'essais aujourd\'hui. Réessayez demain, ou écrivez-nous.');
    await tRef.set({ jour, n: n + 1, maj: FieldValue.serverTimestamp() });

    const cRef = db.doc(`kajabiCodes/${code}`);
    const donnees = await db.runTransaction(async (tx) => {
      const snap = await tx.get(cRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Ce code n\'existe pas. Vérifiez les lettres et les chiffres.');
      const c = snap.data() as { statut: string; expireLe?: Timestamp; formationId: string; formationTitre?: string; registreIds?: string[]; emailNormalise: string; kjbOfferIds?: string[] };
      if (c.statut === 'utilise') throw new HttpsError('failed-precondition', 'Ce code a déjà été utilisé.');
      if (c.expireLe && c.expireLe.toMillis() < Date.now()) throw new HttpsError('failed-precondition', 'Ce code a expiré. Écrivez-nous et nous vous en enverrons un nouveau.');
      tx.update(cRef, { statut: 'utilise', uid, utiliseLe: FieldValue.serverTimestamp() });
      return c;
    });

    const fSnap = await db.doc(`formations/${donnees.formationId}`).get();
    const f = (fSnap.data() || {}) as { titre?: string; imageUrl?: string };
    const lot = db.batch();
    lot.set(db.doc(`achatsFormations/${uid}/formations/${donnees.formationId}`), {
      titre: f.titre || donnees.formationTitre || donnees.formationId,
      imageUrl: f.imageUrl || '',
      montant: 0,
      source: 'kajabi',
      kajabiCode: code,
      kjbOfferIds: donnees.kjbOfferIds || [],
      acheteLe: FieldValue.serverTimestamp(),
    }, { merge: true });
    for (const id of donnees.registreIds || []) lot.update(db.doc(`kajabiRegistre/${id}`), { statut: 'restaure', uid, restaureLe: FieldValue.serverTimestamp() });
    lot.set(db.doc(`members/${uid}`), { kajabiEmails: FieldValue.arrayUnion(donnees.emailNormalise) }, { merge: true });
    await lot.commit();
    await tRef.delete().catch(() => undefined);
    console.log(`[kajabiUtiliserCode] ${uid} a retrouvé ${donnees.formationId} avec ${code}`);
    return { formationId: donnees.formationId, titre: f.titre || donnees.formationTitre || donnees.formationId };
  },
);
