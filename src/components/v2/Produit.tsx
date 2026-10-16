import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShoppingBag } from '@phosphor-icons/react';
import { formatMoney, libelleEtiquette, libelleFormat, type ShopifyProduct } from '../../shopify';
import { BoutonAviser } from './AvisStock';

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

/** Le dosha d'une huile, lu dans son nom (« L'Apaisante Vata », « La
 *  Rafraîchissante Pitta », « L'Énergisante Kapha »). Krystine, 8 oct. 2026 :
 *  « remettre les pictos par huile ». */
export type DoshaProduit = 'vata' | 'pitta' | 'kapha';
export function doshaDe(p: Pick<ShopifyProduct, 'title' | 'handle'>): DoshaProduit | null {
  const t = `${p.handle} ${p.title}`.toLowerCase();
  if (/\bvata\b/.test(t)) return 'vata';
  if (/\bpitta\b/.test(t)) return 'pitta';
  if (/\bkapha\b/.test(t)) return 'kapha';
  return null;
}

export const NOM_DOSHA: Record<DoshaProduit, { FR: string; EN: string }> = {
  vata: { FR: 'Vata (Vent et Espace)', EN: 'Vata (Wind and Space)' },
  pitta: { FR: 'Pitta (Feu et Eau)', EN: 'Pitta (Fire and Water)' },
  kapha: { FR: 'Kapha (Eau et Terre)', EN: 'Kapha (Water and Earth)' },
};

/** Le picto aquarelle de Krystine (public/quiz/pictos/, version crème : ce qui se lit). */
export const PictoDosha: React.FC<{ dosha: DoshaProduit; className?: string; titre?: string }> = ({ dosha, className = 'h-8 w-8', titre }) => (
  <img src={`/quiz/pictos/${dosha}.png`} alt={titre || ''} aria-hidden={titre ? undefined : true} title={titre} loading="lazy" className={`object-contain ${className}`} />
);

/** La photo d'une carte produit (8 oct. 2026) : jamais d'image générée par IA
 *  (nom Gemini, DALL, Midjourney, firefly, generated); et lorsqu'il y a le choix,
 *  la photo du produit passe avant une capture d'écran datée ou un visuel de
 *  publication (souvent des arrêts sur image flous). */
export function photoProduit(p: Pick<ShopifyProduct, 'featuredImage' | 'images'>): string | undefined {
  const reelles = [p.featuredImage?.url, ...p.images.map(i => i.url)]
    .filter((u): u is string => !!u && !/gemini|dall|midjourney|firefly|generated/i.test(u));
  const capture = (u: string) => /\/\d{4}-\d{2}-\d{2}_[\d-]+\.|publications?-rs/i.test(u);
  return reelles.find(u => !capture(u)) || reelles[0];
}

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
  /** Le format qui part au panier (« 50 ml »), affiché dans le bouton long. */
  format?: string | null;
  /** Le handle Shopify : un produit épuisé offre alors « M'aviser » (8 oct. 2026). */
  handle?: string;
  className?: string;
}> = ({ disponible, ajoute, lang, titre, onClick, long = false, format, handle, className = '' }) => {
  const fr = lang === 'FR';
  if (!disponible && handle) return <BoutonAviser handle={handle} titre={titre} lang={lang} className={className} />;
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
      aria-label={`${fr ? 'Ajouter au panier' : 'Add to cart'} : ${titre}${format ? `, ${format}` : ''}`}
      className={`inline-flex min-h-[46px] items-center justify-center gap-2.5 px-6 text-[0.66rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7a44] ${ajoute ? 'bg-[#55602f]' : 'bg-[#1c1712] hover:bg-[#9c7a44]'} ${className}`}
    >
      {ajoute
        ? <><Check size={14} /> {fr ? 'Ajouté' : 'Added'}</>
        : <><ShoppingBag size={14} weight="light" /> {long ? (fr ? 'Ajouter au panier' : 'Add to cart') : (fr ? 'Ajouter' : 'Add')}{long && format ? ` · ${format}` : ''}</>}
    </button>
  );
};

