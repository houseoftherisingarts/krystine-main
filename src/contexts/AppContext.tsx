import { getLang, setLang as persistLang } from '../lib/i18n/lang';
import app from '../firebase';
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAuth, type User } from 'firebase/auth';
import { subscribeToAuthState, isAdminUser, handleRedirectResult } from '../firebase/auth';
import {
  subscribeToMember, updateMember, type MemberDoc,
  subscribeToBoutiqueSettings, DEFAULT_BOUTIQUE_SETTINGS, type BoutiqueSettings,
} from '../firebase/firestore';

// ───────────────────────────────────────────────────────────────────────────
// Types shared across slices
// ───────────────────────────────────────────────────────────────────────────

export type Lang = 'FR' | 'EN';
export type Theme = 'light' | 'dark';

export interface CartItem {
  id?: number | string;
  variantId?: string;
  title?: string;
  name?: string;
  price?: string;
  priceAmount?: string;
  priceCurrency?: string;
  type?: string;
  image?: string;
  cover?: string;
}

// Slice context shapes — consumers can import one narrow hook and re-render
// only when THAT slice changes, not on any unrelated state churn.
interface UIContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  audioPlaying: boolean;
  toggleAudio: () => void;
  /** Remplace la musique d'ambiance (null = la musique de base). */
  setAudioUrl: (url: string | null, opts?: { jouer?: boolean }) => void;
}

interface AuthContextType {
  user: User | null;
  member: MemberDoc | null;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem, e?: React.MouseEvent) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cartTotal: string;
}

// Boutique redirect switch — when enabled, every new-boutique link points at
// Krystine's legacy inspiratanature.com instead. Exposed via its own slice so
// any boutique CTA on the site re-renders when Krystine flips the toggle from
// /admin without needing a full reload.
interface BoutiqueContextType {
  redirectEnabled: boolean;
  redirectUrl: string;
  /**
   * Set of Shopify product handles Krystine has hidden from the public
   * boutique via Admin → Boutique. Callers filter the Shopify catalog
   * before display.
   */
  hiddenProducts: Set<string>;
  loading: boolean;
  /**
   * Returns `{ href, external }` for a boutique target. When the redirect
   * switch is ON, every boutique-ish href collapses to the legacy URL and
   * `external` becomes true — callers use that to decide <Link> vs <a>.
   */
  resolveHref: (href: string) => { href: string; external: boolean };
}

// Legacy combined shape — kept so existing useApp() consumers continue to work.
// New code should prefer useUI() / useAuth() / useCart() / useBoutique() for
// tighter re-render scope.
export type AppContextType = UIContextType & AuthContextType & CartContextType & BoutiqueContextType;

const UIContext = createContext<UIContextType | null>(null);
const AuthContext = createContext<AuthContextType | null>(null);
const CartContext = createContext<CartContextType | null>(null);
const BoutiqueContext = createContext<BoutiqueContextType | null>(null);

const AUDIO_URL = 'https://storage.googleapis.com/inspirata/Base%20site/homecoming-tranquilium-main-version-25793-03-28.mp3';

// ───────────────────────────────────────────────────────────────────────────
// Slice providers
// ───────────────────────────────────────────────────────────────────────────

// À la connexion, le site s'ouvre dans la langue du compte. Une fois par
// session : si la personne change ensuite de langue, le compte suit (setLang).
function appliquerLangueDuCompte(m: MemberDoc | null) {
  if (!m?.lang || (m.lang !== 'fr' && m.lang !== 'en')) return;
  try {
    if (sessionStorage.getItem('langue-compte-appliquee') === '1') return;
    sessionStorage.setItem('langue-compte-appliquee', '1');
  } catch { return; }
  if (m.lang !== getLang()) persistLang(m.lang);
}

