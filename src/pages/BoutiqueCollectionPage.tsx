import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useApp, useBoutique } from '../contexts/AppContext';
import { ASSETS } from '../content';
import { getProducts, formatMoney, isShopifyConfigured, libelleEtiquette, type ShopifyProduct } from '../shopify';
import { useProduitsPerso, appliquerPerso, estVisible, trierSelonPerso } from '../firebase/boutiqueProduits';
import { modeApercu } from '../lib/apercuBoutique';
import {
  ALL_PRODUCTS_SLUG, COLLECTIONS, findCollection,
  type CollectionManifest,
} from '../lib/collections';
import {
  StyleV2, Kicker, TitreV2, SousTitreV2, Planche, LigneDefiler, LienSouligne, TitreChapitre, Reveal, GOUTTIERE, useMotionV2,
} from '../components/v2/Magazine';
import { CarteProduit, GrilleProduits, taille, variantePremiere } from '../components/v2/Produit';

// Synthetic manifest used when the route is /boutique/tous — not a real
// collection, but reuses the same editorial layout so the safety-valve page
// doesn't feel like a different screen.
const allProductsManifest = (lang: 'FR' | 'EN'): CollectionManifest => ({
  id: ALL_PRODUCTS_SLUG,
  slug: ALL_PRODUCTS_SLUG,
  labelFR: 'Tous les produits',
  labelEN: 'All products',
  taglineFR: 'La boutique dans son ensemble',
  taglineEN: 'The full boutique',
  storyFR: "Chaque formule, chaque objet — tout ce qui compose aujourd'hui la maison Inspirata, réuni en un seul lieu.",
  storyEN: "Every formula, every object — all that makes up Maison Inspirata today, gathered in one place.",
  bannerImage: ASSETS.shopBg,
  match: () => true,
});

const BoutiqueCollectionPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { lang, addToCart, setCartOpen } = useApp();
  const { redirectEnabled: renvoiActif, redirectUrl, hiddenProducts, loading: redirectLoading } = useBoutique();
  // L'aperçu (?apercu=1 sur /boutique) se garde pour la visite : la collection reste visible.
  const redirectEnabled = renvoiActif && !modeApercu();
  const { perso } = useProduitsPerso();

  const manifest = slug === ALL_PRODUCTS_SLUG ? allProductsManifest(lang) : findCollection(slug);

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  useMotionV2(racine, !!manifest);

  // Same emergency redirect as /boutique — any collection page also bounces
  // to inspiratanature.com when Krystine has the switch enabled.
  useEffect(() => {
    if (!redirectLoading && redirectEnabled && redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectLoading, redirectEnabled, redirectUrl]);

  useEffect(() => {
    if (redirectEnabled) return;
    if (!isShopifyConfigured) {
      setLoading(false);
      setError(lang === 'FR' ? 'Boutique non configurée.' : 'Shop not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    getProducts(50, lang)
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lang, redirectEnabled]);

  if (redirectEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4efe6]">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">
          {lang === 'FR' ? 'Redirection…' : 'Redirecting…'}
        </p>
      </div>
    );
  }

  if (!manifest) return <Navigate to="/boutique" replace />;

  // Apply Krystine's per-product hide toggles before the collection match.
  // Hidden handles fall out of every collection (and the all-products view)
  // until she flips them back on in Admin → Boutique.
  const visibleProducts = trierSelonPerso(
    products.filter(p => estVisible(p.handle, hiddenProducts, perso)).map(p => appliquerPerso(p, perso.get(p.handle))),
    perso,
  );
  const filtered = visibleProducts.filter(manifest.match);

  const label = lang === 'FR' ? manifest.labelFR : manifest.labelEN;
  const tagline = lang === 'FR' ? manifest.taglineFR : manifest.taglineEN;
  const story = lang === 'FR' ? manifest.storyFR : manifest.storyEN;

  const handleAdd = (p: ShopifyProduct, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const variant = variantePremiere(p);
    if (!variant) return;
    addToCart({
      id: p.id,
      variantId: variant.id,
      title: p.title,
      type: libelleEtiquette(p.productType, lang) || '',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: p.featuredImage?.url ? taille(p.featuredImage.url, 300) : undefined,
    });
    setCartOpen(true);
    setAdded(p.id);
    window.setTimeout(() => setAdded(cur => (cur === p.id ? null : cur)), 1600);
  };

  const fr = lang === 'FR';
  const garanties = fr
    ? [['Paiement sécurisé', 'Par Shopify, en dollars canadiens'], ['Formules maison', 'Conçues par Krystine'], ['Livraison', 'Expédition partout au Canada'], ['Près de 40 ans', 'D’expérience en ayurveda']]
    : [['Secure checkout', 'By Shopify, in Canadian dollars'], ['House formulas', 'Crafted by Krystine'], ['Shipping', 'Across Canada'], ['Nearly 40 years', 'Of Ayurvedic practice']];

  return (
    <div ref={racine} className="relative w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <StyleV2 />

      {/* ─────────── Le seuil de la collection ─────────── */}
      <section data-hero className={`${GOUTTIERE} pt-[clamp(6.5rem,12vh,8.5rem)] pb-[clamp(3rem,7vh,5rem)]`}>
        <Link to="/boutique" className="group inline-flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.24em] text-[#1c1712]/60 hover:text-[#7d6330] transition-colors min-h-[44px]">
          <ArrowLeft size={13} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          {fr ? 'La boutique' : 'The shop'}
        </Link>
        <div className="mt-6 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <Kicker className="mb-6">{fr ? 'Collection INSPIRATA' : 'INSPIRATA collection'}</Kicker>
            <TitreV2 lignes={[label]} className="text-[clamp(2.8rem,7vw,6.2rem)] max-w-[12ch]" />
            <SousTitreV2>{tagline}</SousTitreV2>
            <p data-fade className="mt-6 text-[0.95rem] leading-[1.85] text-[#3a2f23] max-w-[52ch]">{story}</p>
          </div>
          <Planche
            seuil
            src={manifest.bannerImage}
            alt={label}
            etiquette="INSPIRATA"
            ratio="aspect-[5/4]"
          />
        </div>
        <LigneDefiler libelle={fr ? 'Les produits' : 'The products'} droite={fr ? 'Fait main · Petites séries' : 'Handmade · Small batches'} />
      </section>

      {/* ─────────── Les produits ─────────── */}
      <section className={`${GOUTTIERE} pb-[clamp(5rem,12vh,8rem)]`}>
        <div className="mb-[clamp(3rem,7vh,5rem)] grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 border-y border-[#1c1712]/12 py-6">
          {garanties.map(([t, d]) => (
            <div key={t}>
              <p className="text-[0.6rem] uppercase tracking-[0.22em] text-[#7d6330]">{t}</p>
              <p className="mt-1.5 text-[0.85rem] leading-snug text-[#3a2f23]">{d}</p>
            </div>
          ))}
        </div>

        {loading && (
          <p className="py-16 text-[0.66rem] uppercase tracking-[0.28em] text-[#7d6330]">{fr ? 'Chargement des produits…' : 'Loading the products…'}</p>
        )}
        {!loading && error && (
          <p className="py-16 v2-serif font-light text-[1.5rem] text-[#1c1712]">
            {fr ? 'La boutique est momentanément indisponible.' : 'The shop is momentarily unavailable.'}
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16">
            <p className="v2-serif font-light text-[1.5rem] text-[#1c1712] mb-8">
              {fr ? 'Les produits de cette collection arrivent bientôt.' : 'The products of this collection are arriving soon.'}
            </p>
            <LienSouligne to="/boutique">{fr ? 'Revenir à la boutique' : 'Back to the shop'}</LienSouligne>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <GrilleProduits>
            {filtered.map(p => (
              <Reveal key={p.id} className="h-full">
                <CarteProduit p={p} lang={lang} ajoute={added === p.id} onAjouter={handleAdd} />
              </Reveal>
            ))}
          </GrilleProduits>
        )}
      </section>

      {/* ─────────── Les autres collections ─────────── */}
      <section className={`bg-[#efe6d7] ${GOUTTIERE} py-[clamp(4.5rem,11vh,7rem)]`}>
        <Kicker className="mb-5">{fr ? 'Continuer la visite' : 'Keep browsing'}</Kicker>
        <TitreChapitre className="mb-10">{fr ? 'Les autres collections' : 'Other collections'}</TitreChapitre>
        <div className="flex flex-wrap gap-x-9 gap-y-5">
          {COLLECTIONS.filter(c => c.slug !== manifest.slug).map(c => (
            <LienSouligne key={c.slug} to={`/boutique/${c.slug}`}>{fr ? c.labelFR : c.labelEN}</LienSouligne>
          ))}
          {manifest.slug !== ALL_PRODUCTS_SLUG && (
            <LienSouligne to={`/boutique/${ALL_PRODUCTS_SLUG}`}>{fr ? 'Tous les produits' : 'All products'}</LienSouligne>
          )}
        </div>
      </section>
    </div>
  );
};

export default BoutiqueCollectionPage;
