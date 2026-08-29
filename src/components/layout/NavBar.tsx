import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, Music, Moon, Sun, Menu, X } from 'lucide-react';
import { useUI, useAuth, useCart, useBoutique } from '../../contexts/AppContext';
import { ASSETS } from '../../content';

interface NavItem { href: string; labelFR: string; labelEN: string; }

// Condensed nav: Ayurveda/Livres/Quiz live under /medias, Événements under
// /formations. The 3 "doorways" map to the 3 banners on the home page.
const NAV: NavItem[] = [
  { href: '/krystine',    labelFR: 'Krystine St-Laurent',          labelEN: 'Krystine St-Laurent' },
  { href: '/origine',     labelFR: 'Expérience Origine',           labelEN: 'Origine Experience' },
  { href: '/formations',  labelFR: 'Formations',                   labelEN: 'Programs' },
  { href: '/medias',      labelFR: 'Podcasts, Médias & Livres',    labelEN: 'Podcasts, Media & Books' },
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
          ? 'bg-cream/90 dark:bg-espressoDeep/95 backdrop-blur-xl border-b border-brass/15 shadow-[0_6px_34px_rgba(58,49,38,0.10)]'
          : 'bg-cream/55 dark:bg-espressoDeep/70 backdrop-blur-xl border-b border-transparent'
      }`}
    >
      <div className="max-w-[1800px] mx-auto px-6 md:px-8 py-3.5 flex justify-between items-center gap-4">

        {/* Wordmark — Cormorant editorial wordmark, with logomark fallback */}
        <Link
          to="/?splash=1"
          title="Retour à l'écran d'accueil"
          className="flex items-center gap-3 flex-shrink-0 group min-h-[44px]"
        >
          {/* Le mot-symbole de l'accueil, repris tel quel : deux lignes serif
              en majuscules espacées. Un seul logo pour tout le site. */}
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif font-semibold uppercase text-ink dark:text-ctext text-[1.05rem] md:text-[1.18rem] leading-[1.05] tracking-[0.12em] transition-colors duration-300 group-hover:text-brassInk dark:group-hover:text-brassBright"
          >
            Krystine<br />St-Laurent
          </motion.span>
        </Link>

        {/* Desktop Links — Boutique rendered last as a filled brass pill to give
            the nav a single primary action (revenue-driving). */}
        <ul className="hidden xl:flex items-center gap-1 2xl:gap-2">
          {NAV.map((item, i) => {
            const active = isActive(item.href);
            const isPrimary = item.href === '/boutique';
            if (isPrimary) {
              const resolved = resolveHref(item.href);
              const btnClass = `group inline-flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-[10px] 2xl:text-[11px] uppercase tracking-[0.2em] font-sans font-semibold rounded-full transition-colors duration-300 min-h-[44px] ${
                active
                  ? 'bg-espressoSoft text-brassBright border border-brass'
                  : 'bg-brass text-espressoDeep border border-brass hover:bg-brassBright shadow-[0_6px_20px_rgba(187,154,94,0.30)]'
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
                      <ShoppingBag size={13} strokeWidth={2} />
                      {label(item)}
                    </a>
                  ) : (
                    <Link to={resolved.href} className={btnClass}>
                      <ShoppingBag size={13} strokeWidth={2} />
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
                  className={`group relative whitespace-nowrap px-3 2xl:px-4 py-2.5 text-[10px] 2xl:text-[11px] uppercase tracking-[0.15em] 2xl:tracking-[0.18em] font-sans font-medium transition-colors duration-300 ${
                    active ? 'text-brassInk dark:text-brassBright' : 'text-ink/80 dark:text-ctext/80 hover:text-brassInk dark:hover:text-brassBright'
                  }`}
                >
                  {label(item)}
                  {/* Animated brass underline */}
                  <span
                    className={`pointer-events-none absolute left-3 right-3 -bottom-0.5 h-px bg-brass transition-transform duration-300 ${
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
        <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
          <IconButton className="hidden sm:flex" onClick={toggleAudio} title={audioPlaying ? 'Pause' : 'Play'} ariaLabel={audioPlaying ? (lang === 'FR' ? 'Mettre la musique en pause' : 'Pause music') : (lang === 'FR' ? 'Jouer la musique' : 'Play music')}>
            {audioPlaying ? (
              <div className="flex gap-[2px] items-end h-3" aria-hidden>
                {[1, 1.4, 0.8].map((d, i) => (
                  <span key={i} className="w-[2px] bg-brass rounded-full animate-bounce motion-reduce:animate-none" style={{ height: i === 1 ? '12px' : '8px', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : <Music size={15} strokeWidth={1.75} />}
          </IconButton>

          <IconButton className="hidden sm:flex" onClick={toggleTheme} title={theme === 'light' ? 'Mode sombre' : 'Mode clair'} ariaLabel={theme === 'light' ? (lang === 'FR' ? 'Activer le mode sombre' : 'Switch to dark mode') : (lang === 'FR' ? 'Activer le mode clair' : 'Switch to light mode')}>
            {theme === 'light' ? <Moon size={16} strokeWidth={1.75} /> : <Sun size={16} strokeWidth={1.75} />}
          </IconButton>

          <IconButton onClick={() => setCartOpen(true)} title="Panier" ariaLabel={lang === 'FR' ? `Panier, ${cartItems.length} article${cartItems.length > 1 ? 's' : ''}` : `Cart, ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`}>
            <ShoppingBag size={17} strokeWidth={1.75} />
            {cartItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brass text-espressoDeep text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold tabular-nums">
                {cartItems.length}
              </span>
            )}
          </IconButton>

          {user ? (
            <Link
              to="/compte"
              title={member?.displayName || user.displayName || user.email || ''}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 min-h-[44px] rounded-full border border-ink/10 dark:border-ctext/10 hover:border-brass transition-colors"
            >
              {(member?.photoURL || user.photoURL) ? (
                <img src={member?.photoURL || user.photoURL!} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-brass/20 flex items-center justify-center text-[10px] font-bold text-brassInk">
                  {(user.email?.[0] || '?').toUpperCase()}
                </div>
              )}
              {member?.dosha && (
                <span className="text-[9px] uppercase tracking-[0.18em] text-brassInk dark:text-brassBright font-semibold capitalize hidden xl:inline">{member.dosha}</span>
              )}
            </Link>
          ) : (
            <button
              onClick={() => setSignInOpen(true)}
              title={lang === 'FR' ? 'Connexion' : 'Sign in'}
              className="hidden md:inline-flex items-center gap-2 pl-3 pr-4 py-2 min-h-[44px] rounded-full border border-ink/15 dark:border-ctext/15 text-[10px] uppercase tracking-[0.18em] font-sans font-semibold text-ink/75 dark:text-ctext/80 hover:text-brassInk dark:hover:text-brassBright hover:border-brass transition-colors"
            >
              <User size={13} strokeWidth={1.75} />
              {lang === 'FR' ? 'Connexion' : 'Sign in'}
            </button>
          )}
          {!user && (
            <button
              onClick={() => setSignInOpen(true)}
              title={lang === 'FR' ? 'Connexion' : 'Sign in'}
              aria-label={lang === 'FR' ? 'Connexion' : 'Sign in'}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-full text-ink/70 dark:text-ctext/70 hover:text-brassInk dark:hover:text-brassBright hover:bg-brass/8 transition-colors"
            >
              <User size={16} strokeWidth={1.75} />
            </button>
          )}

          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={langOpen}
              aria-label={lang === 'FR' ? 'Changer de langue' : 'Change language'}
              className="min-h-[44px] text-[10px] uppercase tracking-[0.18em] font-sans font-semibold text-ink/75 dark:text-ctext/80 hover:text-brassInk dark:hover:text-brassBright border border-ink/10 dark:border-ctext/10 hover:border-brass px-3 py-2 rounded-full transition-colors"
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
                  role="menu"
                  className="absolute top-full right-0 mt-2 bg-card dark:bg-espressoSoft rounded-xl shadow-xl border border-brass/15 flex flex-col w-20 py-2 z-50"
                >
                  {(['FR', 'EN'] as const).map(l => (
                    <button key={l} role="menuitem" onClick={() => { setLang(l); setLangOpen(false); }}
                      className={`px-4 py-2 text-left text-xs font-sans hover:bg-brass/8 transition-colors ${lang === l ? 'font-bold text-brassInk dark:text-brassBright' : 'text-ink dark:text-ctext'}`}
                    >{l}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? (lang === 'FR' ? 'Fermer le menu' : 'Close menu') : (lang === 'FR' ? 'Ouvrir le menu' : 'Open menu')}
            aria-expanded={menuOpen}
            className="xl:hidden w-11 h-11 flex items-center justify-center rounded-full text-ink/80 dark:text-ctext/80 hover:text-brassInk dark:hover:text-brassBright hover:bg-brass/8 transition-colors"
          >
            {menuOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
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
            className="xl:hidden overflow-hidden border-t border-brass/12"
          >
            <div className="bg-cream/97 dark:bg-espressoDeep/98 backdrop-blur-xl px-6 py-4 flex flex-col">
              {NAV.map((item, i) => {
                const resolved = resolveHref(item.href);
                const cls = `block py-3.5 min-h-[44px] text-sm font-sans font-semibold uppercase tracking-[0.15em] border-b border-ink/5 dark:border-ctext/5 transition-colors ${
                  isActive(item.href) ? 'text-brassInk dark:text-brassBright' : 'text-ink dark:text-ctext hover:text-brassInk dark:hover:text-brassBright'
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

const IconButton: React.FC<{ onClick: () => void; title: string; ariaLabel?: string; className?: string; children: React.ReactNode }> = ({ onClick, title, ariaLabel, className = '', children }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={ariaLabel ?? title}
    className={`relative w-11 h-11 flex items-center justify-center rounded-full text-ink/70 dark:text-ctext/70 hover:text-brassInk dark:hover:text-brassBright hover:bg-brass/8 transition-colors ${className}`}
  >
    {children}
  </button>
);

export default NavBar;
