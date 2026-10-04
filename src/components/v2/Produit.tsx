import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShoppingBag } from '@phosphor-icons/react';
import { formatMoney, libelleEtiquette, type ShopifyProduct } from '../../shopify';

/**
 * La carte produit unique de la boutique, en langage magazine crème V2
 * (Krystine, 4 oct. 2026 : « uniformisation des visuels et des images avec
 * le site »). Les photos Shopify ont des fonds de toutes sortes (blanc pur,
 * dégradés, rendus); chacune se pose donc dans la même case crème, entière
 * (jamais rognée sur l'étiquette du flacon), avec la même marge, et le blanc
 * de son fond se fond dans le crème. Boutique, collection, fiche et panier
 * passent tous par ici.
 */

/** Les photos du CDN Shopify se demandent à la taille de leur case. */
export const taille = (url: string, w: number) =>
  /cdn\.shopify\.com/.test(url) ? `${url}${url.includes('?') ? '&' : '?'}width=${w}` : url;

/** La case d'une photo produit : fond #efe6d7 uniforme, image entière, cadre fileté d'or. */
export const CaseProduit: React.FC<{
  src?: string | null;
  alt?: string;
  ratio?: string;
  largeur?: number;
  etiquette?: string | null;
  marge?: string;
  filet?: boolean;
  eager?: boolean;
  className?: string;
}> = ({ src, alt = '', ratio = 'aspect-[4/5]', largeur = 700, etiquette, marge = 'p-[5%]', filet = true, eager = false, className = '' }) => (
  <div className={`relative w-full ${className}`}>
    {filet && <span className="pointer-events-none absolute -inset-1.5 border border-[#9c7a44]/35" aria-hidden />}
    <div className={`relative w-full ${ratio} overflow-hidden bg-[#efe6d7]`}>
      {src ? (
        <img
          src={taille(src, largeur)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          className={`absolute inset-0 h-full w-full object-contain ${marge} mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[#9c7a44]/40"><ShoppingBag size={36} weight="light" /></div>
      )}
      {etiquette && (
        <span className="absolute top-0 left-0 bg-[#1c1712] text-[#f4efe6] px-3 py-1.5 text-[0.56rem] uppercase tracking-[0.24em]">{etiquette}</span>
      )}
    </div>
  </div>
);

/** Le bouton d'ajout, carré et noir, le même partout. */
export const BoutonAjouter: React.FC<{
  disponible: boolean;
  ajoute: boolean;
  lang: 'FR' | 'EN';
  titre: string;
  onClick: (e: React.MouseEvent) => void;
  long?: boolean;
  className?: string;
}> = ({ disponible, ajoute, lang, titre, onClick, long = false, className = '' }) => {
  const fr = lang === 'FR';
  if (!disponible) {
    return (
      <button disabled className={`inline-flex min-h-[46px] items-center justify-center border border-[#1c1712]/20 px-6 text-[0.66rem] uppercase tracking-[0.18em] text-[#1c1712]/40 cursor-not-allowed ${className}`}>
        {fr ? 'Épuisé' : 'Sold out'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${fr ? 'Ajouter au panier' : 'Add to cart'} : ${titre}`}
      className={`inline-flex min-h-[46px] items-center justify-center gap-2.5 px-6 text-[0.66rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7a44] ${ajoute ? 'bg-[#55602f]' : 'bg-[#1c1712] hover:bg-[#9c7a44]'} ${className}`}
    >
      {ajoute
        ? <><Check size={14} /> {fr ? 'Ajouté' : 'Added'}</>
        : <><ShoppingBag size={14} weight="light" /> {long ? (fr ? 'Ajouter au panier' : 'Add to cart') : (fr ? 'Ajouter' : 'Add')}</>}
    </button>
  );
};

/** La variante qu'une carte ajoute : la première en stock, sinon la première. */
export const variantePremiere = (p: ShopifyProduct) => p.variants.find(v => v.availableForSale) || p.variants[0];

/** La carte produit des grilles (boutique, collection). */
export const CarteProduit: React.FC<{
  p: ShopifyProduct;
  lang: 'FR' | 'EN';
  ajoute: boolean;
  onAjouter: (p: ShopifyProduct, e: React.MouseEvent) => void;
}> = ({ p, lang, ajoute, onAjouter }) => {
  const fr = lang === 'FR';
  const variante = variantePremiere(p);
  const prix = formatMoney(variante ? variante.price : p.priceRange.minVariantPrice, lang);
  const image = p.featuredImage?.url || p.images[0]?.url;
  const type = libelleEtiquette(p.productType, lang);
  const fiche = `/boutique/produit/${p.handle}`;
  const disponible = p.availableForSale && !!variante;

  return (
    <article className="group flex h-full flex-col">
      <Link to={fiche} aria-label={p.title} className="block">
        <CaseProduit src={image} alt={p.featuredImage?.altText || p.title} etiquette={p.availableForSale ? null : (fr ? 'Épuisé' : 'Sold out')} />
      </Link>
      <div className="flex flex-1 flex-col pt-6">
        <p className="truncate text-[0.58rem] uppercase tracking-[0.26em] text-[#7d6330]">{type || 'INSPIRATA'}</p>
        <h3 className="mt-2.5 v2-serif font-light text-[clamp(1.1rem,2.2vw,1.4rem)] leading-[1.15] text-[#1c1712] line-clamp-2">
          <Link to={fiche} className="hover:text-[#7d6330] transition-colors duration-300">{p.title}</Link>
        </h3>
        <p className="mt-2 v2-serif font-light text-[1.2rem] text-[#7d6330] tabular-nums">{prix}</p>
        <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <BoutonAjouter disponible={disponible} ajoute={ajoute} lang={lang} titre={p.title} onClick={e => onAjouter(p, e)} />
          <Link to={fiche} className="group/l inline-flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712]/40 pb-1 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
            {fr ? 'Voir' : 'View'} <ArrowRight size={12} className="transition-transform duration-300 group-hover/l:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

/** La grille commune des cartes produits. */
export const GrilleProduits: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-[clamp(1rem,2.5vw,2.25rem)] gap-y-[clamp(2.5rem,5vw,3.5rem)] ${className}`}>{children}</div>
);
