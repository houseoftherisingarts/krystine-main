import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Star } from '@phosphor-icons/react';
import { useApp, useBoutique } from '../contexts/AppContext';
import {
  getProductByHandle, formatMoney, isShopifyConfigured, libelleEtiquette, libelleFormat,
  type ShopifyProductDetail,
} from '../shopify';
import { useProduitsPerso, appliquerPerso, estVisible } from '../firebase/boutiqueProduits';
import { htmlPropre } from '../lib/htmlPropre';
import { lireAvis, type ResumeAvis } from '../lib/okendo';
import { modeApercu, urlProduitHistorique } from '../lib/apercuBoutique';
import { CaseProduit, taille } from '../components/v2/Produit';
import { StyleV2, Kicker, Reveal, TitreChapitre, CarteVerte, BoutonCuivre, Filet, GOUTTIERE } from '../components/v2/Magazine';

/**
 * La page d'un produit, /boutique/produit/:handle (Krystine, 4 oct. 2026).
 * Langage magazine crème V2. Shopify reste le moteur (prix, formats, stock,
 * panier Storefront); la fiche personnalisée dans l'admin (boutiqueProduits)
 * prime sur le titre, l'accroche, la description et les photos.
 */

const QTE_MAX = 10;


const Etoiles: React.FC<{ note: number; className?: string }> = ({ note, className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 text-[#9c7a44] ${className}`} aria-hidden>
    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} weight={note >= i - 0.25 ? 'fill' : 'regular'} />)}
  </span>
);

