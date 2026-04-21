import { db } from '../firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';

// Each overridable surface on the site is keyed by a stable string. Using a
// single "singleton" doc keeps reads cheap and write-traffic predictable.
// Text overrides are a flat { key: string }. Image overrides carry the url
// plus a focal point (0..1 range) used by EditableImage to recenter the
// picture without cropping.
const DOC_ID = 'singleton';

export interface ImageOverride {
  url: string;
  focalX?: number; // 0..1 — horizontal focal point (default 0.5)
  focalY?: number; // 0..1 — vertical focal point (default 0.5)
}

export interface OverridesDoc {
  text: Record<string, string>;
  images: Record<string, ImageOverride>;
}

const EMPTY: OverridesDoc = { text: {}, images: {} };

export function subscribeToOverrides(cb: (data: OverridesDoc) => void): Unsubscribe {
  if (!db) { cb(EMPTY); return () => {}; }
  const ref = doc(db, 'siteOverrides', DOC_ID);
  return onSnapshot(
    ref,
    snap => {
      if (!snap.exists()) { cb(EMPTY); return; }
      const data = snap.data() as Partial<OverridesDoc>;
      cb({
        text: data.text || {},
        images: data.images || {},
      });
    },
    () => cb(EMPTY),
  );
}

export async function setTextOverride(key: string, value: string): Promise<void> {
  if (!db) throw new Error('[Overrides] Firebase not configured');
  const ref = doc(db, 'siteOverrides', DOC_ID);
  // Dot-path merge so we only touch the single field we're editing.
  await setDoc(ref, { text: { [key]: value } }, { merge: true });
}

export async function setImageOverride(key: string, payload: ImageOverride): Promise<void> {
  if (!db) throw new Error('[Overrides] Firebase not configured');
  const ref = doc(db, 'siteOverrides', DOC_ID);
  await setDoc(ref, { images: { [key]: payload } }, { merge: true });
}
