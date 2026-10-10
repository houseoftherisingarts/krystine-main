// Le portrait d'une nouvelle recrue de Mon Équipe, le programme Mac des employés de Krystine.
//
// Le programme envoie la description de la personne (une phrase en anglais tirée de sa fiche,
// et au besoin quelques mots de Krystine). Le prompt se bâtit ici, autour d'un style maison fixe
// calqué sur les portraits d'Iris et de Tony, puis Replicate (google/nano-banana) rend l'image.
// La fonction la rend en JPEG base64 : le programme la range comme une photo choisie.
//
// Accès : le compte Iris (iris@krystinestlaurent.ca), qui est celui du programme, ou une admin du
// site. Aucune clé ne descend au programme : le jeton Replicate vit dans le secret
// REPLICATE_API_TOKEN.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ADMIN_EMAILS } from './newsletter/send';

const REPLICATE_API_TOKEN = defineSecret('REPLICATE_API_TOKEN');

const COMPTE_IRIS = 'iris@krystinestlaurent.ca';
// ponytail: plafond global de 30 portraits par jour (environ 1,20 $), un compteur par jour UTC;
// un plafond par compte si d'autres programmes s'en servent un jour.
const PLAFOND_JOUR = 30;
const TEXTE_MAX = 400;
const MODELE = 'https://api.replicate.com/v1/models/google/nano-banana/predictions';

export const STYLE_MAISON = 'Photorealistic editorial portrait photograph, head and shoulders, centered, facing camera, '
  + 'soft natural window light from the left, plain warm cream wall background with a bright window edge on the left, '
  + 'linen and natural fabrics, calm and warm expression, shallow depth of field, 85mm lens, square format. No text, no logo.';

const propre = (v: unknown) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TEXTE_MAX) : '');

/** Le prompt complet : le style maison, puis la personne, puis les mots de Krystine s'il y en a. */
export function construirePrompt(data: unknown): string {
  const d = (data && typeof data === 'object' ? data : {}) as { apparence?: unknown; precisions?: unknown };
  const apparence = propre(d.apparence);
  const precisions = propre(d.precisions);
  if (!apparence && !precisions) throw new HttpsError('invalid-argument', 'La description de la personne manque.');
  return [
    STYLE_MAISON,
    apparence && `The person: ${apparence.replace(/\.$/, '')}.`,
    precisions && `Adjust the person as requested (the request may be in French, it wins over the description): ${precisions.replace(/\.$/, '')}.`,
  ].filter(Boolean).join(' ');
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Une prédiction synchrone (Prefer: wait=60). Un 429 « throttled » se réessaie après 8 s, deux fois au plus.
async function predire(prompt: string, jeton: string): Promise<string> {
  for (let essai = 0; ; essai++) {
    const r = await fetch(MODELE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: '1:1', output_format: 'jpg' } }),
    });
    if (r.status === 429 && essai < 2) { await attendre(8000); continue; }
    const corps = (await r.json().catch(() => null)) as { status?: string; output?: unknown; error?: unknown } | null;
    if (!r.ok || !corps) {
      console.error(`genererPortrait : Replicate a répondu ${r.status}`, corps?.error ?? '');
      throw new HttpsError('unavailable', 'Le studio photo ne répond pas. Réessaie dans un instant.');
    }
    const url = Array.isArray(corps.output) ? corps.output[0] : corps.output;
    if (corps.status !== 'succeeded' || typeof url !== 'string') {
      console.error('genererPortrait : prédiction sans image', corps.status, corps.error ?? '');
      throw new HttpsError('unavailable', "Le portrait n'a pas pu être fait. Réessaie dans un instant.");
    }
    return url;
  }
}

// Compte le portrait du jour; refuse au-delà du plafond.
async function compter(): Promise<void> {
  const jour = new Date().toISOString().slice(0, 10);
  const ref = getFirestore().doc(`portraitsEquipe/${jour}`);
  await getFirestore().runTransaction(async (t) => {
    const n = Number((await t.get(ref)).data()?.n || 0);
    if (n >= PLAFOND_JOUR) throw new HttpsError('resource-exhausted', `Le plafond de ${PLAFOND_JOUR} portraits par jour est atteint. Réessaie demain.`);
    t.set(ref, { n: FieldValue.increment(1), maj: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export const genererPortrait = onCall(
  { region: 'us-central1', secrets: [REPLICATE_API_TOKEN], timeoutSeconds: 120, memory: '256MiB' },
  async (req): Promise<{ image: string; type: 'image/jpeg' }> => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Connexion requise.');
    const email = String(req.auth.token.email || '').toLowerCase();
    if (email !== COMPTE_IRIS && !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Réservé au compte Iris.');
    const prompt = construirePrompt(req.data);
    const jeton = REPLICATE_API_TOKEN.value();
    if (!jeton) throw new HttpsError('failed-precondition', "Le studio photo n'est pas configuré.");
    await compter();
    const url = await predire(prompt, jeton);
    const image = await fetch(url);
    if (!image.ok) throw new HttpsError('unavailable', "Le portrait n'a pas pu être récupéré. Réessaie dans un instant.");
    const octets = Buffer.from(await image.arrayBuffer());
    if (octets.length > 8 * 1024 * 1024) throw new HttpsError('internal', 'Le portrait reçu est trop lourd.');
    return { image: octets.toString('base64'), type: 'image/jpeg' };
  },
);
