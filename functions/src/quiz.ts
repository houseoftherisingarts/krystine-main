import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { RECAPTCHA_SECRET, garderFormulaire } from './captcha';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO, PUBLIC_BASE_URL } from './newsletter/mail';
import { enregistrerInscription } from './newsletter/inscrire';
import { renderResultatHtml, renderResultatTexte, sujetResultat, lireProfil, doshaSuite, ETIQUETTE_SUITE, SUITE_PRETE, type Dosha } from './quizCourriel';

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
  await getFirestore().doc(`newsletter/${ins.id}`).update({ tags: FieldValue.arrayUnion(ETIQUETTE_SUITE[d1]), suiteRefusee: FieldValue.arrayRemove(ETIQUETTE_SUITE[d1]) });
}
const ETIQUETTE_RX = /^(profil-(equilibre|double|teinte|net)|second-(vent|feu|terre))$/;

/** La fiche active de cette adresse (consentement déjà donné), ou null. */
async function ficheActive(email: string) {
  const snap = await getFirestore().collection('newsletter').where('email', '==', email).limit(10).get();
  return snap.docs.find(x => x.get('status') === 'active') || null;
}

/** Réinscription choisie par la personne elle-même (Krystine, 4 oct. 2026 :
 *  « on ne veut pas traiter cela à la main »). Appelée seulement lorsque la
 *  propriété de l'adresse est prouvée : un clic dans un courriel envoyé à
 *  cette adresse, ou un compte dont l'adresse est vérifiée. Les fiches
 *  désabonnées redeviennent actives; une adresse rebondie ou en quarantaine
 *  ne se réactive jamais d'ici. */
async function reactiver(email: string, source: string): Promise<{ id: string; status: string } | null> {
  const snap = await getFirestore().collection('newsletter').where('email', '==', email).limit(10).get();
  const desabonnees = snap.docs.filter(x => x.get('status') === 'unsubscribed');
  if (!desabonnees.length) return null;
  for (const x of desabonnees) {
    await x.ref.update({
      status: 'active',
      consentement: true,
      reabonneeLe: FieldValue.serverTimestamp(),
      reabonneePar: source,
      statusAvantReabonnement: 'unsubscribed',
    });
  }
  console.log(`[quiz] réinscrite d'elle-même · ${source} · ${desabonnees.length} fiche(s)`);
  return { id: desabonnees[0].id, status: 'active' };
}

/** « Je préfère ne pas recevoir la suite » : retire seulement l'étiquette de
 *  suite (la séquence s'arrête d'elle-même, raison etiquette-retiree), jamais
 *  l'abonnement, et note le refus pour qu'un prochain quiz ne la remette pas. */
async function retirerSuite(email: string, d1: Dosha): Promise<boolean> {
  const f = await ficheActive(email);
  if (!f) return false;
  await f.ref.update({ tags: FieldValue.arrayRemove(ETIQUETTE_SUITE[d1]), suiteRefusee: FieldValue.arrayUnion(ETIQUETTE_SUITE[d1]) });
  return true;
}

/** Ne rien perdre (Krystine, 5 oct. 2026) : lorsqu'un envoi du résultat
 *  échoue (case anti-robot, cadence, courriel), la personne laisse une trace
 *  dans `quizTentatives`, lue par l'onglet Quiz Dosha de l'admin. Un seul
 *  document par adresse (empreinte), mis à jour à chaque essai : un robot ne
 *  peut pas remplir la collection. Aucune inscription à l'infolettre d'ici,
 *  le consentement n'est pas vérifié. */
