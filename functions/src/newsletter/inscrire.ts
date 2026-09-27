import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { RECAPTCHA_SECRET, verifierJeton } from '../captcha';
import { champsRobot, limiterParIp, MESSAGE_CADENCE } from './robots';
import { MAIL_SECRETS } from './mail';
import { CONFIRMATIONS_LISTES, envoyerConfirmationListe } from './welcome';

// ─── La seule porte d'entrée de la collection `newsletter` ───────────────────
// Jusqu'au 21 septembre 2026, chaque formulaire public écrivait directement
// dans Firestore depuis le navigateur, et la règle laissait créer une fiche à
// quiconque envoyait un champ `email`. La garde posée le matin même (alias
// jetables, cadence par adresse IP, reCAPTCHA) vivait donc dans le navigateur,
// là où un robot qui parle à l'API la contourne d'un appel. Tout passe
// maintenant par ici, et la règle a fermé la porte derrière.
//
// Ce que la fonction couvre : l'infolettre du pied de page, les listes
// d'attente (`waitlist-*`), le formulaire du direct du podcast, le quiz des
// doshas, le consentement d'une membre connectée, et les deux formulaires de
// la page d'accueil statique.
//
// La forme du document ne bouge pas d'un champ : un envoi est en cours et
// `sendNewsletter` lit ces fiches telles quelles.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Une chaîne taillée, ou `undefined` si elle est vide : Firestore refuse `undefined`. */
function texte(v: unknown, max: number): string | undefined {
  const s = String(v ?? '').trim().slice(0, max);
  return s || undefined;
}

