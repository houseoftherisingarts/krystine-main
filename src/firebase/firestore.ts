import { db } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, Timestamp,
  writeBatch, limit,
  type Unsubscribe,
} from 'firebase/firestore';

const noDb = () => { throw new Error('[Firestore] Firebase not configured. Add VITE_FIREBASE_* to .env.local'); };

// ─── Blog Posts ──────────────────────────────────────────────────────────────
export interface BlogPost {
  id?: string;
  title: string;
  subtitle?: string;
  date?: string;
  content: string;
  coverStyle?: string;
  coverImage?: string;
  images?: string[];
  isPublished?: boolean;
  createdAt?: Timestamp;
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  if (!db) return [];
  const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
}

export async function addBlogPost(post: Omit<BlogPost, 'id' | 'createdAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'blogPosts'), { ...post, createdAt: serverTimestamp() });
}

export async function updateBlogPost(id: string, patch: Partial<BlogPost>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'blogPosts', id), patch as any);
}

export async function deleteBlogPost(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'blogPosts', id));
}

// ─── Events ──────────────────────────────────────────────────────────────────
export interface EventDoc {
  id?: string;
  title: string;
  subtitle?: string;
  date: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  registrationLink?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  createdAt?: Timestamp;
}

export async function getEvents(): Promise<EventDoc[]> {
  if (!db) return [];
  const q = query(collection(db, 'events'), orderBy('date', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EventDoc));
}

export async function addEvent(event: Omit<EventDoc, 'id' | 'createdAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'events'), { ...event, createdAt: serverTimestamp() });
}

export async function updateEvent(id: string, patch: Partial<EventDoc>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'events', id), patch as any);
}

export async function deleteEvent(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'events', id));
}

// ─── CRM collections — convention ────────────────────────────────────────────
// The admin "Formulaires" inbox (src/pages/admin/sections/SubmissionsSection.tsx)
// reads from four collections and shows every submission in one filterable
// feed. Any new public-facing form or questionnaire MUST write into one of
// these four to automatically appear in that inbox:
//
//   • bookingRequests  — professional requests (speaking, tours, partnerships)
//   • newsletter       — email captures, waitlists (use `waitlist-<id>` source)
//   • doshaResults     — personality / Ayurveda self-assessments
//   • guideResponses   — multi-question routers / recommendation quizzes
//
// Required payload contract for CRM discoverability:
//   - `source`: stable string identifying the form/page (kebab-case)
//              e.g. "accueil-pulsation", "conference-tour", "waitlist-pitta"
//   - `tags`:   string[] — include the source as first tag plus any
//               structured segmentation (e.g. "kind-keynote", "rec-origine")
//
// The Submissions inbox auto-discovers new `source` values (no code change
// needed), but adding a pretty label for it in SubmissionsSection's
// `prettySource()` keeps the filter dropdown readable.
//
// ─── Newsletter subscribers (CRM) ────────────────────────────────────────────
export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'pending';

export interface NewsletterSubscriber {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  uid?: string;                   // populated when the subscriber is also a signed-in member
  tags?: string[];                // simple segmentation — "client", "event-2024", "dosha-vata", …
  status?: SubscriberStatus;      // default 'active' when added via public form
  unsubscribeToken?: string;      // hash used by the /desinscription public route
  subscribedAt?: Timestamp;
  unsubscribedAt?: Timestamp;
}

// Generate a URL-safe random token. Used as the subscriber's unsubscribe key
// so Krystine can include a revocation link in every sent email without
// exposing the document id.
function genUnsubToken(): string {
  const bytes = new Uint8Array(18);
  (globalThis.crypto || (window as any).crypto).getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function addNewsletterSubscriber(data: Omit<NewsletterSubscriber, 'id' | 'subscribedAt'>) {
  if (!db) return console.warn('[Firestore] Not configured');
  // Firestore rejects `undefined` values. Keep only defined, non-empty fields.
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  if (!clean.email) return;
  clean.email = String(clean.email).trim().toLowerCase();
  if (!clean.status) clean.status = 'active';
  if (!clean.unsubscribeToken) clean.unsubscribeToken = genUnsubToken();
  return addDoc(collection(db, 'newsletter'), { ...clean, subscribedAt: serverTimestamp() });
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  if (!db) return [];
  const q = query(collection(db, 'newsletter'), orderBy('subscribedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsletterSubscriber));
}

export async function deleteNewsletterSubscriber(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'newsletter', id));
}

export async function updateNewsletterSubscriber(id: string, patch: Partial<NewsletterSubscriber>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'newsletter', id), patch as any);
}

