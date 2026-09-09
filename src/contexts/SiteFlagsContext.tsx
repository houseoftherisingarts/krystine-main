// SiteFlagsContext — single source of truth for the visibility flags
// described in src/firebase/siteFlags.ts. Subscribes to Firestore on
// mount so any admin toggle updates the public site within a second.
// Falls back to DEFAULT_FLAGS while loading or when Firestore is
// unavailable, so the site never blocks on this read.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_FLAGS, subscribeToSiteFlags, type SiteFlags } from '../firebase/siteFlags';

// `pret` passe à true à la première réponse de Firestore : une page qui
// redirige selon un drapeau attend ce signal, sinon elle jugerait sur les
// valeurs par défaut pendant le chargement.
type SiteFlagsState = SiteFlags & { pret: boolean };

const SiteFlagsContext = createContext<SiteFlagsState>({ ...DEFAULT_FLAGS, pret: false });

export const SiteFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<SiteFlagsState>({ ...DEFAULT_FLAGS, pret: false });

  useEffect(() => {
    const unsub = subscribeToSiteFlags(f => setFlags({ ...f, pret: true }));
    return unsub;
  }, []);

  return <SiteFlagsContext.Provider value={flags}>{children}</SiteFlagsContext.Provider>;
};

export const useSiteFlags = (): SiteFlagsState => useContext(SiteFlagsContext);