const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang] = useState<Lang>(() => getLang() === 'en' ? 'EN' : 'FR');
  // Changer la langue du site, c'est aussi changer celle du compte connecté
  // (et donc de ses infolettres, voir la fonction membreLangue). Le compte
  // s'écrit avant le rechargement de la page.
  const setLang = useCallback((l: Lang) => {
    if (l === lang) return;
    const code = l === 'EN' ? 'en' : 'fr';
    const u = app ? getAuth(app).currentUser : null;
    const ecrire = u ? updateMember(u.uid, { lang: code }).catch(() => {}) : Promise.resolve();
    ecrire.finally(() => persistLang(code));
  }, [lang]);
  const [theme, setTheme] = useState<Theme>('light');
  // Un seul lecteur pour tout le site, gardé dans une ref. L'état « joue »
  // vient des événements du lecteur lui-même (play, pause, ended), jamais
  // d'une supposition : le bouton reflète toujours ce qui sort des
  // haut-parleurs. Choisir une piste la fait jouer tout de suite.
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof Audio !== 'undefined') {
    const a = new Audio(AUDIO_URL);
    a.loop = true; a.preload = 'auto'; a.volume = 0.4;
    audioRef.current = a;
  }
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const sync = () => setAudioPlaying(!a.paused && !a.ended);
    a.addEventListener('play', sync); a.addEventListener('playing', sync); a.addEventListener('pause', sync); a.addEventListener('ended', sync);
    return () => { a.removeEventListener('play', sync); a.removeEventListener('playing', sync); a.removeEventListener('pause', sync); a.removeEventListener('ended', sync); a.pause(); };
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  // Changer de piste. `jouer: true` quand c'est un choix de la personne (le
  // geste autorise la lecture) : la nouvelle piste joue tout de suite. Sans
  // `jouer`, la piste change en silence, sauf si la musique jouait déjà.
  // `null` ramène la musique par défaut du site.
  const setAudioUrl = useCallback((url: string | null, opts?: { jouer?: boolean }) => {
    const a = audioRef.current;
    if (!a) return;
    const jouait = !a.paused;
    const next = new URL(url || AUDIO_URL, window.location.href).href;
    if (a.src !== next) { a.src = next; a.load(); }
    if (opts?.jouer || jouait) { a.volume = 0.4; a.play().catch(() => setAudioPlaying(false)); }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const toggleAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.volume = 0.4; a.play().catch(() => setAudioPlaying(false)); }
    else a.pause();
  }, []);

  const value = useMemo<UIContextType>(() => ({
    lang, setLang, theme, setTheme, toggleTheme, audioPlaying, toggleAudio, setAudioUrl,
  }), [lang, theme, toggleTheme, audioPlaying, toggleAudio, setAudioUrl]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberDoc | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    // Dev-only: when `localStorage.__devAdmin === '1'`, flip admin true
    // without requiring a real Firebase sign-in. Production is untouched.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      try { if (localStorage.getItem('__devAdmin') === '1') setIsAdmin(true); } catch { /* noop */ }
    }
    // Capture any pending redirect-back from `signInWithRedirect` (the
    // fallback path used when popup auth is blocked). No-op when nothing is
    // pending. Fires before the auth subscription so the bootstrap runs
    // before downstream effects react to the new user.
    handleRedirectResult().catch(() => { /* logged in helper */ });
    const unsub = subscribeToAuthState(u => {
      setUser(u);
      setIsAdmin(isAdminUser(u));
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Les administratrices suivent aussi leur fiche : leur espace client
    // (bannière, skin, boutique) lit les mêmes champs que celui des membres.
    if (!user) { setMember(null); return; }
    const unsub = subscribeToMember(user.uid, m => { setMember(m); appliquerLangueDuCompte(m); });
    return unsub;
  }, [user]);

  const value = useMemo<AuthContextType>(() => ({
    user, member, isAdmin, setIsAdmin, signInOpen, setSignInOpen,
  }), [user, member, isAdmin, signInOpen]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback((item: CartItem, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCartItems(prev => [...prev, item]);
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCartItems(prev => { const n = [...prev]; n.splice(index, 1); return n; });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartTotal = useMemo(() => cartItems.reduce((acc, item) => {
    if (item.priceAmount) return acc + parseFloat(item.priceAmount);
    const raw = item.price || '';
    // Handle fr-CA ("29,99 $") and en-CA ("$29.99") — keep digits, decimal point/comma, minus.
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    const decimalIdx = Math.max(lastComma, lastDot);
    let numeric: string;
    if (decimalIdx === -1) {
      numeric = raw.replace(/[^\d-]/g, '');
    } else {
      const intPart = raw.slice(0, decimalIdx).replace(/[^\d-]/g, '');
      const fracPart = raw.slice(decimalIdx + 1).replace(/[^\d]/g, '');
      numeric = `${intPart}.${fracPart}`;
    }
    const n = parseFloat(numeric);
    return acc + (isNaN(n) ? 0 : n);
  }, 0).toFixed(2), [cartItems]);

  const value = useMemo<CartContextType>(() => ({
    cartItems, addToCart, removeFromCart, clearCart, cartOpen, setCartOpen, cartTotal,
  }), [cartItems, addToCart, removeFromCart, clearCart, cartOpen, cartTotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

const BoutiqueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BoutiqueSettings>(DEFAULT_BOUTIQUE_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToBoutiqueSettings(s => {
      setSettings(s);
      setLoading(false);
    });
    return unsub;
  }, []);

  // La redirection de la boutique ne touche QUE la boutique. Avant le 6
  // septembre 2026, elle avalait tout lien passé ici (Origine, Formations,
  // Médias) et envoyait toute la barre de navigation vers l'ancien site.
  const resolveHref = useCallback<BoutiqueContextType['resolveHref']>((href) => {
    const estBoutique = href === '/boutique' || href.startsWith('/boutique/') || href.startsWith('/boutique?') || href.startsWith('/boutique#');
    if (estBoutique && settings.redirectEnabled && settings.redirectUrl) {
      return { href: settings.redirectUrl, external: true };
    }
    return { href, external: false };
  }, [settings.redirectEnabled, settings.redirectUrl]);

  const hiddenProducts = useMemo(
    () => new Set(settings.hiddenProducts || []),
    [settings.hiddenProducts],
  );

  const value = useMemo<BoutiqueContextType>(() => ({
    redirectEnabled: settings.redirectEnabled,
    redirectUrl: settings.redirectUrl,
    hiddenProducts,
    loading,
    resolveHref,
  }), [settings.redirectEnabled, settings.redirectUrl, hiddenProducts, loading, resolveHref]);

  return <BoutiqueContext.Provider value={value}>{children}</BoutiqueContext.Provider>;
};

// ───────────────────────────────────────────────────────────────────────────
// Root provider + hooks
// ───────────────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UIProvider>
    <AuthProvider>
      <CartProvider>
        <BoutiqueProvider>{children}</BoutiqueProvider>
      </CartProvider>
    </AuthProvider>
  </UIProvider>
);

export const useUI = (): UIContextType => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside AppProvider');
  return ctx;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AppProvider');
  return ctx;
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside AppProvider');
  return ctx;
};

export const useBoutique = (): BoutiqueContextType => {
  const ctx = useContext(BoutiqueContext);
  if (!ctx) throw new Error('useBoutique must be used inside AppProvider');
  return ctx;
};

// Legacy combined hook. Subscribes to all four slices — prefer the narrower
// hooks above for any new or frequently-rendered component.
export const useApp = (): AppContextType => {
  const ui = useUI();
  const auth = useAuth();
  const cart = useCart();
  const boutique = useBoutique();
  return { ...ui, ...auth, ...cart, ...boutique };
};
