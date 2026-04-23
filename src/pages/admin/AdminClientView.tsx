import React, { useEffect, useState } from 'react';
import {
  getMember, getClientOrdersForMember, getDoshaResultsForMember, getGuideResponsesForMember,
  type MemberDoc, type ClientOrder, type DoshaResult, type GuideResponse,
} from '../../firebase/firestore';
import { getProducts, formatMoney, isShopifyConfigured, type ShopifyProduct } from '../../shopify';
import { findOilForDosha } from '../../lib/shopifyOil';
import {
  getMemberPoints, listPointsEvents, listMyRewardRedemptions, adjustPoints, reconcileBalance,
  type PointsBalance, type PointsEvent, type RewardRedemption,
} from '../../firebase/points';
import { tierFromLifetime } from '../../lib/pointsConfig';

// Read-only admin view of a client's portal — the same visual language as the
// real ClientPortal (profile card + tabs + cards) but served from the admin
// shell and plumbed with a specific uid. No mutations: profile fields are
// shown as plain text, no edit/upload controls, no cart buttons.

type Tab = 'profile' | 'orders' | 'loyalty' | 'dosha';

interface Props {
  uid: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  paid: 'Payé',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
};
const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-50 text-yellow-600',
  paid: 'bg-blue-50 text-blue-600',
  shipped: 'bg-indigo-50 text-indigo-600',
  delivered: 'bg-green-50 text-green-600',
  cancelled: 'bg-red-50 text-red-500',
};

const DOSHA_GUIDANCE: Record<string, { fr: string; color: string }> = {
  Vata:  { fr: 'Enraciner · Réchauffer · Apaiser',  color: '#8F9779' },
  Pitta: { fr: 'Rafraîchir · Apaiser · Adoucir',    color: '#BC4A3C' },
  Kapha: { fr: 'Activer · Alléger · Stimuler',      color: '#4A7C9D' },
};

