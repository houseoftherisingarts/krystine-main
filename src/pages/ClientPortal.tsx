import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { logout } from '../firebase/auth';
import { updateMember, getClientOrdersForMember, getDoshaResultsForMember, type ClientOrder, type DoshaResult } from '../firebase/firestore';
import { uploadImage } from '../firebase/storage';
import ClientSupport from './client/ClientSupport';

type Tab = 'profile' | 'orders' | 'dosha' | 'support';

const ClientPortal: React.FC = () => {
  const { user, member, isAdmin, setSignInOpen, lang } = useApp();
  const [tab, setTab] = useState<Tab>('profile');

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
    { id: 'profile', label: lang === 'FR' ? 'Profil' : 'Profile', icon: 'fa-user' },
    { id: 'orders',  label: lang === 'FR' ? 'Commandes' : 'Orders', icon: 'fa-box' },
    { id: 'dosha',   label: lang === 'FR' ? 'Dosha' : 'Dosha', icon: 'fa-circle-nodes' },
    { id: 'support', label: lang === 'FR' ? 'Support' : 'Support', icon: 'fa-envelope' },
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
          {tab === 'profile' && <ProfileTab />}
          {tab === 'orders'  && <OrdersTab />}
          {tab === 'dosha'   && <DoshaTab />}
          {tab === 'support' && <ClientSupport />}
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
  const { user, member, lang } = useApp();
  const [results, setResults] = useState<DoshaResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDoshaResultsForMember(user.uid)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;

  return (
    <div>
      {member?.dosha ? (
        <div className="text-center bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-[20px] p-10 mb-8 border border-[#D4AF37]/20">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-3">{lang === 'FR' ? 'Votre dominance' : 'Your dominance'}</p>
          <h2 className="text-5xl font-serif text-[#0B1A36] dark:text-white mb-2">{member.dosha}</h2>
        </div>
      ) : (
        <div className="text-center py-12 mb-4">
          <i className="fa-solid fa-circle-nodes text-4xl text-[#0B1A36]/30 dark:text-white/30 mb-4 block" />
          <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic mb-6">
            {lang === 'FR' ? 'Vous n\'avez pas encore complété le Quiz Dosha.' : "You haven't taken the Dosha Quiz yet."}
          </p>
          <a href="/ayurveda" className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors">
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
                    <span className="text-[#0B1A36]/50 dark:text-white/50 ml-3 text-xs font-mono">V{r.vata}·P{r.pitta}·K{r.kapha}</span>
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
    </div>
  );
};

export default ClientPortal;
