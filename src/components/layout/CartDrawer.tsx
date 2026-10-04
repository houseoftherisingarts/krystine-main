import React, { useEffect, useRef, useState } from 'react';
import { useUI, useAuth, useCart } from '../../contexts/AppContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShoppingBag, X } from '@phosphor-icons/react';
import { createCheckout, formatMoney, isShopifyConfigured, libelleConnu } from '../../shopify';
import { trackObjectif } from '../../lib/track';
import Portail from '../Portail';
import { CaseProduit } from '../v2/Produit';

const CartDrawer: React.FC = () => {
  const { lang } = useUI();
  const { user } = useAuth();
  const { cartItems, removeFromCart, cartTotal, cartOpen, setCartOpen } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Flash an "added" toast for 2.4s when a new item enters the cart.
  const prevCountRef = useRef(cartItems.length);
  const [flashTitle, setFlashTitle] = useState<string | null>(null);
  useEffect(() => {
    if (cartItems.length > prevCountRef.current) {
      const newest = cartItems[cartItems.length - 1];
      setFlashTitle(newest?.title || newest?.name || (lang === 'FR' ? 'Article ajouté' : 'Item added'));
      const t = setTimeout(() => setFlashTitle(null), 2400);
      return () => clearTimeout(t);
    }
    prevCountRef.current = cartItems.length;
  }, [cartItems.length, lang]);
  useEffect(() => { prevCountRef.current = cartItems.length; }, [cartItems.length]);

  const shopifyItems = cartItems.filter(i => !!i.variantId);
  const canCheckout = isShopifyConfigured && shopifyItems.length > 0;

  const currency = cartItems.find(i => i.priceCurrency)?.priceCurrency || 'CAD';
  const totalFormatted = formatMoney({ amount: cartTotal, currencyCode: currency }, lang);

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const agg = new Map<string, number>();
      shopifyItems.forEach(i => agg.set(i.variantId!, (agg.get(i.variantId!) || 0) + 1));
      const lines = Array.from(agg.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
      // Le courriel de la membre connectée se pose d'avance au paiement : c'est par
      // lui que le webhook retrouve son compte pour lui verser ses niskas.
      const url = await createCheckout(lines, lang, user?.email || undefined);
      trackObjectif('Paiement commencé · boutique', 'gros', { paiement: true });

      // Plus rien n'est écrit ici (4 oct. 2026) : avant, chaque clic créait une
      // commande « en attente » dans clientOrders et donnait des niskas avant
      // même le paiement. La commande et ses niskas arrivent maintenant par le
      // serveur, lorsque Shopify confirme le paiement (functions/src/shopify/webhook.ts).

      window.location.href = url;
    } catch (e: any) {
      setCheckoutError(e?.message || 'Checkout failed');
      setCheckingOut(false);
    }
  };

  const fr = lang === 'FR';

  return (
    <Portail>
    <>
      {/* Voile */}
      <div
        className={`fixed inset-0 z-[100] bg-[#1c1712]/45 backdrop-blur-[2px] transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setCartOpen(false)}
      />

      {/* Le panier, en langage magazine crème V2 (4 oct. 2026) */}
      <aside
        aria-label={fr ? 'Panier' : 'Cart'}
        inert={!cartOpen}
        className={`fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col bg-[#f4efe6] text-[#1c1712] shadow-[-30px_0_80px_-40px_rgba(28,23,18,0.45)] transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
      >
        {/* Tête */}
        <div className="flex items-end justify-between border-b border-[#1c1712]/12 px-6 pt-7 pb-5">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[#7d6330]">INSPIRATA AYURVEDA</p>
            <h3 className="mt-2 text-[2rem] font-light leading-none" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
              {fr ? 'Votre panier' : 'Your cart'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label={fr ? 'Fermer le panier' : 'Close the cart'}
            className="grid h-11 w-11 place-items-center text-[#1c1712] transition-colors hover:text-[#7d6330]"
          >
            <X size={20} />
          </button>
        </div>

        {/* L'ajout se confirme même lorsque le panier glisse sans qu'on le remarque. */}
        <div
          aria-live="polite"
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ${flashTitle ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="mx-6 mt-4 flex items-center gap-3 border border-[#9c7a44]/40 bg-[#efe6d7] px-4 py-2.5">
            <Check size={14} className="shrink-0 text-[#7d6330]" />
            <p className="truncate text-[0.78rem] text-[#1c1712]">
              <span className="mr-2 text-[0.58rem] uppercase tracking-[0.22em] text-[#7d6330]">{fr ? 'Ajouté' : 'Added'}</span>
              {flashTitle}
            </p>
          </div>
        </div>

        {/* Articles */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag size={34} weight="light" className="mb-5 text-[#9c7a44]" />
              <p className="text-[1.4rem] font-light" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>{fr ? 'Le panier est vide.' : 'The cart is empty.'}</p>
              <Link
                to="/boutique"
                onClick={() => setCartOpen(false)}
                className="mt-6 inline-flex items-center gap-2 border-b border-[#1c1712] pb-1.5 text-[0.68rem] uppercase tracking-[0.2em] transition-colors hover:border-[#9c7a44] hover:text-[#7d6330]"
              >
                {fr ? 'Voir la boutique' : 'See the shop'} <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#1c1712]/10">
              {cartItems.map((item, i) => (
                <li key={i} className="flex gap-4 py-5 first:pt-0">
                  <CaseProduit src={item.image || item.cover} alt="" ratio="aspect-[4/5]" largeur={200} marge="p-1.5" filet={false} className="w-20 shrink-0 border border-[#9c7a44]/30" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[0.56rem] uppercase tracking-[0.24em] text-[#7d6330]">{libelleConnu(item.type, lang) || 'INSPIRATA'}</p>
                    <h4 className="mt-1.5 text-[1.1rem] font-light leading-snug" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>{item.title || item.name}</h4>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="text-[1.05rem] font-light tabular-nums text-[#7d6330]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>{item.price}</span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(i)}
                        className="border-b border-[#1c1712]/30 pb-0.5 text-[0.6rem] uppercase tracking-[0.2em] text-[#1c1712]/65 transition-colors hover:border-[#9c7a44] hover:text-[#7d6330]"
                      >
                        {fr ? 'Retirer' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pied */}
        {cartItems.length > 0 && (
          <div className="border-t border-[#1c1712]/12 bg-[#efe6d7] px-6 pt-5 pb-6">
            <div className="mb-5 flex items-baseline justify-between">
              <span className="text-[0.62rem] uppercase tracking-[0.26em] text-[#1c1712]/70">Total</span>
              <span className="text-[1.6rem] font-light tabular-nums" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>{totalFormatted}</span>
            </div>
            {checkoutError && (
              <p className="mb-4 text-center text-[0.78rem] text-[#8a2f1f]">{checkoutError}</p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!canCheckout || checkingOut}
              className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 bg-[#1c1712] px-7 text-[0.7rem] uppercase tracking-[0.2em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingOut
                ? (fr ? 'Redirection vers le paiement…' : 'Redirecting to checkout…')
                : <>{fr ? 'Passer la commande' : 'Checkout'} <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
            </button>
            <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-[#1c1712]/55">
              {canCheckout
                ? (fr ? 'Paiement sécurisé par Shopify, en dollars canadiens.' : 'Secure checkout by Shopify, in Canadian dollars.')
                : (fr ? 'Aucun article éligible à la commande.' : 'No items eligible for checkout.')}
            </p>
          </div>
        )}
      </aside>
    </>
    </Portail>
  );
};

export default CartDrawer;
