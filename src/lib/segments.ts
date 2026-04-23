// Segment engine — query builder + evaluator.
// ─────────────────────────────────────────────────────────────────────────────
// Krystine composes a set of criteria (dosha = Vata, points lifetime > 150,
// has bought ≥ 2 items whose title contains "huile", …) and this module
// decides, for each contact, whether they match. The output drives the
// "Nouveau groupe par segment" flow in GroupsSection — the matching
// contacts become the group's member list.
//
// What's trackable today (all metrics below derive from existing writes):
//   • dosha              — MemberDoc.dosha (set synchronously after quiz)
//   • loyalty tier       — tierFromLifetime(PointsBalance.lifetime)
//   • points balance     — PointsBalance.balance (spendable)
//   • points lifetime    — PointsBalance.lifetime (monotonic, tier driver)
//   • orders count       — ClientOrder rows for uid (and email fallback)
//   • total spend        — sum of subtotal across their orders
//   • product keyword    — item.title substring match, count comparison
//   • newsletter origin  — NewsletterSubscriber.source
//   • newsletter tag     — any tag in NewsletterSubscriber.tags
//   • newsletter status  — NewsletterSubscriber.status
//   • took dosha quiz    — DoshaResult rows matching email
//   • took guide         — GuideResponse rows matching uid/email
//   • guide rec          — any GuideResponse.recommendationId
//   • days since joined  — MemberDoc.joinedAt → now
//   • is member          — has a members/ doc (vs. email-only)
//
// Performance: the caller loads all snapshot data once (members,
// subscribers, orders, doshas, guides) and passes it to buildContactMetrics.
// Point balances are loaded lazily in parallel per-uid because there's no
// bulk loader — the caller decides when to pay that cost (typically only
// when a points criterion is active).

import type {
  MemberDoc, NewsletterSubscriber, ClientOrder,
  DoshaResult, GuideResponse,
} from '../firebase/firestore';
import type { PointsBalance } from '../firebase/points';
import { tierFromLifetime, TIERS, type Tier } from './pointsConfig';

// ─── Criterion ──────────────────────────────────────────────────────────────

export type CriterionField =
  | 'dosha'
  | 'tier'
  | 'pointsBalance'
  | 'pointsLifetime'
  | 'ordersCount'
  | 'totalSpend'
  | 'productBoughtCount'
  | 'newsletterStatus'
  | 'newsletterSource'
  | 'newsletterTag'
  | 'tookDoshaQuiz'
  | 'tookGuide'
  | 'guideRecommendation'
  | 'daysSinceJoined'
  | 'isMember';

export type Operator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains';

export interface Criterion {
  /** Stable id so the UI can track rows across re-renders. */
  id: string;
  field: CriterionField;
  op: Operator;
  /** Primary value — string for enums, number for comparisons. */
  value: string | number | boolean;
  /** Secondary input — e.g. the product keyword when field === 'productBoughtCount'. */
  extra?: string;
}

export interface Segment {
  /** 'all' = AND between criteria; 'any' = OR. */
  mode: 'all' | 'any';
  criteria: Criterion[];
}

// ─── ContactMetrics — per-contact precomputed state ─────────────────────────

export interface ContactMetrics {
  email: string;              // lowercased key
  displayEmail: string;
  name: string;
  uid?: string;
  isMember: boolean;
  dosha?: string;
  tierId?: string;            // 'graine' | 'pousse' | …
  pointsBalance: number;
  pointsLifetime: number;
  ordersCount: number;
  totalSpend: number;
  /** All item titles this contact has purchased, lowercased. Used for keyword match. */
  itemTitles: string[];
  /** Counts of item titles matching arbitrary keywords (computed per criterion at eval time). */
  newsletterStatus?: string;
  newsletterSource?: string;
  newsletterTags: string[];
  tookDoshaQuiz: boolean;
  tookGuide: boolean;
  guideRecommendations: string[];
  joinedAt?: Date;
}

// ─── Snapshot ───────────────────────────────────────────────────────────────

export interface SegmentData {
  members: MemberDoc[];
  subscribers: NewsletterSubscriber[];
  orders: ClientOrder[];
  doshaResults: DoshaResult[];
  guideResponses: GuideResponse[];
  /** Optional — only populated when a points-based criterion is in use. */
  pointsByUid?: Record<string, PointsBalance>;
}

// ─── Builder ────────────────────────────────────────────────────────────────

