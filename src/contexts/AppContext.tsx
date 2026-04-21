import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthState, isAdminUser } from '../firebase/auth';
import { subscribeToMember, type MemberDoc } from '../firebase/firestore';

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

// Legacy combined shape — kept so existing useApp() consumers continue to work.
// New code should prefer useUI() / useAuth() / useCart() for tighter re-render scope.
export type AppContextType = UIContextType & AuthContextType & CartContextType;

const UIContext = createContext<UIContextType | null>(null);
const AuthContext = createContext<AuthContextType | null>(null);
const CartContext = createContext<CartContextType | null>(null);

const AUDIO_URL = 'https://storage.googleapis.com/inspirata/Base%20site/homecoming-tranquilium-main-version-25793-03-28.mp3';

// ───────────────────────────────────────────────────────────────────────────
// Slice providers
// ───────────────────────────────────────────────────────────────────────────

const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('FR');
  const [theme, setTheme] = useState<Theme>('light');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const audio = new Audio(AUDIO_URL);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.volume = 0.4;
      audio.play().catch(() => {});
      setAudioPlaying(true);
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  }, []);

  const value = useMemo<UIContextType>(() => ({
    lang, setLang, theme, setTheme, toggleTheme, audioPlaying, toggleAudio,
  }), [lang, theme, toggleTheme, audioPlaying, toggleAudio]);

  return (
    <UIContext.Provider value={value}>
      <audio ref={audioRef} src={AUDIO_URL} loop preload="auto" style={{ display: 'none' }} />
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
    const unsub = subscribeToAuthState(u => {
      setUser(u);
      setIsAdmin(isAdminUser(u));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || isAdminUser(user)) { setMember(null); return; }
    const unsub = subscribeToMember(user.uid, setMember);
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

// ───────────────────────────────────────────────────────────────────────────
// Root provider + hooks
// ───────────────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UIProvider>
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
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

// Legacy combined hook. Subscribes to all three slices — prefer the narrower
// hooks above for any new or frequently-rendered component.
export const useApp = (): AppContextType => {
  const ui = useUI();
  const auth = useAuth();
  const cart = useCart();
  return { ...ui, ...auth, ...cart };
};
