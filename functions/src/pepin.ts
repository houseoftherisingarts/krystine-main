import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'crypto';
import { RECAPTCHA_SECRET, garderFormulaire } from './captcha';
import { limiterParIp, MESSAGE_CADENCE } from './newsletter/robots';

// « Un commentaire ? Écrivez-nous » (ex « Un pépin ? », 6 oct. 2026) : la pastille d'aide de toutes les pages
// publiques. Une visiteuse non connectée n'a pas le droit d'écrire dans
// Firestore (règles de `bugs`), alors le message passe ici : la case « Je ne
// suis pas un robot » et la cadence par adresse IP gardent la porte, puis
// l'Admin SDK range la fiche dans `bugs/{id}`, là où l'onglet Problèmes
// techniques de l'admin la lit déjà. Une personne connectée passe seulement
// la cadence. La copie part aussi à la porte du studio (recevoirDemande).

const VEXEL_PORTE = 'https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande';
const VEXEL_CLIENT = 'krystine';
// Clé client publique, déjà dans l'iframe DemandeVexel ; ce n'est pas un secret.
const VEXEL_CLE = 'aT_yMR68NLyEW3weNDjwYdW_';
const CAPTURE_MAX = 5 * 1024 * 1024;
const TYPES = new Set(['aime', 'idee', 'technique', 'introuvable']);
const PREFIXES: Record<string, string> = {
  aime: '[Aime ce qu\'elle voit] ',
  idee: '[Une idée] ',
  introuvable: '[Ne trouve pas ce qu\'elle cherche] ',
};
const MIMES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const signalerPepin = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET], memory: '512MiB' },
  async (req) => {
    const d = (req.data || {}) as Record<string, unknown>;
    const type = TYPES.has(String(d.type)) ? String(d.type) : 'technique';
    const texte = String(d.texte || '').trim().slice(0, 4000);
    const courriel = String(d.courriel || req.auth?.token?.email || '').trim().toLowerCase().slice(0, 200);
    const nom = String(d.nom || req.auth?.token?.name || '').trim().slice(0, 120);
    const page = String(d.page || '').slice(0, 300);
    const ecran = String(d.ecran || '').slice(0, 20);
    const agent = String(d.agent || '').slice(0, 300);

    if (!texte) throw new HttpsError('invalid-argument', 'Le message est vide.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) throw new HttpsError('invalid-argument', 'Courriel invalide.');

    if (req.auth) {
      if (!(await limiterParIp(req.rawRequest?.ip, 'pepin', 10))) throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
    } else {
      await garderFormulaire(String(d.token || ''), 'pepin', req.rawRequest?.ip, 5);
    }

    let capture = '';
    let capturePath = '';
    const b64 = typeof d.capture === 'string' ? d.capture : '';
    if (b64) {
      const mime = String(d.captureType || 'image/jpeg');
      const ext = MIMES[mime];
      if (!ext) throw new HttpsError('invalid-argument', 'La capture doit être une image.');
      const buf = Buffer.from(b64, 'base64');
      if (buf.length === 0 || buf.length > CAPTURE_MAX) throw new HttpsError('invalid-argument', 'La capture est trop lourde.');
      const bucket = getStorage().bucket();
      capturePath = `bugs/pepin/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const jeton = crypto.randomUUID();
      await bucket.file(capturePath).save(buf, {
        contentType: mime,
        metadata: { metadata: { firebaseStorageDownloadTokens: jeton } },
      });
      capture = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(capturePath)}?alt=media&token=${jeton}`;
    }

    let vexel: 'transmis' | 'echec' = 'echec';
    try {
      const rep = await fetch(VEXEL_PORTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: VEXEL_CLIENT,
          cle: VEXEL_CLE,
          type: type === 'technique' ? 'bug' : 'contact',
          auteurNom: nom,
          auteurCourriel: courriel,
          texte: (PREFIXES[type] || '') + texte,
          page: `https://krystinestlaurent.ca${page}`,
          capture,
          agent,
          ecran,
        }),
      });
      if (rep.ok) vexel = 'transmis';
    } catch (e) {
      console.warn('[pepin] porte Vexel injoignable', e);
    }

    await getFirestore().collection('bugs').add({
      uid: req.auth?.uid || '',
      nom,
      courriel,
      texte,
      page,
      capture,
      capturePath,
      agent,
      ecran,
      type,
      source: 'pastille',
      statut: 'nouveau',
      vexel,
      cree: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  },
);
