import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { RECAPTCHA_SECRET, garderFormulaire } from './captcha';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO, PUBLIC_BASE_URL } from './newsletter/mail';
import { enregistrerInscription } from './newsletter/inscrire';
import { renderResultatHtml, renderResultatTexte, sujetResultat, lireProfil, ETIQUETTE_SUITE, type Dosha } from './quizCourriel';

// ─── « Recevoir mon résultat » (page /quiz) ──────────────────────────────────
// Une visiteuse reçoit son résultat par courriel sans créer de compte
// (Krystine, 2 oct. 2026). La fonction garde la porte (pot de miel, cadence
// par adresse IP, reCAPTCHA, trois envois par adresse en 24 h), enregistre le
// résultat dans `doshaResults`, envoie le courriel, puis, seulement si la case
// « Recevoir la suite de ma lecture » est cochée, inscrit la personne au fil
// par le même chemin que `inscrireInfolettre`. Rien de personnel ne revient.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENVOIS_MAX = 3;
const FENETRE_MS = 24 * 60 * 60 * 1000;
const NOM: Record<Dosha, string> = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' };

// L'étiquette de suite (suite-vent, suite-feu, suite-terre) se pose APRÈS
// l'inscription, dans une mise à jour à part : la séquence par étiquette ne
// démarre que sur une fiche modifiée (inscrireSequencesEtiquette), jamais à
// la création, et une étiquette déjà présente à la création ne la déclenche plus.
async function poserSuite(ins: { id: string; status: string }, d1: Dosha) {
  if (ins.status !== 'active') return;
  await getFirestore().doc(`newsletter/${ins.id}`).update({ tags: FieldValue.arrayUnion(ETIQUETTE_SUITE[d1]) });
}
const ETIQUETTE_RX = /^(profil-(equilibre|double|teinte|net)|second-(vent|feu|terre))$/;

const pct = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

