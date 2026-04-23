import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  subscribeToOverrides,
  setTextOverride,
  setImageOverride,
  type OverridesDoc,
  type ImageOverride,
} from '../firebase/overrides';
import { useAuth } from './AppContext';

interface EditModeContextType {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  overrides: OverridesDoc;
  /** Read helper — returns the override if any, else the default. */
  getText: (key: string, fallback: string) => string;
  getImage: (key: string, fallbackUrl: string) => ImageOverride;
  /** Write helpers — persist to Firestore. */
  saveText: (key: string, value: string) => Promise<void>;
  saveImage: (key: string, payload: ImageOverride) => Promise<void>;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

const EMPTY: OverridesDoc = { text: {}, images: {} };

// Session-scoped flag. Survives SPA navigations AND full-page reloads
// (including the footer links to statically-bundled routes like /origine,
// /podcast, /vata, which reload the whole app), so Krystine stays in edit
// mode until she explicitly clicks "Terminer".
const STORAGE_KEY = 'inspirata.editMode';

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  const [editMode, setEditModeState] = useState(false);
  const [overrides, setOverrides] = useState<OverridesDoc>(EMPTY);

  // Stream overrides live so every visitor sees the latest edits without reload.
  useEffect(() => {
    const unsub = subscribeToOverrides(setOverrides);
    return unsub;
  }, []);

  // If the admin flag flips off, drop edit mode from local state. We do NOT
  // clear sessionStorage here because `isAdmin` starts as `false` on every
  // mount (including full reloads triggered by the footer links to
  // statically-hosted routes) and only flips `true` once Firebase auth
  // resolves asynchronously — clearing storage on that initial `false`
  // would race-wipe the persisted flag before the rehydration effect
  // below could read it. Storage is cleared only on explicit exit
  // (`setEditMode(false)`) via the bar.
  useEffect(() => {
    if (!isAdmin) setEditModeState(false);
  }, [isAdmin]);

  // Rehydrate from sessionStorage + honour the ?edit=1 entry point. Runs
  // whenever `isAdmin` flips to true — which on every page load means
  // "once Firebase has confirmed the user is still an admin" — so we
  // re-enter edit mode without the URL flag being present.
  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('edit') === '1';
    let fromSession = false;
    try { fromSession = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch { /* noop */ }
    if (fromUrl || fromSession) setEditModeState(true);
  }, [isAdmin]);

  const setEditMode = useCallback((v: boolean) => {
    if (v && !isAdmin) return;
    setEditModeState(v);
    // Mirror the flag to sessionStorage so it survives page reloads.
    try {
      if (v) sessionStorage.setItem(STORAGE_KEY, '1');
      else   sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* private mode / SSR — state still lives in memory for this tab */ }
  }, [isAdmin]);

  const getText = useCallback(
    (key: string, fallback: string) => overrides.text[key] ?? fallback,
    [overrides],
  );

  const getImage = useCallback(
    (key: string, fallbackUrl: string): ImageOverride => overrides.images[key] ?? { url: fallbackUrl },
    [overrides],
  );

  const saveText = useCallback(async (key: string, value: string) => {
    await setTextOverride(key, value);
  }, []);

  const saveImage = useCallback(async (key: string, payload: ImageOverride) => {
    await setImageOverride(key, payload);
  }, []);

  const value = useMemo<EditModeContextType>(() => ({
    editMode, setEditMode, overrides, getText, getImage, saveText, saveImage,
  }), [editMode, setEditMode, overrides, getText, getImage, saveText, saveImage]);

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
};

export const useEditMode = (): EditModeContextType => {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error('useEditMode must be used inside EditModeProvider');
  return ctx;
};
