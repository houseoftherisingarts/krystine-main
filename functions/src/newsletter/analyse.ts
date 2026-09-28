import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { assertAdmin } from './send';

// ─── L'analyse des envois (Krystine, 27 sept. 2026) ─────────────────────────
// Pour chaque lettre envoyée, relit les traces personne par personne (envois,
// ouvertures, clics) et range un résumé dans `analyseInfolettre/{id}` : les
// vraies ouvertures, leurs délais et leurs heures, les clics des vraies
// personnes par lien, les robots de sécurité et leurs domaines, les
// désabonnements et leurs raisons dans les sept jours. Les domaines où des
// robots ont été vus sont cumulés dans `analyseInfolettre/_robots`, avec
// le nombre d'abonnées actives sur chacun : ce sont les robots à prévoir avant
// le prochain envoi. Lancé à la main depuis l'admin (onglet Analyse).

const QC = (d: Date) => new Date(d.getTime() - 4 * 3600e3);
const domaine = (e: string) => (e.split('@')[1] || '').toLowerCase();
const nomLien = (u: string) => {
  const m = /coche=(interet|preference)(?::|%3A)([a-z-]+)/i.exec(u);
  if (m) return `${m[1] === 'interet' ? 'carre' : 'facon'}:${m[2]}`;
  try { return new URL(u).pathname || '/'; } catch { return u.slice(0, 60); }
};

async function tous(col: FirebaseFirestore.CollectionReference) {
  return (await col.get()).docs;
}

export const analyserInfolettres = onCall({ region: 'us-central1', timeoutSeconds: 300, memory: '1GiB' }, async (req) => {
  assertAdmin(req);
  const db = getFirestore();
  const lettres = (await db.collection('newsletters').where('status', '==', 'sent').get()).docs;
  const robotsDomaines: Record<string, number> = {};
  const resumes: { id: string; subject: string }[] = [];

  for (const l of lettres) {
    const sentAt: Date | undefined = l.get('sentAt')?.toDate?.();
    if (!sentAt) continue;
    const [envois, ouvertures, clics] = await Promise.all([
      tous(l.ref.collection('envois')), tous(l.ref.collection('ouvertures')), tous(l.ref.collection('clics')),
    ]);
    const courriel = new Map(envois.map(d => [d.id, String(d.get('email') || '')]));
    const robots = new Set(clics.filter(c => c.get('robot') === true).map(c => c.id));
    const domainesRobots: Record<string, number> = {};
    for (const id of robots) { const dm = domaine(courriel.get(id) || ''); if (dm) { domainesRobots[dm] = (domainesRobots[dm] || 0) + 1; robotsDomaines[dm] = (robotsDomaines[dm] || 0) + 1; } }

    const humaines = ouvertures.filter(o => o.get('humaine') === true && !robots.has(o.id));
    const delais = { moinsUneHeure: 0, uneASixHeures: 0, sixAVingtQuatre: 0, plusDUnJour: 0 };
    const heures: Record<string, number> = {};
    for (const o of humaines) {
      const at: Date | undefined = (o.get('humaineAt') || o.get('at'))?.toDate?.();
      if (!at) continue;
      const h = (at.getTime() - sentAt.getTime()) / 3600e3;
      if (h < 1) delais.moinsUneHeure++; else if (h < 6) delais.uneASixHeures++; else if (h < 24) delais.sixAVingtQuatre++; else delais.plusDUnJour++;
      const hq = String(QC(at).getUTCHours()); heures[hq] = (heures[hq] || 0) + 1;
    }

    const clicsParLien: Record<string, number> = {};
    const vraisClics = clics.filter(c => !robots.has(c.id));
    for (const c of vraisClics) for (const u of new Set<string>(c.get('liens') || [])) { const k = nomLien(u); clicsParLien[k] = (clicsParLien[k] || 0) + 1; }

    const fin = Timestamp.fromMillis(sentAt.getTime() + 7 * 86400e3);
    const debut = Timestamp.fromDate(sentAt);
    const [desabo, choix] = await Promise.all([
      db.collection('newsletter').where('unsubscribedAt', '>=', debut).where('unsubscribedAt', '<=', fin).get(),
      db.collection('newsletter').where('choixLe', '>=', debut).where('choixLe', '<=', fin).get(),
    ]);
    const emailsLettre = new Set([...courriel.values()].map(e => e.toLowerCase()));
    const desaboLettre = desabo.docs.filter(d => emailsLettre.has(String(d.get('email') || '').toLowerCase()));
    const raisons: Record<string, number> = {};
    for (const d of desaboLettre) for (const t of (d.get('tags') || []) as string[]) if (t.startsWith('depart-')) raisons[t.slice(7)] = (raisons[t.slice(7)] || 0) + 1;

    const stats = l.get('stats') || {};
    const analyse = {
      calculeLe: Timestamp.now(),
      envoyeeLe: Timestamp.fromDate(sentAt),
      destinataires: Number(stats.recipients) || envois.length,
      livrees: envois.length,
      rebonds: Number(stats.bounces) || 0,
      ouverturesHumaines: humaines.length,
      ouverturesAutomatiques: ouvertures.filter(o => o.get('auto') === true).length,
      tauxOuverture: envois.length ? Math.round(1000 * humaines.length / envois.length) / 10 : 0,
      delais, heures,
      personnesQuiCliquent: vraisClics.length,
      clicsParLien,
      robots: robots.size,
      domainesRobots,
      desabonnements: new Set(desaboLettre.map(d => String(d.get('email') || '').toLowerCase())).size,
      raisonsDepart: raisons,
      choixEnvoyes: choix.size,
    };
    // Hors de la lettre (lisible publiquement une fois envoyée) : l'analyse et
    // les conclusions vivent dans analyseInfolettre/{id}, réservé à l'admin.
    await db.doc(`analyseInfolettre/${l.id}`).set({ subject: String(l.get('subject') || ''), analyse }, { merge: true });
    resumes.push({ id: l.id, subject: String(l.get('subject') || '') });
  }

  // Les robots à prévoir : abonnées actives sur les domaines où des robots ont
  // déjà cliqué tous les liens.
  const actives = await db.collection('newsletter').where('status', '==', 'active').select('email').get();
  const prevision: Record<string, number> = {};
  for (const d of actives.docs) { const dm = domaine(String(d.get('email') || '')); if (robotsDomaines[dm]) prevision[dm] = (prevision[dm] || 0) + 1; }
  await db.doc('analyseInfolettre/_robots').set({ calculeLe: Timestamp.now(), robotsDomaines, prevision }, { merge: false });
  return { ok: true, lettres: resumes.length };
});