// ─── Bulk import (CSV flow) ──────────────────────────────────────────────────
// Skips emails that already exist (case-insensitive). Writes in batches of 400
// to stay under Firestore's 500-op batch limit.
export interface BulkImportResult {
  inserted: number;
  skippedDuplicates: number;
  invalid: number;
}

export async function bulkAddNewsletterSubscribers(
  rows: Array<Omit<NewsletterSubscriber, 'id' | 'subscribedAt' | 'unsubscribeToken'>>,
): Promise<BulkImportResult> {
  if (!db) { noDb(); return { inserted: 0, skippedDuplicates: 0, invalid: 0 }; }

  const existing = await getNewsletterSubscribers();
  const seen = new Set(existing.map(s => s.email.toLowerCase()));
  const validRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let inserted = 0;
  let skipped = 0;
  let invalid = 0;
  let batch = writeBatch(db!);
  let ops = 0;

  for (const row of rows) {
    const email = String(row.email || '').trim().toLowerCase();
    if (!email || !validRx.test(email)) { invalid++; continue; }
    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const ref = doc(collection(db, 'newsletter'));
    const payload: Record<string, any> = {
      email,
      status: row.status || 'active',
      source: row.source || 'csv-import',
      unsubscribeToken: genUnsubToken(),
      subscribedAt: serverTimestamp(),
    };
    if (row.firstName) payload.firstName = row.firstName;
    if (row.lastName) payload.lastName = row.lastName;
    if (row.tags && row.tags.length) payload.tags = row.tags;
    batch.set(ref, payload);
    ops++;
    inserted++;

    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db!);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { inserted, skippedDuplicates: skipped, invalid };
}

// ─── Newsletter messages (campaigns) ─────────────────────────────────────────
export type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'quote' | 'cta' | 'spacer';

export interface NewsletterBlock {
  type: BlockType;
  // Loose content bag so each block type can store its own shape without a
  // discriminated union explosion on the Firestore side.
  content?: Record<string, any>;
}

export interface NewsletterStats {
  recipients?: number;
  delivered?: number;
  opens?: number;
  clicks?: number;
  bounces?: number;
  unsubscribes?: number;
}

export interface NewsletterDoc {
  id?: string;
  title: string;           // internal label for Krystine
  subject: string;         // email Subject line
  preheader?: string;      // hidden preview text
  fromName?: string;       // e.g. "Krystine St-Laurent"
  blocks: NewsletterBlock[];
  status: NewsletterStatus;
  segmentTag?: string | null;  // null → send to all active subscribers
  scheduledFor?: Timestamp;
  sentAt?: Timestamp;
  stats?: NewsletterStats;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createNewsletter(data: Omit<NewsletterDoc, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'newsletters'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNewsletter(id: string, patch: Partial<NewsletterDoc>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'newsletters', id), { ...patch, updatedAt: serverTimestamp() } as any);
}

export async function deleteNewsletter(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'newsletters', id));
}

export async function getNewsletter(id: string): Promise<NewsletterDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'newsletters', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as NewsletterDoc) : null;
}

export async function getNewsletters(): Promise<NewsletterDoc[]> {
  if (!db) return [];
  const q = query(collection(db, 'newsletters'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsletterDoc));
}

// ─── Member inbox (newsletter archives) ──────────────────────────────────────
// Each inbox pointer references a newsletter by id; the full body is fetched
// from /newsletters/{newsletterId}. This keeps per-member storage tiny.
export interface InboxPointer {
  id?: string;                 // matches newsletterId
  newsletterId: string;
  title: string;
  subject: string;
  receivedAt?: Timestamp;
  readAt?: Timestamp;
}

