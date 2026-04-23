// Loyalty-point persistence helpers.
// ─────────────────────────────────────────────────────────────────────────────
// Storage layout:
// - `memberPoints/{uid}` — one doc per member: { balance, lifetime, updatedAt }
// - `pointsEvents/{dedupKey}` — append-only event log. The doc id IS the
//   deduplication key, so replays (retries, double-clicks, re-opens of the
//   same page) are idempotent at the Firestore level.
// - `rewardRedemptions/{auto}` — pending reward redemptions for Krystine to
//   fulfill manually. Each doc records the uid, reward id, cost, and status.

import { db } from '../firebase';
import {
  doc, collection, query, where, orderBy, limit as fbLimit,
  onSnapshot, getDoc, getDocs, runTransaction, addDoc, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import type { PointsKind } from '../lib/pointsConfig';

const noDb = () => { throw new Error('[Firestore] Firebase not configured.'); };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PointsBalance {
  balance: number;   // spendable
  lifetime: number;  // total ever earned (drives tier progression)
  updatedAt?: Timestamp;
}

export const DEFAULT_POINTS_BALANCE: PointsBalance = { balance: 0, lifetime: 0 };

export interface PointsEvent {
  id?: string;
  uid: string;
  kind: PointsKind;
  amount: number;          // signed — redemptions are negative
  meta?: Record<string, any>;
  dedupKey: string;        // mirrored from doc id
  at?: Timestamp;
}

export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface RewardRedemption {
  id?: string;
  uid: string;
  email?: string;
  rewardId: string;
  rewardLabel: string;
  cost: number;
  status: RedemptionStatus;
  fulfillmentNote?: string;  // e.g. a Shopify code once Krystine issues it
  createdAt?: Timestamp;
  fulfilledAt?: Timestamp;
}

// ─── Award / redeem ───────────────────────────────────────────────────────────

// Award points to a member. `dedupKey` must be deterministic for anything
// that should count at most once (e.g. `quiz:{uid}`, `order:{orderId}`).
// For genuinely repeatable events (a social share), pass a unique key per
// occurrence (timestamp, random id) and accept the dedup file grows.
//
// Returns { awarded } where awarded === 0 when the key already existed.
export async function awardPoints(
  uid: string,
  kind: PointsKind,
  amount: number,
  dedupKey: string,
  meta?: Record<string, any>,
): Promise<{ awarded: number; alreadyAwarded?: boolean }> {
  if (!db || !uid || !amount) return { awarded: 0 };
  const eventRef = doc(db, 'pointsEvents', dedupKey);
  const balanceRef = doc(db, 'memberPoints', uid);
  try {
    return await runTransaction(db, async tx => {
      const existing = await tx.get(eventRef);
      if (existing.exists()) return { awarded: 0, alreadyAwarded: true };
      const bal = await tx.get(balanceRef);
      const prev = (bal.exists() ? bal.data() : DEFAULT_POINTS_BALANCE) as PointsBalance;
      const next: PointsBalance = {
        balance: (prev.balance || 0) + amount,
        lifetime: amount > 0 ? (prev.lifetime || 0) + amount : (prev.lifetime || 0),
      };
      tx.set(eventRef, {
        uid, kind, amount, dedupKey,
        meta: meta || null,
        at: serverTimestamp(),
      });
      tx.set(balanceRef, { ...next, updatedAt: serverTimestamp() }, { merge: true });
      return { awarded: amount };
    });
  } catch (e) {
    console.warn('[points] awardPoints failed', e);
    return { awarded: 0 };
  }
}

// Spend points on a reward. Unlike `awardPoints`, this always creates a new
// event doc (auto-id) so the same reward can be redeemed multiple times. A
// companion `rewardRedemptions` doc captures the intent for fulfillment.
//
// When `reward.oneShot` is true, we pre-scan the member's existing
// redemptions (outside the transaction, since Firestore txns don't support
// query reads) and reject the redemption if a non-cancelled one already
// exists for the same rewardId. There's a tiny race window if the same
// member clicks twice within milliseconds, but the UI button is disabled
// after the first successful click and the pre-scan catches the second
// server round-trip.
export async function redeemReward(
  uid: string,
  email: string | undefined,
  reward: { id: string; cost: number; label: string; oneShot?: boolean },
): Promise<{ ok: boolean; reason?: 'insufficient' | 'error' | 'one-shot'; redemptionId?: string }> {
  if (!db || !uid) return { ok: false, reason: 'error' };

  if (reward.oneShot) {
    const existing = await listMyRewardRedemptions(uid);
    const already = existing.some(r => r.rewardId === reward.id && r.status !== 'cancelled');
    if (already) return { ok: false, reason: 'one-shot' };
  }

  const balanceRef = doc(db, 'memberPoints', uid);
  try {
    const redemptionId = await runTransaction(db, async tx => {
      const bal = await tx.get(balanceRef);
      const prev = (bal.exists() ? bal.data() : DEFAULT_POINTS_BALANCE) as PointsBalance;
      if ((prev.balance || 0) < reward.cost) throw new Error('insufficient');

      // Redemption intent — admin fulfills and fills in fulfillmentNote.
      const redemptionRef = doc(collection(db!, 'rewardRedemptions'));
      tx.set(redemptionRef, {
        uid, email: email || null,
        rewardId: reward.id,
        rewardLabel: reward.label,
        cost: reward.cost,
        status: 'pending' as RedemptionStatus,
        createdAt: serverTimestamp(),
      });

      // Event log — dedup key is the redemption doc id, so a replayed call
      // with the same redemptionRef wouldn't double-spend (though we never
      // replay since we always generate a fresh ref above).
      const eventRef = doc(db!, 'pointsEvents', `redeem:${redemptionRef.id}`);
      tx.set(eventRef, {
        uid,
        kind: 'redeem' as PointsKind,
        amount: -reward.cost,
        dedupKey: `redeem:${redemptionRef.id}`,
        meta: { rewardId: reward.id, rewardLabel: reward.label },
        at: serverTimestamp(),
      });

      tx.set(balanceRef, {
        balance: (prev.balance || 0) - reward.cost,
        lifetime: prev.lifetime || 0, // unchanged — redemptions don't lower lifetime
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return redemptionRef.id;
    });
    return { ok: true, redemptionId };
  } catch (e: any) {
    if (e?.message === 'insufficient') return { ok: false, reason: 'insufficient' };
    console.warn('[points] redeemReward failed', e);
    return { ok: false, reason: 'error' };
  }
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function subscribeToMemberPoints(uid: string, cb: (b: PointsBalance) => void): Unsubscribe {
  if (!db || !uid) { cb(DEFAULT_POINTS_BALANCE); return () => {}; }
  // Emit defaults right away so the UI can flip out of its loading state
  // even if Firestore takes a moment (or — critically — if the rules for
  // memberPoints haven't been deployed yet and onSnapshot errors silently).
  cb(DEFAULT_POINTS_BALANCE);
  return onSnapshot(
    doc(db, 'memberPoints', uid),
    snap => {
      if (!snap.exists()) cb(DEFAULT_POINTS_BALANCE);
      else cb({ ...DEFAULT_POINTS_BALANCE, ...snap.data() } as PointsBalance);
    },
    err => {
      console.warn('[points] subscribeToMemberPoints error:', err);
      cb(DEFAULT_POINTS_BALANCE);
    },
  );
}

// One-shot read. Useful as a fallback when the live snapshot is silent
// (rules misconfig, IndexedDB cache stuck, ITP, etc.) and the UI needs to
// refresh the balance on demand.
export async function getMemberPoints(uid: string): Promise<PointsBalance> {
  if (!db || !uid) return DEFAULT_POINTS_BALANCE;
  try {
    const snap = await getDoc(doc(db, 'memberPoints', uid));
    if (!snap.exists()) return DEFAULT_POINTS_BALANCE;
    return { ...DEFAULT_POINTS_BALANCE, ...snap.data() } as PointsBalance;
  } catch (e) {
    console.warn('[points] getMemberPoints failed', e);
    return DEFAULT_POINTS_BALANCE;
  }
}

export async function listPointsEvents(uid: string, max = 50): Promise<PointsEvent[]> {
  if (!db || !uid) return [];
  try {
    const q = query(
      collection(db, 'pointsEvents'),
      where('uid', '==', uid),
      orderBy('at', 'desc'),
      fbLimit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PointsEvent));
  } catch (e) {
    console.warn('[points] listPointsEvents failed', e);
    return [];
  }
}

export async function listMyRewardRedemptions(uid: string): Promise<RewardRedemption[]> {
  if (!db || !uid) return [];
  try {
    const q = query(
      collection(db, 'rewardRedemptions'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardRedemption));
  } catch (e) {
    console.warn('[points] listMyRewardRedemptions failed', e);
    return [];
  }
}

// Recompute balance + lifetime from the event log and write them back to
// `memberPoints/{uid}`. Used as a self-heal when a dedup doc exists but the
// companion balance write rolled back (or the UI's view of events is stale
// and the two diverge). Idempotent; safe to call multiple times.
//
// `balance` = Σ event.amount for all events.
// `lifetime` = Σ event.amount for events where amount > 0 (monotonic).
//
// IMPORTANT: this is non-destructive. If `listPointsEvents` returns an
// empty list (which can happen when Firestore rules block the query, even
// though the balance doc itself has real points), we DO NOT overwrite the
// existing balance with 0. We just return what's already on the doc.
export async function reconcileBalance(uid: string): Promise<PointsBalance> {
  if (!db || !uid) return DEFAULT_POINTS_BALANCE;
  const events = await listPointsEvents(uid, 500);
  if (events.length === 0) {
    return getMemberPoints(uid);
  }
  let balance = 0;
  let lifetime = 0;
  for (const ev of events) {
    const n = Number(ev.amount) || 0;
    balance += n;
    if (n > 0) lifetime += n;
  }
  try {
    const { setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(
      doc(db, 'memberPoints', uid),
      { balance, lifetime, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch (e) {
    console.warn('[points] reconcileBalance write failed', e);
  }
  return { balance, lifetime };
}

// Admin helper — list all pending redemptions.
export async function listAllRewardRedemptions(): Promise<RewardRedemption[]> {
  if (!db) return [];
  const q = query(collection(db, 'rewardRedemptions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardRedemption));
}

// Convenience kickers for the common event shapes. Keeps call sites tight.
export const points = {
  // New claim-once welcome bonus. Uses a distinct dedup key + kind so it
  // doesn't collide with legacy `welcome:{uid}` events written by the
  // old auto-grant path — accounts that saw the earlier 100-pt auto-grant
  // can still claim the 50-pt welcome button once.
  welcomeBonus:       (uid: string) =>
    awardPoints(uid, 'welcome-claim', 50, `welcome-claim:${uid}`),
  quizCompleted:      (uid: string) =>
    awardPoints(uid, 'quiz', 5, `quiz:${uid}`),
  newsletterSigned:   (uid: string, source?: string) =>
    awardPoints(uid, 'newsletter', 5, `newsletter:${uid}`, { source }),
  orderPlaced:        (uid: string, orderId: string, itemCount: number) =>
    awardPoints(uid, 'order', 10 * Math.max(1, itemCount), `order:${orderId}`, { itemCount }),
  videoWatched:       (uid: string, videoId: string) =>
    awardPoints(uid, 'video', 3, `video:${videoId}:${uid}`, { videoId }),
  podcastListened:    (uid: string, episodeId: string) =>
    awardPoints(uid, 'podcast', 2, `podcast:${episodeId}:${uid}`, { episodeId }),
  navSectionVisited:  (uid: string, section: string) =>
    awardPoints(uid, 'nav', 1, `nav:${section}:${uid}`, { section }),
  shared:             (uid: string, target: string, platform: string) =>
    // Shares are intentionally *not* deduplicated beyond millisecond — each
    // share counts. This key will almost never collide in practice.
    awardPoints(uid, 'share', 2, `share:${target}:${platform}:${uid}:${Date.now()}`, { target, platform }),
  formationSubscribed:(uid: string, formationId: string) =>
    awardPoints(uid, 'formation', 50, `formation:${formationId}:${uid}`, { formationId }),
  origineSubscribed:  (uid: string) =>
    awardPoints(uid, 'origine', 100, `origine:${uid}`),
} as const;

// Manual admin adjustment — signed delta with a free-form note. Each
// adjustment gets its own event doc (dedup key includes the current ms
// timestamp) so Krystine can both credit and debit a member repeatedly
// without dedup collisions. The audit trail lives in `pointsEvents`.
export async function adjustPoints(uid: string, delta: number, note?: string) {
  const key = `adjust:${uid}:${Date.now()}`;
  return awardPoints(uid, 'adjust', delta, key, note ? { note } : undefined);
}
