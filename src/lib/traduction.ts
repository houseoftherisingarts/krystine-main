import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { createNewsletter, getNewsletter, saveNewsletterVersion, updateNewsletter, type NewsletterBlock, type NewsletterDoc } from '../firebase/firestore';

// ─── Traduire une infolettre par Iris ───────────────────────────────────────
// La traduction passe par le relais Iris (Claude Code sur l'ordinateur de
// Krystine, donc son abonnement Max), jamais par l'API. L'admin dépose une
// demande `type: traduction` avec le contenu source (le compte Iris ne lit pas
// newsletters/), le relais rend `traductionJson`, et l'admin applique ici :
// « copie » crée un brouillon dans l'autre langue, « surplace » change les
// mots du même brouillon après avoir gardé la version d'avant.

const HORS_LIGNE_APRES_MS = 90_000;
const ATTENTE_MAX_MS = 4 * 60_000;
const CHAMPS_TEXTE = ['text', 'caption', 'alt', 'label', 'attribution', 'eyebrow', 'title', 'body', 'buttonLabel'] as const;

interface Traduction { title?: string; subject?: string; preheader?: string; etiquette?: string; blocks: Array<Record<string, string | null>> }

// Firestore refuse `undefined` : on l'enlève partout avant d'écrire.
function sansUndefined<T>(v: T): T {
  if (Array.isArray(v)) return v.map(sansUndefined) as T;
  if (v && typeof v === 'object' && !(v as any).toDate && (v as any).constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (x !== undefined) out[k] = sansUndefined(x);
    return out as T;
  }
  return v;
}

export async function irisEnLigne(): Promise<{ enLigne: boolean; hote: string }> {
  if (!db) return { enLigne: false, hote: '' };
  const s = await getDoc(doc(db, 'etat', 'iris'));
  const b = s.data()?.battement;
  const d: Date | null = b?.toDate ? b.toDate() : null;
  return { enLigne: !!d && Date.now() - d.getTime() < HORS_LIGNE_APRES_MS, hote: String(s.data()?.hote || '') };
}

export async function traduireParIris(opts: { newsletterId: string; mode: 'copie' | 'surplace'; cible?: 'fr' | 'en' }): Promise<{ id: string; cible: 'fr' | 'en' }> {
  if (!db) throw new Error('Firebase n’est pas configuré.');
  const src = await getNewsletter(opts.newsletterId);
  if (!src) throw new Error('Infolettre introuvable.');
  if (opts.mode === 'surplace' && (src.status === 'sent' || src.status === 'sending')) throw new Error('Une lettre déjà envoyée ne se traduit pas sur place : dupliquez-la.');
  const cible: 'fr' | 'en' = opts.cible || (src.lang === 'en' ? 'fr' : 'en');

  const { enLigne, hote } = await irisEnLigne();
  if (!enLigne) throw new Error('Iris est hors ligne : aucun ordinateur ne la fait tourner. Ouvrez Iris sur l’ordinateur de Krystine (onglet Terminal, « Installer sur cet ordinateur ») puis réessayez.');

  const blocks: NewsletterBlock[] = src.blocks || [];
  const source = {
    lang: src.lang || 'fr',
    title: src.title || '', subject: src.subject || '', preheader: src.preheader || '',
    etiquette: src.bandeau?.etiquette || '',
    blocks: blocks.map(b => {
      const out: Record<string, any> = { type: b.type };
      for (const k of CHAMPS_TEXTE) if (b.content?.[k]) out[k] = b.content[k];
      return out;
    }),
  };
  const ref = await addDoc(collection(db, 'irisDemandes'), {
    // Statut à part : un relais d'avant la 2.2.0 ne cherche que « nouvelle » et ne prendra jamais cette demande.
    type: 'traduction', statut: 'a_traduire', newsletterId: opts.newsletterId, cible, mode: opts.mode, source,
    cree: serverTimestamp(),
  });

  const t: Traduction = await new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { off(); reject(new Error(`Iris (${hote || 'le relais'}) met plus de quatre minutes : la demande reste en file, réessayez dans un moment.`)); }, ATTENTE_MAX_MS);
    const off = onSnapshot(doc(db!, 'irisDemandes', ref.id), s => {
      const d = s.data();
      if (!d) return;
      if (d.statut === 'repondue') {
        window.clearTimeout(timer); off();
        if (!d.traductionJson) { reject(new Error('Le relais Iris qui a répondu est trop ancien pour traduire : il se met à jour tout seul dans l’heure, réessayez ensuite.')); return; }
        try { resolve(JSON.parse(d.traductionJson)); } catch { reject(new Error('La traduction rendue est illisible.')); }
      } else if (d.statut === 'echec') {
        window.clearTimeout(timer); off();
        reject(new Error(`Iris n’a pas pu traduire : ${d.erreur || 'erreur inconnue'}.`));
      }
    }, e => { window.clearTimeout(timer); off(); reject(e); });
  });
  if (!Array.isArray(t.blocks) || t.blocks.length !== blocks.length) throw new Error('La traduction ne compte pas le même nombre de blocs que la lettre.');

  const traduits: NewsletterBlock[] = blocks.map((b, i) => {
    const content = { ...(b.content || {}) };
    for (const k of CHAMPS_TEXTE) { const v = t.blocks[i]?.[k]; if (content[k] && typeof v === 'string' && v) content[k] = v; }
    return { type: b.type, content };
  });
  const mots = {
    subject: t.subject || src.subject,
    preheader: t.preheader || src.preheader || '',
    blocks: traduits,
    bandeau: src.bandeau ? { ...src.bandeau, ...(src.bandeau.etiquette ? { etiquette: t.etiquette || src.bandeau.etiquette } : {}) } : null,
    lang: cible,
  };

  if (opts.mode === 'surplace') {
    await saveNewsletterVersion(opts.newsletterId, {
      title: src.title || '', subject: src.subject || '', preheader: src.preheader || '', blocks, lang: src.lang || 'fr',
      bandeau: src.bandeau ?? null, fond: src.fond ?? null, couverture: src.couverture, couvertureUrl: src.couvertureUrl ?? null, signature: src.signature !== false,
      raison: 'traduction',
    });
    await updateNewsletter(opts.newsletterId, sansUndefined(mots));
    return { id: opts.newsletterId, cible };
  }
  const { id: _i, sentAt: _s, stats: _st, createdAt: _c, updatedAt: _u, versionAt: _v, ...reste } = src as NewsletterDoc & { versionAt?: unknown };
  const nouveau = await createNewsletter(sansUndefined({
    ...(reste as Omit<NewsletterDoc, 'id' | 'createdAt' | 'updatedAt'>),
    ...mots,
    title: t.title || `${src.title || src.subject} (${cible.toUpperCase()})`,
    traductionDe: opts.newsletterId,
    status: 'draft' as const,
    scheduledFor: null,
  }));
  if (!nouveau) throw new Error('Le brouillon traduit n’a pas pu être créé.');
  return { id: nouveau.id, cible };
}