export async function getMemberInbox(uid: string): Promise<InboxPointer[]> {
  if (!db) return [];
  const q = query(collection(db, 'members', uid, 'inbox'), orderBy('receivedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as InboxPointer));
}

export async function markInboxRead(uid: string, newsletterId: string) {
  if (!db) return;
  const ref = doc(db, 'members', uid, 'inbox', newsletterId);
  try { await updateDoc(ref, { readAt: serverTimestamp() } as any); } catch { /* not-yet-created inbox item is fine to skip */ }
}

// Resolve an unsubscribe token → subscriber doc, flip their status.
// Delegated to a Cloud Function so we don't have to expose the newsletter
// collection to public reads (which would leak every subscriber's email).
// Region + project ID come from the Firebase project the app is bound to.
const FUNCTIONS_BASE =
  (import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined)
  || `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string }> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/unsubscribeByToken?t=${encodeURIComponent(token)}`);
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

// ─── Dosha Quiz Results ───────────────────────────────────────────────────────
export interface DoshaResult {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  dominant: string;
  vata: number;
  pitta: number;
  kapha: number;
  // Origin tracking so the admin CRM can see which page/context produced
  // the quiz submission. Defaults to 'quiz' when unspecified.
  source?: string;
  tags?: string[];
  createdAt?: Timestamp;
}

export async function addDoshaQuizResult(data: Omit<DoshaResult, 'id' | 'createdAt'>) {
  if (!db) return console.warn('[Firestore] Not configured');
  // Default to `source: 'quiz'` so legacy callers without explicit attribution
  // still land in the admin CRM under a recognizable bucket.
  const payload = { source: 'quiz', ...data, createdAt: serverTimestamp() };
  return addDoc(collection(db, 'doshaResults'), payload);
}

export async function getDoshaResults(): Promise<DoshaResult[]> {
  if (!db) return [];
  const q = query(collection(db, 'doshaResults'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DoshaResult));
}

export async function deleteDoshaResult(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'doshaResults', id));
}

// ─── Booking Requests (conférence / contact) ─────────────────────────────────
export type BookingStatus = 'new' | 'in_progress' | 'accepted' | 'declined';

// Speaker-booking structured fields. A requester who fills the Réserver
// Krystine form is expected to answer these; the admin Demandes view
// renders each as a labelled row so Krystine can triage without reading a
// free-form paragraph.
export type InterventionKind =
  | 'keynote'         // conférence / keynote
  | 'workshop'        // atelier pratique
  | 'panel'           // table ronde / panel
  | 'hosting'         // animation d'événement
  | 'podcast'         // podcast / entrevue média
  | 'corporate'       // formation corporate
  | 'retreat'         // retraite / séjour
  | 'other';

export type EventFormat = 'in-person' | 'virtual' | 'hybrid' | 'open';

export type AudienceType =
  | 'general-public'
  | 'corporate'
  | 'students'
  | 'healthcare'
  | 'community'
  | 'other';

export type AudienceSize = 'under-50' | '50-150' | '150-500' | '500-plus' | 'unknown';

export type InterventionDuration =
  | '30min'
  | '60min'
  | '90min'
  | 'half-day'
  | 'full-day'
  | 'multi-day'
  | 'flexible';

export type BudgetRange =
  | 'under-2k'
  | '2k-5k'
  | '5k-10k'
  | '10k-plus'
  | 'to-discuss';

export type LangPref = 'fr' | 'en' | 'bilingual';

export interface BookingRequest {
  id?: string;
  name: string;
  email: string;
  organization?: string;
  organizationUrl?: string;
  message?: string;
  eventType?: string;
  interventionKind?: InterventionKind;
  format?: EventFormat;
  audienceType?: AudienceType;
  audienceSize?: AudienceSize;
  duration?: InterventionDuration;
  preferredDate?: string;
  budgetRange?: BudgetRange;
  languagePref?: LangPref;
  // Conference-tour-specific fields. Populated only when `source` is
  // 'conference-tour'; left undefined for classic speaker-booking requests.
  city?: string;
  region?: string;
  /**
   * How the requester can help bring the conference to their region —
   * ranges from a passive "I'd just like it here" to a full host offer.
   * Lets Krystine filter serious prospects without a phone call.
   */
  hostCapability?: 'request-only' | 'know-venue' | 'can-venue' | 'can-organize' | 'venue-and-organize';
  phone?: string;
  status?: BookingStatus;
  // Origin tracking — the page / form that produced the request. Mirrors the
  // same field on NewsletterSubscriber / DoshaResult for a consistent CRM.
  source?: string;
  tags?: string[];
  createdAt?: Timestamp;
}