export const inscrireInfolettre = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET, ...MAIL_SECRETS], cors: true },
  async (req) => {
    const d = (req.data || {}) as Record<string, unknown>;

    // Le pot de miel : un champ que personne ne voit à l'écran et qu'un robot
    // remplit parce qu'il remplit tout. Refusé avant la cadence, pour qu'une
    // rafale de robots ne mange pas le quota d'une vraie personne derrière la
    // même sortie réseau.
    if (texte(d.site, 400)) {
      console.warn('[inscrire] refus : pot de miel rempli');
      throw new HttpsError('invalid-argument', "Cette inscription n'a pas pu être enregistrée.");
    }

    const email = String(d.email ?? '').trim().toLowerCase().slice(0, 200);
    if (!EMAIL_RX.test(email)) {
      throw new HttpsError('invalid-argument', 'Entrez une adresse courriel valide.');
    }

    // Même garde que `verifierCaptcha`, `extraitCinqElements` et
    // `musiqueOrigine` : cinq par heure et par adresse. L'émulateur des
    // fonctions ne donne pas d'adresse, et `limiterParIp` laisse alors passer,
    // donc la cadence se vérifie à part (functions/test/callable-inscrire.mjs,
    // dernière section).
    if (!(await limiterParIp(req.rawRequest?.ip, 'infolettre'))) {
      console.warn('[inscrire] cadence dépassée');
      throw new HttpsError('resource-exhausted', MESSAGE_CADENCE);
    }

    // Le jeton reCAPTCHA se vérifie SEULEMENT là où le formulaire en porte
    // déjà un. L'inscription générale n'a pas de case et n'en gagne pas ici :
    // Alex tient à la conversion, et une case devant le champ courriel du pied
    // de page coûte plus d'inscrites qu'elle n'arrête de robots. Un formulaire
    // qui en gagnerait une plus tard est vérifié sans toucher à ce fichier.
    const token = texte(d.token, 4000);
    if (token) await verifierJeton(token, 'infolettre');

    const source = texte(d.source, 80) || 'site';
    const tags = Array.isArray(d.tags)
      ? Array.from(new Set(d.tags.map(t => String(t).trim().slice(0, 60)).filter(Boolean))).slice(0, 20)
      : [source];
    // Les formulaires publics n'envoient que `active` (ou rien). Tout autre
    // statut vient d'ailleurs que d'un de nos formulaires : on le ramène.
    const status = d.status === 'pending' ? 'pending' : 'active';

    const fiche: Record<string, unknown> = {
      email,
      source,
      tags,
      status,
      unsubscribeToken: crypto.randomBytes(18).toString('hex'),
      subscribedAt: FieldValue.serverTimestamp(),
      // Un alias jetable entre en quarantaine : la fiche existe, elle ne
      // reçoit rien, et Krystine tranche dans Admin › Infolettre › Abonnés.
      ...champsRobot(email, tags, status),
    };

    const poser = (cle: string, v: string | undefined) => { if (v) fiche[cle] = v; };
    poser('firstName', texte(d.firstName, 80));
    poser('lastName', texte(d.lastName, 80));
    poser('question', texte(d.question, 1000));
    poser('province', texte(d.province, 120));
    poser('region', texte(d.region, 120));
    poser('phone', texte(d.phone, 40));

    const lang = String(d.lang ?? '').toLowerCase();
    if (lang === 'fr' || lang === 'en') fiche.lang = lang;

    // Le `uid` vient du jeton d'authentification, jamais du corps de l'appel :
    // autrement n'importe qui rattacherait une fiche au compte d'une autre.
    if (req.auth?.uid) fiche.uid = req.auth.uid;
    if (d.consentement === true) fiche.consentement = true;

    // Une adresse déjà connue ne crée plus de deuxième fiche (Krystine, 27 sept.
    // 2026) : la nouvelle liste s'ajoute à ses étiquettes, les champs vides se
    // complètent, et une personne désabonnée ou en attente qui s'inscrit d'elle-
    // même redevient active. Une fiche en quarantaine ou rebondie garde son
    // statut. Si la liste rejointe a son propre courriel, il part une fois.
    const col = getFirestore().collection('newsletter');
    const existantes = await col.where('email', '==', email).limit(10).get();
    if (!existantes.empty) {
      const docs = existantes.docs;
      const cible = docs.find(x => x.get('status') === 'active') || docs[0];
      const avant = cible.data() as Record<string, any>;
      const tagsAvant: string[] = Array.isArray(avant.tags) ? avant.tags : [];
      const nouvelles = tags.filter(t => !tagsAvant.includes(t));
      const maj: Record<string, unknown> = { derniereInscriptionLe: FieldValue.serverTimestamp() };
      if (nouvelles.length) maj.tags = FieldValue.arrayUnion(...nouvelles);
      for (const cle of ['firstName', 'lastName', 'province', 'region', 'phone', 'lang', 'uid'] as const) {
        if (!avant[cle] && fiche[cle]) maj[cle] = fiche[cle];
      }
      if (fiche.question) maj.question = fiche.question;
      if (fiche.consentement) maj.consentement = true;
      let statut = String(avant.status || 'active');
      if (status === 'active' && (statut === 'unsubscribed' || statut === 'pending')) {
        statut = 'active';
        maj.status = 'active';
        maj.reinscriteLe = FieldValue.serverTimestamp();
      }
      await cible.ref.update(maj);
      console.log(`[inscrire] ${source} · fiche existante ${cible.id} · +${nouvelles.join(',') || 'rien'}`);
      if (statut === 'active') {
        for (const t of nouvelles) {
          if (!CONFIRMATIONS_LISTES[t]) continue;
          try {
            await envoyerConfirmationListe(cible.ref, { email, firstName: (avant.firstName || fiche.firstName) as string | undefined, unsubscribeToken: avant.unsubscribeToken, confirmationsEnvoyees: avant.confirmationsEnvoyees }, t);
          } catch (e) { console.error('[inscrire] confirmation', t, e); }
        }
      }
      return { ok: true, id: cible.id, status: statut };
    }

    const ref = await col.add(fiche);
    console.log(`[inscrire] ${source} · ${fiche.status} · ${ref.id}`);
    return { ok: true, id: ref.id, status: fiche.status as string };
  },
);
