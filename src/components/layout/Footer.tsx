import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useApp, useBoutique } from '../../contexts/AppContext';
import { CONTENT, ASSETS } from '../../content';
import { isStaticRoute } from '../../lib/staticRoutes';
import SalonContactCard from '../SalonContactCard';
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
  // Salon contact card — opens in place of the previous outbound link to
  // www.lesalondesinconnus.com so curious visitors can reach Alex (or
  // submit the website-needs form) without leaving the site.
  const [salonOpen, setSalonOpen] = useState(false);

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
    <footer ref={footerRef} className="relative font-sans text-ctextSoft pt-28 md:pt-36 pb-10 mt-auto overflow-hidden md:min-h-[60vh]">
      {/* Jacques-Cartier National Park backdrop — full-bleed horizontal
          landscape behind the footer's espresso tint. The div is stretched
          beyond its bounds on the Y axis so the parallax translate can move
          without exposing the edges. */}
      <motion.div
        className="absolute -inset-y-[40%] inset-x-0 bg-cover bg-center bg-no-repeat pointer-events-none will-change-transform"
        style={reduce
          ? { backgroundImage: `url(${ASSETS.footerBg})` }
          : { backgroundImage: `url(${ASSETS.footerBg})`, y: mountainY }}
        aria-hidden
      />
      {/* Espresso wash over the mountain silhouette — espressoDeep at 88% so the
          landscape shows through while copy contrast stays WCAG-AA. A subtle
          top-down gradient deepens the brand colour where the type sits. */}
      <div
        className="absolute inset-0 bg-espressoDeep/88 pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-espressoDeep/40 via-transparent to-espressoDeep/60"
        aria-hidden
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 pb-16 border-b border-brass/15">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img
              src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png"
              alt=""
              aria-hidden
              className="h-14 w-auto mb-5 opacity-90"
              style={{ filter: 'invert(1) brightness(1.5)' }}
            />
            <p className="font-serif text-ctext text-2xl leading-none tracking-[0.01em] mb-4">Krystine St-Laurent</p>
            <div className="h-px w-12 bg-brass/50 mb-5" />
            <p className="text-sm text-ctextSoft/80 leading-relaxed max-w-[34ch]">
              {lang === 'FR'
                ? 'Sagesse ayurvédique pour une vie consciente.'
                : 'Ayurvedic wisdom for conscious living.'}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-sans text-brass font-semibold uppercase tracking-[0.2em] text-[0.68rem] mb-6">{lang === 'FR' ? 'Navigation' : 'Navigation'}</h4>
            <ul className="space-y-3">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className="inline-block py-2 text-xs text-ctextSoft hover:text-brassBright transition-colors uppercase tracking-[0.12em]">{label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Programmes */}
          <div>
            <h4 className="font-sans text-brass font-semibold uppercase tracking-[0.2em] text-[0.68rem] mb-6">{nav.formations}</h4>
            <ul className="space-y-3">
              {programmes.map(({ href, label }) => (
                <li key={href}>
                  <NavLink href={href} className="inline-block py-2 text-xs text-ctextSoft hover:text-brassBright transition-colors uppercase tracking-[0.12em]">{label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans text-brass font-semibold uppercase tracking-[0.2em] text-[0.68rem] mb-6">{foot.contact}</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:equipe@inspiratanature.com" className="text-ctextSoft hover:text-brassBright transition-colors">equipe@inspiratanature.com</a></li>
              <li><a href="https://www.instagram.com/krystinesaintlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-instagram" aria-hidden /> Instagram</a></li>
              <li><a href="https://www.facebook.com/Krystinestlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-facebook" aria-hidden /> Facebook</a></li>
              <li><a href="https://www.youtube.com/@KrystineStLaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-youtube" aria-hidden /> YouTube</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em] text-ctextSoft/45">
          <p>© {new Date().getFullYear()} Krystine St-Laurent. {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <Link to="/politique-de-confidentialite" className="hover:text-brassBright transition-colors">{foot.privacy}</Link>
          </div>
          <button
            type="button"
            onClick={() => setSalonOpen(true)}
            className="group inline-flex items-center gap-1 transition-colors"
            aria-haspopup="dialog"
          >
            <span className="text-ctextSoft/45 group-hover:text-ctextSoft/80 transition-colors">{foot.madeBy}</span>{' '}
            <span
              className="font-semibold"
              style={{
                backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 70%, #B07A3C 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Le Salon des Inconnus
            </span>
          </button>
        </div>
      </div>

      <SalonContactCard open={salonOpen} onClose={() => setSalonOpen(false)} sourceSite="krystine" />
    </footer>
  );
};

export default Footer;
