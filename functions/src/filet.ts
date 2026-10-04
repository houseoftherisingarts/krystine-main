import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO } from './newsletter/mail';
import { assertAdmin } from './newsletter/send';

// ─── Le filet du matin (Krystine, 4 oct. 2026) ──────────────────────────────
// Le 3 oct. 2026, une version du site construite sans la clé anti-robot a
// bloqué le formulaire du quiz pour tout le monde, et personne ne l'a vu
// pendant au moins une journée. Chaque matin à 6 h 30, ce filet vérifie que
// les pages répondent, que la version en ligne porte ses clés, et que du
// monde entre encore (quiz, inscriptions). Le verdict est rangé dans
// sante/filetDuMatin (lu par l'admin et par Iris); s'il y a un problème, un
// courriel d'alerte part à Krystine, à elle seule.
// Le parcours cliqué (quiz jusqu'au formulaire, achat jusqu'à la caisse) est
// vérifié par scripts/qa/filet-du-matin.mjs sur l'ordinateur de Krystine.

const SITE = 'https://www.krystinestlaurent.ca';
const PAGES = ['/accueil', '/quiz', '/vata', '/formations', '/podcast', '/direct', '/medias', '/krystine', '/compte', '/paiement/vata'];
const ALERTE_A = 'krystine@inspiratanature.com';

type Etat = 'ok' | 'alerte';
interface Controle { nom: string; etat: Etat; detail: string }

async function controlerPages(): Promise<Controle[]> {
  return Promise.all(PAGES.map(async (p) => {
    try {
      const r = await fetch(SITE + p, { redirect: 'follow' });
      return { nom: `Page ${p}`, etat: r.ok ? 'ok' : 'alerte', detail: `réponse ${r.status}` } as Controle;
    } catch (e) {
      return { nom: `Page ${p}`, etat: 'alerte', detail: `injoignable (${(e as Error).message})` } as Controle;
    }
  }));
}

// Même vérification que scripts/garde-cles.mjs, mais sur la version EN LIGNE.
async function controlerCles(): Promise<Controle[]> {
  try {
    const html = await (await fetch(SITE + '/quiz')).text();
    const idx = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
    if (!idx) return [{ nom: 'Version en ligne', etat: 'alerte', detail: 'fichier principal introuvable' }];
    const js = await (await fetch(SITE + idx)).text();
    return [
      { nom: 'Case « Je ne suis pas un robot »', etat: /6L[0-9A-Za-z_-]{38}/.test(js) ? 'ok' : 'alerte', detail: 'clé reCAPTCHA dans la version en ligne' },
      { nom: 'Connexion Firebase', etat: /AIza[0-9A-Za-z_-]{35}/.test(js) ? 'ok' : 'alerte', detail: 'clé Firebase dans la version en ligne' },
    ];
  } catch (e) {
    return [{ nom: 'Version en ligne', etat: 'alerte', detail: (e as Error).message }];
  }
}

async function compter(col: string, champ: string, depuis: Date, source?: string): Promise<number> {
  let q = getFirestore().collection(col).where(champ, '>=', Timestamp.fromDate(depuis));
  if (source) q = q.where('source', '==', source);
  return (await q.count().get()).data().count;
}

export async function calculerFilet() {
  const maintenant = Date.now();
  const h24 = new Date(maintenant - 24 * 3600e3);
  const h48 = new Date(maintenant - 48 * 3600e3);
  const j7 = new Date(maintenant - 7 * 24 * 3600e3);

  const [pages, cles, quiz24, quiz7j, formulaire48, inscrites24, inscrites7j] = await Promise.all([
    controlerPages(),
    controlerCles(),
    compter('doshaResults', 'createdAt', h24),
    compter('doshaResults', 'createdAt', j7),
    compter('doshaResults', 'createdAt', h48, 'quiz-courriel'),
    compter('newsletter', 'subscribedAt', h24),
    compter('newsletter', 'subscribedAt', j7),
  ]);

  const mouvement: Controle[] = [
    {
      nom: 'Quiz faits (24 h)',
      etat: quiz24 === 0 && quiz7j >= 3 ? 'alerte' : 'ok',
      detail: `${quiz24} en 24 h · ${quiz7j} en 7 jours`,
    },
    {
      // Le formulaire « Recevoir mes résultats » (sans compte) : c'est lui qui
      // était tombé le 3 oct.
      nom: 'Formulaire du résultat (48 h)',
      etat: formulaire48 === 0 && quiz7j >= 3 ? 'alerte' : 'ok',
      detail: `${formulaire48} résultat(s) envoyé(s) par courriel en 48 h`,
    },
    {
      nom: 'Nouvelles inscriptions (24 h)',
      etat: 'ok',
      detail: `${inscrites24} en 24 h · ${inscrites7j} en 7 jours`,
    },
  ];

  const controles = [...pages, ...cles, ...mouvement];
  const alertes = controles.filter((c) => c.etat === 'alerte');
  return {
    le: Timestamp.now(),
    verdict: alertes.length ? 'alerte' : 'ok',
    controles,
    chiffres: { quiz24, quiz7j, formulaire48, inscrites24, inscrites7j },
  };
}

async function rangerEtAlerter(r: Awaited<ReturnType<typeof calculerFilet>>) {
  const db = getFirestore();
  const jour = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto' }).format(r.le.toDate());
  await db.doc('sante/filetDuMatin').set({ ...r, rangeLe: FieldValue.serverTimestamp() });
  await db.doc(`sante/filetDuMatin/historique/${jour}`).set(r);
  if (r.verdict !== 'alerte') return;
  const lignes = r.controles.filter((c) => c.etat === 'alerte').map((c) => `• ${c.nom} : ${c.detail}`);
  await createTransporter().sendMail({
    from: fromAddr('Le filet du site'),
    replyTo: REPLY_TO,
    to: ALERTE_A,
    subject: `Filet du matin : à vérifier sur le site (${lignes.length})`,
    text: `Bonjour Krystine,\n\nLe filet du matin a trouvé ceci sur krystinestlaurent.ca :\n\n${lignes.join('\n')}\n\nOuvrez Iris et dites « regarde le filet du matin » : elle regarde et corrige.\n\nL'équipe`,
  });
}

export const filetDuMatin = onSchedule(
  { schedule: '30 6 * * *', timeZone: 'America/Toronto', region: 'us-central1', timeoutSeconds: 120, secrets: [...MAIL_SECRETS] },
  async () => {
    const r = await calculerFilet();
    console.log('[filetDuMatin]', r.verdict, JSON.stringify(r.chiffres));
    await rangerEtAlerter(r);
  },
);

// Le même filet, lancé à la demande depuis l'admin ou par Iris.
export const lancerFilet = onCall(
  { region: 'us-central1', timeoutSeconds: 120, secrets: [...MAIL_SECRETS] },
  async (req) => {
    assertAdmin(req);
    const r = await calculerFilet();
    await rangerEtAlerter(r);
    return { verdict: r.verdict, controles: r.controles, chiffres: r.chiffres };
  },
);