export async function addBookingRequest(data: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>) {
  if (!db) return console.warn('[Firestore] Not configured');
  const payload = { source: 'conferenciere', ...data, status: 'new' as BookingStatus, createdAt: serverTimestamp() };
  return addDoc(collection(db, 'bookingRequests'), payload);
}

export async function getBookingRequests(): Promise<BookingRequest[]> {
  if (!db) return [];
  const q = query(collection(db, 'bookingRequests'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingRequest));
}

export async function updateBookingRequest(id: string, patch: Partial<BookingRequest>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'bookingRequests', id), patch as any);
}

export async function deleteBookingRequest(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'bookingRequests', id));
}

// ─── Media Library (Firebase Storage URL registry) ───────────────────────────
// Holds two flavours of entries:
//   • `source: 'upload'`  — files in our Firebase Storage bucket; `path`
//      points at the Storage object and we own deletion.
//   • `source: 'linked'`  — external URLs the site hardcodes (CDN banners,
//      book covers, chakra art, /public files). Indexed so Krystine sees
//      and downloads them from the Médiathèque, but deletion only removes
//      the Firestore doc — the original file is not ours to delete.
export type MediaSource = 'upload' | 'linked';
export interface MediaItem {
  id?: string;
  url: string;
  path: string;
  name: string;
  contentType?: string;
  size?: number;
  source?: MediaSource;
  /** Human grouping for the grid (logo, founder, books, chakras, products, home, public). */
  category?: string;
  uploadedAt?: Timestamp;
}

export async function addMediaItem(item: Omit<MediaItem, 'id' | 'uploadedAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'mediaLibrary'), { ...item, uploadedAt: serverTimestamp() });
}

export async function getMediaLibrary(): Promise<MediaItem[]> {
  if (!db) return [];
  const q = query(collection(db, 'mediaLibrary'), orderBy('uploadedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaItem));
}

export async function deleteMediaItem(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'mediaLibrary', id));
}

/**
 * Bulk-register external media entries (hardcoded site assets) without
 * re-creating rows that already exist. Uniqueness is keyed by `url`.
 * Returns the number of newly added entries. Safe to re-run — existing
 * entries are left untouched so Krystine's metadata edits aren't clobbered.
 */
export async function seedLinkedMedia(
  entries: Array<{ url: string; name: string; path?: string; category?: string; contentType?: string }>
): Promise<{ added: number; skipped: number }> {
  if (!db) noDb();
  const existing = await getMediaLibrary();
  const knownUrls = new Set(existing.map(e => e.url));
  let added = 0;
  let skipped = 0;
  for (const e of entries) {
    if (knownUrls.has(e.url)) { skipped++; continue; }
    await addMediaItem({
      url: e.url,
      path: e.path ?? e.url,     // for 'linked' we fall back to URL as the path — never used for deletion
      name: e.name,
      contentType: e.contentType,
      source: 'linked',
      category: e.category,
    });
    added++;
  }
  return { added, skipped };
}

// ─── Member Profiles (client accounts) ───────────────────────────────────────
export interface MemberDoc {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  provider?: 'google' | 'email' | string;
  dosha?: string;                 // dominant dosha set after quiz
  newsletterSubscribed?: boolean; // true once the member is on the newsletter list
  newsletterSource?: string;      // page/context that triggered the subscription
  joinedAt?: Timestamp;
  lastSeenAt?: Timestamp;
}

export async function ensureMemberProfile(profile: Omit<MemberDoc, 'joinedAt' | 'lastSeenAt'>) {
  if (!db) return;
  const ref = doc(db, 'members', profile.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...profile, joinedAt: serverTimestamp(), lastSeenAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...snap.data(), ...profile, lastSeenAt: serverTimestamp() }, { merge: true });
  }
}