/** La variante qu'une carte ajoute : la première en stock, sinon la première. */
export const variantePremiere = (p: ShopifyProduct) => p.variants.find(v => v.availableForSale) || p.variants[0];

/** À quoi sert un format, pour la personne qui ne sait pas lequel choisir (4 oct. 2026). */
export function usageFormat(format: string | null | undefined, lang: 'FR' | 'EN'): string | null {
  const ml = Number((format || '').match(/(\d+)\s*ml/i)?.[1]);
  if (!ml) return null;
  const fr = lang === 'FR';
  if (ml <= 100) return fr ? 'pour essayer' : 'to try it';
  if (ml <= 300) return fr ? "pour l'usage de tous les jours" : 'for everyday use';
  return fr ? 'pour la famille ou les massages' : 'for the family or massages';
}

/** Le guide des formats en une phrase : « 50 ml pour essayer, 230 ml pour… ». */
export function guideFormats(p: ShopifyProduct, lang: 'FR' | 'EN'): string | null {
  const parts = p.variants
    .filter(v => v.availableForSale)
    .map(v => libelleFormat(v.title))
    .filter((f): f is string => !!f)
    .map(f => { const u = usageFormat(f, lang); return u ? `${f} ${u}` : null; })
    .filter(Boolean);
  return parts.length > 1 ? `${parts.join(', ')}.` : null;
}

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
  const image = photoProduit(p);
  const type = libelleEtiquette(p.productType, lang);
  const fiche = `/boutique/produit/${p.handle}`;
  const disponible = p.availableForSale && !!variante;
  // Le format qui part au panier, et les autres offerts sur la fiche.
  const format = libelleFormat(variante?.title);
  const autres = p.variants.filter(v => v.availableForSale && v.id !== variante?.id).map(v => libelleFormat(v.title)).filter(Boolean);
  const dosha = doshaDe(p);

  return (
    <article className="group flex h-full flex-col">
      <Link to={fiche} aria-label={p.title} className="relative block">
        <CaseProduit src={image} alt={p.featuredImage?.altText || p.title} etiquette={p.availableForSale ? null : (fr ? 'Épuisé' : 'Sold out')} />
        {dosha && <PictoDosha dosha={dosha} className="absolute right-2.5 top-2.5 h-9 w-9 sm:h-10 sm:w-10" />}
      </Link>
      <div className="flex flex-1 flex-col pt-6">
        {/* Rien de tronqué (la Ronde, 16 oct. 2026) : la nomenclature et le nom passent à la ligne au lieu d'être coupés. */}
        <p className="text-[0.58rem] uppercase leading-[1.6] tracking-[0.14em] sm:tracking-[0.26em] text-[#7d6330] [overflow-wrap:break-word]">{dosha ? NOM_DOSHA[dosha][lang] : (type || 'INSPIRATA')}</p>
        <h3 className="mt-2.5 v2-serif font-light text-[clamp(1.1rem,1.5vw,1.25rem)] leading-[1.2] text-[#1c1712] [overflow-wrap:break-word]">
          <Link to={fiche} className="hover:text-[#7d6330] transition-colors duration-300">{p.title}</Link>
        </h3>
        <p className="mt-2 v2-serif font-light text-[1.1rem] text-[#7d6330] tabular-nums">
          {prix}
          {format && <span className="ml-2 text-[0.78rem] text-[#1c1712]/80" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>{format}</span>}
        </p>
        {format && autres.length > 0 && (
          <p className="mt-1 text-[1rem] leading-[1.5] text-[#1c1712]/75">
            {fr ? 'Aussi en' : 'Also in'} {autres.join(fr ? ' et ' : ' and ')}{fr ? ', sur la fiche' : ', on the product page'}
          </p>
        )}
        <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <BoutonAjouter disponible={disponible} ajoute={ajoute} lang={lang} titre={p.title} format={format} handle={p.handle} onClick={e => onAjouter(p, e)} />
          <Link to={fiche} className="group/l inline-flex min-h-[44px] items-center gap-2 text-[0.64rem] uppercase tracking-[0.2em] text-[#1c1712] border-b border-[#1c1712]/40 pb-1 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
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