const AdminClientView: React.FC<Props> = ({ uid, onClose }) => {
  const [tab, setTab] = useState<Tab>('profile');
  const [member, setMember] = useState<MemberDoc | null | undefined>(undefined);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [doshaResults, setDoshaResults] = useState<DoshaResult[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [pointsBalance, setPointsBalance] = useState<PointsBalance>({ balance: 0, lifetime: 0 });
  const [pointsEvents, setPointsEvents] = useState<PointsEvent[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [guideResponses, setGuideResponses] = useState<GuideResponse[]>([]);

  useEffect(() => {
    getMember(uid).then(setMember);
    getClientOrdersForMember(uid).then(setOrders);
    getDoshaResultsForMember(uid).then(setDoshaResults);
    getMemberPoints(uid).then(setPointsBalance);
    listPointsEvents(uid, 50).then(setPointsEvents);
    listMyRewardRedemptions(uid).then(setRedemptions);
    getGuideResponsesForMember(uid).then(setGuideResponses).catch(() => setGuideResponses([]));
    if (isShopifyConfigured) getProducts(50, 'FR').then(setProducts).catch(() => setProducts([]));
  }, [uid]);

  // Close on Escape — standard modal affordance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profil',    icon: 'fa-user' },
    { id: 'orders',  label: 'Commandes', icon: 'fa-box' },
    { id: 'loyalty', label: 'Points',    icon: 'fa-seedling' },
    { id: 'dosha',   label: 'Dosha',     icon: 'fa-circle-nodes' },
  ];

  const name = member?.displayName || member?.email?.split('@')[0] || '—';

  return (
    <div className="fixed inset-0 z-[85] bg-[#0B1A36]/55 backdrop-blur-md overflow-y-auto" onClick={onClose}>
      <div
        className="min-h-full flex items-start justify-center p-4 md:p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full max-w-5xl bg-[#F5F5F0] dark:bg-[#050C1A] rounded-[24px] shadow-2xl border border-[#D4AF37]/20 overflow-hidden">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 dark:bg-[#0B1A36]/80 backdrop-blur flex items-center justify-center text-[#0B1A36] dark:text-white hover:bg-[#D4AF37] hover:text-white transition-colors"
          >
            <i className="fa-solid fa-times text-lg" />
          </button>

          {/* Read-only banner */}
          <div className="bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 px-6 md:px-8 py-3 text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] flex items-center gap-2">
            <i className="fa-solid fa-eye" />
            Aperçu admin · Espace client en lecture seule
          </div>

          {/* Header — same layout as ClientPortal's profile card */}
          <div className="p-6 md:p-8">
            <div className="bg-white dark:bg-[#0B1A36] rounded-[24px] shadow-sm border border-[#0B1A36]/5 dark:border-white/5 p-6 md:p-8 mb-6 flex flex-wrap items-center gap-5">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full bg-cover bg-center bg-[#F5F5F0] dark:bg-white/5 border-2 border-[#D4AF37]/30"
                  style={{ backgroundImage: member?.photoURL ? `url(${member.photoURL})` : undefined }}
                >
                  {!member?.photoURL && (
                    <div className="w-full h-full flex items-center justify-center text-[#0B1A36]/30 dark:text-white/30">
                      <i className="fa-solid fa-user text-2xl" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-serif text-[#0B1A36] dark:text-white">
                    {name}
                  </h1>
                  {member?.dosha && (
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      <i className="fa-solid fa-circle-nodes mr-1" /> {member.dosha}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#0B1A36]/50 dark:text-white/50 mt-1">{member?.email || '—'}</p>
                {member?.joinedAt && (
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#0B1A36]/40 dark:text-white/40 mt-1">
                    Inscrit · {member.joinedAt.toDate().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
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
              {member === undefined ? (
                <div className="py-12 flex justify-center">
                  <i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" />
                </div>
              ) : member === null ? (
                <div className="py-12 text-center text-[#0B1A36]/60 dark:text-white/60 font-serif italic">
                  Aucun profil membre trouvé pour cet identifiant.
                </div>
              ) : tab === 'profile' ? (
                <ProfileView member={member} />
              ) : tab === 'orders' ? (
                <OrdersView orders={orders} />
              ) : tab === 'loyalty' ? (
                <LoyaltyView
                  uid={uid}
                  balance={pointsBalance}
                  events={pointsEvents}
                  redemptions={redemptions}
                  onRefresh={async () => {
                    const [b, e] = await Promise.all([
                      getMemberPoints(uid),
                      listPointsEvents(uid, 50),
                    ]);
                    setPointsBalance(b);
                    setPointsEvents(e);
                  }}
                />
              ) : (
                <DoshaView member={member} results={doshaResults} products={products} guideResponses={guideResponses} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Profile (read-only) ─────────────────────────────────────────────────────
const ProfileView: React.FC<{ member: MemberDoc }> = ({ member }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <div className="md:col-span-1">
      <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-3">Photo</label>
      <div
        className="w-40 h-40 rounded-full overflow-hidden bg-[#F5F5F0] dark:bg-white/5 border-2 border-[#D4AF37]/30 bg-cover bg-center"
        style={{ backgroundImage: member.photoURL ? `url(${member.photoURL})` : undefined }}
      >
        {!member.photoURL && (
          <div className="w-full h-full flex items-center justify-center text-[#0B1A36]/30 dark:text-white/30">
            <i className="fa-solid fa-user text-4xl" />
          </div>
        )}
      </div>
    </div>
    <div className="md:col-span-2 space-y-5">
      <ReadField label="Nom"           value={member.displayName} />
      <ReadField label="Courriel"      value={member.email} />
      <ReadField label="Téléphone"     value={member.phone} />
      <ReadField label="Dosha dominant" value={member.dosha} accent />
      <ReadField label="Méthode d'authentification" value={member.provider} />
      <ReadField
        label="Inscrit à l'infolettre"
        value={member.newsletterSubscribed ? `Oui${member.newsletterSource ? ` · ${member.newsletterSource}` : ''}` : 'Non'}
      />
    </div>
  </div>
);

const ReadField: React.FC<{ label: string; value?: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <label className="block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">{label}</label>
    <p className={`px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-sm ${
      accent ? 'text-[#D4AF37] font-bold' : 'text-[#0B1A36] dark:text-white'
    }`}>
      {value || '—'}
    </p>
  </div>
);

// ─── Orders (read-only, same card layout as ClientPortal) ────────────────────
const OrdersView: React.FC<{ orders: ClientOrder[] }> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fa-regular fa-box text-4xl text-[#0B1A36]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#0B1A36]/60 dark:text-white/60 font-serif italic">Aucune commande pour l'instant.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {orders.map(o => (
        <div key={o.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-[20px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                {o.createdAt?.toDate().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || '—'}
              </p>
              <p className="text-sm font-mono text-[#0B1A36]/60 dark:text-white/60">#{o.id?.slice(0, 8)}</p>
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-[#0B1A36]/5 text-[#0B1A36]/60'}`}>
              {STATUS_LABELS[o.status] || o.status}
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
          {o.subtotal && <p className="text-sm font-bold text-[#D4AF37]">Total : {o.subtotal}</p>}
          {o.trackingNumber && (
            <p className="mt-3 pt-3 border-t border-[#0B1A36]/5 dark:border-white/5 text-sm">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60 block mb-1">Suivi</span>
              <span className="font-mono text-[#0B1A36] dark:text-white">{o.trackingNumber}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Dosha (read-only, same % + oil rec layout as client view) ───────────────
const DoshaView: React.FC<{ member: MemberDoc; results: DoshaResult[]; products: ShopifyProduct[]; guideResponses: GuideResponse[] }> = ({ member, results, products, guideResponses }) => {
  const latest = results[0];
  const dominant = latest?.dominant || member.dosha || '';
  const guidance = DOSHA_GUIDANCE[dominant as keyof typeof DOSHA_GUIDANCE];

  if (!latest && !member.dosha) {
    return (
      <div className="text-center py-12 text-[#0B1A36]/60 dark:text-white/60 font-serif italic">
        Cette cliente n'a pas encore complété le Quiz Dosha.
      </div>
    );
  }

  const ranked: Array<{ name: string; pct: number }> = latest
    ? (['vata', 'pitta', 'kapha'] as const)
        .map(d => ({ name: d.charAt(0).toUpperCase() + d.slice(1), pct: latest[d] || 0 }))
        .sort((a, b) => b.pct - a.pct)
    : [];
  const secondary = ranked[1] && ranked[1].pct >= 30 ? ranked[1] : null;

  const recommendFor = (doshaName: string) => findOilForDosha(products, doshaName);

  return (
    <div>
      {/* Dominant headline */}
      <div
        className="text-center rounded-[20px] p-8 md:p-10 mb-6 border"
        style={{
          borderColor: guidance ? `${guidance.color}55` : 'rgba(212,175,55,0.2)',
          background: guidance
            ? `linear-gradient(135deg, ${guidance.color}22 0%, ${guidance.color}0A 100%)`
            : 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))',
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-3">Dominance</p>
        <h2 className="text-5xl font-serif text-[#0B1A36] dark:text-white mb-2">{dominant}</h2>
        {guidance && (
          <p className="font-serif italic text-[#0B1A36]/70 dark:text-white/70">{guidance.fr}</p>
        )}
      </div>

      {/* Percentages */}
      {latest && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(['vata', 'pitta', 'kapha'] as const).map(d => {
            const pct = latest[d] || 0;
            const label = d.charAt(0).toUpperCase() + d.slice(1);
            const color = DOSHA_GUIDANCE[label]?.color || '#D4AF37';
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
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Oil recommendations (primary + optional secondary) — no add-to-cart
          in admin view, just the informational card so Krystine sees what
          the client sees. */}
      {[
        { name: dominant, kicker: 'Huile recommandée', pct: latest ? latest[dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha'] ?? null : null },
        ...(secondary ? [{ name: secondary.name, kicker: 'En accompagnement · second dosha', pct: secondary.pct }] : []),
      ].map(rec => {
        const product = rec.name ? recommendFor(rec.name) : undefined;
        const variant = product?.variants.find(v => v.availableForSale) || product?.variants[0];
        return (
          <div key={rec.kicker} className="rounded-[20px] border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6 mb-4 flex items-center gap-5">
            <div
              className="w-20 h-24 rounded-lg bg-cover bg-center shrink-0 bg-[#F5F5F0] dark:bg-[#0B1A36] border border-[#0B1A36]/5 dark:border-white/10"
              style={{ backgroundImage: product?.featuredImage?.url ? `url(${product.featuredImage.url})` : undefined }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-1">
                {rec.kicker}
                {rec.pct !== null && <span className="text-[#0B1A36]/50 dark:text-white/50 font-normal tracking-normal normal-case ml-2">· {rec.name} {rec.pct}%</span>}
              </p>
              {product ? (
                <>
                  <p className="font-serif text-lg text-[#0B1A36] dark:text-white">{product.title}</p>
                  <p className="text-sm text-[#D4AF37]">{variant ? formatMoney(variant.price, 'FR') : ''}</p>
                </>
              ) : (
                <p className="font-serif italic text-[#0B1A36]/60 dark:text-white/60">
                  Aucun produit trouvé en boutique pour « {rec.name} ».
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* History */}
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-3">
            Historique des quiz
          </h3>
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-xl p-3 text-sm">
                <span className="text-[#D4AF37] font-bold capitalize">{r.dominant}</span>
                <span className="text-[#0B1A36]/50 dark:text-white/50 ml-3 text-xs font-mono">V{r.vata}%·P{r.pitta}%·K{r.kapha}%</span>
                <span className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40 ml-3">
                  {r.createdAt?.toDate().toLocaleDateString('fr-CA') || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past "Laissez-vous guider" routings — shown after the dosha quiz
          history so the admin sees both signals in one tab. */}
      {guideResponses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-3">
            <i className="fa-solid fa-compass text-[#D4AF37] mr-2" />
            Parcours « Laissez-vous guider »
          </h3>
          <div className="space-y-3">
            {guideResponses.map(g => (
              <div key={g.id} className="border border-[#0B1A36]/5 dark:border-white/5 rounded-xl p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="text-[#D4AF37] font-bold">{g.recommendationLabel || g.recommendationId}</span>
                  <span className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
                    {g.createdAt?.toDate().toLocaleDateString('fr-CA') || ''}
                  </span>
                </div>
                {g.answers?.length > 0 && (
                  <ul className="text-[11px] text-[#0B1A36]/60 dark:text-white/60 space-y-1 pl-4 list-disc">
                    {g.answers.map((a, i) => (
                      <li key={i}>
                        <span className="font-bold">{a.questionLabel || a.qid}</span>
                        {' — '}
                        <span className="italic">{a.optionLabel || a.optionId}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Loyalty (read-only view + admin manual adjustment) ─────────────────────
const LoyaltyView: React.FC<{
  uid: string;
  balance: PointsBalance;
  events: PointsEvent[];
  redemptions: RewardRedemption[];
  onRefresh: () => Promise<void>;
}> = ({ uid, balance, events, redemptions, onRefresh }) => {
  const { current, next } = tierFromLifetime(balance.lifetime);
  const progressPct = next
    ? Math.min(100, Math.round(((balance.lifetime - current.threshold) / (next.threshold - current.threshold)) * 100))
    : 100;
  const pointsToNext = next ? Math.max(0, next.threshold - balance.lifetime) : 0;
  const pending = redemptions.filter(r => r.status === 'pending');

  // Admin manual adjust — signed delta + optional note. Kept co-located here
  // because the action is only visible inside the admin client-view overlay.
  const [adjustAmount, setAdjustAmount] = React.useState('');
  const [adjustNote, setAdjustNote] = React.useState('');
  const [adjusting, setAdjusting] = React.useState(false);
  const [adjustFeedback, setAdjustFeedback] = React.useState<string | null>(null);

  // Drift detection — if the live balance doc disagrees with the event log
  // we show a Reconcile button. Same math as the client side.
  const computedBalance = events.reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const driftDetected = events.length > 0 && computedBalance !== balance.balance;

  const runReconcile = async () => {
    setAdjusting(true); setAdjustFeedback(null);
    try {
      await reconcileBalance(uid);
      setAdjustFeedback('Solde rétabli à partir de l\'historique.');
      await onRefresh();
    } finally {
      setAdjusting(false);
      setTimeout(() => setAdjustFeedback(null), 3500);
    }
  };

  const submitAdjust = async (sign: 1 | -1) => {
    const raw = parseInt(adjustAmount, 10);
    if (!Number.isFinite(raw) || raw <= 0) return;
    setAdjusting(true); setAdjustFeedback(null);
    try {
      const res = await adjustPoints(uid, sign * raw, adjustNote.trim() || undefined);
      if (res.awarded !== 0) {
        setAdjustFeedback(sign > 0 ? `+${raw} pts ajoutés.` : `−${raw} pts retirés.`);
        setAdjustAmount(''); setAdjustNote('');
        await onRefresh();
      } else {
        setAdjustFeedback('Ajustement refusé.');
      }
    } finally {
      setAdjusting(false);
      setTimeout(() => setAdjustFeedback(null), 3500);
    }
  };

  return (
    <div>
      {/* Balance */}
      <div
        className="rounded-[20px] p-8 md:p-10 mb-6 border text-center"
        style={{
          borderColor: `${current.accent}55`,
          background: `linear-gradient(135deg, ${current.accent}22 0%, ${current.accent}08 100%)`,
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style={{ color: current.accent }}>
          Solde de points
        </p>
        <div className="flex items-baseline justify-center gap-2 mb-3">
          <span className="text-5xl md:text-6xl font-serif text-[#0B1A36] dark:text-white">{balance.balance}</span>
          <span className="text-sm text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest font-bold">pts</span>
        </div>
        <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50 uppercase tracking-widest">
          Total accumulé · {balance.lifetime} · Palier {current.labelFR}
        </p>
      </div>

      {/* Progress */}
      {next && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2 text-[11px] uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60">
            <span>{current.labelFR}</span>
            <span>{pointsToNext} pts vers {next.labelFR}</span>
          </div>
          <div className="relative h-2 rounded-full bg-[#0B1A36]/5 dark:bg-white/10 overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressPct}%`, backgroundColor: current.accent }} />
          </div>
        </div>
      )}

      {driftDetected && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-yellow-300/60 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-bold text-yellow-800 dark:text-yellow-200">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              Solde désynchronisé
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-200/70 mt-1">
              Affiché {balance.balance} · calculé {computedBalance}.
            </p>
          </div>
          <button
            type="button"
            onClick={runReconcile}
            disabled={adjusting}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-50"
          >
            <i className="fa-solid fa-wand-magic-sparkles" /> Rétablir
          </button>
        </div>
      )}

      {/* Manual adjustment — admin-only. Creditting adds to both balance
          and lifetime (counts toward tier). Debiting subtracts from balance
          only — lifetime is never lowered by a debit. */}
      <div className="mb-6 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 p-4 bg-[#F5F5F0]/60 dark:bg-white/5">
        <p className="text-[11px] uppercase tracking-widest font-bold text-[#0B1A36]/70 dark:text-white/70 mb-3">
          <i className="fa-solid fa-scale-balanced mr-2 text-[#D4AF37]" />
          Ajustement manuel
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto_auto] gap-3 items-center">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={adjustAmount}
            onChange={e => setAdjustAmount(e.target.value)}
            placeholder="Montant"
            className="px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 text-sm text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
          />
          <input
            type="text"
            value={adjustNote}
            onChange={e => setAdjustNote(e.target.value)}
            placeholder="Note (facultatif)"
            className="px-3 py-2 rounded-lg border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-[#0B1A36]/60 text-sm text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
          />
          <button
            type="button"
            disabled={adjusting || !adjustAmount}
            onClick={() => submitAdjust(1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-plus" /> Ajouter
          </button>
          <button
            type="button"
            disabled={adjusting || !adjustAmount}
            onClick={() => submitAdjust(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-minus" /> Retirer
          </button>
        </div>
        {adjustFeedback && (
          <p className="mt-3 text-[11px] uppercase tracking-widest font-bold text-[#D4AF37]">
            <i className="fa-solid fa-check mr-1" />
            {adjustFeedback}
          </p>
        )}
        <p className="mt-3 text-[11px] text-[#0B1A36]/50 dark:text-white/50 leading-relaxed">
          Les retraits ne réduisent pas le total accumulé (lifetime) utilisé pour les paliers.
        </p>
      </div>

      {/* Pending redemptions — surfaced loud so Krystine knows to issue a code */}
      {pending.length > 0 && (
        <div className="mb-6 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 p-4">
          <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 mb-2">
            <i className="fa-solid fa-gift mr-2" /> {pending.length} {pending.length === 1 ? 'récompense à honorer' : 'récompenses à honorer'}
          </p>
          <ul className="space-y-1 text-sm text-yellow-900 dark:text-yellow-100">
            {pending.map(r => (
              <li key={r.id}>• {r.rewardLabel} ({r.cost} pts) — demandée le {r.createdAt?.toDate().toLocaleDateString('fr-CA') || '—'}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Event history */}
      <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-3">
        Historique
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-[#0B1A36]/50 dark:text-white/50 italic font-serif py-4">
          Aucune activité pour l'instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map(ev => {
            const positive = ev.amount >= 0;
            return (
              <li key={ev.id} className="flex items-center gap-3 border border-[#0B1A36]/5 dark:border-white/5 rounded-xl p-3 text-sm">
                <span className="text-[10px] uppercase tracking-widest font-bold bg-[#0B1A36]/5 dark:bg-white/5 text-[#0B1A36]/70 dark:text-white/70 px-2 py-0.5 rounded-full">
                  {ev.kind}
                </span>
                <span className="flex-1 text-[#0B1A36]/70 dark:text-white/70 text-xs">
                  {ev.at?.toDate().toLocaleDateString('fr-CA') || ''}
                </span>
                <span className={`font-serif font-bold ${positive ? 'text-[#D4AF37]' : 'text-red-500'}`}>
                  {positive ? '+' : ''}{ev.amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminClientView;
