import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { CONTENT } from '../../content';
import { isStaticRoute } from '../../lib/staticRoutes';

// Render a React Router <Link> for in-app routes, or a plain <a> for statically
// hosted bundles (/origine, /podcast, /vata) so Firebase rewrites can serve them.
const NavLink: React.FC<{ href: string; className?: string; children: React.ReactNode }> = ({ href, className, children }) => (
  isStaticRoute(href)
    ? <a href={href} className={className}>{children}</a>
    : <Link to={href} className={className}>{children}</Link>
);

const Footer: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang];
  const nav = t.nav;
  const foot = t.footer;

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
    { href: '/dimanches-origine', label: nav.dimanchesOrigine },
  ];

  return (
    <footer className="bg-[#050C1A] text-white/60 pt-20 pb-10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        
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
              <li><a href="https://www.instagram.com/krystinestlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"><i className="fa-brands fa-instagram" /> Instagram</a></li>
              <li><a href="https://www.facebook.com/krystinestlaurentinspirata" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors"><i className="fa-brands fa-facebook" /> Facebook</a></li>
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
