import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI, useAuth, useCart, useBoutique } from '../../contexts/AppContext';
import { ASSETS } from '../../content';

interface NavItem { href: string; labelFR: string; labelEN: string; }

// Condensed nav: Ayurveda/Livres/Quiz live under /medias, Événements under
// /formations. The 3 "doorways" map to the 3 banners on the home page.
const NAV: NavItem[] = [
  { href: '/krystine',    labelFR: 'Krystine St-Laurent',          labelEN: 'Krystine St-Laurent' },
  { href: '/medias',      labelFR: 'Podcasts, Médias & Livres',    labelEN: 'Podcasts, Media & Books' },
  { href: '/formations',  labelFR: 'Formations',                   labelEN: 'Programs' },
  { href: '/boutique',    labelFR: 'Boutique Inspirata',           labelEN: 'Inspirata Shop' },
];

const NavBar: React.FC = () => {
  const { lang, setLang, theme, toggleTheme, audioPlaying, toggleAudio } = useUI();
  const { user, member, setSignInOpen } = useAuth();
  const { cartItems, setCartOpen } = useCart();
  const { resolveHref } = useBoutique();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setLangOpen(false); }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href;
  const label = (i: NavItem) => lang === 'EN' ? i.labelEN : i.labelFR;

  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 w-full z-40 transition-[background,border,box-shadow] duration-500 ${
        scrolled
          ? 'bg-white/85 dark:bg-[#2E1A14]/95 backdrop-blur-xl border-b border-[#B8532F]/15 shadow-[0_4px_30px_rgba(58,37,30,0.08)]'
          : 'bg-white/60 dark:bg-[#2E1A14]/70 backdrop-blur-xl border-b border-transparent'
      }`}
    >
      <div className="max-w-[1800px] mx-auto px-6 py-3 flex justify-between items-center gap-4">

        {/* Logo */}
        <Link to="/?splash=1" title="Retour à l'écran d'accueil" className="block flex-shrink-0 group">
          <motion.img
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            src={ASSETS.navLogo}
            alt="Krystine St-Laurent"
            className="h-10 md:h-12 w-auto transition-all duration-300 group-hover:opacity-75 dark:invert dark:brightness-[1.5]"
          />
        </Link>

        {/* Desktop Links — Boutique rendered last as a filled CTA to give the
            nav a single primary action (revenue-driving). */}
        <ul className="hidden xl:flex items-center gap-0.5 2xl:gap-2">
          {NAV.map((item, i) => {
            const active = isActive(item.href);
            const isPrimary = item.href === '/boutique';
            if (isPrimary) {
              const resolved = resolveHref(item.href);
              const btnClass = `inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 text-[10px] 2xl:text-[11px] uppercase tracking-[0.2em] font-bold rounded-full transition-all duration-300 ${
                active
                  ? 'bg-[#3A251E] text-[#B8532F] border border-[#B8532F]'
                  : 'bg-[#B8532F] text-[#3A251E] border border-[#B8532F] hover:bg-[#3A251E] hover:text-[#B8532F] shadow-[0_4px_18px_rgba(184,83,47,0.25)]'
              }`;
              return (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + i * 0.04, ease: 'easeOut' }}
                  className="ml-2"
                >
                  {resolved.external ? (
                    <a href={resolved.href} className={btnClass}>
                      <i className="fa-solid fa-basket-shopping text-[10px]" />
                      {label(item)}
                    </a>
                  ) : (
                    <Link to={resolved.href} className={btnClass}>
                      <i className="fa-solid fa-basket-shopping text-[10px]" />
                      {label(item)}
                    </Link>
                  )}
                </motion.li>
              );
            }
            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 + i * 0.04, ease: 'easeOut' }}
              >
                <Link
                  to={item.href}
                  className={`relative whitespace-nowrap px-2.5 2xl:px-3 py-2 text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] 2xl:tracking-[0.2em] font-semibold transition-colors duration-300 ${
                    active ? 'text-[#B8532F]' : 'text-[#3A251E] dark:text-white/85 hover:text-[#B8532F]'
                  }`}
                >
                  {label(item)}
                  {/* Animated underline */}
                  <span
                    className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-px bg-[#B8532F] origin-center transition-transform duration-300 ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                    style={{ transformOrigin: 'center' }}
                  />
                </Link>
              </motion.li>
            );
          })}
        </ul>

        {/* Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <IconButton onClick={toggleAudio} title={audioPlaying ? 'Pause' : 'Play'}>
            {audioPlaying ? (
              <div className="flex gap-[2px] items-end h-3">
                {[1, 1.4, 0.8].map((d, i) => (
                  <span key={i} className="w-[2px] bg-[#B8532F] rounded-full animate-bounce" style={{ height: i === 1 ? '12px' : '8px', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : <i className="fa-solid fa-music text-[12px]" />}
          </IconButton>

          <IconButton onClick={toggleTheme} title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}>
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-[13px]`} />
          </IconButton>

          <IconButton onClick={() => setCartOpen(true)} title="Panier">
            <i className="fa-solid fa-shopping-bag text-[14px]" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#B8532F] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {cartItems.length}
              </span>
            )}
          </IconButton>

          {user ? (
            <Link
              to="/compte"
              title={member?.displayName || user.displayName || user.email || ''}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border border-[#3A251E]/10 dark:border-white/10 hover:border-[#B8532F] transition-colors"
            >
              {(member?.photoURL || user.photoURL) ? (
                <img src={member?.photoURL || user.photoURL!} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#B8532F]/20 flex items-center justify-center text-[10px] font-bold text-[#B8532F]">
                  {(user.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              {member?.dosha && (
                <span className="text-[9px] uppercase tracking-widest text-[#B8532F] font-bold capitalize hidden xl:inline">{member.dosha}</span>
              )}
            </Link>
          ) : (
            <button
              onClick={() => setSignInOpen(true)}
              title={lang === 'FR' ? 'Connexion' : 'Sign in'}
              className="hidden md:inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border border-[#3A251E]/15 dark:border-white/15 text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A251E]/80 dark:text-white/80 hover:text-[#B8532F] hover:border-[#B8532F] transition-colors"
            >
              <i className="fa-solid fa-user text-[11px]" />
              {lang === 'FR' ? 'Connexion' : 'Sign in'}
            </button>
          )}
          {!user && (
            <button
              onClick={() => setSignInOpen(true)}
              title={lang === 'FR' ? 'Connexion' : 'Sign in'}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[#3A251E]/70 dark:text-white/70 hover:text-[#B8532F] hover:bg-[#B8532F]/5 transition-colors"
            >
              <i className="fa-solid fa-user text-[13px]" />
            </button>
          )}

          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(v => !v)}
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A251E]/80 dark:text-white/80 hover:text-[#B8532F] border border-[#3A251E]/10 dark:border-white/10 px-2.5 py-1 rounded-full"
            >
              {lang}
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 bg-white dark:bg-[#4A3228] rounded-xl shadow-xl border border-[#3A251E]/5 flex flex-col w-20 py-2 z-50"
                >
                  {(['FR', 'EN'] as const).map(l => (
                    <button key={l} onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`px-4 py-2 text-left text-xs hover:bg-[#3A251E]/5 transition-colors ${lang === l ? 'font-bold text-[#B8532F]' : 'text-[#3A251E] dark:text-white'}`}
                    >{l}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hamburger (mobile) */}
          <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5">
            <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden border-t border-[#B8532F]/10"
          >
            <div className="bg-white/95 dark:bg-[#2E1A14]/98 backdrop-blur-xl px-6 py-4 flex flex-col">
              {NAV.map((item, i) => {
                const resolved = resolveHref(item.href);
                const cls = `block py-3 text-sm font-semibold uppercase tracking-widest border-b border-[#3A251E]/5 dark:border-white/5 transition-colors ${
                  isActive(item.href) ? 'text-[#B8532F]' : 'text-[#3A251E] dark:text-white hover:text-[#B8532F]'
                }`;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {resolved.external
                      ? <a href={resolved.href} className={cls}>{label(item)}</a>
                      : <Link to={resolved.href} className={cls}>{label(item)}</Link>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const IconButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className="relative w-9 h-9 flex items-center justify-center rounded-full text-[#3A251E]/70 dark:text-white/70 hover:text-[#B8532F] hover:bg-[#B8532F]/5 transition-colors"
  >
    {children}
  </button>
);

export default NavBar;