const ProduitPage: React.FC = () => {
  const { handle = '' } = useParams<{ handle: string }>();
  const { lang, addToCart, setCartOpen } = useApp();
  const fr = lang === 'FR';
  const { redirectEnabled: renvoiActif, hiddenProducts, loading: renvoiLoading } = useBoutique();
  const apercu = useMemo(() => modeApercu(), []);
  const renvoi = renvoiActif && !apercu;
  const { perso, pret: persoPret } = useProduitsPerso();

  // Renvoi allumé : la fiche du même produit sur la boutique historique.
  useEffect(() => {
    if (!renvoiLoading && renvoi) window.location.replace(urlProduitHistorique(handle));
  }, [renvoiLoading, renvoi, handle]);

  const [brut, setBrut] = useState<ShopifyProductDetail | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'absent' | 'erreur'>('chargement');
  useEffect(() => {
    if (renvoi) return;
    if (!isShopifyConfigured) { setEtat('erreur'); return; }
    let vivant = true;
    setEtat('chargement');
    getProductByHandle(handle, lang)
      .then(p => { if (!vivant) return; setBrut(p); setEtat(p ? 'pret' : 'absent'); })
      .catch(() => { if (vivant) setEtat('erreur'); });
    return () => { vivant = false; };
  }, [handle, lang, renvoi]);

  const visible = brut ? estVisible(brut.handle, hiddenProducts, perso) : false;
  const p = useMemo(() => (brut ? appliquerPerso(brut, perso.get(brut.handle)) : null), [brut, perso]);

  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const [qte, setQte] = useState(1);
  const [ajoute, setAjoute] = useState(false);
  useEffect(() => {
    if (!brut) return;
    setVarianteId((brut.variants.find(v => v.availableForSale) || brut.variants[0])?.id || null);
    setPhoto(0); setQte(1);
  }, [brut]);

  const [avis, setAvis] = useState<ResumeAvis | null>(null);
  useEffect(() => {
    if (!brut) return;
    let vivant = true;
    lireAvis(brut.numericId).then(r => { if (vivant) setAvis(r); });
    return () => { vivant = false; };
  }, [brut]);

  // Titre de l'onglet et description pour le partage, une fois le produit connu.
  useEffect(() => {
    if (!p || !visible) return;
    document.title = `${p.title} · Boutique · Krystine St-Laurent`;
    const desc = (p.accroche || p.description || '').slice(0, 155);
    document.head.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.head.querySelector('meta[property="og:title"]')?.setAttribute('content', p.title);
    document.head.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://www.krystinestlaurent.ca/boutique/produit/${p.handle}`);
  }, [p, visible]);

  const descriptionHtml = useMemo(
    () => (p ? htmlPropre(p.descriptionPerso || p.descriptionHtml || p.description) : ''),
    [p],
  );

  // Une description courte (une ou deux phrases) se lit près du prix; une
  // longue a sa propre section plus bas.
  const descriptionCourte = descriptionHtml.replace(/<[^>]+>/g, '').length < 320;

  if (renvoi) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe6]">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">{fr ? 'Redirection…' : 'Redirecting…'}</p>
      </div>
    );
  }

  const enAttente = etat === 'chargement' || (etat === 'pret' && !persoPret);
  if (enAttente) {
    return (
      <div className="min-h-screen bg-[#f4efe6] flex items-center justify-center">
        <StyleV2 />
        <p className="text-[0.66rem] uppercase tracking-[0.28em] text-[#7d6330]">{fr ? 'Chargement du produit…' : 'Loading the product…'}</p>
      </div>
    );
  }

  if (!p || !visible) {
    return (
      <div className={`min-h-screen bg-[#f4efe6] text-[#1c1712] ${GOUTTIERE} pt-[clamp(8rem,16vh,11rem)] pb-24`}>
        <StyleV2 />
        <Kicker className="mb-5">{fr ? 'Boutique' : 'Shop'}</Kicker>
        <h1 className="v2-serif font-light leading-[1.02] text-[clamp(2.2rem,5vw,3.8rem)] max-w-[18ch]">
          {etat === 'erreur'
            ? (fr ? 'La boutique est momentanément indisponible.' : 'The shop is momentarily unavailable.')
            : (fr ? 'Ce produit n’est plus offert sur le site.' : 'This product is no longer offered here.')}
        </h1>
        <Link to="/boutique" className="mt-10 group inline-flex items-center gap-2.5 text-[0.72rem] uppercase tracking-[0.2em] border-b border-[#1c1712] pb-1.5 hover:text-[#7d6330] hover:border-[#9c7a44] transition-colors">
          <ArrowLeft size={15} /> {fr ? 'Revenir à la boutique' : 'Back to the shop'}
        </Link>
      </div>
    );
  }

  const variante = p.variants.find(v => v.id === varianteId) || p.variants[0];
  const prix = variante ? formatMoney(variante.price, lang) : formatMoney(p.priceRange.minVariantPrice, lang);
  const disponible = !!variante?.availableForSale;
  const formats = p.variants.filter(v => libelleFormat(v.title));
  const photos = Array.from(new Map([p.featuredImage, ...p.images].filter(Boolean).map(i => [i!.url, i!])).values());
  const photoActive = photos[Math.min(photo, photos.length - 1)];
  const type = libelleEtiquette(p.productType, lang);

  const ajouter = () => {
    if (!variante || !disponible) return;
    const format = libelleFormat(variante.title);
    for (let i = 0; i < qte; i++) {
      addToCart({
        id: p.id,
        variantId: variante.id,
        title: p.title,
        type: format || type || '',
        price: formatMoney(variante.price, lang),
        priceAmount: variante.price.amount,
        priceCurrency: variante.price.currencyCode,
        image: photos[0]?.url ? taille(photos[0].url, 300) : undefined,
      });
    }
    setCartOpen(true);
    setAjoute(true);
    window.setTimeout(() => setAjoute(false), 1800);
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    image: photos.map(i => i.url),
    description: (p.accroche || p.description || '').slice(0, 500),
    brand: { '@type': 'Brand', name: 'INSPIRATA AYURVEDA' },
    offers: {
      '@type': 'Offer',
      priceCurrency: variante?.price.currencyCode || 'CAD',
      price: variante?.price.amount || p.priceRange.minVariantPrice.amount,
      availability: disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://www.krystinestlaurent.ca/boutique/produit/${p.handle}`,
    },
    ...(avis && avis.nombre > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: avis.moyenne.toFixed(1), reviewCount: avis.nombre } }
      : {}),
  };

  return (
    <div className="relative w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <StyleV2 />
      <style>{`
        .fiche-texte p { margin: 0 0 1.1em; }
        .fiche-texte strong { font-weight: 500; color: #1c1712; }
        .fiche-texte ul, .fiche-texte ol { margin: 0 0 1.2em; padding-left: 1.2em; }
        .fiche-texte ul { list-style: disc; } .fiche-texte ol { list-style: decimal; }
        .fiche-texte li { margin: 0.35em 0; }
        .fiche-texte li::marker { color: #9c7a44; }
        .fiche-texte h2, .fiche-texte h3, .fiche-texte h4 { font-family: "Fraunces", Georgia, serif; font-weight: 300; font-size: 1.45rem; line-height: 1.2; margin: 1.6em 0 0.6em; color: #1c1712; }
        .fiche-texte a { border-bottom: 1px solid #9c7a44; }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* ─────────── La fiche : galerie et achat ─────────── */}
      <section className={`${GOUTTIERE} pt-[clamp(6.5rem,12vh,8.5rem)] pb-[clamp(4rem,9vh,7rem)]`}>
        <Link to="/boutique" className="group inline-flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.24em] text-[#1c1712]/60 hover:text-[#7d6330] transition-colors min-h-[44px]">
          <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          {fr ? 'La boutique' : 'The shop'}
        </Link>

        <div className="mt-6 grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
          {/* Galerie */}
          <div className="min-w-0">
            <CaseProduit
              key={photoActive?.url}
              src={photoActive?.url}
              alt={photoActive?.altText || p.title}
              ratio="aspect-square lg:aspect-[4/5]"
              largeur={1200}
              marge="p-[8%]"
              eager
              etiquette={p.availableForSale ? null : (fr ? 'Épuisé' : 'Sold out')}
            />
            {photos.length > 1 && (
              <div className="mt-6 flex gap-3 overflow-x-auto pb-1" role="list">
                {photos.map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    role="listitem"
                    onClick={() => setPhoto(i)}
                    aria-label={`${fr ? 'Photo' : 'Photo'} ${i + 1}`}
                    aria-pressed={i === photo}
                    className={`relative shrink-0 w-[4.5rem] h-[5.6rem] overflow-hidden bg-[#efe6d7] border transition-colors ${i === photo ? 'border-[#1c1712]' : 'border-[#9c7a44]/30 hover:border-[#9c7a44]'}`}
                  >
                    <img src={taille(img.url, 200)} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Achat */}
          <div className="min-w-0 lg:sticky lg:top-28">
            <Kicker className="mb-5">INSPIRATA AYURVEDA{type ? ` · ${type}` : ''}</Kicker>
            <h1 className="v2-serif font-light leading-[1.04] text-[clamp(2.2rem,4vw,3.6rem)] text-[#1c1712]">{p.title}</h1>
            {p.accroche && (
              <p className="mt-5 v2-serif font-light text-[clamp(1.15rem,1.8vw,1.45rem)] leading-[1.4] text-[#3a2f23] max-w-[40ch]">{p.accroche}</p>
            )}

            <div className="mt-7 flex flex-wrap items-baseline gap-x-6 gap-y-3">
              <span className="v2-serif font-light text-[clamp(1.6rem,2.4vw,2.1rem)] text-[#7d6330] tabular-nums">{prix}</span>
              {avis && avis.nombre > 0 && (
                <a href="#avis" className="inline-flex items-center gap-2 text-[0.72rem] text-[#1c1712]/70 hover:text-[#7d6330] transition-colors">
                  <Etoiles note={avis.moyenne} />
                  <span>{avis.nombre} {fr ? (avis.nombre > 1 ? 'avis' : 'avis') : (avis.nombre > 1 ? 'reviews' : 'review')}</span>
                </a>
              )}
            </div>

            {descriptionHtml && descriptionCourte && (
              <div className="fiche-texte mt-6 text-[0.95rem] leading-[1.8] text-[#3a2f23] max-w-[52ch]" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            )}

            <Filet className="mt-8" />

            {formats.length > 1 && (
              <fieldset className="mt-8">
                <legend className="text-[0.62rem] uppercase tracking-[0.26em] text-[#1c1712]/60 mb-3">{fr ? 'Format' : 'Size'}</legend>
                <div className="flex flex-wrap gap-2.5">
                  {formats.map(v => {
                    const choisi = v.id === variante?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVarianteId(v.id)}
                        aria-pressed={choisi}
                        className={`min-h-[46px] px-5 py-2.5 text-[0.74rem] tracking-[0.06em] border transition-colors ${
                          choisi ? 'bg-[#1c1712] border-[#1c1712] text-[#f4efe6]' : 'border-[#1c1712]/25 text-[#1c1712] hover:border-[#1c1712]'
                        } ${v.availableForSale ? '' : 'opacity-55'}`}
                      >
                        <span className={v.availableForSale ? '' : 'line-through'}>{libelleFormat(v.title)}</span>
                        <span className="ml-2 tabular-nums opacity-70">{formatMoney(v.price, lang)}</span>
                        {!v.availableForSale && <span className="ml-2 text-[0.6rem] uppercase tracking-[0.16em]">{fr ? 'épuisé' : 'sold out'}</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-8 flex flex-wrap items-stretch gap-3">
              <div className="inline-flex items-stretch border border-[#1c1712]/25" aria-label={fr ? 'Quantité' : 'Quantity'}>
                <button type="button" onClick={() => setQte(q => Math.max(1, q - 1))} disabled={qte <= 1} aria-label={fr ? 'Retirer un' : 'One less'} className="w-12 grid place-items-center hover:bg-[#1c1712]/5 disabled:opacity-30">
                  <Minus size={14} />
                </button>
                <span className="w-10 grid place-items-center tabular-nums text-[0.95rem]" aria-live="polite">{qte}</span>
                <button type="button" onClick={() => setQte(q => Math.min(QTE_MAX, q + 1))} disabled={qte >= QTE_MAX} aria-label={fr ? 'Ajouter un' : 'One more'} className="w-12 grid place-items-center hover:bg-[#1c1712]/5 disabled:opacity-30">
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={ajouter}
                disabled={!disponible}
                className={`flex-1 min-w-[12rem] min-h-[52px] inline-flex items-center justify-center gap-2.5 px-7 text-[0.7rem] uppercase tracking-[0.2em] transition-colors duration-300 ${
                  !disponible
                    ? 'border border-[#1c1712]/20 text-[#1c1712]/40 cursor-not-allowed'
                    : ajoute ? 'bg-[#55602f] text-[#f4efe6]' : 'bg-[#1c1712] text-[#f4efe6] hover:bg-[#9c7a44]'
                }`}
              >
                {!disponible
                  ? (fr ? 'Format épuisé' : 'Sold out')
                  : ajoute
                    ? <><Check size={15} /> {fr ? 'Ajouté au panier' : 'Added to cart'}</>
                    : <><ShoppingBag size={15} weight="light" /> {fr ? 'Ajouter au panier' : 'Add to cart'}</>}
              </button>
            </div>

            <p className="mt-6 text-[0.78rem] leading-relaxed text-[#1c1712]/60">
              {fr
                ? 'Paiement sécurisé par Shopify, en dollars canadiens. Expédition au Canada.'
                : 'Secure checkout by Shopify, in Canadian dollars. Ships across Canada.'}
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── La description complète ─────────── */}
      {descriptionHtml && !descriptionCourte && (
        <section className={`bg-[#efe6d7] ${GOUTTIERE} py-[clamp(4.5rem,11vh,8rem)]`}>
          <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-8 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <Kicker className="mb-5">{fr ? 'La description' : 'The description'}</Kicker>
              <TitreChapitre className="max-w-[14ch]">{fr ? 'La fiche complète' : 'The full details'}</TitreChapitre>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="fiche-texte text-[0.98rem] leading-[1.85] text-[#3a2f23] max-w-[64ch]" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ─────────── Les avis Okendo ─────────── */}
      {avis && avis.nombre > 0 && (
        <section id="avis" className={`${GOUTTIERE} py-[clamp(4.5rem,11vh,8rem)] scroll-mt-24`}>
          <Reveal className="max-w-[760px]">
            <Kicker className="mb-5">{fr ? 'Ce qu’elles en disent' : 'What they say'}</Kicker>
            <TitreChapitre>{fr ? 'Les avis des clientes' : 'Customer reviews'}</TitreChapitre>
            <p className="mt-5 flex items-center gap-3 text-[0.9rem] text-[#3a2f23]">
              <Etoiles note={avis.moyenne} />
              <span>{avis.moyenne.toFixed(1).replace('.', fr ? ',' : '.')} / 5 · {avis.nombre} {fr ? 'avis' : (avis.nombre > 1 ? 'reviews' : 'review')}</span>
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {avis.avis.map(a => (
              <Reveal key={a.reviewId}>
                <article className="h-full bg-[#faf6ee] border border-[#9c7a44]/25 p-7">
                  <Etoiles note={a.rating} />
                  {a.title && !/^\d\s*stars?$/i.test(a.title.trim()) && (
                    <h3 className="mt-4 v2-serif font-light text-[1.25rem] leading-snug">{a.title}</h3>
                  )}
                  <p className="mt-3 text-[0.92rem] leading-[1.75] text-[#3a2f23]">{a.body}</p>
                  <p className="mt-5 text-[0.6rem] uppercase tracking-[0.22em] text-[#7d6330]">
                    {a.reviewer?.displayName || (fr ? 'Cliente' : 'Customer')}
                    {' · '}
                    {new Date(a.dateCreated).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long' })}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── La carte vert profond : le questionnaire ─────────── */}
      <section className={`${GOUTTIERE} pb-[clamp(5rem,12vh,8rem)] ${avis && avis.nombre > 0 ? '' : 'pt-[clamp(4.5rem,11vh,8rem)]'}`}>
        <Reveal>
          <CarteVerte className="p-[clamp(2rem,5vw,4rem)]">
            <div className="grid gap-8 md:grid-cols-[1.3fr_auto] items-center">
              <div>
                <Kicker sombre className="mb-4">{fr ? 'Le questionnaire des doshas' : 'The dosha questionnaire'}</Kicker>
                <p className="v2-serif font-light text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] text-[#EEE7DB] max-w-[24ch]">
                  {fr ? 'Quelle formule vous ressemble en ce moment ?' : 'Which formula fits you right now?'}
                </p>
                <p className="mt-4 text-[0.92rem] leading-[1.75] text-[#EEE7DB]/75 max-w-[48ch]">
                  {fr
                    ? 'Quelques questions sur le sommeil, la digestion et l’humeur orientent vers l’huile qui convient à votre équilibre.'
                    : 'A few questions on sleep, digestion and mood point to the oil that suits your balance.'}
                </p>
              </div>
              <BoutonCuivre to="/quiz">{fr ? 'Faire le questionnaire' : 'Take the questionnaire'}</BoutonCuivre>
            </div>
          </CarteVerte>
        </Reveal>
      </section>
    </div>
  );
};

export default ProduitPage;
