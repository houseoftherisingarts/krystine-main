import { db } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, Timestamp,
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

// ─── Newsletter ───────────────────────────────────────────────────────────────
export interface NewsletterSubscriber {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  uid?: string;             // populated when the subscriber is also a signed-in member
  subscribedAt?: Timestamp;
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
  createdAt?: Timestamp;
}

export async function addDoshaQuizResult(data: Omit<DoshaResult, 'id' | 'createdAt'>) {
  if (!db) return console.warn('[Firestore] Not configured');
  return addDoc(collection(db, 'doshaResults'), { ...data, createdAt: serverTimestamp() });
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

export interface BookingRequest {
  id?: string;
  name: string;
  email: string;
  organization?: string;
  message?: string;
  eventType?: string;
  status?: BookingStatus;
  createdAt?: Timestamp;
}

export async function addBookingRequest(data: Omit<BookingRequest, 'id' | 'status' | 'createdAt'>) {
  if (!db) return console.warn('[Firestore] Not configured');
  return addDoc(collection(db, 'bookingRequests'), { ...data, status: 'new' as BookingStatus, createdAt: serverTimestamp() });
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
export interface MediaItem {
  id?: string;
  url: string;
  path: string;
  name: string;
  contentType?: string;
  size?: number;
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
