import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ASSETS } from '../../content';
import { createCheckout, formatMoney, isShopifyConfigured } from '../../shopify';
import { addClientOrder } from '../../firebase/firestore';

const CartDrawer: React.FC = () => {
  const { cartItems, removeFromCart, cartTotal, cartOpen, setCartOpen, lang, user } = useApp();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      const url = await createCheckout(lines, lang);

      // Log the order in Firestore (if user is signed in) so it appears in their client space.
      if (user?.email) {
        const orderItems = shopifyItems.map(i => ({
          title: i.title || '',
          price: i.price || '',
          quantity: 1,
          image: i.image,
          variantId: i.variantId,
        }));
        const currency = shopifyItems.find(i => i.priceCurrency)?.priceCurrency || 'CAD';
        const subtotalFormatted = formatMoney({ amount: cartTotal, currencyCode: currency }, lang);
        try {
          await addClientOrder({
            uid: user.uid,
            email: user.email,
            items: orderItems,
            subtotal: subtotalFormatted,
            currency,
            checkoutUrl: url,
            status: 'pending_payment',
          });
        } catch (e) { console.warn('[cart] addClientOrder failed', e); }
      }

      window.location.href = url;
    } catch (e: any) {
      setCheckoutError(e?.message || 'Checkout failed');
      setCheckingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0B1A36] shadow-2xl z-[101] transform transition-transform duration-500 ease-out flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-[#0B1A36]/10 dark:border-white/10 flex justify-between items-center bg-[#F5F5F0] dark:bg-[#050C1A]">
          <h3 className="text-2xl font-serif text-[#0B1A36] dark:text-white">
            {lang === 'FR' ? 'Panier' : 'Cart'}
          </h3>
          <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center hover:text-[#D4AF37] transition-colors">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 text-[#0B1A36] dark:text-white">
              <i className="fa-solid fa-basket-shopping text-4xl mb-4" />
              <p className="text-sm uppercase tracking-widest">{lang === 'FR' ? 'Panier vide' : 'Empty cart'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div
                    className="w-20 h-24 rounded-lg bg-[#f0f0ec] bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${item.image || item.cover || ASSETS.productVata})` }}
                  />
                  <div className="flex-1">
                    <h4 className="font-serif text-[#0B1A36] dark:text-white leading-tight mb-1">{item.title || item.name}</h4>
                    <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-wider mb-2">{item.type}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#D4AF37]">{item.price}</span>
                      <button onClick={() => removeFromCart(i)} className="text-xs text-red-400 hover:text-red-600 underline transition-colors">
                        {lang === 'FR' ? 'Retirer' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-[#F5F5F0] dark:bg-[#050C1A] border-t border-[#0B1A36]/10 dark:border-white/10">
            <div className="flex justify-between mb-6 text-lg font-serif font-bold text-[#0B1A36] dark:text-white">
              <span>Total</span>
              <span>{totalFormatted}</span>
            </div>
            {checkoutError && (
              <p className="mb-4 text-xs text-red-500 text-center">{checkoutError}</p>
            )}
            <button
              onClick={handleCheckout}
              disabled={!canCheckout || checkingOut}
              className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingOut
                ? (lang === 'FR' ? 'Redirection vers Shopify…' : 'Redirecting to Shopify…')
                : (lang === 'FR' ? 'Passer la commande' : 'Checkout')}
            </button>
            {!canCheckout && (
              <p className="mt-3 text-[10px] text-center text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest">
                {lang === 'FR' ? 'Aucun article éligible à la commande' : 'No items eligible for checkout'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
