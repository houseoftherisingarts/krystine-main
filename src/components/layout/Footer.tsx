import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useApp, useBoutique } from '../../contexts/AppContext';
import { CONTENT, ASSETS } from '../../content';
import { isStaticRoute } from '../../lib/staticRoutes';

// Renders the right tag for a footer link:
// - plain <a> for statically hosted bundles (/origine, /podcast, /vata)
// - plain <a> when Krystine's boutique-redirect switch re-routes /boutique
// - React Router <Link> for everything else (in-app SPA routes).
const NavLink: React.FC<{ href: string; className?: string; children: React.ReactNode }> = ({ href, className, children }) => {
  const { resolveHref } = useBoutique();
  const resolved = href.startsWith('/boutique') ? resolveHref(href) : { href, external: false };
  if (resolved.external) return <a href={resolved.href} className={className}>{children}</a>;
  if (isStaticRoute(resolved.href)) return <a href={resolved.href} className={className}>{children}</a>;
  return <Link to={resolved.href} className={className}>{children}</Link>;
};

const Footer: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang];
  const nav = t.nav;
  const foot = t.footer;

  // Parallax on the Jacques-Cartier backdrop. Tracks the footer's position
  // through the viewport; the image drifts ~40% of the footer's height in the
  // opposite direction of scroll while the footer passes. The over-sized
  // -inset-y on the image div gives the translation room to move without
  // revealing any edge. Disabled when the user prefers reduced motion.
  const reduce = useReducedMotion() ?? false;
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ['start end', 'end start'],
  });
  const mountainY = useTransform(scrollYProgress, [0, 1], ['-35%', '35%']);

  const links = [
    { href: '/krystine', label: nav.krystine },
    { href: '/medias', label: nav.medias },
    { href: '/formations', label: nav.formations },
    { href: '/boutique', label: nav.boutique },
    { href: '/blogue', label: nav.blogue },
    { href: '/points-de-vente', label: nav.pointsDeVente },
    { href: '/conferenciere', label: nav.conferenciere },
  ];

  const programmes = [
    { href: '/origine', label: nav.origine },
    { href: '/vata', label: nav.vata },
    { href: '/podcast', label: nav.podcast },
  ];

  return (
    <footer ref={footerRef} className="relative text-white/60 pt-28 md:pt-36 pb-10 mt-auto overflow-hidden md:min-h-[60vh]">
      {/* Jacques-Cartier National Park backdrop — full-bleed horizontal
          landscape behind the footer's navy tint. The div is stretched
          beyond its bounds on the Y axis so the parallax translate can move
          without exposing the edges. */}
      <motion.div
        className="absolute -inset-y-[40%] inset-x-0 bg-cover bg-center bg-no-repeat pointer-events-none will-change-transform"
        style={reduce
          ? { backgroundImage: `url(${ASSETS.footerBg})` }
          : { backgroundImage: `url(${ASSETS.footerBg})`, y: mountainY }}
        aria-hidden
      />
      {/* Single semi-transparent navy layer — same #050C1A as before, just at
          85% opacity so the mountain silhouette shows through while copy
          contrast stays WCAG-AA. */}
      <div
        className="absolute inset-0 bg-[#050C1A]/85 pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 pb-16 border-b border-white/10">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img
              src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png"
              alt="Krystine St-Laurent"
              className="h-16 w-auto mb-6 opacity-90"
              style={{ filter: 'invert(1) brightness(1.5)' }}
            />
            <p className="text-xs text-white/40 leading-relaxed">
              {lang === 'FR'
                ? 'Sagesse Ayurvédique pour une vie consciente.'
                : 'Ayurvedic wisdom for conscious living.'}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">{lang === 'FR' ? 'Navigation' : 'Navigation'}</h4>
            <ul className="space-y-3">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className="text-xs hover:text-[#D4AF37] transition-colors uppercase tracking-wide">{label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Programmes */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">{nav.formations}</h4>
            <ul className="space-y-3">
              {programmes.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className="text-xs hover:text-[#D4AF37] transition-colors uppercase tracking-wide">{label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">{foot.contact}</h4>
            <ul className="space-y-3 text-xs">
              <li><a href="mailto:equipe@inspiratanature.com" className="hover:text-[#D4AF37] transition-colors">equipe@inspiratanature.com</a></li>
              <li><a href="https://www.instagram.com/krystinesaintlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"><i className="fa-brands fa-instagram" /> Instagram</a></li>
              <li><a href="https://www.facebook.com/Krystinestlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"><i className="fa-brands fa-facebook" /> Facebook</a></li>
              <li><a href="https://www.youtube.com/@KrystineStLaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"><i className="fa-brands fa-youtube" /> YouTube</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-white/30">
          <p>© {new Date().getFullYear()} Krystine St-Laurent. {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <Link to="/politique-de-confidentialite" className="hover:text-[#D4AF37] transition-colors">{foot.privacy}</Link>
            <Link to="/admin" className="hover:text-[#D4AF37]/50 transition-colors opacity-40">{lang === 'FR' ? 'Admin' : 'Admin'}</Link>
          </div>
          <a href="https://www.lesalondesinconnus.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
            {foot.madeBy} <span className="font-semibold">Le Salon des Inconnus</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
