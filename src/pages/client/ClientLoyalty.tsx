import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  subscribeToMemberPoints, getMemberPoints, listPointsEvents, listMyRewardRedemptions, redeemReward, points, reconcileBalance,
  type PointsBalance, type PointsEvent, type RewardRedemption,
} from '../../firebase/points';
import { POINTS, TIERS, REWARDS, FACONS_DE_GAGNER, tierFromLifetime, rewardMinThreshold, niskas, type Reward } from '../../lib/pointsConfig';
import PieceNiska from '../../components/client/PieceNiska';
import PointsPlant, { type Stage } from '../../components/PointsPlant';

// Labels for every PointsKind surfaced in the activity history. Kept here
// rather than in pointsConfig because the wording is UI-facing.
const EVENT_LABELS: Record<string, { fr: string; en: string; icon: string }> = {
  welcome:         { fr: 'Bienvenue · espace client créé', en: 'Welcome · client space created', icon: 'fa-door-open' },
  'welcome-claim': { fr: 'Cadeau de bienvenue réclamé',    en: 'Welcome gift claimed',            icon: 'fa-gift' },
  quiz:            { fr: 'Quiz Dosha complété',     en: 'Dosha Quiz completed',    icon: 'fa-circle-nodes' },
  newsletter: { fr: 'Abonnement à une lettre', en: 'Newsletter subscription', icon: 'fa-envelope' },
  order:      { fr: 'Commande passée',         en: 'Order placed',            icon: 'fa-box' },
  video:      { fr: 'Vidéo regardée',          en: 'Video watched',           icon: 'fa-circle-play' },
  podcast:    { fr: 'Épisode écouté',          en: 'Episode listened',        icon: 'fa-headphones' },
  nav:        { fr: 'Exploration du site',     en: 'Site exploration',        icon: 'fa-compass' },
  share:      { fr: 'Partage sur les réseaux', en: 'Shared on social',        icon: 'fa-share-nodes' },
  formation:  { fr: 'Inscription à une formation', en: 'Program subscription', icon: 'fa-graduation-cap' },
  origine:    { fr: 'Inscription à Origine',   en: "Origin subscription",      icon: 'fa-sun' },
  redeem:     { fr: 'Récompense échangée',     en: 'Reward redeemed',         icon: 'fa-gift' },
  adjust:     { fr: 'Ajustement',              en: 'Adjustment',              icon: 'fa-scale-balanced' },
  direct:     { fr: 'Participation au direct', en: 'Live participation',      icon: 'fa-tower-broadcast' },
  quotidien:  { fr: 'Récompense du jour',      en: 'Reward of the day',       icon: 'fa-sun' },
  profil:     { fr: 'Profil complété',         en: 'Profile completed',       icon: 'fa-user-check' },
  billet:     { fr: 'Premier billet publié',   en: 'First note posted',       icon: 'fa-feather' },
  amitie:     { fr: 'Amitié acceptée',         en: 'Friendship accepted',     icon: 'fa-user-group' },
  parrainage: { fr: 'Filleule inscrite',       en: 'Referral signed up',      icon: 'fa-hand-holding-heart' },
  question:   { fr: 'Question posée pour le direct', en: 'Question asked for the live', icon: 'fa-circle-question' },
  rediffusion:{ fr: 'Rediffusion regardée',    en: 'Replay watched',          icon: 'fa-circle-play' },
  commentaire:{ fr: 'Commentaire laissé',      en: 'Comment left',            icon: 'fa-comment' },
  boutique:   { fr: 'Achat à la petite boutique', en: 'Little shop purchase', icon: 'fa-bag-shopping' },
  'achat-niskas': { fr: 'Paquet de niskas acheté', en: 'Niska pack bought',   icon: 'fa-coins' },
};

