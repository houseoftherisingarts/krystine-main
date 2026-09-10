import React, { useEffect, useMemo, useState } from 'react';
import { collectionGroup, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getToutesHabitudes, pageFavorite, type Habitudes } from '../../../firebase/habitudes';
import {
  getAllMembers, getClientOrders, getShopifyOrders,
  type MemberDoc, type ClientOrder, type ClientOrderStatus, type ShopifyOrderDoc,
} from '../../../firebase/firestore';
import { getFormations, type Formation } from '../../../firebase/formations';
import { Card, Input, EmptyState, GhostButton, downloadCsv } from '../primitives';

// La fiche « une formation achetée » telle qu'écrite sous achatsFormations/{uid}/formations/{id}
// par le webhook Stripe (functions/src/paiements.ts) — montant en dollars,
// jamais en cents. On la relit ici par collectionGroup, avec l'uid porteur.
interface AchatFormation {
  uid: string;
  titre: string;
  montant: number;
  acheteLe?: Timestamp;
}

async function chargerAchatsFormations(): Promise<AchatFormation[]> {
  if (!db) return [];
  const snap = await getDocs(collectionGroup(db, 'formations'));
  return snap.docs
    .filter(d => d.ref.parent.parent?.parent.id === 'achatsFormations')
    .map(d => {
      const data = d.data() as { titre?: string; montant?: number; acheteLe?: Timestamp };
      return {
        uid: d.ref.parent.parent!.id,
        titre: data.titre || d.id,
        montant: typeof data.montant === 'number' ? data.montant : 0,
        acheteLe: data.acheteLe,
      };
    });
}

// Une commande du site (clientOrders) écrit son sous-total déjà formaté en
// devise (« 24,99 $ », via Intl), jamais un nombre brut. On en retire la
// valeur pour pouvoir l'additionner honnêtement au reste des achats.
function montantDeChaine(s?: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

const formatMontant = (n: number, devise = 'CAD') =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: devise, minimumFractionDigits: 2 }).format(n);

const fmtDate = (ts?: Timestamp) =>
  ts ? ts.toDate().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

// La tranche d'âge exacte demandée par Krystine pour cette page — distincte
// des dizaines utilisées ailleurs dans l'admin (detailsCompteurs.ts), qui
// sert un autre panneau. Rien n'est deviné : sans année de naissance, la
// personne tombe dans « Âge non renseigné », jamais dans une moyenne inventée.
function trancheAge(anneeNaissance?: number): string {
  if (!anneeNaissance) return 'Âge non renseigné';
  const age = new Date().getFullYear() - anneeNaissance;
  if (age < 30) return 'Moins de 30 ans';
  if (age < 45) return '30 à 44 ans';
  if (age < 60) return '45 à 59 ans';
  return '60 ans et plus';
}

const STATUT_COMMANDE: Record<ClientOrderStatus, string> = {
  pending_payment: 'en attente de paiement',
  paid: 'payée',
  shipped: 'expédiée',
  delivered: 'livrée',
  cancelled: 'annulée',
};

/** Additionne plusieurs relevés { clé: compte } en un seul, du plus fréquent
 *  au moins fréquent. Sert autant aux pages et aux familles qu'aux tranches
 *  d'âge ou aux régions, une fois ramenées à ce même format. */
