// SiteFlagsContext — single source of truth for the visibility flags
// described in src/firebase/siteFlags.ts. Subscribes to Firestore on
// mount so any admin toggle updates the public site within a second.
// Falls back to DEFAULT_FLAGS while loading or when Firestore is
// unavailable, so the site never blocks on this read.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_FLAGS, subscribeToSiteFlags, type SiteFlags } from '../firebase/siteFlags';

const SiteFlagsContext = createContext<SiteFlags>(DEFAULT_FLAGS);

export const SiteFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<SiteFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    const unsub = subscribeToSiteFlags(setFlags);
    return unsub;
  }, []);

  return <SiteFlagsContext.Provider value={flags}>{children}</SiteFlagsContext.Provider>;
};

export const useSiteFlags = (): SiteFlags => useContext(SiteFlagsContext);
