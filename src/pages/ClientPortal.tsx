import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { logout } from '../firebase/auth';
import { updateMember, getClientOrdersForMember, getDoshaResultsForMember, getGuideResponsesForMember, type ClientOrder, type DoshaResult, type GuideResponse } from '../firebase/firestore';
import { uploadImage } from '../firebase/storage';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../shopify';
import { findOilForDosha } from '../lib/shopifyOil';
import { ritualForDosha } from '../lib/doshaRituals';
import { jsPDF } from 'jspdf';
import ClientSupport from './client/ClientSupport';
import ClientArchives from './client/ClientArchives';
import ClientLoyalty from './client/ClientLoyalty';
import { subscribeToMemberPoints, type PointsBalance, DEFAULT_POINTS_BALANCE } from '../firebase/points';

type Tab = 'profile' | 'orders' | 'loyalty' | 'dosha' | 'archives' | 'support';

const ClientPortal: React.FC = () => {
  const { user, member, isAdmin, setSignInOpen, lang } = useApp();
  const [tab, setTab] = useState<Tab>('profile');
  // Live points balance for the header chip. Subscribed here once so all
  // tabs share the same stream rather than each re-subscribing.
  const [pointsBalance, setPointsBalance] = useState<PointsBalance>(DEFAULT_POINTS_BALANCE);
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMemberPoints(user.uid, setPointsBalance);
    return unsub;
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-serif text-[#0B1A36] dark:text-white mb-4">
            {lang === 'FR' ? 'Espace Client' : 'Client Space'}
          </h1>
          <p className="text-[#0B1A36]/60 dark:text-white/60 mb-8">
            {lang === 'FR' ? 'Connectez-vous pour accéder à votre espace.' : 'Sign in to access your space.'}
          </p>
          <button onClick={() => setSignInOpen(true)} className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors">
            {lang === 'FR' ? 'Se connecter' : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-serif text-[#0B1A36] dark:text-white mb-4">
            {lang === 'FR' ? 'Compte Administrateur' : 'Admin Account'}
          </h1>
          <p className="text-[#0B1A36]/60 dark:text-white/60 mb-8">
            {lang === 'FR' ? 'Votre tableau de bord est dans l\'espace admin.' : 'Your dashboard is in the admin space.'}
          </p>
          <a href="/admin" className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors inline-block">
            {lang === 'FR' ? 'Aller au tableau de bord' : 'Go to admin dashboard'}
          </a>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile',  label: lang === 'FR' ? 'Profil' : 'Profile', icon: 'fa-user' },
    { id: 'orders',   label: lang === 'FR' ? 'Commandes' : 'Orders', icon: 'fa-box' },
    { id: 'loyalty',  label: lang === 'FR' ? 'Points' : 'Points', icon: 'fa-seedling' },
    { id: 'dosha',    label: lang === 'FR' ? 'Dosha' : 'Dosha', icon: 'fa-circle-nodes' },
    { id: 'archives', label: lang === 'FR' ? 'Archives' : 'Archives', icon: 'fa-envelope-open-text' },
    { id: 'support',  label: lang === 'FR' ? 'Support' : 'Support', icon: 'fa-comments' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-28 pb-24">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="bg-white dark:bg-[#0B1A36] rounded-[24px] shadow-sm border border-[#0B1A36]/5 dark:border-white/5 p-6 md:p-8 mb-6 flex flex-wrap items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-cover bg-center bg-[#F5F5F0] dark:bg-white/5 border-2 border-[#D4AF37]/30" style={{ backgroundImage: member?.photoURL ? `url(${member.photoURL})` : (user.photoURL ? `url(${user.photoURL})` : undefined) }}>
              {!member?.photoURL && !user.photoURL && (
                <div className="w-full h-full flex items-center justify-center text-[#0B1A36]/30 dark:text-white/30">
                  <i className="fa-solid fa-user text-2xl" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-serif text-[#0B1A36] dark:text-white">
                {member?.displayName || user.displayName || user.email?.split('@')[0]}
              </h1>
              {member?.dosha && (
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  <i className="fa-solid fa-circle-nodes mr-1" /> {member.dosha}
                </span>
              )}
              {/* Balance chip — always visible in the header, clickable to
                  jump straight to the Points tab. */}
              <button
                type="button"
                onClick={() => setTab('loyalty')}
                className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full bg-[#0B1A36] text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
              >
                <i className="fa-solid fa-seedling mr-1" />
                {pointsBalance.balance} {lang === 'FR' ? 'pts' : 'pts'}
              </button>
            </div>
            <p className="text-sm text-[#0B1A36]/50 dark:text-white/50 mt-1">{user.email}</p>
          </div>
          <button onClick={logout} className="text-xs uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 hover:text-red-500">
            <i className="fa-solid fa-right-from-bracket mr-2" />{lang === 'FR' ? 'Déconnexion' : 'Sign out'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? 'bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36]'
                  : 'bg-white dark:bg-[#0B1A36]/60 text-[#0B1A36]/60 dark:text-white/60 hover:text-[#D4AF37] border border-[#0B1A36]/5 dark:border-white/5'
              }`}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-[#0B1A36] rounded-[24px] shadow-sm border border-[#0B1A36]/5 dark:border-white/5 p-6 md:p-8">
          {tab === 'profile'  && <ProfileTab />}
          {tab === 'orders'   && <OrdersTab />}
          {tab === 'loyalty'  && <ClientLoyalty />}
          {tab === 'dosha'    && <DoshaTab />}
          {tab === 'archives' && <ClientArchives />}
          {tab === 'support'  && <ClientSupport />}
        </div>
      </div>
    </div>
  );
};

// ─── Profile tab ──────────────────────────────────────────────────────────────
const ProfileTab: React.FC = () => {
  const { user, member, lang } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(member?.displayName || user?.displayName || '');
    setPhone(member?.phone || '');
  }, [member, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true); setSaved(false);
    try {
      await updateMember(user.uid, { displayName: displayName.trim(), phone: phone.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, `members/${user.uid}`);
      await updateMember(user.uid, { photoURL: url });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1">
        <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-3">Photo</label>
        <div className="relative w-40 h-40 rounded-full overflow-hidden bg-[#F5F5F0] dark:bg-white/5 border-2 border-[#D4AF37]/30 bg-cover bg-center" style={{ backgroundImage: member?.photoURL ? `url(${member.photoURL})` : (user?.photoURL ? `url(${user.photoURL})` : undefined) }}>
          {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-white text-xl" /></div>}
        </div>
        <label className="inline-block mt-3 text-xs uppercase tracking-widest text-[#D4AF37] hover:underline cursor-pointer">
          <i className="fa-solid fa-camera mr-2" />{lang === 'FR' ? 'Changer la photo' : 'Change photo'}
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
        </label>
      </div>
      <div className="md:col-span-2 space-y-5">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Nom' : 'Name'}</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Courriel' : 'Email'}</label>
          <input value={user?.email || ''} disabled className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36]/60 dark:text-white/60 outline-none" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">{lang === 'FR' ? 'Téléphone' : 'Phone'}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 …" className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]" />
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button onClick={save} disabled={saving} className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-50">
            {saving ? (lang === 'FR' ? 'Enregistrement…' : 'Saving…') : (lang === 'FR' ? 'Enregistrer' : 'Save')}
          </button>
          {saved && <span className="text-xs text-green-600 uppercase tracking-widest"><i className="fa-solid fa-check mr-1" />{lang === 'FR' ? 'Enregistré' : 'Saved'}</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Orders tab ──────────────────────────────────────────────────────────────
const STATUS_LABELS_FR: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payé',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
};
const STATUS_LABELS_EN: Record<string, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-50 text-yellow-600',
  paid: 'bg-blue-50 text-blue-600',
  shipped: 'bg-indigo-50 text-indigo-600',
  delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500',
};

const OrdersTab: React.FC = () => {
  const { user, lang } = useApp();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getClientOrdersForMember(user.uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;
  if (!orders.length) {
    return (
      <div className="text-center py-12">
        <i className="fa-regular fa-box text-4xl text-[#0B1A36]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic">
          {lang === 'FR' ? 'Aucune commande pour l\'instant.' : 'No orders yet.'}
        </p>
      </div>
    );
  }

  const labels = lang === 'FR' ? STATUS_LABELS_FR : STATUS_LABELS_EN;
  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div key={o.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-[20px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                {o.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || '—'}
              </p>
              <p className="text-sm font-mono text-[#0B1A36]/60 dark:text-white/60">#{o.id?.slice(0, 8)}</p>
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-[#0B1A36]/5 text-[#0B1A36]/60'}`}>
              {labels[o.status] || o.status}
            </span>
          </div>
          <ul className="space-y-1 mb-3">
            {o.items.map((it, i) => (
              <li key={i} className="text-sm text-[#0B1A36]/80 dark:text-white/80 flex justify-between">
                <span>{it.quantity}× {it.title}</span>
                {it.price && <span className="text-[#0B1A36]/60 dark:text-white/60">{it.price}</span>}
              </li>
            ))}
          </ul>
          {o.subtotal && <p className="text-sm font-bold text-[#D4AF37] mb-2">Total: {o.subtotal}</p>}
          {o.trackingNumber && (
            <div className="mt-3 pt-3 border-t border-[#0B1A36]/5 dark:border-white/5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60 mb-1">
                {lang === 'FR' ? 'Numéro de suivi' : 'Tracking number'}
              </p>
              {o.trackingUrl ? (
                <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-[#D4AF37] underline hover:text-[#0B1A36] dark:hover:text-white">{o.trackingNumber}</a>
              ) : (
                <p className="text-sm font-mono text-[#0B1A36] dark:text-white">{o.trackingNumber}</p>
              )}
            </div>
          )}
          {o.checkoutUrl && o.status === 'pending_payment' && (
            <a href={o.checkoutUrl} className="inline-block mt-3 text-xs text-[#D4AF37] hover:underline">
              <i className="fa-solid fa-arrow-right mr-1" />{lang === 'FR' ? 'Finaliser le paiement' : 'Complete payment'}
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Dosha tab ───────────────────────────────────────────────────────────────
const DoshaTab: React.FC = () => {
  const { user, member, lang, addToCart } = useApp();
  const [results, setResults] = useState<DoshaResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [guideResponses, setGuideResponses] = useState<GuideResponse[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDoshaResultsForMember(user.uid)
      .then(setResults)
      .finally(() => setLoading(false));
    getGuideResponsesForMember(user.uid).then(setGuideResponses).catch(() => setGuideResponses([]));
  }, [user]);

  // Pull the Shopify catalog so we can surface the oil matching the member's
  // dominant dosha. Failures are silent — the recommendation simply falls
  // back to a link to the body-oils collection.
  useEffect(() => {
    if (!isShopifyConfigured) return;
    getProducts(50, lang).then(setProducts).catch(() => setProducts([]));
  }, [lang]);

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;

  // Latest saved result drives the % breakdown. Older results fall into the
  // history list below.
  const latest = results[0];
  const dominant = latest?.dominant || member?.dosha || '';

  // Rank the three doshas by percentage. Used to surface a "second dominant"
  // oil recommendation when the runner-up is meaningful (≥ 30%).
  const rankedDoshas: Array<{ name: string; pct: number }> = latest
    ? (['vata', 'pitta', 'kapha'] as const)
        .map(d => ({ name: d.charAt(0).toUpperCase() + d.slice(1), pct: latest[d] || 0 }))
        .sort((a, b) => b.pct - a.pct)
    : [];
  const SECONDARY_THRESHOLD = 30;
  const secondary = rankedDoshas[1] && rankedDoshas[1].pct >= SECONDARY_THRESHOLD
    ? rankedDoshas[1]
    : null;

  const addOilToCart = (product: ShopifyProduct) => {
    const variant = product.variants.find(v => v.availableForSale) || product.variants[0];
    if (!variant) return;
    addToCart({
      id: product.id,
      variantId: variant.id,
      title: product.title,
      type: product.productType || 'Huile Corporelle',
      price: formatMoney(variant.price, lang),
      priceAmount: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      image: product.featuredImage?.url,
    });
  };

  // Ayurvedic action phrase per dosha — drives the copy above the oil
  // recommendation so it reads as guidance, not a product pitch.
  const doshaGuidance: Record<string, { fr: string; en: string; color: string }> = {
    Vata:  { fr: 'Enraciner · Réchauffer · Apaiser',  en: 'Ground · Warm · Soothe',        color: '#8F9779' },
    Pitta: { fr: 'Rafraîchir · Apaiser · Adoucir',    en: 'Cool · Soothe · Soften',        color: '#BC4A3C' },
    Kapha: { fr: 'Activer · Alléger · Stimuler',      en: 'Activate · Lighten · Stimulate', color: '#4A7C9D' },
  };
  const guidance = doshaGuidance[dominant as keyof typeof doshaGuidance];

  return (
    <div>
      {latest || member?.dosha ? (
        <>
          {/* Headline: dominant dosha + accent color */}
          <div
            className="text-center rounded-[20px] p-8 md:p-10 mb-6 border"
            style={{
              borderColor: guidance ? `${guidance.color}55` : 'rgba(212,175,55,0.2)',
              background: guidance
                ? `linear-gradient(135deg, ${guidance.color}22 0%, ${guidance.color}0A 100%)`
                : 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-3">
              {lang === 'FR' ? 'Votre dominance' : 'Your dominance'}
            </p>
            <h2 className="text-5xl font-serif text-[#0B1A36] dark:text-white mb-2">{dominant}</h2>
            {guidance && (
              <p className="font-serif italic text-[#0B1A36]/70 dark:text-white/70">
                {lang === 'FR' ? guidance.fr : guidance.en}
              </p>
            )}
          </div>

          {/* Percentages — three big numbers with proportional bars. Built
              straight from the latest DoshaResult, which stores percentages,
              not raw scores. */}
          {latest && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {(['vata', 'pitta', 'kapha'] as const).map(d => {
                const pct = latest[d] || 0;
                const label = d.charAt(0).toUpperCase() + d.slice(1);
                const color = doshaGuidance[label]?.color || '#D4AF37';
                const isDominant = label.toLowerCase() === dominant.toLowerCase();
                return (
                  <div
                    key={d}
                    className={`rounded-2xl p-5 border transition-colors ${
                      isDominant
                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10'
                        : 'border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-white/5'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#0B1A36]/70 dark:text-white/70">{label}</span>
                      <span className="text-3xl md:text-4xl font-serif text-[#0B1A36] dark:text-white">
                        {pct}<span className="text-base text-[#0B1A36]/50 dark:text-white/50">%</span>
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rituals — primary (dominant) + runner-up when ≥ 30%. Same
              card renderer for both; each carries its own PDF download. */}
          {(() => {
            const memberName = member?.displayName || user?.displayName || user?.email?.split('@')[0] || '';

            const downloadPdf = (doshaName: string) => {
              const r = ritualForDosha(doshaName);
              if (!r) return;
              const title = lang === 'FR' ? r.titleFR : r.titleEN;
              const subtitle = lang === 'FR' ? r.subtitleFR : r.subtitleEN;
              const moment = lang === 'FR' ? r.momentFR : r.momentEN;
              const steps = lang === 'FR' ? r.stepsFR : r.stepsEN;
              // 1-page A4 branded PDF. Helvetica avoids font-embedding weight.
              const doc = new jsPDF({ unit: 'pt', format: 'a4' });
              const W = doc.internal.pageSize.getWidth();
              const margin = 56;
              let y = margin;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(3);
              doc.line(margin, y, margin + 72, y); y += 24;
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.setTextColor(212, 175, 55);
              doc.text((lang === 'FR' ? 'VOTRE RITUEL · ' : 'YOUR RITUAL · ') + doshaName.toUpperCase(), margin, y);
              y += 28;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(28);
              doc.setTextColor(11, 26, 54); doc.text(title, margin, y); y += 22;
              doc.setFont('helvetica', 'italic'); doc.setFontSize(13);
              doc.setTextColor(90, 90, 100);
              const subLines = doc.splitTextToSize(subtitle, W - margin * 2);
              doc.text(subLines, margin, y); y += subLines.length * 18 + 8;
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.setTextColor(11, 26, 54); doc.text(moment.toUpperCase(), margin, y); y += 24;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.6);
              doc.line(margin, y, W - margin, y); y += 24;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
              doc.setTextColor(20, 20, 30);
              steps.forEach((step, i) => {
                const prefix = `${i + 1}.  `;
                const prefixWidth = doc.getTextWidth(prefix);
                doc.setFont('helvetica', 'bold'); doc.setTextColor(212, 175, 55);
                doc.text(prefix, margin, y);
                doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 20, 30);
                const lines = doc.splitTextToSize(step, W - margin * 2 - prefixWidth);
                doc.text(lines, margin + prefixWidth, y);
                y += lines.length * 16 + 10;
              });
              y = doc.internal.pageSize.getHeight() - margin;
              doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.5);
              doc.line(margin, y - 20, margin + 72, y - 20);
              doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
              doc.setTextColor(130, 130, 140);
              doc.text(
                (memberName ? `${memberName} · ` : '')
                  + `Krystine St-Laurent · Inspirata Ayurveda · ${new Date().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA')}`,
                margin, y);
              const safeName = (memberName || 'mon-rituel').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              doc.save(`rituel-${doshaName.toLowerCase()}-${safeName}.pdf`);
            };

            const renderRitualCard = (doshaName: string, variant: 'primary' | 'secondary', pct: number | null) => {
              const r = ritualForDosha(doshaName);
              if (!r) return null;
              return (
                <div
                  key={`${variant}-${doshaName}`}
                  className="rounded-[20px] p-6 md:p-8 mb-6 border"
                  style={{
                    borderColor: `${r.accent}55`,
                    background: `linear-gradient(135deg, ${r.accent}18 0%, ${r.accent}06 100%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: r.accent }}>
                        {variant === 'primary'
                          ? (lang === 'FR' ? 'Votre rituel' : 'Your ritual')
                          : (lang === 'FR' ? 'En accompagnement · second dosha' : 'As a companion · second dosha')}
                        <span className="ml-2 text-[#0B1A36]/50 dark:text-white/50 font-normal tracking-normal normal-case">
                          · {doshaName}{pct !== null ? ` ${pct}%` : ''}
                        </span>
                      </p>
                      <h3 className="font-serif text-2xl md:text-3xl text-[#0B1A36] dark:text-white mb-1">
                        {lang === 'FR' ? r.titleFR : r.titleEN}
                      </h3>
                      <p className="font-serif italic text-[#0B1A36]/75 dark:text-white/75">
                        {lang === 'FR' ? r.subtitleFR : r.subtitleEN}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadPdf(doshaName)}
                      className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                    >
                      <i className="fa-solid fa-file-pdf" />
                      {lang === 'FR' ? 'Télécharger' : 'Download'}
                    </button>
                  </div>
                  <p className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full bg-white/70 dark:bg-white/10 text-[#0B1A36]/70 dark:text-white/70 mb-5">
                    <i className="fa-regular fa-clock mr-1.5" />
                    {lang === 'FR' ? r.momentFR : r.momentEN}
                  </p>
                  <ol className="space-y-3 text-sm text-[#0B1A36]/85 dark:text-white/85 leading-relaxed">
                    {(lang === 'FR' ? r.stepsFR : r.stepsEN).map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-serif"
                          style={{ backgroundColor: `${r.accent}22`, color: r.accent }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            };

            const primaryPct = latest ? (latest[dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha'] ?? null) : null;
            return (
              <div className="mb-4">
                {renderRitualCard(dominant, 'primary', primaryPct)}
                {secondary && renderRitualCard(secondary.name, 'secondary', secondary.pct)}
              </div>
            );
          })()}

          {/* Oil recommendation(s). Always render the primary (dominant).
              Also render the runner-up when it's ≥ 30% — a true bi-doshic
              profile benefits from both oils. Same card renderer for both;
              the only differences are the kicker label and the percentage
              shown under the name. */}
          {(() => {
            const renderOilCard = (
              doshaName: string,
              kickerFR: string,
              kickerEN: string,
              pct: number | null,
              mb: string,
            ) => {
              const product = doshaName ? findOilForDosha(products, doshaName) : undefined;
              const variant = product?.variants.find(v => v.availableForSale) || product?.variants[0];
              const priceText = variant ? formatMoney(variant.price, lang) : '';
              const soldOut = product ? !product.availableForSale : false;
              return (
                <div className={`rounded-[20px] border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-white/5 p-6 md:p-8 ${mb}`}>
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    {/* Image */}
                    <div
                      className="w-32 h-40 md:w-36 md:h-48 rounded-xl bg-cover bg-center shrink-0 bg-[#F5F5F0] dark:bg-[#0B1A36] border border-[#0B1A36]/5 dark:border-white/10"
                      style={{ backgroundImage: product?.featuredImage?.url ? `url(${product.featuredImage.url})` : undefined }}
                    />
                    {/* Copy */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-2">
                        {lang === 'FR' ? kickerFR : kickerEN}
                        {pct !== null && <span className="text-[#0B1A36]/50 dark:text-white/50 font-normal tracking-normal normal-case ml-2">· {doshaName} {pct}%</span>}
                      </p>
                      {product ? (
                        <>
                          <h3 className="text-xl md:text-2xl font-serif text-[#0B1A36] dark:text-white mb-1">{product.title}</h3>
                          {product.productType && (
                            <p className="text-[11px] uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 mb-3">{product.productType}</p>
                          )}
                          <p className="text-lg font-serif text-[#D4AF37] mb-4">{priceText}</p>
                          <div className="flex flex-wrap gap-3">
                            {!soldOut && variant ? (
                              <button
                                type="button"
                                onClick={() => addOilToCart(product)}
                                className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md"
                              >
                                <i className="fa-solid fa-basket-shopping text-[10px]" />
                                {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#0B1A36]/10 dark:bg-white/10 text-[#0B1A36]/60 dark:text-white/60">
                                {lang === 'FR' ? 'Épuisé' : 'Sold out'}
                              </span>
                            )}
                            <a
                              href="/boutique/huiles-corporelles"
                              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#0B1A36]/15 dark:border-white/15 text-[#0B1A36]/70 dark:text-white/70 font-bold uppercase tracking-widest text-[11px] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                            >
                              {lang === 'FR' ? 'Voir la collection' : 'View the collection'}
                              <i className="fa-solid fa-arrow-right text-[9px]" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl md:text-2xl font-serif text-[#0B1A36] dark:text-white mb-2">
                            {lang === 'FR' ? `Huile Corporelle ${doshaName}` : `${doshaName} Body Oil`}
                          </h3>
                          <p className="text-[#0B1A36]/60 dark:text-white/60 mb-4 font-serif italic text-sm">
                            {lang === 'FR'
                              ? "La formule qui correspond à cette dominance est bientôt en ligne — explorez la collection pour choisir celle qui vous appelle."
                              : 'The matching formula is coming online soon — explore the collection to choose the one that calls to you.'}
                          </p>
                          <a
                            href="/boutique/huiles-corporelles"
                            className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
                          >
                            {lang === 'FR' ? 'Voir les huiles corporelles' : 'View body oils'}
                            <i className="fa-solid fa-arrow-right text-[9px]" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            const primaryPct = latest ? (latest[dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha'] ?? null) : null;
            return (
              <>
                {renderOilCard(
                  dominant,
                  'Huile recommandée pour vous',
                  'Oil recommended for you',
                  primaryPct,
                  secondary ? 'mb-4' : 'mb-10',
                )}
                {secondary && renderOilCard(
                  secondary.name,
                  'En accompagnement · votre second dosha',
                  'As a companion · your second dosha',
                  secondary.pct,
                  'mb-10',
                )}
              </>
            );
          })()}
        </>
      ) : (
        <div className="text-center py-12 mb-4">
          <i className="fa-solid fa-circle-nodes text-4xl text-[#0B1A36]/30 dark:text-white/30 mb-4 block" />
          <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic mb-6">
            {lang === 'FR' ? 'Vous n\'avez pas encore complété le Quiz Dosha.' : "You haven't taken the Dosha Quiz yet."}
          </p>
          <a href="/quiz" className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors">
            {lang === 'FR' ? 'Faire le quiz' : 'Take the quiz'} <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      )}

      {results.length > 0 && (
        <>
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">
            {lang === 'FR' ? 'Historique des résultats' : 'Results history'}
          </h3>
          <div className="space-y-3">
            {results.map(r => (
              <div key={r.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#0B1A36] dark:text-white">
                    <span className="text-[#D4AF37] font-bold capitalize">{r.dominant}</span>
                    <span className="text-[#0B1A36]/50 dark:text-white/50 ml-3 text-xs font-mono">V{r.vata}%·P{r.pitta}%·K{r.kapha}%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                    {r.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Past "Laissez-vous guider" routings — surfaced here so the member's
          self-knowledge journey lives in one place. */}
      {guideResponses.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">
            <i className="fa-solid fa-compass text-[#D4AF37] mr-2" />
            {lang === 'FR' ? 'Vos parcours suggérés' : 'Your suggested paths'}
          </h3>
          <div className="space-y-3">
            {guideResponses.map(g => (
              <div key={g.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-xl p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-sm text-[#0B1A36] dark:text-white">
                    <span className="text-[#D4AF37] font-bold">{g.recommendationLabel || g.recommendationId}</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                    {g.createdAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </p>
                </div>
                {g.answers?.length > 0 && (
                  <details className="text-xs text-[#0B1A36]/60 dark:text-white/60">
                    <summary className="cursor-pointer hover:text-[#D4AF37] transition-colors">
                      {lang === 'FR' ? 'Voir les réponses' : 'View answers'}
                    </summary>
                    <ul className="mt-2 space-y-1.5 pl-4 list-disc">
                      {g.answers.map((a, i) => (
                        <li key={i}>
                          <span className="font-bold">{a.questionLabel || a.qid}</span>
                          {' — '}
                          <span className="italic">{a.optionLabel || a.optionId}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;