function fusionner(relevés: Record<string, number>[]): [string, number][] {
  const m = new Map<string, number>();
  for (const r of relevés) for (const [k, v] of Object.entries(r || {})) m.set(k, (m.get(k) || 0) + v);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Une petite barre horizontale aux tokens du canon (laiton sur piste crème),
// réutilisée pour les familles d'une cliente comme pour les tendances.
const Barre: React.FC<{ label: string; n: number; max: number }> = ({ label, n, max }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-36 shrink-0 truncate text-[#293027]/70 dark:text-white/70">{label}</span>
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#293027]/10 dark:bg-white/10">
      <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${max > 0 ? (n / max) * 100 : 0}%` }} />
    </div>
    <span className="w-8 shrink-0 text-right text-[#293027]/50 dark:text-white/50">{n}</span>
  </div>
);

const Couverture: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-3 text-[11px] text-[#293027]/40 dark:text-white/40">{children}</p>
);

const HabitudesSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [habitudesList, setHabitudesList] = useState<Habitudes[]>([]);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [achats, setAchats] = useState<AchatFormation[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [shopify, setShopify] = useState<ShopifyOrderDoc[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const [h, m, f, a, o, s] = await Promise.all([
        getToutesHabitudes(), getAllMembers(), getFormations(),
        chargerAchatsFormations(), getClientOrders(), getShopifyOrders(5000),
      ]);
      if (!vivant) return;
      setHabitudesList(h); setMembers(m); setFormations(f); setAchats(a); setOrders(o); setShopify(s);
      setLoading(false);
    })();
    return () => { vivant = false; };
  }, []);

  const habitudesParUid = useMemo(() => new Map(habitudesList.map(h => [h.uid, h])), [habitudesList]);
  const formationParId = useMemo(() => new Map(formations.map(f => [f.id, f])), [formations]);

  const achatsParUid = useMemo(() => {
    const m = new Map<string, AchatFormation[]>();
    for (const a of achats) { const arr = m.get(a.uid) || []; arr.push(a); m.set(a.uid, arr); }
    return m;
  }, [achats]);

  const commandesParUid = useMemo(() => {
    const m = new Map<string, ClientOrder[]>();
    for (const o of orders) { if (!o.uid) continue; const arr = m.get(o.uid) || []; arr.push(o); m.set(o.uid, arr); }
    return m;
  }, [orders]);

  const boutiqueParEmail = useMemo(() => {
    const m = new Map<string, ShopifyOrderDoc[]>();
    for (const s of shopify) {
      const email = (s.customer?.email || s.email || '').toLowerCase();
      if (!email) continue;
      const arr = m.get(email) || []; arr.push(s); m.set(email, arr);
    }
    return m;
  }, [shopify]);

  // Le montant total dépensé par une cliente, tous silos confondus, en
  // dollars réels (les niskas sont une monnaie de fidélité, jamais mêlées
  // à un montant payé).
  const montantTotal = (uid: string, email?: string): number => {
    const formations = (achatsParUid.get(uid) || []).reduce((s, a) => s + a.montant, 0);
    const commandes = (commandesParUid.get(uid) || [])
      .filter(o => o.status !== 'cancelled')
      .reduce((s, o) => s + montantDeChaine(o.subtotal), 0);
    const boutique = (boutiqueParEmail.get((email || '').toLowerCase()) || [])
      .filter(o => !o.cancelledAt)
      .reduce((s, o) => s + (o.totalPrice || 0), 0);
    return formations + commandes + boutique;
  };

  // ── Tendances : jamais sur une cliente qui a éteint le suivi ───────────
  const habitudesAvecSuivi = useMemo(() => habitudesList.filter(h => !h.suiviRefuse), [habitudesList]);
  const nbSuiviEteint = habitudesList.length - habitudesAvecSuivi.length;
  const habitudesNaviguees = useMemo(() => habitudesAvecSuivi.filter(h => (h.visites || 0) > 0), [habitudesAvecSuivi]);

  const pagesTop = useMemo(() => fusionner(habitudesNaviguees.map(h => h.pages)).slice(0, 10), [habitudesNaviguees]);
  const famillesTop = useMemo(() => fusionner(habitudesNaviguees.map(h => h.familles)).slice(0, 10), [habitudesNaviguees]);

  const agesTop = useMemo(
    () => fusionner(members.map(m => ({ [trancheAge(m.anneeNaissance)]: 1 }))),
    [members],
  );
  const regionsTop = useMemo(
    () => fusionner(members.map(m => ({ [m.region?.trim() || 'Région non précisée']: 1 }))),
    [members],
  );

  const topDepenses = useMemo(() => members
    .map(m => ({ m, montant: montantTotal(m.uid, m.email) }))
    .filter(x => x.montant > 0)
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 10),
    [members, achatsParUid, commandesParUid, boutiqueParEmail]);

  const formationsTop = useMemo(() => {
    const m = new Map<string, { qte: number; revenu: number }>();
    for (const a of achats) {
      const c = m.get(a.titre) || { qte: 0, revenu: 0 };
      c.qte += 1; c.revenu += a.montant;
      m.set(a.titre, c);
    }
    return [...m.entries()].sort((a, b) => b[1].qte - a[1].qte).slice(0, 8);
  }, [achats]);

  const produitsTop = useMemo(() => {
    const m = new Map<string, { qte: number; revenu: number }>();
    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      for (const it of o.items || []) {
        const c = m.get(it.title) || { qte: 0, revenu: 0 };
        c.qte += it.quantity || 0; c.revenu += montantDeChaine(it.price) * (it.quantity || 0);
        m.set(it.title, c);
      }
    }
    for (const o of shopify) {
      if (o.cancelledAt) continue;
      for (const it of o.lineItems || []) {
        const c = m.get(it.title) || { qte: 0, revenu: 0 };
        c.qte += it.quantity || 0; c.revenu += (it.price || 0) * (it.quantity || 0);
        m.set(it.title, c);
      }
    }
    return [...m.entries()].sort((a, b) => b[1].qte - a[1].qte).slice(0, 8);
  }, [orders, shopify]);

  const actifs30j = useMemo(() => {
    const seuil = Date.now() - 30 * 86400000;
    return members.filter(m => (m.lastSeenAt?.toMillis() || 0) >= seuil).length;
  }, [members]);

  // ── Une cliente à la fois ───────────────────────────────────────────────
  const resultats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members.filter(m =>
      m.email?.toLowerCase().includes(q) || m.displayName?.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [search, members]);

  const selected = selectedUid ? members.find(m => m.uid === selectedUid) || null : null;
  const habitudesSel = selectedUid ? habitudesParUid.get(selectedUid) || null : null;
  const suiviEteintSel = !!habitudesSel?.suiviRefuse;
  const favoriteSel = habitudesSel && !suiviEteintSel ? pageFavorite(habitudesSel) : null;
  const offreSel = habitudesSel && !suiviEteintSel ? habitudesSel.offre : null;
  const offreTitreSel = offreSel ? (formationParId.get(offreSel.id)?.titre || offreSel.id) : null;
  const offreVuesSel = offreSel ? (habitudesSel?.offresVues?.[offreSel.id] || 0) : 0;
  const offreClicsSel = offreSel ? (habitudesSel?.offresCliquees?.[offreSel.id] || 0) : 0;
  const achatsSel = selected ? (achatsParUid.get(selected.uid) || []) : [];
  const commandesSel = selected ? (commandesParUid.get(selected.uid) || []) : [];
  const boutiqueSel = selected ? (boutiqueParEmail.get(selected.email?.toLowerCase() || '') || []) : [];
  const montantSel = selected ? montantTotal(selected.uid, selected.email) : 0;

  const exportCsv = () => downloadCsv(`habitudes_clientes_${new Date().toISOString().slice(0, 10)}.csv`, members.map(m => {
    const h = habitudesParUid.get(m.uid);
    const refuse = !!h?.suiviRefuse;
    const fav = h && !refuse ? pageFavorite(h) : null;
    return {
      email: m.email,
      nom: m.displayName || '',
      compteDepuis: m.joinedAt ? fmtDate(m.joinedAt) : '',
      derniereVisite: m.lastSeenAt ? fmtDate(m.lastSeenAt) : '',
      suiviPersonnalisation: refuse ? 'éteint' : (h ? 'actif' : 'aucune donnée'),
      joursDistincts: refuse ? '' : (h?.jours ?? ''),
      pagesOuvertes: refuse ? '' : (h?.visites ?? ''),
      pageFavorite: fav ? fav.page : '',
      dosha: m.dosha || '',
      pays: m.pays || '',
      region: m.region || '',
      trancheAge: trancheAge(m.anneeNaissance),
      montantTotalAchats: montantTotal(m.uid, m.email).toFixed(2),
    };
  }));

  if (loading) return <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">
          {members.length} comptes au total, dont {actifs30j} se sont connectés dans les trente derniers jours.
        </p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter en CSV</GhostButton>
      </div>

      {/* ── Les tendances ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Pages les plus ouvertes</h3>
          {pagesTop.length === 0 ? (
            <p className="text-sm italic text-[#293027]/40 dark:text-white/40">Aucune page n'a encore été enregistrée dans les habitudes de navigation.</p>
          ) : (
            <div className="space-y-2">
              {pagesTop.map(([label, n]) => <Barre key={label} label={label} n={n} max={pagesTop[0][1]} />)}
            </div>
          )}
          <Couverture>Calculé sur {habitudesNaviguees.length} comptes qui ont navigué avec le suivi activé, sur {members.length} comptes au total{nbSuiviEteint > 0 ? ` (${nbSuiviEteint} l'ont éteint)` : ''}.</Couverture>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Familles les plus fréquentées</h3>
          {famillesTop.length === 0 ? (
            <p className="text-sm italic text-[#293027]/40 dark:text-white/40">Aucune famille de pages n'a encore été enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {famillesTop.map(([label, n]) => <Barre key={label} label={label} n={n} max={famillesTop[0][1]} />)}
            </div>
          )}
          <Couverture>Calculé sur {habitudesNaviguees.length} comptes qui ont navigué avec le suivi activé, sur {members.length} comptes au total.</Couverture>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Répartition par âge</h3>
          <div className="space-y-2">
            {agesTop.map(([label, n]) => <Barre key={label} label={label} n={n} max={agesTop[0][1]} />)}
          </div>
          <Couverture>Sur {members.length} comptes, à partir de l'année de naissance que chaque cliente a bien voulu donner.</Couverture>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Répartition par région</h3>
          <div className="space-y-2">
            {regionsTop.map(([label, n]) => <Barre key={label} label={label} n={n} max={regionsTop[0][1]} />)}
          </div>
          <Couverture>Sur {members.length} comptes.</Couverture>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Celles qui ont le plus dépensé</h3>
          {topDepenses.length === 0 ? (
            <p className="text-sm italic text-[#293027]/40 dark:text-white/40">Aucun achat n'est encore enregistré pour cette communauté.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topDepenses.map(({ m, montant }) => (
                <li key={m.uid} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[#293027] dark:text-white">{m.displayName || m.email}</span>
                  <span className="font-bold text-[#8B4A2F]">{formatMontant(montant)}</span>
                </li>
              ))}
            </ul>
          )}
          <Couverture>Sur {topDepenses.length} comptes ayant un achat enregistré, sur {members.length} comptes au total.</Couverture>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Ce qui s'achète le plus</h3>
          {formationsTop.length === 0 && produitsTop.length === 0 ? (
            <p className="text-sm italic text-[#293027]/40 dark:text-white/40">Aucun achat n'est encore enregistré pour cette communauté.</p>
          ) : (
            <div className="space-y-4">
              {formationsTop.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#293027]/40 dark:text-white/40">Formations</p>
                  <ul className="space-y-1 text-sm">
                    {formationsTop.map(([titre, v]) => (
                      <li key={titre} className="flex items-center justify-between gap-3">
                        <span className="truncate text-[#293027] dark:text-white">{titre}</span>
                        <span className="text-[#293027]/50 dark:text-white/50">{v.qte}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {produitsTop.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#293027]/40 dark:text-white/40">Produits (boutique et commandes du site)</p>
                  <ul className="space-y-1 text-sm">
                    {produitsTop.map(([titre, v]) => (
                      <li key={titre} className="flex items-center justify-between gap-3">
                        <span className="truncate text-[#293027] dark:text-white">{titre}</span>
                        <span className="text-[#293027]/50 dark:text-white/50">{v.qte}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <Couverture>Calculé sur {achats.length} formations achetées et {orders.length + shopify.length} commandes.</Couverture>
        </Card>
      </div>

      {/* ── Une cliente à la fois ────────────────────────────────────── */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Une cliente à la fois</h3>
        <Input
          type="search"
          placeholder="Chercher par nom ou par courriel…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedUid(null); }}
        />
        {!selected && resultats.length > 0 && (
          <ul className="mt-3 divide-y divide-[#293027]/5 dark:divide-white/5 rounded-xl border border-[#293027]/10 dark:border-white/10">
            {resultats.map(m => (
              <li key={m.uid}>
                <button
                  type="button"
                  onClick={() => { setSelectedUid(m.uid); setSearch(''); }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#BA7B39]/5"
                >
                  <span className="truncate text-[#293027] dark:text-white">{m.displayName || m.email.split('@')[0]}</span>
                  <span className="truncate text-[11px] text-[#293027]/50 dark:text-white/50">{m.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!selected && search.trim() && resultats.length === 0 && (
          <p className="mt-3 text-sm italic text-[#293027]/40 dark:text-white/40">Aucun compte ne correspond à cette recherche.</p>
        )}

        {selected && (
          <div className="mt-5 rounded-[15px] border border-[#293027]/10 bg-white/50 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#293027]/5 bg-cover bg-center bg-[#EEE7DB] text-[#293027]/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40" style={{ backgroundImage: selected.photoURL ? `url(${selected.photoURL})` : undefined }}>
                  {!selected.photoURL && <i className="fa-solid fa-user" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg text-[#293027] dark:text-white">{selected.displayName || selected.email.split('@')[0]}</p>
                  <p className="truncate text-[11px] text-[#293027]/50 dark:text-white/50">{selected.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUid(null)} className="text-[11px] uppercase tracking-widest text-[#293027]/40 hover:text-[#8B4A2F] dark:text-white/40">
                <i className="fa-solid fa-xmark mr-1" /> Fermer
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-[#293027] dark:text-white">
              <p>
                {selected.joinedAt ? `Elle a un compte depuis le ${fmtDate(selected.joinedAt)}` : "La date d'ouverture de son compte n'est pas connue"}
                {selected.lastSeenAt ? `, et elle s'est connectée pour la dernière fois le ${fmtDate(selected.lastSeenAt)}.` : '.'}
              </p>

              {suiviEteintSel ? (
                <p className="rounded-xl bg-[#293027]/5 px-4 py-3 text-[#293027]/60 dark:bg-white/5 dark:text-white/60">
                  Cette cliente a éteint le suivi de personnalisation dans ses préférences. Par respect de son choix, ses habitudes de navigation ne s'affichent pas ici.
                </p>
              ) : habitudesSel ? (
                <>
                  <p>
                    Elle a ouvert {habitudesSel.visites} page{habitudesSel.visites > 1 ? 's' : ''} en {habitudesSel.jours} journée{habitudesSel.jours > 1 ? 's' : ''} distincte{habitudesSel.jours > 1 ? 's' : ''}
                    {favoriteSel ? `, et sa page favorite est « ${favoriteSel.page} », ouverte ${favoriteSel.n} fois.` : '.'}
                  </p>
                  {Object.keys(habitudesSel.familles || {}).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(habitudesSel.familles).sort((a, b) => b[1] - a[1]).map(([famille, n]) => (
                        <Barre key={famille} label={famille} n={n} max={Math.max(...Object.values(habitudesSel.familles))} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="italic text-[#293027]/40 dark:text-white/40">Aucune habitude de navigation n'est encore enregistrée pour cette cliente.</p>
              )}

              <p>
                {selected.dosha ? `Son dosha dominant est ${selected.dosha}. ` : ''}
                {selected.region || selected.pays
                  ? `Elle a indiqué vivre ${[selected.region, selected.pays].filter(Boolean).join(', ')}. `
                  : "Elle n'a pas encore indiqué où elle vit. "}
                {trancheAge(selected.anneeNaissance) === 'Âge non renseigné' ? "Son âge n'est pas renseigné." : `Elle fait partie de la tranche « ${trancheAge(selected.anneeNaissance)} ».`}
              </p>

              <div>
                <p className="font-bold">
                  {montantSel > 0 ? `Elle a dépensé ${formatMontant(montantSel)} au total.` : "Aucun achat n'est enregistré pour cette cliente pour l'instant."}
                </p>
                {(achatsSel.length > 0 || commandesSel.length > 0 || boutiqueSel.length > 0) && (
                  <ul className="mt-2 space-y-1 text-[13px] text-[#293027]/80 dark:text-white/80">
                    {achatsSel.map((a, i) => (
                      <li key={`f${i}`}>La formation « {a.titre} », {a.montant > 0 ? `achetée pour ${formatMontant(a.montant)}` : 'offerte'}{a.acheteLe ? `, le ${fmtDate(a.acheteLe)}` : ''}.</li>
                    ))}
                    {commandesSel.map(o => (
                      <li key={o.id}>Une commande du site, {o.subtotal || 'montant inconnu'}, {STATUT_COMMANDE[o.status]}{o.createdAt ? `, le ${fmtDate(o.createdAt)}` : ''}.</li>
                    ))}
                    {boutiqueSel.map(o => (
                      <li key={o.id}>Une commande boutique {o.name}, {formatMontant(o.totalPrice, o.currency)}{o.createdAt ? `, le ${fmtDate(o.createdAt)}` : ''}.</li>
                    ))}
                  </ul>
                )}
              </div>

              <p>
                {offreSel
                  ? `L'offre présentée en ce moment est « ${offreTitreSel} », vue ${offreVuesSel} fois et cliquée ${offreClicsSel} fois.`
                  : (suiviEteintSel ? '' : "Aucune offre n'est présentée à cette cliente en ce moment.")}
              </p>
            </div>
          </div>
        )}

        {!selected && !search.trim() && (
          <EmptyState icon="fa-magnifying-glass">Cherchez une cliente par nom ou par courriel pour ouvrir sa fiche.</EmptyState>
        )}
      </Card>
    </div>
  );
};

export default HabitudesSection;