export async function getMember(uid: string): Promise<MemberDoc | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'members', uid));
  return snap.exists() ? (snap.data() as MemberDoc) : null;
}

export async function updateMember(uid: string, patch: Partial<MemberDoc>) {
  if (!db) noDb();
  return setDoc(doc(db!, 'members', uid), patch, { merge: true });
}

export function subscribeToMember(uid: string, cb: (m: MemberDoc | null) => void): Unsubscribe {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, 'members', uid), snap => cb(snap.exists() ? (snap.data() as MemberDoc) : null));
}

export async function getAllMembers(): Promise<MemberDoc[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'members'), orderBy('joinedAt', 'desc')));
  return snap.docs.map(d => d.data() as MemberDoc);
}

// ─── Dosha results by member uid ─────────────────────────────────────────────
export async function getDoshaResultsForMember(uid: string): Promise<DoshaResult[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'doshaResults'), where('uid', '==', uid)));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as DoshaResult));
  return rows.sort((a, b) => {
    const aT = a.createdAt?.toMillis() || 0;
    const bT = b.createdAt?.toMillis() || 0;
    return bT - aT;
  });
}

// ─── Client Orders (logged when checkout is created) ─────────────────────────
export type ClientOrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface ClientOrder {
  id?: string;
  uid?: string;              // member uid (if signed in at checkout)
  email: string;
  items: { title: string; price?: string; quantity: number; image?: string; variantId?: string }[];
  subtotal?: string;
  currency?: string;
  checkoutUrl?: string;
  cartId?: string;
  status: ClientOrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addClientOrder(order: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'clientOrders'), { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function getClientOrders(): Promise<ClientOrder[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'clientOrders'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientOrder));
}

export async function getClientOrdersForMember(uid: string): Promise<ClientOrder[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'clientOrders'), where('uid', '==', uid)));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientOrder));
  return rows.sort((a, b) => {
    const aT = a.createdAt?.toMillis() || 0;
    const bT = b.createdAt?.toMillis() || 0;
    return bT - aT;
  });
}

export async function updateClientOrder(id: string, patch: Partial<ClientOrder>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'clientOrders', id), { ...patch, updatedAt: serverTimestamp() } as any);
}

export async function deleteClientOrder(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'clientOrders', id));
}

// ─── Support Messaging (client ↔ admin) ──────────────────────────────────────
export interface ConversationDoc {
  uid: string;
  memberEmail: string;
  memberName?: string;
  memberPhotoURL?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  unreadByAdmin?: number;
  unreadByClient?: number;
}

export interface MessageDoc {
  id?: string;
  sender: 'client' | 'admin';
  body: string;
  createdAt?: Timestamp;
}

export async function ensureConversation(uid: string, profile: Pick<ConversationDoc, 'memberEmail' | 'memberName' | 'memberPhotoURL'>) {
  if (!db) noDb();
  const ref = doc(db!, 'conversations', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, ...profile, unreadByAdmin: 0, unreadByClient: 0 });
  }
}

export async function sendMessage(uid: string, sender: 'client' | 'admin', body: string, profile?: Pick<ConversationDoc, 'memberEmail' | 'memberName' | 'memberPhotoURL'>) {
  if (!db) noDb();
  // Write message first.
  const msgsRef = collection(db!, 'conversations', uid, 'messages');
  await addDoc(msgsRef, { sender, body, createdAt: serverTimestamp() });
  // Update conversation meta.
  const convRef = doc(db!, 'conversations', uid);
  const convSnap = await getDoc(convRef);
  const prev = convSnap.exists() ? (convSnap.data() as ConversationDoc) : ({ uid, memberEmail: profile?.memberEmail || '' } as ConversationDoc);
  await setDoc(convRef, {
    ...prev,
    ...(profile || {}),
    uid,
    lastMessage: body.slice(0, 200),
    lastMessageAt: serverTimestamp(),
    unreadByAdmin: sender === 'client' ? (prev.unreadByAdmin || 0) + 1 : 0,
    unreadByClient: sender === 'admin' ? (prev.unreadByClient || 0) + 1 : 0,
  }, { merge: true });
}