function norm(s: string | undefined): string {
  return (s || '').trim().toLowerCase();
}

export function buildContactMetrics(data: SegmentData): ContactMetrics[] {
  const { members, subscribers, orders, doshaResults, guideResponses, pointsByUid = {} } = data;

  const map = new Map<string, ContactMetrics>();

  // 1. Seed from members/ — the authoritative source for dosha and uid.
  for (const m of members) {
    const email = norm(m.email);
    if (!email) continue;
    map.set(email, {
      email,
      displayEmail: m.email,
      name: m.displayName || email,
      uid: m.uid,
      isMember: true,
      dosha: m.dosha,
      pointsBalance: pointsByUid[m.uid]?.balance ?? 0,
      pointsLifetime: pointsByUid[m.uid]?.lifetime ?? 0,
      tierId: tierFromLifetime(pointsByUid[m.uid]?.lifetime ?? 0).current.id,
      ordersCount: 0,
      totalSpend: 0,
      itemTitles: [],
      newsletterTags: [],
      tookDoshaQuiz: false,
      tookGuide: false,
      guideRecommendations: [],
      joinedAt: m.joinedAt?.toDate?.(),
    });
  }

  // 2. Fold in newsletter subscribers (creates email-only contacts when no
  //    member exists; enriches members when the email matches).
  for (const s of subscribers) {
    const email = norm(s.email);
    if (!email) continue;
    const existing = map.get(email);
    const prettyName = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
    if (existing) {
      if (!existing.name || existing.name === email) existing.name = prettyName || existing.name;
      existing.newsletterStatus = s.status;
      existing.newsletterSource = s.source;
      existing.newsletterTags = Array.from(new Set([...existing.newsletterTags, ...(s.tags || [])]));
    } else {
      map.set(email, {
        email,
        displayEmail: s.email,
        name: prettyName || email,
        isMember: false,
        pointsBalance: 0,
        pointsLifetime: 0,
        tierId: 'graine',
        ordersCount: 0,
        totalSpend: 0,
        itemTitles: [],
        newsletterStatus: s.status,
        newsletterSource: s.source,
        newsletterTags: s.tags || [],
        tookDoshaQuiz: false,
        tookGuide: false,
        guideRecommendations: [],
      });
    }
  }

  // 3. Aggregate orders — prefer uid match, fall back to email.
  const uidToEmail = new Map<string, string>();
  for (const m of members) if (m.uid && m.email) uidToEmail.set(m.uid, norm(m.email));

  for (const o of orders) {
    const emailFromUid = o.uid ? uidToEmail.get(o.uid) : undefined;
    const email = emailFromUid || norm(o.email);
    if (!email) continue;
    const row = map.get(email);
    if (!row) continue;       // order for an address we don't track yet — skip
    row.ordersCount += 1;
    // subtotal is stored as a string on ClientOrder (Shopify-style money
    // format). Coerce with parseFloat; NaN falls through to 0.
    const spend = typeof o.subtotal === 'string' ? parseFloat(o.subtotal) : Number(o.subtotal ?? 0);
    row.totalSpend += Number.isFinite(spend) ? spend : 0;
    for (const item of o.items || []) {
      if (item.title) row.itemTitles.push(norm(item.title));
    }
  }

  // 4. Dosha quiz history — by email (uid not stored on DoshaResult).
  for (const d of doshaResults) {
    const email = norm(d.email);
    const row = map.get(email);
    if (!row) continue;
    row.tookDoshaQuiz = true;
    // If the member doc hasn't been updated with a dosha yet but we have
    // a result, use the latest one as a fallback so dosha filters still
    // match unauthenticated takers who later signed up.
    if (!row.dosha && d.dominant) row.dosha = d.dominant;
  }

  // 5. Guide history.
  for (const g of guideResponses) {
    const email = g.email ? norm(g.email) : (g.uid ? uidToEmail.get(g.uid) : undefined);
    if (!email) continue;
    const row = map.get(email);
    if (!row) continue;
    row.tookGuide = true;
    if (g.recommendationId) row.guideRecommendations.push(g.recommendationId);
  }

  return Array.from(map.values());
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function compareNumber(value: number, op: Operator, target: number): boolean {
  switch (op) {
    case 'eq':  return value === target;
    case 'neq': return value !== target;
    case 'gt':  return value >  target;
    case 'gte': return value >= target;
    case 'lt':  return value <  target;
    case 'lte': return value <= target;
    default:    return false;
  }
}

function compareString(value: string, op: Operator, target: string): boolean {
  const a = value.toLowerCase(), b = target.toLowerCase();
  switch (op) {
    case 'eq':          return a === b;
    case 'neq':         return a !== b;
    case 'contains':    return a.includes(b);
    case 'notContains': return !a.includes(b);
    default:            return false;
  }
}

function compareBool(value: boolean, op: Operator, target: boolean): boolean {
  switch (op) {
    case 'eq':  return value === target;
    case 'neq': return value !== target;
    default:    return false;
  }
}

function evaluateCriterion(c: ContactMetrics, cr: Criterion): boolean {
  switch (cr.field) {
    case 'dosha':
      return compareString(c.dosha || '', cr.op, String(cr.value));
    case 'tier':
      return compareString(c.tierId || '', cr.op, String(cr.value));
    case 'pointsBalance':
      return compareNumber(c.pointsBalance, cr.op, Number(cr.value));
    case 'pointsLifetime':
      return compareNumber(c.pointsLifetime, cr.op, Number(cr.value));
    case 'ordersCount':
      return compareNumber(c.ordersCount, cr.op, Number(cr.value));
    case 'totalSpend':
      return compareNumber(c.totalSpend, cr.op, Number(cr.value));
    case 'productBoughtCount': {
      const keyword = norm(cr.extra || '');
      if (!keyword) return false;
      const count = c.itemTitles.filter(t => t.includes(keyword)).length;
      return compareNumber(count, cr.op, Number(cr.value));
    }
    case 'newsletterStatus':
      return compareString(c.newsletterStatus || '', cr.op, String(cr.value));
    case 'newsletterSource':
      return compareString(c.newsletterSource || '', cr.op, String(cr.value));
    case 'newsletterTag': {
      const needle = String(cr.value).toLowerCase();
      const has = c.newsletterTags.some(t => t.toLowerCase() === needle);
      return cr.op === 'notContains' ? !has : has;
    }
    case 'tookDoshaQuiz':
      return compareBool(c.tookDoshaQuiz, cr.op, Boolean(cr.value));
    case 'tookGuide':
      return compareBool(c.tookGuide, cr.op, Boolean(cr.value));
    case 'guideRecommendation': {
      const needle = String(cr.value).toLowerCase();
      const has = c.guideRecommendations.some(r => r.toLowerCase() === needle);
      return cr.op === 'notContains' ? !has : has;
    }
    case 'daysSinceJoined': {
      if (!c.joinedAt) return false;
      const days = Math.floor((Date.now() - c.joinedAt.getTime()) / 86_400_000);
      return compareNumber(days, cr.op, Number(cr.value));
    }
    case 'isMember':
      return compareBool(c.isMember, cr.op, Boolean(cr.value));
    default:
      return false;
  }
}

export function evaluateSegment(contacts: ContactMetrics[], segment: Segment): ContactMetrics[] {
  if (!segment.criteria.length) return [];
  return contacts.filter(c => {
    const results = segment.criteria.map(cr => evaluateCriterion(c, cr));
    return segment.mode === 'all' ? results.every(Boolean) : results.some(Boolean);
  });
}

// ─── Field catalog for the builder UI ───────────────────────────────────────
// Declarative description of every field so the UI can render appropriate
// controls (operator list, value input type, preset options) without each
// component having to know the internals of every criterion.

export type ValueKind = 'number' | 'text' | 'boolean' | 'enum';

export interface FieldDef {
  id: CriterionField;
  label: string;
  description?: string;
  valueKind: ValueKind;
  operators: Operator[];
  /** For enum fields — the canonical option list. */
  options?: { value: string; label: string }[];
  /** When true, the UI renders a second input for `extra`. */
  needsExtra?: boolean;
  extraLabel?: string;
  extraPlaceholder?: string;
}

const DOSHA_OPTIONS = [
  { value: 'Vata',      label: 'Vata' },
  { value: 'Pitta',     label: 'Pitta' },
  { value: 'Kapha',     label: 'Kapha' },
  { value: 'Tridoshic', label: 'Tridosha' },
];

const TIER_OPTIONS = TIERS.map((t: Tier) => ({ value: t.id, label: t.labelFR }));

const BOOL_OPTIONS = [
  { value: 'true',  label: 'Oui' },
  { value: 'false', label: 'Non' },
];

const NEWSLETTER_STATUS_OPTIONS = [
  { value: 'active',       label: 'Actif' },
  { value: 'unsubscribed', label: 'Désabonné' },
  { value: 'bounced',      label: 'Rebond' },
  { value: 'pending',      label: 'En attente' },
];

const GUIDE_REC_OPTIONS = [
  { value: 'origine',    label: 'Expérience Origine' },
  { value: 'podcast',    label: 'Podcast' },
  { value: 'boutique',   label: 'Boutique · rituels' },
  { value: 'livre',      label: 'Trilogie' },
  { value: 'evenement',  label: 'Événement · live' },
];

export const FIELDS: FieldDef[] = [
  {
    id: 'dosha', label: 'Dosha dominant',
    description: 'Valeur enregistrée sur le profil membre (mise à jour par le quiz).',
    valueKind: 'enum', operators: ['eq', 'neq'], options: DOSHA_OPTIONS,
  },
  {
    id: 'tier', label: 'Niveau de fidélité',
    description: 'Graine, Pousse, Tige, Fleur, Source — dérivé des points cumulés.',
    valueKind: 'enum', operators: ['eq', 'neq'], options: TIER_OPTIONS,
  },
  {
    id: 'pointsBalance', label: 'Points (solde actuel)',
    valueKind: 'number', operators: ['gte', 'gt', 'lte', 'lt', 'eq'],
  },
  {
    id: 'pointsLifetime', label: 'Points cumulés (à vie)',
    valueKind: 'number', operators: ['gte', 'gt', 'lte', 'lt', 'eq'],
  },
  {
    id: 'ordersCount', label: 'Nombre de commandes',
    valueKind: 'number', operators: ['gte', 'gt', 'lte', 'lt', 'eq'],
  },
  {
    id: 'totalSpend', label: 'Dépense totale ($)',
    valueKind: 'number', operators: ['gte', 'gt', 'lte', 'lt'],
  },
  {
    id: 'productBoughtCount', label: 'Produits achetés contenant…',
    description: 'Ex. "huile" pour les maniaques des huiles, "formation" pour les programmes.',
    valueKind: 'number', operators: ['gte', 'gt', 'eq'],
    needsExtra: true, extraLabel: 'Mot-clé dans le titre', extraPlaceholder: 'ex. huile',
  },
  {
    id: 'tookDoshaQuiz', label: 'A complété le quiz Dosha',
    valueKind: 'boolean', operators: ['eq'], options: BOOL_OPTIONS,
  },
  {
    id: 'tookGuide', label: 'A complété le Laissez-vous guider',
    valueKind: 'boolean', operators: ['eq'], options: BOOL_OPTIONS,
  },
  {
    id: 'guideRecommendation', label: 'Recommandation du guide',
    valueKind: 'enum', operators: ['contains', 'notContains'], options: GUIDE_REC_OPTIONS,
  },
  {
    id: 'newsletterStatus', label: 'Statut infolettre',
    valueKind: 'enum', operators: ['eq', 'neq'], options: NEWSLETTER_STATUS_OPTIONS,
  },
  {
    id: 'newsletterSource', label: 'Origine de l\'inscription',
    description: 'Ex. accueil-pulsation, waitlist-pitta, conferenciere.',
    valueKind: 'text', operators: ['eq', 'contains'],
  },
  {
    id: 'newsletterTag', label: 'Tag infolettre',
    description: 'Ex. waitlist-pitta, booking-conferenciere, kind-keynote.',
    valueKind: 'text', operators: ['contains', 'notContains'],
  },
  {
    id: 'daysSinceJoined', label: 'Jours depuis inscription',
    valueKind: 'number', operators: ['lte', 'lt', 'gte', 'gt'],
  },
  {
    id: 'isMember', label: 'A un compte client',
    valueKind: 'boolean', operators: ['eq'], options: BOOL_OPTIONS,
  },
];

export function findField(id: CriterionField): FieldDef | undefined {
  return FIELDS.find(f => f.id === id);
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  eq:          'est égal à',
  neq:         'est différent de',
  gt:          'supérieur à',
  gte:         'supérieur ou égal à',
  lt:          'inférieur à',
  lte:         'inférieur ou égal à',
  contains:    'contient',
  notContains: 'ne contient pas',
};

export function newCriterion(): Criterion {
  return {
    id: Math.random().toString(36).slice(2, 9),
    field: 'dosha',
    op: 'eq',
    value: 'Vata',
  };
}