/** Trois envois par adresse en 24 h : un document par adresse (empreinte, jamais l'adresse en clair). */
async function limiterParAdresse(email: string): Promise<boolean> {
  const db = getFirestore();
  const ref = db.doc(`quizEnvois/${crypto.createHash('sha256').update(email).digest('hex')}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const maintenant = Date.now();
    const recents = ((snap.get('envois') as Timestamp[] | undefined) || [])
      .map(t => t.toMillis())
      .filter(ms => maintenant - ms < FENETRE_MS);
    if (recents.length >= ENVOIS_MAX) return false;
    recents.push(maintenant);
    tx.set(ref, { envois: recents.map(ms => Timestamp.fromMillis(ms)), majLe: FieldValue.serverTimestamp() });
    return true;
  });
}

export const envoyerResultatQuiz = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET, ...MAIL_SECRETS], cors: true },
  async (req) => {
    const d = (req.data || {}) as Record<string, unknown>;

    // Pot de miel : même champ caché que NewsletterSignup.
    if (String(d.site ?? '').trim()) {
      console.warn('[quiz] refus : pot de miel rempli');
      throw new HttpsError('invalid-argument', "Votre résultat n'a pas pu être envoyé.");
    }

    const email = String(d.email ?? '').trim().toLowerCase().slice(0, 200);
    // Prénom : retours de ligne retirés, 60 caractères au plus (échappé au rendu).
    const prenom = String(d.prenom ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 60);
    // Seules trois valeurs passent; tout le reste est refusé avant le rendu.
    const DOMINANTS: Record<string, Dosha> = { Vata: 'vata', Pitta: 'pitta', Kapha: 'kapha' };
    const brut = String(d.dominant ?? '');
    const dominant = Object.prototype.hasOwnProperty.call(DOMINANTS, brut) ? DOMINANTS[brut] : null;
    if (!EMAIL_RX.test(email)) throw new HttpsError('invalid-argument', 'Entrez une adresse courriel valide.');
    if (!prenom) throw new HttpsError('invalid-argument', 'Entrez votre prénom.');
    if (!dominant) throw new HttpsError('invalid-argument', 'Résultat illisible.');
    const p = (d.pourcentages && typeof d.pourcentages === 'object') ? d.pourcentages as Record<string, unknown> : {};
    const pourcentages = { vata: pct(p.vata), pitta: pct(p.pitta), kapha: pct(p.kapha) };
    const suite = d.suite === true;
    // L'algorithme du résultat (quizCourriel.ts) : D1 vient des pourcentages,
    // Vent puis Feu puis Terre à égalité. Sans pourcentages lisibles, le
    // dominant reçu reste.
    const profil = lireProfil(pourcentages);
    const d1: Dosha = pourcentages.vata + pourcentages.pitta + pourcentages.kapha > 0 ? profil.ordre[0] : dominant;

    // Cadence par IP (5 par heure) puis jeton reCAPTCHA, comme la musique d'Origine.
    await garderFormulaire(String(d.token || ''), 'quiz-resultat', req.rawRequest?.ip);
    if (!(await limiterParAdresse(email))) {
      console.warn('[quiz] refus : plus de 3 envois en 24 h pour cette adresse');
      throw new HttpsError('resource-exhausted', 'Votre résultat a déjà été envoyé à cette adresse. Vérifiez votre boîte de réception.');
    }

    await getFirestore().collection('doshaResults').add({
      ...(req.auth?.uid ? { uid: req.auth.uid } : {}),
      firstName: prenom,
      lastName: '',
      email,
      dominant: NOM[d1],
      ...pourcentages,
      source: 'quiz-courriel',
      tags: ['dosha-quiz', ...profil.etiquettes],
      branche: profil.branche,
      suite,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Sans la case cochée, le courriel porte un bouton qui inscrit en un clic :
    // la clé ne donne accès qu'à ce geste-là, et vit 60 jours.
    let lienSuite: string | undefined;
    if (!suite) {
      const k = crypto.randomBytes(24).toString('base64url');
      await getFirestore().doc(`quizSuite/${k}`).set({
        email, prenom, dosha: d1, etiquettes: profil.etiquettes, creeLe: FieldValue.serverTimestamp(),
        ...(String(d.lang ?? '').toLowerCase() === 'en' ? { lang: 'en' } : { lang: 'fr' }),
      });
      lienSuite = `${PUBLIC_BASE_URL}/suite-lecture?k=${k}`;
    }
    const r = { prenom, dominant: d1, pourcentages, suite, lienSuite };
    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        replyTo: REPLY_TO,
        from: fromAddr(),
        to: email,
        subject: sujetResultat(d1),
        html: renderResultatHtml(r),
        text: renderResultatTexte(r),
      });
    } catch (err) {
      console.error('[quiz] envoi raté', err);
      throw new HttpsError('internal', "Le courriel n'a pas pu partir. Réessayez dans un instant.");
    } finally {
      transporter.close();
    }

    if (suite) {
      // L'inscription au fil ne fait jamais échouer l'envoi du résultat.
      try {
        const lang = String(d.lang ?? '').toLowerCase();
        const ins = await enregistrerInscription({
          email,
          firstName: prenom,
          source: 'quiz',
          tags: ['quiz', `dosha-${d1}`, ...profil.etiquettes],
          consentement: true,
          ...(lang === 'fr' || lang === 'en' ? { lang } : {}),
          ...(d.provenance && typeof d.provenance === 'object' ? { provenance: d.provenance } : {}),
        }, req.auth?.uid);
        await poserSuite(ins, d1);
      } catch (e) {
        console.error('[quiz] inscription au fil', e);
      }
    }

    console.log(`[quiz] résultat envoyé · ${d1} · ${profil.branche} · suite=${suite}`);
    return { ok: true };
  },
);

// ─── « Recevoir la suite de ma lecture », en un clic depuis le courriel ──────
// /suite-lecture?k=… (réécriture dans firebase.json). Le clic de la personne
// vaut consentement : geste explicite depuis sa propre boîte. Clé inconnue,
// déjà utilisée ou vieille de plus de 60 jours : retour au quiz, rien d'écrit.
const CLE_RX = /^[A-Za-z0-9_-]{32}$/;
const VIE_MS = 60 * 24 * 60 * 60 * 1000;

export const suiteLecture = onRequest(
  { region: 'us-central1', maxInstances: 10, secrets: [...MAIL_SECRETS] },
  async (req, res) => {
    const k = String(req.query.k || '');
    let ok = false;
    if (CLE_RX.test(k)) {
      try {
        const ref = getFirestore().doc(`quizSuite/${k}`);
        const snap = await ref.get();
        const cree = (snap.get('creeLe') as Timestamp | undefined)?.toMillis() ?? 0;
        const dosha = String(snap.get('dosha') || '') as Dosha;
        if (snap.exists && Date.now() - cree < VIE_MS && Object.prototype.hasOwnProperty.call(NOM, dosha)) {
          if (!snap.get('utiliseLe')) {
            const etiquettes = ((snap.get('etiquettes') || []) as unknown[]).map(String).filter(t => ETIQUETTE_RX.test(t));
            const ins = await enregistrerInscription({
              email: snap.get('email'),
              firstName: snap.get('prenom'),
              source: 'quiz-suite',
              tags: ['quiz', `dosha-${dosha}`, ...etiquettes],
              consentement: true,
              lang: snap.get('lang'),
            });
            try { await poserSuite(ins, dosha); } catch (e) { console.error('[suiteLecture] étiquette de suite', e); }
            await ref.update({ utiliseLe: FieldValue.serverTimestamp() });
            console.log(`[suiteLecture] inscrite · ${dosha}`);
          }
          ok = true;
        }
      } catch (e) {
        console.error('[suiteLecture]', e);
      }
    }
    res.redirect(302, ok ? `${PUBLIC_BASE_URL}/quiz?suite=ok` : `${PUBLIC_BASE_URL}/quiz`);
  },
);