export function subscribeToMessages(uid: string, cb: (msgs: MessageDoc[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'conversations', uid, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageDoc))));
}

export function subscribeToConversations(cb: (list: ConversationDoc[]) => void): Unsubscribe {
  if (!db) { cb([]); return () => {}; }
  const q = query(collection(db, 'conversations'), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data() as ConversationDoc)));
}

export async function markConversationRead(uid: string, role: 'admin' | 'client') {
  if (!db) return;
  const key = role === 'admin' ? 'unreadByAdmin' : 'unreadByClient';
  return setDoc(doc(db, 'conversations', uid), { [key]: 0 }, { merge: true });
}

// ─── Shopify Orders (mirrored from Shopify Admin API via Cloud Functions) ───
export interface ShopifyOrderDoc {
  id: string;
  orderNumber: number;
  name: string;
  email: string | null;
  customer: { id: string | null; name: string | null; email: string | null };
  currency: string;
  totalPrice: number;
  subtotalPrice: number;
  totalTax: number;
  totalDiscounts: number;
  totalShipping: number;
  financialStatus: string;
  fulfillmentStatus: string | null;
  tags: string[];
  lineItems: { id: string; productId: string | null; variantId: string | null; title: string; quantity: number; price: number; sku: string | null }[];
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingCountry: string | null;
  createdAt?: Timestamp;
  processedAt?: Timestamp | null;
  cancelledAt?: Timestamp | null;
  updatedAt?: Timestamp;
  ingestedAt?: Timestamp;
}

export async function getShopifyOrders(limit = 500): Promise<ShopifyOrderDoc[]> {
  if (!db) return [];
  const q = query(collection(db, 'shopifyOrders'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() } as ShopifyOrderDoc));
}

// ─── Site Settings (key/value document) ──────────────────────────────────────
export async function getSiteSettings(): Promise<Record<string, any>> {
  if (!db) return {};
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : {};
}

export async function updateSiteSettings(patch: Record<string, any>) {
  if (!db) noDb();
  return setDoc(doc(db!, 'settings', 'main'), patch, { merge: true });
}

// ─── Splash screen settings ──────────────────────────────────────────────────
export interface SplashSettings {
  enabled: boolean;
  tagline: string;
  headline: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  skipCtaLabel: string;
  // Optional: i18n EN strings; if absent, fall back to FR.
  taglineEN?: string;
  headlineEN?: string;
  subtitleEN?: string;
  primaryCtaLabelEN?: string;
  skipCtaLabelEN?: string;
}

export const DEFAULT_SPLASH: SplashSettings = {
  enabled: true,
  tagline: 'Art de vivre conscient',
  headline: 'Retrouvez votre boussole intérieure',
  subtitle: '12 semaines · Un parcours · L\'Ayurveda comme chemin',
  primaryCtaLabel: 'Découvrir l\'Expérience Origine',
  primaryCtaHref: '/origine',
  skipCtaLabel: 'Entrer dans l\'univers',
  taglineEN: 'Conscious living',
  headlineEN: 'Rediscover your inner compass',
  subtitleEN: '12 weeks · A journey · Ayurveda as a path',
  primaryCtaLabelEN: 'Discover the Origin Experience',
  skipCtaLabelEN: 'Enter the universe',
};

export async function getSplashSettings(): Promise<SplashSettings> {
  if (!db) return DEFAULT_SPLASH;
  const snap = await getDoc(doc(db, 'settings', 'splash'));
  if (!snap.exists()) return DEFAULT_SPLASH;
  return { ...DEFAULT_SPLASH, ...snap.data() } as SplashSettings;
}

export async function updateSplashSettings(patch: Partial<SplashSettings>) {
  if (!db) noDb();
  return setDoc(doc(db!, 'settings', 'splash'), patch, { merge: true });
}

