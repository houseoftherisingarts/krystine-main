import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthState, isAdminUser } from '../firebase/auth';
import { subscribeToMember, type MemberDoc } from '../firebase/firestore';

export type Lang = 'FR' | 'EN';
export type Theme = 'light' | 'dark';

interface CartItem {
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

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  cartItems: CartItem[];
  addToCart: (item: CartItem, e?: React.MouseEvent) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cartTotal: string;
  user: User | null;
  member: MemberDoc | null;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
  audioPlaying: boolean;
  toggleAudio: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const AUDIO_URL = 'https://storage.googleapis.com/inspirata/Base%20site/homecoming-tranquilium-main-version-25793-03-28.mp3';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('FR');
  const [theme, setTheme] = useState<Theme>('light');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberDoc | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Auth subscription ──
  useEffect(() => {
    const unsub = subscribeToAuthState(u => {
      setUser(u);
      setIsAdmin(isAdminUser(u));
    });
    return unsub;
  }, []);

  // ─── Member profile subscription ──
  useEffect(() => {
    if (!user || isAdminUser(user)) { setMember(null); return; }
    const unsub = subscribeToMember(user.uid, setMember);
    return unsub;
  }, [user]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const audio = new Audio(AUDIO_URL);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    return () => { audio.pause(); };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addToCart = (item: CartItem, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCartItems(prev => [...prev, item]);
    setCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => { const n = [...prev]; n.splice(index, 1); return n; });
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = cartItems.reduce((acc, item) => {
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
  }, 0).toFixed(2);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
  };

  return (
    <AppContext.Provider value={{
      lang, setLang, theme, setTheme, toggleTheme,
      cartItems, addToCart, removeFromCart, clearCart, cartOpen, setCartOpen, cartTotal,
      user, member, isAdmin, setIsAdmin, signInOpen, setSignInOpen,
      audioPlaying, toggleAudio,
    }}>
      {/* Global audio element */}
      <audio ref={audioRef} src={AUDIO_URL} loop preload="auto" style={{ display: 'none' }} />
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
