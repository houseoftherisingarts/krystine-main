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

export const EditModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  const [editMode, setEditModeState] = useState(false);
  const [overrides, setOverrides] = useState<OverridesDoc>(EMPTY);

  // Stream overrides live so every visitor sees the latest edits without reload.
  useEffect(() => {
    const unsub = subscribeToOverrides(setOverrides);
    return unsub;
  }, []);

  // If the admin flag ever flips off (sign-out, session expiry), force-exit edit mode.
  useEffect(() => { if (!isAdmin) setEditModeState(false); }, [isAdmin]);

  // Auto-enable edit mode when Krystine lands with ?edit=1 (coming from the
  // "Modifier le site" shortcut in the admin dashboard).
  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === '1') setEditModeState(true);
  }, [isAdmin]);

  const setEditMode = useCallback((v: boolean) => {
    if (v && !isAdmin) return;
    setEditModeState(v);
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