// ─── "Laissez-vous guider" responses ────────────────────────────────────────
// Each submission of the recommendation quiz writes a row here so Krystine
// can see who's landing where. When the visitor is signed in we also stamp
// their uid + email, which lets the client portal and the admin client-view
// overlay surface their past routing decisions.
export interface GuideAnswer {
  qid: string;
  optionId: string;
  // Denormalized FR labels for fast admin rendering without re-joining
  // against the question set.
  questionLabel?: string;
  optionLabel?: string;
}

export interface GuideResponse {
  id?: string;
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  answers: GuideAnswer[];
  recommendationId: string;     // e.g. "origine"
  recommendationLabel?: string; // denormalized for admin display
  source?: string;              // always 'guide' for this collection
  // Filterable segmentation for the unified admin CRM view. At minimum a
  // "guide" tag plus "rec-<recommendationId>" so Krystine can slice by
  // outcome (e.g. everyone routed to Origine). Mirrors the tag pattern
  // used by bookingRequests / newsletter / doshaResults.
  tags?: string[];
  createdAt?: Timestamp;
}

export async function addGuideResponse(data: Omit<GuideResponse, 'id' | 'createdAt'>) {
  if (!db) return null;
  try {
    return await addDoc(collection(db, 'guideResponses'), {
      source: 'guide',
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[firestore] addGuideResponse failed', e);
    return null;
  }
}

export async function getGuideResponses(max = 200): Promise<GuideResponse[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'guideResponses'), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GuideResponse));
  } catch (e) {
    console.warn('[firestore] getGuideResponses failed', e);
    return [];
  }
}

export async function getGuideResponsesForMember(uid: string): Promise<GuideResponse[]> {
  if (!db || !uid) return [];
  try {
    const q = query(
      collection(db, 'guideResponses'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GuideResponse));
  } catch (e) {
    console.warn('[firestore] getGuideResponsesForMember failed', e);
    return [];
  }
}