const ClientLoyalty: React.FC = () => {
  const { user, lang } = useApp();
  const [balance, setBalance] = useState<PointsBalance>({ balance: 0, lifetime: 0 });
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<PointsEvent[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [claimingWelcome, setClaimingWelcome] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Hybrid balance read — one-shot getDoc for an immediate, accurate value
  // (which works even if the live subscription is misfiring), then attach
  // an onSnapshot for live updates after writes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMemberPoints(user.uid).then(b => { if (!cancelled) { setBalance(b); setLoading(false); } });
    const unsub = subscribeToMemberPoints(user.uid, b => {
      if (cancelled) return;
      setBalance(b);
      setLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [user]);

  // Events + past redemptions + balance — pulled once and after every
  // claim / redeem so the UI is never dependent on the live snapshot
  // catching up.
  const refreshHistory = async () => {
    if (!user) return;
    const [e, r, b] = await Promise.all([
      listPointsEvents(user.uid, 50),
      listMyRewardRedemptions(user.uid),
      getMemberPoints(user.uid),
    ]);
    setEvents(e);
    setRedemptions(r);
    setBalance(b);
  };
  useEffect(() => { refreshHistory(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Welcome gift — one-time 50 pts claimable by tapping the button below.
  // `welcome-claim:{uid}` is the Firestore dedup key. Kept distinct from the
  // legacy `welcome:{uid}` grants that older accounts may have so the new
  // button is always actionable on those accounts.
  const welcomeClaimed = events.some(e => e.kind === 'welcome-claim');
  const claimWelcome = async () => {
    if (!user || welcomeClaimed) return;
    setClaimingWelcome(true);
    try {
      const res = await points.welcomeBonus(user.uid);
      if (res.awarded > 0) {
        setToast({ kind: 'ok', msg: lang === 'FR' ? `Bienvenue ! ${niskas(POINTS.welcome, 'FR')} ajoutés à votre bourse.` : `Welcome! ${niskas(POINTS.welcome, 'EN')} added to your purse.` });
      } else {
        // Server says the event is already recorded but the UI didn't have
        // it — reconcile the balance from the full event log (heals drift
        // between `memberPoints` and `pointsEvents`) and show a neutral
        // confirmation rather than a red error.
        await reconcileBalance(user.uid);
        setToast({ kind: 'ok', msg: lang === 'FR' ? 'Votre cadeau de bienvenue était déjà crédité. Votre solde a été rétabli.' : 'Your welcome gift was already credited. Balance reconciled.' });
      }
      await refreshHistory();
    } finally {
      setClaimingWelcome(false);
      setTimeout(() => setToast(null), 4500);
    }
  };

  // Drift detection: the live balance doc can lag behind the event log in
  // edge cases (network aborted mid-transaction, rules were redeployed
  // after the grant landed, etc.). We compute what the balance *should* be
  // from the events and offer a "Rétablir mon solde" button when they diverge.
  const computedBalance = events.reduce((n, e) => n + (Number(e.amount) || 0), 0);
  const computedLifetime = events.reduce((n, e) => (Number(e.amount) > 0 ? n + Number(e.amount) : n), 0);
  const driftDetected = events.length > 0 && (computedBalance !== balance.balance || computedLifetime !== balance.lifetime);
  const [reconciling, setReconciling] = useState(false);
  const runReconcile = async () => {
    if (!user) return;
    setReconciling(true);
    try {
      await reconcileBalance(user.uid);
      setToast({ kind: 'ok', msg: lang === 'FR' ? 'Solde rétabli à partir de votre historique.' : 'Balance reconciled from your history.' });
      await refreshHistory();
    } finally {
      setReconciling(false);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const onRedeem = async (reward: Reward) => {
    if (!user) return;
    if (balance.balance < reward.cost) return;
    setRedeeming(reward.id);
    try {
      const res = await redeemReward(user.uid, user.email || undefined, {
        id: reward.id,
        cost: reward.cost,
        label: lang === 'FR' ? reward.labelFR : reward.labelEN,
        oneShot: reward.oneShot,
      });
      if (res.ok) {
        setToast({ kind: 'ok', msg: lang === 'FR' ? 'Récompense demandée — vous recevrez votre code par courriel sous 24 h.' : 'Reward requested — you will receive your code by email within 24 h.' });
        await refreshHistory();
      } else if (res.reason === 'insufficient') {
        setToast({ kind: 'err', msg: lang === 'FR' ? "Pas assez de niskas pour cette récompense." : 'Not enough niskas for this reward.' });
      } else if (res.reason === 'one-shot') {
        setToast({ kind: 'err', msg: lang === 'FR' ? "Cette récompense a déjà été réclamée." : 'This reward has already been claimed.' });
      } else {
        setToast({ kind: 'err', msg: lang === 'FR' ? "Échec de l'échange. Réessayez plus tard." : 'Redemption failed. Try again later.' });
      }
    } finally {
      setRedeeming(null);
      setTimeout(() => setToast(null), 4500);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  const { current, next } = tierFromLifetime(balance.lifetime);
  const progressPct = next
    ? Math.min(100, Math.round(((balance.lifetime - current.threshold) / (next.threshold - current.threshold)) * 100))
    : 100;
  const pointsToNext = next ? Math.max(0, next.threshold - balance.lifetime) : 0;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm ${
            toast.kind === 'ok'
              ? 'bg-[#BA7B39]/15 text-[#293027] dark:text-white border border-[#BA7B39]/30'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          <i className={`fa-solid ${toast.kind === 'ok' ? 'fa-check-circle' : 'fa-triangle-exclamation'} mr-2`} />
          {toast.msg}
        </div>
      )}

      {/* Balance + tier headline + growing plant */}
      <div
        className="rounded-[20px] p-6 md:p-8 mb-6 border"
        style={{
          borderColor: `${current.accent}55`,
          background: `linear-gradient(135deg, ${current.accent}22 0%, ${current.accent}08 100%)`,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          {/* Left: big number + tier label */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold" style={{ color: current.accent }}>
                {lang === 'FR' ? 'Vos niskas' : 'Your niskas'}
              </p>
              {/* One-shot refresh — bypasses any wedged onSnapshot. */}
              <button
                type="button"
                onClick={async () => {
                  if (!user) return;
                  const fresh = await getMemberPoints(user.uid);
                  setBalance(fresh);
                  await refreshHistory();
                }}
                title={lang === 'FR' ? 'Actualiser le solde' : 'Refresh balance'}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#293027]/40 dark:text-white/40 hover:text-[#8B4A2F] hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
              >
                <i className="fa-solid fa-rotate text-[11px]" />
              </button>
            </div>
            <div className="flex items-baseline justify-center md:justify-start gap-2 mb-3">
              <span className="text-6xl md:text-7xl font-serif text-[#293027] dark:text-white">{balance.balance}</span>
              <span className="inline-flex items-center gap-2 text-lg text-[#293027]/50 dark:text-white/50 uppercase tracking-widest font-bold">
                <PieceNiska size={22} /> niskas
              </span>
            </div>
            <p className="mb-2 max-w-md text-sm text-[#293027]/70 dark:text-white/70">
              {lang === 'FR'
                ? 'Le niska est la monnaie de votre espace : il se gagne en participant et se dépense à la petite boutique.'
                : 'The niska is the currency of your space: you earn it by taking part and spend it at the little shop.'}
            </p>
            <p className="text-[11px] text-[#293027]/50 dark:text-white/50 uppercase tracking-widest mb-4">
              {lang === 'FR' ? `Gagnés en tout · ${balance.lifetime} · c’est ce total qui fait pousser votre plante` : `Earned overall · ${balance.lifetime} · this total grows your plant`}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.dispatchEvent(new Event('krystine:ouvrir-roue'))} className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-white/60 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:bg-white dark:bg-white/10 dark:text-[#d9a05b]">
                <i className="fa-solid fa-sun" /> {lang === 'FR' ? 'Ma récompense du jour' : 'My reward of the day'}
              </button>
              <button type="button" onClick={() => window.dispatchEvent(new Event('krystine:ouvrir-boutique'))} className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#d9a05b]">
                <i className="fa-solid fa-bag-shopping" /> {lang === 'FR' ? 'Acheter des niskas' : 'Buy niskas'}
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-sm text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: current.accent }}>
              <i className="fa-solid fa-seedling" />
              {lang === 'FR' ? current.labelFR : current.labelEN}
            </div>
          </div>
          {/* Right: growing plant tile, keyed to the current tier id so the
              SVG transitions smoothly when the member crosses a threshold. */}
          <div className="w-40 h-40 md:w-48 md:h-48 mx-auto md:mx-0 rounded-2xl overflow-hidden border border-[#293027]/5 dark:border-white/10 shadow-[0_12px_32px_rgba(58,37,30,0.08)] bg-white/50 dark:bg-white/5">
            <PointsPlant stage={current.id as Stage} accent={current.accent} />
          </div>
        </div>
      </div>

      {/* Drift repair — only visible when the live balance disagrees with
          the event log, so the common case renders clean. */}
      {driftDetected && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-yellow-300/60 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="font-bold text-yellow-800 dark:text-yellow-200">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              {lang === 'FR' ? 'Votre solde semble désynchronisé.' : 'Your balance looks out of sync.'}
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-200/70 mt-1 leading-relaxed">
              {lang === 'FR'
                ? `Solde affiché ${balance.balance}, calculé ${computedBalance}. Cliquez pour rétablir à partir de votre historique.`
                : `Shown balance ${balance.balance}, computed ${computedBalance}. Click to reconcile from your history.`}
            </p>
          </div>
          <button
            type="button"
            onClick={runReconcile}
            disabled={reconciling}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-widest font-bold bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-50"
          >
            {reconciling
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'Rétablissement…' : 'Reconciling…'}</>
              : <><i className="fa-solid fa-wand-magic-sparkles" /> {lang === 'FR' ? 'Rétablir mon solde' : 'Reconcile my balance'}</>}
          </button>
        </div>
      )}

      {/* Welcome claim — prominent CTA that sits once above the rewards.
          Disappears after the claim, replaced with a quiet confirmation. */}
      {!welcomeClaimed ? (
        <button
          type="button"
          onClick={claimWelcome}
          disabled={claimingWelcome}
          className="w-full mb-6 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-[#BA7B39]/40 bg-gradient-to-r from-[#BA7B39]/20 to-[#BA7B39]/5 hover:from-[#BA7B39]/30 hover:to-[#BA7B39]/10 transition-colors text-left"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8B4A2F] mb-1">
              {lang === 'FR' ? 'Cadeau de bienvenue' : 'Welcome gift'}
            </p>
            <p className="font-serif text-[#293027] dark:text-white">
              {lang === 'FR'
                ? `Réclamez vos ${niskas(POINTS.welcome, 'FR')} de bienvenue.`
                : `Claim your ${niskas(POINTS.welcome, 'EN')} welcome gift.`}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px]">
            {claimingWelcome
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'En cours…' : 'Claiming…'}</>
              : <><i className="fa-solid fa-gift" /> {lang === 'FR' ? `Réclamer +${POINTS.welcome}` : `Claim +${POINTS.welcome}`}</>}
          </span>
        </button>
      ) : (
        <div className="mb-6 px-5 py-3 rounded-2xl border border-[#293027]/5 dark:border-white/5 bg-white/50 dark:bg-white/5 flex items-center gap-3 text-sm text-[#293027]/70 dark:text-white/70">
          <i className="fa-solid fa-check-circle text-[#8B4A2F]" />
          {lang === 'FR' ? `Cadeau de bienvenue reçu (+${niskas(POINTS.welcome, 'FR')})` : `Welcome gift received (+${niskas(POINTS.welcome, 'EN')})`}
        </div>
      )}

      {/* La plante : ce que les niskas gagnés font pousser */}
      {next && (
        <div className="mb-8 rounded-2xl border border-[#293027]/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: current.accent }}>
            <i className="fa-solid fa-seedling mr-2" />{lang === 'FR' ? 'Votre plante' : 'Your plant'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#293027]/80 dark:text-white/80">
            {lang === 'FR'
              ? `Chaque niska gagné fait pousser votre plante, et elle ne rapetisse jamais quand vous dépensez. Avec ${niskas(balance.lifetime, 'FR')} gagnés, elle est au stade ${current.labelFR}. Encore ${niskas(pointsToNext, 'FR')} et elle devient ${next.labelFR}.`
              : `Every niska you earn makes your plant grow, and it never shrinks when you spend. With ${niskas(balance.lifetime, 'EN')} earned, it is at the ${current.labelEN} stage. ${niskas(pointsToNext, 'EN')} more and it becomes ${next.labelEN}.`}
          </p>
          <div className="relative mt-4 h-2 rounded-full bg-[#293027]/5 dark:bg-white/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: current.accent }}
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50">
            <span>{lang === 'FR' ? current.labelFR : current.labelEN} · {current.threshold}</span>
            <span>{lang === 'FR' ? next.labelFR : next.labelEN} · {lang === 'FR' ? `${next.threshold} niskas gagnés` : `${next.threshold} niskas earned`}</span>
          </div>
        </div>
      )}

      {/* Rewards catalog */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold">
            {lang === 'FR' ? 'Récompenses' : 'Rewards'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REWARDS.map(r => {
            const canAfford = balance.balance >= r.cost;
            const minThreshold = rewardMinThreshold(r);
            const tierReached = balance.lifetime >= minThreshold;
            const tierLabel = r.minTier
              ? TIERS.find(t => t.id === r.minTier)
              : null;
            const alreadyClaimed = r.oneShot && redemptions.some(x => x.rewardId === r.id && x.status !== 'cancelled');
            const locked = !tierReached || alreadyClaimed;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border p-5 transition-opacity ${
                  locked ? 'border-[#293027]/5 dark:border-white/5 bg-[#EEE7DB]/50 dark:bg-white/[0.03]'
                    : 'border-[#293027]/10 dark:border-white/10 bg-white dark:bg-white/5'
                }`}
              >
                <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8B4A2F]">
                    {niskas(r.cost, lang)}
                    {r.oneShot && (
                      <span className="text-[#293027]/50 dark:text-white/50 font-normal tracking-normal normal-case ml-2">
                        · {lang === 'FR' ? 'unique' : 'one-time'}
                      </span>
                    )}
                  </span>
                  {!tierReached && tierLabel ? (
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: tierLabel.accent }}>
                      <i className="fa-solid fa-lock mr-1" />
                      {lang === 'FR' ? `Palier ${tierLabel.labelFR}` : `${tierLabel.labelEN} tier`}
                    </span>
                  ) : alreadyClaimed ? (
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-[#8B4A2F]">
                      <i className="fa-solid fa-check mr-1" />
                      {lang === 'FR' ? 'Récompense obtenue' : 'Claimed'}
                    </span>
                  ) : !canAfford ? (
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#293027]/40 dark:text-white/40">
                      {lang === 'FR' ? `Encore ${niskas(r.cost - balance.balance, 'FR')}` : `${niskas(r.cost - balance.balance, 'EN')} away`}
                    </span>
                  ) : null}
                </div>
                <h4 className="font-serif text-[#293027] dark:text-white text-lg mb-2">
                  {lang === 'FR' ? r.labelFR : r.labelEN}
                </h4>
                <p className="text-sm text-[#293027]/60 dark:text-white/60 mb-4 leading-relaxed">
                  {lang === 'FR' ? r.descFR : r.descEN}
                </p>
                <button
                  type="button"
                  disabled={!canAfford || locked || redeeming === r.id}
                  onClick={() => onRedeem(r)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {redeeming === r.id
                    ? <><i className="fa-solid fa-circle-notch fa-spin" /> {lang === 'FR' ? 'Échange…' : 'Redeeming…'}</>
                    : alreadyClaimed
                      ? <><i className="fa-solid fa-check" /> {lang === 'FR' ? 'Réclamée' : 'Claimed'}</>
                      : !tierReached
                        ? <><i className="fa-solid fa-lock" /> {lang === 'FR' ? `Débloqué au palier ${tierLabel?.labelFR ?? ''}` : `Unlocks at ${tierLabel?.labelEN ?? ''}`}</>
                        : <><i className="fa-solid fa-gift" /> {lang === 'FR' ? 'Échanger' : 'Redeem'}</>}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Points guide — collapsible */}
      <section className="mb-10">
        <button
          type="button"
          onClick={() => setGuideOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[#293027]/10 dark:border-white/10 bg-white dark:bg-white/5 text-left hover:border-[#BA7B39] transition-colors"
        >
          <span className="flex items-center gap-3">
            <i className="fa-solid fa-circle-info text-[#8B4A2F]" />
            <span className="font-serif text-[#293027] dark:text-white">
              {lang === 'FR' ? 'Comment gagner des niskas' : 'How to earn niskas'}
            </span>
          </span>
          <i className={`fa-solid fa-chevron-down text-[#293027]/40 dark:text-white/40 text-xs transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
        </button>
        {guideOpen && (
          <ul className="mt-3 space-y-2 text-sm text-[#293027]/80 dark:text-white/80 bg-[#EEE7DB] dark:bg-white/5 rounded-2xl p-5">
            {FACONS_DE_GAGNER.map((f) => (
              <GuideRow key={f.fr} pts={f.pts} label={lang === 'FR' ? f.fr : f.en} note={lang === 'FR' ? f.noteFR : f.noteEN} />
            ))}
            <li className="pt-2">
              <a href="/compte/comment-gagner-des-niskas.pdf" target="_blank" rel="noreferrer" className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline">
                <i className="fa-solid fa-file-pdf mr-2" />{lang === 'FR' ? 'Le guide en PDF' : 'The guide as a PDF'}
              </a>
            </li>
          </ul>
        )}
      </section>

      {/* Tier ladder */}
      <section className="mb-10">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">
          {lang === 'FR' ? 'Votre plante, stade par stade' : 'Your plant, stage by stage'}
        </h3>
        <ol className="space-y-3">
          {TIERS.map(t => {
            const reached = balance.lifetime >= t.threshold;
            const isCurrent = t.id === current.id;
            return (
              <li
                key={t.id}
                className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  isCurrent
                    ? 'border-[#BA7B39]/50 bg-[#BA7B39]/5'
                    : reached
                      ? 'border-[#293027]/10 dark:border-white/10 bg-white dark:bg-white/5'
                      : 'border-[#293027]/5 dark:border-white/5 bg-[#EEE7DB]/50 dark:bg-white/[0.02] opacity-60'
                }`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-serif" style={{ backgroundColor: `${t.accent}22`, color: t.accent }}>
                  {reached ? <i className="fa-solid fa-check" /> : <i className="fa-regular fa-circle" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[#293027] dark:text-white">
                    {lang === 'FR' ? t.labelFR : t.labelEN}
                    {isCurrent && <span className="ml-2 text-[10px] uppercase tracking-widest font-bold text-[#8B4A2F]">· {lang === 'FR' ? 'Actuel' : 'Current'}</span>}
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">
                    {lang === 'FR' ? `à partir de ${niskas(t.threshold, 'FR')} gagnés` : `from ${niskas(t.threshold, 'EN')} earned`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Recent activity */}
      <section>
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">
          {lang === 'FR' ? 'Activité récente' : 'Recent activity'}
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-[#293027]/50 dark:text-white/50 italic font-serif py-4">
            {lang === 'FR' ? "Aucune activité pour l'instant." : 'No activity yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map(ev => {
              const l = EVENT_LABELS[ev.kind] || { fr: ev.kind, en: ev.kind, icon: 'fa-star' };
              const positive = ev.amount >= 0;
              return (
                <li key={ev.id} className="flex items-center gap-4 border border-[#293027]/5 dark:border-white/5 rounded-xl p-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    positive ? 'bg-[#BA7B39]/15 text-[#8B4A2F]' : 'bg-red-50 text-red-500'
                  }`}>
                    <i className={`fa-solid ${l.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#293027] dark:text-white truncate">{lang === 'FR' ? l.fr : l.en}</p>
                    <p className="text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">
                      {ev.at?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                    </p>
                  </div>
                  <span className={`font-serif font-bold ${positive ? 'text-[#8B4A2F]' : 'text-red-500'}`}>
                    {positive ? '+' : ''}{ev.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {redemptions.length > 0 && (
          <div className="mt-6">
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60 mb-3">
              {lang === 'FR' ? 'Mes récompenses' : 'My rewards'}
            </h4>
            <ul className="space-y-2">
              {redemptions.map(r => (
                <li key={r.id} className="flex items-center gap-3 border border-[#293027]/5 dark:border-white/5 rounded-xl p-3 text-sm">
                  <i className="fa-solid fa-gift text-[#8B4A2F]" />
                  <span className="flex-1 text-[#293027] dark:text-white">{r.rewardLabel}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'fulfilled' ? 'bg-green-50 text-green-600'
                      : r.status === 'cancelled' ? 'bg-red-50 text-red-500'
                      : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {r.status === 'fulfilled' ? (lang === 'FR' ? 'Honorée' : 'Fulfilled')
                      : r.status === 'cancelled' ? (lang === 'FR' ? 'Annulée' : 'Cancelled')
                      : (lang === 'FR' ? 'En attente' : 'Pending')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

const GuideRow: React.FC<{ pts: number | string; label: string; note?: string }> = ({ pts, label, note }) => (
  <li className="flex items-center gap-3">
    <span className="w-16 shrink-0 text-right font-serif text-[#8B4A2F] font-bold">+{pts}</span>
    <span className="flex-1">{label}</span>
    {note && <span className="text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40 whitespace-nowrap">{note}</span>}
  </li>
);

export default ClientLoyalty;
