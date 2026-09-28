import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { assertAdmin } from './newsletter/send';

// ─── Où en est la migration (Krystine, 28 sept. 2026) ──────────────────────
// Formation par formation : les personnes au registre de l'ancien système,
// les codes émis, les codes envoyés, les accès restaurés (une preuve d'achat
// existe dans achatsFormations pour cette personne, par un code ou autrement)
// et le reste à faire. Une personne compte une fois par formation, même si
// plusieurs achats du registre y mènent.
//
// Lu en direct par l'admin (kajabiEtatMigration), et photographié chaque
// lundi par analyseHebdomadaire dans analyseInfolettre/_migration (champ
// historique, les 26 dernières semaines). La cible de rythme vit dans le
// même document (champ cible), écrite par l'admin et jamais écrasée ici.

export interface LigneMigration {
  formationId: string;
  titre: string;
  personnes: number;
  codesEmis: number;
  codesEnvoyes: number;
  restaures: number;
  reste: number;
}
export interface EtatMigration {
  calculeLe: string;
  formations: LigneMigration[];
  total: Omit<LigneMigration, 'formationId' | 'titre'> & { pourcentage: number; personnesDistinctes: number };
  // Les personnes dont l'achat n'est encore relié à aucune formation du site.
  nonReliees: number;
}

const SEMAINES_GARDEES = 26;

export async function calculerMigration(): Promise<EtatMigration> {
  const db = getFirestore();
  const [offresSnap, registreSnap, codesSnap, formationsSnap] = await Promise.all([
    db.collection('kajabiOffres').get(),
    db.collection('kajabiRegistre').get(),
    db.collection('kajabiCodes').get(),
    db.collection('formations').select('titre').get(),
  ]);
  const titre = new Map(formationsSnap.docs.map(d => [d.id, String(d.get('titre') || d.id)]));
  const formationsDe = new Map(offresSnap.docs.map(d => [d.id, ((d.get('formationIds') || []) as string[])]));

  // Registre → personnes par formation, et celles qui ont reçu leur code.
  const personnes = new Map<string, Set<string>>();
  const envoyes = new Map<string, Set<string>>();
  const sansFormation = new Set<string>();
  for (const d of registreSnap.docs) {
    const email = String(d.get('emailNormalise') || '').toLowerCase();
    if (!email) continue;
    const fids = formationsDe.get(String(d.get('kjbOfferId') || '')) || [];
    if (!fids.length) { sansFormation.add(email); continue; }
    const statut = String(d.get('statut') || '');
    for (const f of fids) {
      if (!personnes.has(f)) personnes.set(f, new Set());
      personnes.get(f)!.add(email);
      if (statut === 'code_envoye' || statut === 'restaure') {
        if (!envoyes.has(f)) envoyes.set(f, new Set());
        envoyes.get(f)!.add(email);
      }
    }
  }
  // Une personne déjà reliée ailleurs n'est pas « non reliée ».
  const toutes = new Set<string>(); for (const s of personnes.values()) for (const e of s) toutes.add(e);
  for (const e of toutes) sansFormation.delete(e);

  // Les codes émis (hors codes de test), par formation.
  const emis = new Map<string, Set<string>>();
  for (const d of codesSnap.docs) {
    if (d.get('test') === true) continue;
    const f = String(d.get('formationId') || ''); const e = String(d.get('emailNormalise') || '').toLowerCase();
    if (!f || !e) continue;
    if (!emis.has(f)) emis.set(f, new Set());
    emis.get(f)!.add(e);
  }

  // Adresse → comptes du site : le compte de connexion, et les adresses de
  // l'ancien système qu'un code a déjà rattachées à un compte (kajabiEmails).
  const uids = new Map<string, Set<string>>();
  const lier = (e: string, uid: string) => { if (!uids.has(e)) uids.set(e, new Set()); uids.get(e)!.add(uid); };
  const liste = [...toutes];
  for (let i = 0; i < liste.length; i += 100) {
    const r = await getAuth().getUsers(liste.slice(i, i + 100).map(email => ({ email })));
    for (const u of r.users) if (u.email) lier(u.email.toLowerCase(), u.uid);
  }
  const membres = await db.collection('members').select('kajabiEmails').get();
  for (const m of membres.docs) for (const e of ((m.get('kajabiEmails') || []) as string[])) lier(String(e).toLowerCase(), m.id);

  // Les preuves d'achat, lues seulement pour les paires qui comptent.
  const restaures = new Map<string, Set<string>>();
  const paires: { f: string; e: string; ref: FirebaseFirestore.DocumentReference }[] = [];
  for (const [f, emails] of personnes) for (const e of emails) for (const uid of uids.get(e) || []) {
    paires.push({ f, e, ref: db.doc(`achatsFormations/${uid}/formations/${f}`) });
  }
  for (let i = 0; i < paires.length; i += 300) {
    const tranche = paires.slice(i, i + 300);
    const snaps = await db.getAll(...tranche.map(p => p.ref));
    snaps.forEach((s, j) => {
      if (!s.exists) return;
      const { f, e } = tranche[j];
      if (!restaures.has(f)) restaures.set(f, new Set());
      restaures.get(f)!.add(e);
    });
  }

  const formations: LigneMigration[] = [...personnes.entries()].map(([f, emails]) => {
    const r = restaures.get(f)?.size || 0;
    return {
      formationId: f, titre: titre.get(f) || f, personnes: emails.size,
      codesEmis: emis.get(f)?.size || 0, codesEnvoyes: envoyes.get(f)?.size || 0,
      restaures: r, reste: emails.size - r,
    };
  }).sort((a, b) => b.personnes - a.personnes);
  const somme = (k: keyof Omit<LigneMigration, 'formationId' | 'titre'>) => formations.reduce((n, l) => n + l[k], 0);
  const total = {
    personnes: somme('personnes'), codesEmis: somme('codesEmis'), codesEnvoyes: somme('codesEnvoyes'),
    restaures: somme('restaures'), reste: somme('reste'), personnesDistinctes: toutes.size, pourcentage: 0,
  };
  total.pourcentage = total.personnes ? Math.round(1000 * total.restaures / total.personnes) / 10 : 0;
  return { calculeLe: new Date().toISOString(), formations, total, nonReliees: sansFormation.size };
}

/** L'instantané du lundi : ajouté à l'historique, borné aux 26 dernières semaines. */
export async function photographierMigration(): Promise<void> {
  const db = getFirestore();
  const e = await calculerMigration();
  const ref = db.doc('analyseInfolettre/_migration');
  const semaine = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10); // date de Montréal
  const point = {
    semaine, personnes: e.total.personnes, codesEmis: e.total.codesEmis, codesEnvoyes: e.total.codesEnvoyes,
    restaures: e.total.restaures, reste: e.total.reste, pourcentage: e.total.pourcentage,
  };
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const avant = ((snap.get('historique') || []) as { semaine: string }[]).filter(p => p.semaine !== semaine);
    tx.set(ref, { dernier: e, historique: [...avant, point].slice(-SEMAINES_GARDEES), photographieLe: Timestamp.now() }, { merge: true });
  });
}

export const kajabiEtatMigration = onCall({ region: 'us-central1', timeoutSeconds: 120, memory: '512MiB' }, async (req) => {
  assertAdmin(req);
  return calculerMigration();
});