// ─── Messaging groups (CRM segmentation) ─────────────────────────────────────
// Krystine-curated groups of clients. Each group stores both `memberUids`
// (for internal batch messaging — loops sendMessage) and `memberEmails`
// (for batch emails via the newsletter cloud function). Emails are kept
// alongside uids because many contacts are on the newsletter list without
// a members/* record yet; the group should still be able to email them.
//
// Batch sending flow:
//   • Internal message → loop `sendMessage(uid, 'admin', body, profile)`
//     over `memberUids`. Contacts without a uid are silently skipped
//     (shown as "only email" in the group UI).
//   • Email → write/update newsletter subscribers with tag `group-<id>`,
//     create a NewsletterDoc with `segmentTag: 'group-<id>'`, then fire
//     the deployed `sendNewsletter` Cloud Function.
export interface MessagingGroup {
  id?: string;
  name: string;
  description?: string;
  memberUids: string[];         // signed-in members — reachable via internal messages
  memberEmails: string[];       // de-duplicated lowercase emails — reachable via email
  /**
   * Optional segment definition. When present, the group was assembled by
   * the segment builder (dosha = Vata, points > 150, etc.) and can be
   * re-evaluated against fresh data with the "Rafraîchir" action. Stored
   * as plain JSON (mirrors the Segment shape from src/lib/segments.ts) —
   * we deliberately avoid importing the type here to keep firestore.ts
   * free of cross-cutting lib deps.
   */
  segment?: {
    mode: 'all' | 'any';
    criteria: Array<{ id: string; field: string; op: string; value: string | number | boolean; extra?: string }>;
  };
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function createMessagingGroup(data: Omit<MessagingGroup, 'id' | 'createdAt' | 'updatedAt'>) {
  if (!db) noDb();
  return addDoc(collection(db!, 'messagingGroups'), {
    ...data,
    memberUids: data.memberUids ?? [],
    memberEmails: data.memberEmails ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMessagingGroup(id: string, patch: Partial<MessagingGroup>) {
  if (!db) noDb();
  return updateDoc(doc(db!, 'messagingGroups', id), { ...patch, updatedAt: serverTimestamp() } as any);
}

export async function deleteMessagingGroup(id: string) {
  if (!db) noDb();
  return deleteDoc(doc(db!, 'messagingGroups', id));
}

export async function getMessagingGroups(): Promise<MessagingGroup[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'messagingGroups'), orderBy('updatedAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MessagingGroup));
  } catch (e) {
    console.warn('[firestore] getMessagingGroups failed', e);
    return [];
  }
}

/**
 * Tag every newsletter subscriber whose email belongs to the group with
 * `group-<groupId>`. This is what powers the email batch send — the
 * sendNewsletter Cloud Function filters by `segmentTag`. Subscribers who
 * aren't already on the list get a new doc created with status='active'
 * so they can receive the group email, but they still count as
 * opt-in-via-group (Krystine added them explicitly by pulling them into
 * the group, which acts as the consent gesture).
 */
export async function tagSubscribersForGroup(groupId: string, emails: string[]): Promise<number> {
  if (!db || emails.length === 0) return 0;
  const tag = `group-${groupId}`;
  const subs = await getNewsletterSubscribers();
  const byEmail = new Map(subs.map(s => [s.email.trim().toLowerCase(), s]));
  let updated = 0;
  const batch = writeBatch(db);
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email);
    if (existing?.id) {
      const nextTags = Array.from(new Set([...(existing.tags || []), tag]));
      if (nextTags.length !== (existing.tags?.length || 0)) {
        batch.update(doc(db, 'newsletter', existing.id), { tags: nextTags });
        updated++;
      }
    } else {
      const ref = doc(collection(db, 'newsletter'));
      batch.set(ref, {
        email,
        status: 'active',
        source: `group-${groupId}`,
        tags: [tag],
        subscribedAt: serverTimestamp(),
      });
      updated++;
    }
  }
  if (updated > 0) await batch.commit();
  return updated;
}

// ─── Boutique settings (redirect switch) ─────────────────────────────────────
// Lives at `settings/boutique`. The redirect switch is a safety valve so
// Krystine can temporarily swap every new-boutique link for the old
// inspiratanature.com site while we iterate.
export interface BoutiqueSettings {
  redirectEnabled: boolean;
  redirectUrl: string;
  // Per-product visibility toggle. Each entry is the Shopify product handle
  // (slug) that should be hidden from the public boutique without removing
  // it from Shopify. Krystine flips these from Admin → Boutique.
  hiddenProducts?: string[];
  updatedAt?: Timestamp;
}

export const DEFAULT_BOUTIQUE_SETTINGS: BoutiqueSettings = {
  redirectEnabled: false,
  redirectUrl: 'https://www.inspiratanature.com',
  hiddenProducts: [],
};

// Toggle a single product's visibility. Pure list-membership update —
// rebuilds the array client-side and writes the whole field. No need for
// arrayUnion/arrayRemove since the list is small (a handful of items).
export async function setProductHidden(handle: string, hidden: boolean) {
  if (!db) noDb();
  const current = await getBoutiqueSettings();
  const set = new Set(current.hiddenProducts || []);
  if (hidden) set.add(handle);
  else set.delete(handle);
  await updateBoutiqueSettings({ hiddenProducts: Array.from(set) });
}

export async function getBoutiqueSettings(): Promise<BoutiqueSettings> {
  if (!db) return DEFAULT_BOUTIQUE_SETTINGS;
  const snap = await getDoc(doc(db, 'settings', 'boutique'));
  if (!snap.exists()) return DEFAULT_BOUTIQUE_SETTINGS;
  return { ...DEFAULT_BOUTIQUE_SETTINGS, ...snap.data() } as BoutiqueSettings;
}

export async function updateBoutiqueSettings(patch: Partial<BoutiqueSettings>) {
  if (!db) noDb();
  return setDoc(doc(db!, 'settings', 'boutique'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeToBoutiqueSettings(cb: (s: BoutiqueSettings) => void): Unsubscribe {
  if (!db) { cb(DEFAULT_BOUTIQUE_SETTINGS); return () => {}; }
  return onSnapshot(doc(db, 'settings', 'boutique'), snap => {
    if (!snap.exists()) cb(DEFAULT_BOUTIQUE_SETTINGS);
    else cb({ ...DEFAULT_BOUTIQUE_SETTINGS, ...snap.data() } as BoutiqueSettings);
  });
}