async function noterTentative(email: string, prenom: string, dominant: string, pourcentages: Record<string, number>, suite: boolean, err: unknown) {
  try {
    const e = err as { code?: string; message?: string };
    const raison = String(e?.code || 'inconnue') + (e?.message ? ` · ${String(e.message).slice(0, 160)}` : '');
    const id = crypto.createHash('sha256').update(email).digest('hex');
    await getFirestore().doc(`quizTentatives/${id}`).set({
      email, prenom, dominant, ...pourcentages, suite, raison,
      statut: 'a-rattraper',
      essais: FieldValue.increment(1),
      derniere: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (x) {
    console.error('[quiz] trace de tentative impossible', x);
  }
}

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
    // L'algorithme du résultat (quizCourriel.ts) : D1 vient des pourcentages.
    // Une seule suite de lettres : à égalité stricte, le dosha que la saison
    // accentue (doshaSuite : Vata en premier en saison Vata s'il est parmi
    // les ex æquo). Sans pourcentages lisibles, le dominant reçu reste.
    const profil = lireProfil(pourcentages);
    const d1: Dosha = pourcentages.vata + pourcentages.pitta + pourcentages.kapha > 0 ? doshaSuite(pourcentages) : dominant;

    // Cadence par IP (5 par heure) puis jeton reCAPTCHA, comme la musique d'Origine.
    try {
      await garderFormulaire(String(d.token || ''), 'quiz-resultat', req.rawRequest?.ip);
    } catch (err) {
      await noterTentative(email, prenom, NOM[d1], pourcentages, suite, err);
      throw err;
    }
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

    // La clé du courriel vit 60 jours et ne sert qu'au bouton qui inscrit en
    // un clic (sans la suite). Plus aucun lien de refus dans le courriel
    // (Krystine, 5 oct. 2026) : le désabonnement vit au pied des lettres.
    // Le chemin &non=1 reste servi pour les courriels déjà partis.
    const k = crypto.randomBytes(24).toString('base64url');
    await getFirestore().doc(`quizSuite/${k}`).set({
      email, prenom, dosha: d1, etiquettes: profil.etiquettes, creeLe: FieldValue.serverTimestamp(),
      ...(String(d.lang ?? '').toLowerCase() === 'en' ? { lang: 'en' } : { lang: 'fr' }),
    });
    const lienSuite = `${PUBLIC_BASE_URL}/suite-lecture?k=${k}`;
    const r = { prenom, dominant: d1, pourcentages, suite, lienSuite, prete: SUITE_PRETE[d1] };
    const transporter = createTransporter();
    try {
      await transporter.sendMail({
        replyTo: REPLY_TO,
        from: fromAddr(),
        to: email,
        subject: sujetResultat(d1, pourcentages),
        html: renderResultatHtml(r),
        text: renderResultatTexte(r),
      });
    } catch (err) {
      console.error('[quiz] envoi raté', err);
      await noterTentative(email, prenom, NOM[d1], pourcentages, suite, { code: 'envoi-courriel', message: String((err as Error)?.message || '') });
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
    // « Je préfère ne pas recevoir la suite » : seulement l'étiquette de suite.
    if (req.query.non === '1') {
      if (CLE_RX.test(k)) {
        try {
          const snap = await getFirestore().doc(`quizSuite/${k}`).get();
          const cree = (snap.get('creeLe') as Timestamp | undefined)?.toMillis() ?? 0;
          const dosha = String(snap.get('dosha') || '') as Dosha;
          if (snap.exists && Date.now() - cree < VIE_MS && Object.prototype.hasOwnProperty.call(NOM, dosha)) {
            await retirerSuite(String(snap.get('email') || ''), dosha);
            console.log(`[suiteLecture] suite refusée · ${dosha}`);
            ok = true;
          }
        } catch (e) {
          console.error('[suiteLecture] refus', e);
        }
      }
      res.redirect(302, ok ? `${PUBLIC_BASE_URL}/quiz?suite=non` : `${PUBLIC_BASE_URL}/quiz`);
      return;
    }
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
            // Le clic vient d'un courriel envoyé à cette adresse : c'est elle,
            // et c'est son choix. Une adresse désabonnée se réinscrit ici.
            const finale = ins.status === 'active' ? ins : (await reactiver(String(snap.get('email') || ''), 'quiz-courriel')) || ins;
            try { await poserSuite(finale, dosha); } catch (e) { console.error('[suiteLecture] étiquette de suite', e); }
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

// ─── La suite pour une personne connectée, à l'écran du résultat ────────────
// L'adresse vient TOUJOURS du jeton du compte, la dominance du dernier
// résultat enregistré sous son uid : rien du navigateur ne choisit ni l'une
// ni l'autre. Trois gestes :
//   etat     : abonnée active (consentement déjà donné) → l'étiquette de suite
//              se pose d'elle-même, sauf si elle l'a déjà refusée; sinon, rien
//              n'est écrit et l'écran lui offre le bouton.
//   inscrire : son clic sur « Recevoir la suite de ma lecture » (consentement
//              explicite) → fiche inscrite/activée, source quiz-suite, puis l'étiquette.
//   refuser  : « Je préfère ne pas recevoir la suite » → l'étiquette seule part.
export const suiteQuiz = onCall(
  { region: 'us-central1', maxInstances: 10, secrets: [...MAIL_SECRETS] },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour recevoir la suite.');
    const email = String(req.auth.token.email || '').trim().toLowerCase();
    if (!EMAIL_RX.test(email)) throw new HttpsError('failed-precondition', 'Votre compte n’a pas d’adresse courriel.');
    const action = String((req.data || {}).action || '');

    const res = await getFirestore().collection('doshaResults').where('uid', '==', req.auth.uid).limit(50).get();
    const dernier = res.docs
      .map(x => ({ x, t: (x.get('createdAt') as Timestamp | undefined)?.toMillis() ?? 0 }))
      .sort((a, b) => b.t - a.t)[0]?.x;
    if (!dernier) throw new HttpsError('failed-precondition', 'Aucun résultat enregistré.');
    const pourcentages = { vata: pct(dernier.get('vata')), pitta: pct(dernier.get('pitta')), kapha: pct(dernier.get('kapha')) };
    const profil = lireProfil(pourcentages);
    const brut = String(dernier.get('dominant') || '').toLowerCase() as Dosha;
    const d1: Dosha = pourcentages.vata + pourcentages.pitta + pourcentages.kapha > 0 ? doshaSuite(pourcentages)
      : (Object.prototype.hasOwnProperty.call(NOM, brut) ? brut : 'vata');
    const tag = ETIQUETTE_SUITE[d1];
    const base = { dosha: d1, prete: SUITE_PRETE[d1] };

    if (action === 'refuser') {
      await retirerSuite(email, d1);
      return { ...base, etat: 'refusee' };
    }

    // La case « Je souhaite recevoir de nouveau les lettres » cochée par une
    // personne désabonnée. Compte à l'adresse vérifiée (Google ou adresse
    // confirmée) : réinscrite tout de suite. Sinon, un courriel de
    // confirmation part à l'adresse et son lien fait la réinscription
    // (suiteLecture) : personne ne peut réabonner l'adresse d'une autre.
    if (action === 'reabonner') {
      if (req.auth.token.email_verified === true) {
        const ins = await reactiver(email, 'quiz-compte');
        if (!ins) return { ...base, etat: 'desabonnee' };
        await poserSuite(ins, d1);
        return { ...base, etat: 'inscrite' };
      }
      const k = crypto.randomBytes(24).toString('base64url');
      await getFirestore().doc(`quizSuite/${k}`).set({
        email, prenom: String(req.auth.token.name || '').trim().split(/\s+/)[0] || '', dosha: d1,
        etiquettes: profil.etiquettes, creeLe: FieldValue.serverTimestamp(), lang: 'fr', reabonnement: true,
      });
      const lien = `${PUBLIC_BASE_URL}/suite-lecture?k=${k}`;
      await createTransporter().sendMail({
        replyTo: REPLY_TO,
        from: fromAddr(),
        to: email,
        subject: 'Confirmer votre retour aux lettres',
        text: `Bonjour,\n\nVous avez demandé à recevoir de nouveau les lettres de Krystine St-Laurent, avec la suite de votre lecture.\n\nPour confirmer, cliquez ici : ${lien}\n\nSi vous n'avez rien demandé, ignorez simplement ce courriel : rien ne changera.\n\nL'équipe`,
        html: `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1c1712;max-width:520px"><p>Bonjour,</p><p>Vous avez demandé à recevoir de nouveau les lettres de Krystine St-Laurent, avec la suite de votre lecture.</p><p><a href="${lien}" style="display:inline-block;background:#1c1712;color:#f4efe6;padding:14px 26px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Confirmer mon retour</a></p><p>Si vous n'avez rien demandé, ignorez ce courriel : rien ne changera.</p><p>L'équipe</p></div>`,
      });
      return { ...base, etat: 'confirmation' };
    }

    if (action === 'inscrire') {
      const nom = String(req.auth.token.name || '').trim().split(/\s+/)[0] || undefined;
      const ins = await enregistrerInscription({
        email,
        firstName: nom,
        source: 'quiz-suite',
        tags: ['quiz', `dosha-${d1}`, ...profil.etiquettes],
        consentement: true,
        lang: String((req.data || {}).lang ?? '').toLowerCase() === 'en' ? 'en' : 'fr',
      }, req.auth.uid);
      if (ins.status !== 'active') return { ...base, etat: 'desabonnee' };
      await poserSuite(ins, d1);
      console.log(`[suiteQuiz] inscrite · ${d1}`);
      return { ...base, etat: 'inscrite' };
    }

    // etat
    const f = await ficheActive(email);
    if (!f) return { ...base, etat: 'offre' };
    const tags = (f.get('tags') || []) as string[];
    if (tags.includes(tag)) return { ...base, etat: 'deja' };
    if (((f.get('suiteRefusee') || []) as string[]).includes(tag)) return { ...base, etat: 'offre' };
    await f.ref.update({ tags: FieldValue.arrayUnion(tag) });
    console.log(`[suiteQuiz] abonnée active, suite posée d'elle-même · ${d1}`);
    return { ...base, etat: 'auto' };
  },
);
