import React from 'react';
import { Link } from 'react-router-dom';
import { useApp, useBoutique } from '../../contexts/AppContext';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import { CONTENT } from '../../content';
import { isStaticRoute } from '../../lib/staticRoutes';
import { db } from '../../firebase';
import { BadgeVexel } from '../../vexel/BadgeVexel';
import { CollantVexel } from '../../vexel/CollantVexel';
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

/**
 * Le pied de page unique du site, retracé sur celui de Vexel Webstudio et de
 * Xena Horizon : un colophon plat (sans image de fond), la marque et sa
 * phrase, deux colonnes de navigation, les coordonnées avec le collant Vexel,
 * puis le nom géant en filigrane coupé par le bas de page. Un seul et même
 * pied de page partout, identique.
 */
const Footer: React.FC = () => {
  const { lang } = useApp();
  const { presseOuvert } = useSiteFlags();
  const t = CONTENT[lang];
  const nav = t.nav;
  const foot = t.footer;

  // La salle de presse n'apparaît dans le pied de page qu'une fois son
  // interrupteur allumé dans l'admin, parce que Krystine la relit d'abord.
  const links = [
    { href: '/krystine', label: nav.krystine },
    { href: '/medias', label: nav.medias },
    { href: '/formations', label: nav.formations },
    { href: '/boutique', label: nav.boutique },
    { href: '/points-de-vente', label: nav.pointsDeVente },
    { href: '/conferenciere', label: nav.conferenciere },
    ...(presseOuvert ? [{ href: '/presse', label: lang === 'FR' ? 'Presse' : 'Press' }] : []),
  ];

  const programmes = [
    { href: '/origine', label: nav.origine },
    { href: '/vata', label: nav.vata },
    { href: '/podcast', label: nav.podcast },
  ];

  return (
    <footer className="relative overflow-hidden font-sans text-ctextSoft border-t border-brass/15 bg-espressoDeep pt-16 md:pt-20 pb-0 mt-auto">
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">

        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">

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
              <li><a href="mailto:teamksl@inspiratanature.com" className="text-ctextSoft hover:text-brassBright transition-colors">teamksl@inspiratanature.com</a></li>
              <li><a href="https://www.instagram.com/krystinesaintlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-instagram" aria-hidden /> Instagram</a></li>
              <li><a href="https://www.facebook.com/Krystinestlaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-facebook" aria-hidden /> Facebook</a></li>
              <li><a href="https://www.youtube.com/@KrystineStLaurent" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-ctextSoft hover:text-brassBright transition-colors"><i className="fa-brands fa-youtube" aria-hidden /> YouTube</a></li>
            </ul>
            <div className="mt-8">
              <CollantVexel lang={lang} />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em] text-ctextSoft/45">
          <p>© {new Date().getFullYear()} Krystine St-Laurent. {lang === 'FR' ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <Link to="/politique-de-confidentialite" className="hover:text-brassBright transition-colors">{foot.privacy}</Link>
          </div>
          {db && (
            <div
              style={{
                ['--couleur-surface' as string]: '#2a2015',
                ['--couleur-texte' as string]: '#f4ece0',
                ['--couleur-muted' as string]: '#cdbfa9',
                ['--couleur-bordure' as string]: 'rgba(187,154,94,0.35)',
                ['--couleur-accent' as string]: '#bb9a5e',
                ['--rayon-carte' as string]: '15px',
              }}
            >
              <BadgeVexel db={db} />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
