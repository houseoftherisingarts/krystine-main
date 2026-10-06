import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import { MAIL_SECRETS, NEWSLETTER_POSTAL_ADDRESS, PUBLIC_BASE_URL, REPLY_TO, createTransporter, fromAddr } from './newsletter/mail';

const CHARTE = {
  cream: '#f6f3ee', espresso: '#2a2015', brass: '#BA7B39', brassInk: '#8B4A2F',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
const ESSAIS_GLOBAL_PAR_JOUR = 500; // ~660 acheteuses : largement assez pour les vraies, dérisoire pour une force brute sur 2^40

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
        <tr><td style="padding:0 0 22px;font-family:${CHARTE.serif};font-size:32px;line-height:1.1;color:${CHARTE.espresso};font-weight:500;">Votre code est arrivé</td></tr>
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
    if (!offerIds.length) throw new HttpsError('failed-precondition', 'Aucune offre de l\'ancien site n\'est reliée à cette formation. Reliez-les d\'abord dans le tableau.');

    // Les achats à restaurer pour ces offres, regroupés par adresse.
    const parEmail = new Map<string, { ids: string[]; nom: string; offres: Set<string> }>();
    for (let i = 0; i < offerIds.length; i += 30) {
      // Un seul filtre par requête : aucun index composé à déployer.
      const q = await db.collection('kajabiRegistre').where('kjbOfferId', 'in', offerIds.slice(i, i + 30)).get();
      for (const d of q.docs) {
        const r = d.data() as Registre;
        if (r.statut !== 'a_restaurer') continue;
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
        const existant = (await db.collection('kajabiCodes').where('emailNormalise', '==', email).get()).docs
          .some(d => { const c = d.data() as { formationId?: string; statut?: string; test?: boolean }; return c.formationId === formationId && c.statut === 'actif' && !c.test; });
        if (existant && !testEmail) { sautes++; continue; }

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

    // Un code a 40 bits. Dix essais par jour et par compte, et un plafond
    // global sur tout le site : même avec mille comptes, personne ne le devine.
    const jour = new Date().toISOString().slice(0, 10);
    const tRef = db.doc(`kajabiTentatives/${uid}`);
    const gRef = db.doc('kajabiTentatives/_global');
    const [t, g] = (await db.getAll(tRef, gRef)).map(d => d.data() as { jour?: string; n?: number } | undefined);
    const n = t?.jour === jour ? (t.n || 0) : 0;
    const ng = g?.jour === jour ? (g.n || 0) : 0;
    if (n >= ESSAIS_PAR_JOUR || ng >= ESSAIS_GLOBAL_PAR_JOUR) throw new HttpsError('resource-exhausted', 'Trop d\'essais aujourd\'hui. Réessayez demain, ou écrivez-nous.');
    await Promise.all([tRef.set({ jour, n: n + 1, maj: FieldValue.serverTimestamp() }), gRef.set({ jour, n: ng + 1, maj: FieldValue.serverTimestamp() })]);

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

// ── Restauration sans code, à la connexion (décision de Krystine, 2 oct. 2026) ──
// Les anciennes clientes de VATA retrouvent leur formation dès qu'elles se
// connectent avec la même adresse : aucun code. On lit le registre à cette
// adresse et on écrit la même preuve d'achat que kajabiUtiliserCode (source
// kajabi, donc tout le cours ouvert, sans goutte-à-goutte).
//
// Sécurité : l'adresse doit être vérifiée par Firebase (Google le fait; un
// compte courriel et mot de passe confirme son adresse par le lien reçu).
// Sinon n'importe qui créerait un compte avec l'adresse d'une cliente et
// prendrait son accès : on répond alors « à vérifier », sans rien ouvrir.
// Une entrée du registre est liée au premier compte restauré (restaurePar) :
// un autre compte avec la même adresse est refusé et journalisé.
//
// Idempotent : un achat déjà « restaure » est sauté, et une preuve qui existe
// déjà (un achat fait sur le site) n'est jamais écrasée. Limitée aux
// formations ci-dessous tant que Krystine n'en a pas décidé d'autres.
export const FORMATIONS_RESTAURATION_AUTO = ['kajabi-2148687644'];

// ── Les fondatrices d'EXPÉRIENCE ORIGINE, sans code (décision de Krystine, 6 oct. 2026) ──
// Une fondatrice est reconnue à son adresse : une fiche de la collection
// newsletter à cette adresse porte l'étiquette « origine-fondatrice » (les 115
// de l'export Kajabi). Elle reçoit le cours dès qu'elle se connecte ou crée son
// compte avec cette adresse, vérifiée par Firebase (sinon « à vérifier »).
//
// L'interrupteur : formations/kajabi-2149348838, champ accesFondatricesOuvert.
// Absent ou false, personne n'entre, sauf les adresses de test ci-dessous.
// Krystine l'allume dans l'admin › Formations › Options du cours des fondatrices.
// La cohorte est close (12 juillet 2026) : tout le cours est ouvert, sans
// goutte-à-goutte. Une preuve d'achat déjà là n'est jamais écrasée.
export const FORMATION_FONDATRICES = 'kajabi-2149348838';
const ETIQUETTE_FONDATRICES = 'origine-fondatrice';
const FONDATRICES_TEST = ['krystine+fondatrice@inspiratanature.com', 'krystinestlaurent+fondatrice@gmail.com'];
// Le compte d'aperçu créé le 6 oct. 2026 pour parcourir le cours comme une
// fondatrice (krystinestlaurent+fondatrice@gmail.com) : seul compte dispensé
// de la vérification d'adresse, parce que ce compte précis est le nôtre.
const COMPTE_APERCU_UID = '1BDmCB6UtfP6IiJlCHOAZpVO5N72';

async function accorderFondatrice(db: ReturnType<typeof getFirestore>, uid: string, email: string, verifiee: boolean): Promise<'rien' | 'a_verifier' | 'accorde'> {
  const ref = db.doc(`achatsFormations/${uid}/formations/${FORMATION_FONDATRICES}`);
  if ((await ref.get()).exists) return 'rien';
  const test = FONDATRICES_TEST.includes(email);
  if (!test) {
    const fiche = (await db.doc(`formations/${FORMATION_FONDATRICES}`).get()).data() as { accesFondatricesOuvert?: boolean; titre?: string } | undefined;
    if (fiche?.accesFondatricesOuvert !== true) return 'rien';
    const abonnees = await db.collection('newsletter').where('email', '==', email).limit(10).get();
    if (!abonnees.docs.some(d => ((d.get('tags') || []) as string[]).includes(ETIQUETTE_FONDATRICES))) return 'rien';
  }
  if (!verifiee && uid !== COMPTE_APERCU_UID) return 'a_verifier';
  const f = ((await db.doc(`formations/${FORMATION_FONDATRICES}`).get()).data() || {}) as { titre?: string; imageUrl?: string };
  await ref.set({
    titre: f.titre || 'Expérience Origine : Cohorte Fondatrice',
    imageUrl: f.imageUrl || '',
    montant: 0,
    source: 'fondatrice',
    restaurationAuto: true,
    ...(test ? { test: true } : {}),
    acheteLe: FieldValue.serverTimestamp(),
  });
  console.log(`[kajabiRestaurerAuto] fondatrice ${uid} (${email}) a reçu ${FORMATION_FONDATRICES}${test ? ' (adresse de test)' : ''}`);
  return 'accorde';
}
const RESTAURABLE = ['a_restaurer', 'code_envoye'];

export const kajabiRestaurerAuto = onCall(
  { region: 'us-central1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connectez-vous.');
    const uid = req.auth.uid;
    const email = normaliser(req.auth.token?.email || '');
    const rien = { restaurees: [] as string[], aVerifier: false };
    if (!email) return rien;
    const db = getFirestore();

    // Les fondatrices d'EXPÉRIENCE ORIGINE retrouvent leur cours à la connexion.
    const fondatrice = await accorderFondatrice(db, uid, email, req.auth.token?.email_verified === true);
    const fin = { restaurees: fondatrice === 'accorde' ? [FORMATION_FONDATRICES] : [] as string[], aVerifier: fondatrice === 'a_verifier' };

    // Offre → formations couvertes par la restauration automatique.
    const achats = (await db.collection('kajabiRegistre').where('emailNormalise', '==', email).get()).docs;
    if (!achats.length) return fin;
    const offerIds = [...new Set(achats.map(d => String(d.get('kjbOfferId') || '')).filter(Boolean))];
    const offres = offerIds.length ? await db.getAll(...offerIds.map(id => db.doc(`kajabiOffres/${id}`))) : [];
    const formationsDe = new Map(offres.map(o => [o.id, ((o.get('formationIds') || []) as string[]).filter(f => FORMATIONS_RESTAURATION_AUTO.includes(f))]));
    const couverts = achats.filter(d => (formationsDe.get(String(d.get('kjbOfferId') || '')) || []).length);

    // Déjà restauré pour un autre compte avec la même adresse : refus journalisé.
    const autres = couverts.filter(d => { const p = d.get('restaurePar') || (d.get('statut') === 'restaure' ? d.get('uid') : ''); return p && p !== uid; });
    if (autres.length) console.warn(`[kajabiRestaurerAuto] refus : ${email} déjà restauré pour un autre compte (${autres.map(d => d.id).join(', ')}), appel de ${uid}`);

    const aFaire = couverts.filter(d => RESTAURABLE.includes(String(d.get('statut'))) && !d.get('restaurePar'));
    if (!aFaire.length) return fin;
    if (req.auth.token?.email_verified !== true) return { restaurees: fin.restaurees, aVerifier: true };

    const parFormation = new Map<string, { ids: string[]; offres: Set<string> }>();
    for (const d of aFaire) {
      const offre = String(d.get('kjbOfferId'));
      for (const f of formationsDe.get(offre) || []) {
        const e = parFormation.get(f) || { ids: [], offres: new Set<string>() };
        e.ids.push(d.id); e.offres.add(offre); parFormation.set(f, e);
      }
    }

    const restaurees: string[] = [...fin.restaurees];
    for (const [formationId, info] of parFormation) {
      const ref = db.doc(`achatsFormations/${uid}/formations/${formationId}`);
      const f = ((await db.doc(`formations/${formationId}`).get()).data() || {}) as { titre?: string; imageUrl?: string };
      const fait = await db.runTransaction(async (tx) => {
        const regRefs = info.ids.map(id => db.doc(`kajabiRegistre/${id}`));
        const [deja, ...regs] = await tx.getAll(ref, ...regRefs);
        // Relu dans la transaction : un appel simultané a pu les prendre.
        const libres = regs.filter(r => RESTAURABLE.includes(String(r.get('statut'))) && !r.get('restaurePar'));
        if (!libres.length) return false;
        if (!deja.exists) {
          tx.set(ref, {
            titre: f.titre || formationId,
            imageUrl: f.imageUrl || '',
            montant: 0,
            source: 'kajabi',
            kjbOfferIds: [...info.offres],
            restaurationAuto: true,
            acheteLe: FieldValue.serverTimestamp(),
          });
        }
        for (const r of libres) tx.update(r.ref, { statut: 'restaure', uid, restaurePar: uid, restaureLe: FieldValue.serverTimestamp(), restaurationAuto: true });
        tx.set(db.doc(`members/${uid}`), { kajabiEmails: FieldValue.arrayUnion(email) }, { merge: true });
        return true;
      });
      if (fait) restaurees.push(formationId);
    }
    if (restaurees.length) console.log(`[kajabiRestaurerAuto] ${uid} (${email}) a retrouvé ${restaurees.join(', ')}`);
    return { restaurees, aVerifier: fin.aVerifier };
  },
);
