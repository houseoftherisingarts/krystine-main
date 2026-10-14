import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getCountFromServer, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { getCommandesStripe, type CommandeStripe } from '../../../../firebase/commandes';
import { getShopifyOrders, type ShopifyOrderDoc, type DoshaResult } from '../../../../firebase/firestore';
import { journee, veilleDe } from '../../../../lib/pointsConfig';
import { Card } from '../../primitives';

// D'un coup d'œil (Krystine, 14 oct. 2026) : « le rapport est difficile à
// lire. je veux les ventes par 24 heures, puis les cumulatives par mois, et
// je veux pouvoir voir clairement mouvement, quiz etc. »
// Mêmes sources et mêmes règles que le bilan du matin (functions/src/bilan.ts) :
//  - ventes du site : getCommandesStripe (achatsFormations/*/formations.acheteLe
//    avec sessionId, pointsEvents kind achat-niskas .at, pourboires .at),
//    ventes test de 1 $ exclues;
//  - boutique : shopifyOrders.createdAt, annulées et commandes à 1 $ exclues;
//  - inscriptions et départs : newsletter.subscribedAt / unsubscribedAt (comptes);
//  - visites : vh_jours/krystine_{AAAA-MM-JJ}.sessions (une fiche par journée);
//  - quiz : doshaResults.createdAt et .dominant (liste déjà lue par le tableau de bord).
// Montants taxes comprises, comme la carte des deux maisons.

const argent = (d: number) => d.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
const nombre = (n: number) => n.toLocaleString('fr-CA');
const H24 = 24 * 3600 * 1000;

type Genre = 'formation' | 'niskas' | 'pourboire' | 'boutique';
const NOM_GENRE: Record<Genre, string> = {
  formation: 'Formations',
  niskas: 'Niskas',
  pourboire: 'Pourboires',
  boutique: 'Boutique INSPIRATA AYURVEDA',
};
interface Vente { genre: Genre; quand: number; montant: number; quoi: string }

const shopifyValide = (o: ShopifyOrderDoc) =>
  !o.cancelledAt && o.financialStatus !== 'voided' && o.financialStatus !== 'refunded' && (o.totalPrice || 0) > 1;

const Titre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">{children}</h3>
);
const Explication: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-1 text-[12px] leading-relaxed text-[#293027]/60 dark:text-white/60">{children}</p>
);

interface Mouvement { ins24: number; ins7: number; dep24: number; dep7: number; visAujourdhui: number | null; vis7: number | null }

async function lireMouvement(): Promise<Mouvement | null> {
  if (!db) return null;
  const maintenant = Date.now();
  const compte = (champ: string, depuis: number) =>
    getCountFromServer(query(collection(db!, 'newsletter'), where(champ, '>=', Timestamp.fromMillis(depuis))))
      .then(s => s.data().count);
  const jours: string[] = [];
  for (let j = journee(), i = 0; i < 7; i++, j = veilleDe(j)) jours.push(j);
  const [ins24, ins7, dep24, dep7, fiches] = await Promise.all([
    compte('subscribedAt', maintenant - H24),
    compte('subscribedAt', maintenant - 7 * H24),
    compte('unsubscribedAt', maintenant - H24),
    compte('unsubscribedAt', maintenant - 7 * H24),
    Promise.all(jours.map(j => getDoc(doc(db!, 'vh_jours', `krystine_${j}`)).catch(() => null))),
  ]);
  const lues = fiches.filter(Boolean);
  const visites = (f: (typeof fiches)[number]) => Number(f?.exists() ? f.get('sessions') : 0) || 0;
  return {
    ins24, ins7, dep24, dep7,
    visAujourdhui: lues.length ? visites(fiches[0]) : null,
    vis7: lues.length ? fiches.reduce((s, f) => s + visites(f), 0) : null,
  };
}

const CoupDOeilCard: React.FC<{ dosha: DoshaResult[] }> = ({ dosha }) => {
  const [stripe, setStripe] = useState<CommandeStripe[] | null>(null);
  const [shopify, setShopify] = useState<ShopifyOrderDoc[] | null>(null);
  const [mouvement, setMouvement] = useState<Mouvement | null | undefined>(undefined);

  useEffect(() => {
    getCommandesStripe().then(setStripe).catch(() => setStripe([]));
    getShopifyOrders(20000).then(setShopify).catch(() => setShopify([]));
    lireMouvement().then(setMouvement).catch(() => setMouvement(null));
  }, []);

  const { ventes, depuisShopify } = useMemo(() => {
    const v: Vente[] = [];
    for (const c of stripe || []) {
      const t = c.date?.toMillis();
      if (t) v.push({ genre: c.source, quand: t, montant: c.total / 100, quoi: c.libelle });
    }
    let plusAncienne = Infinity;
    for (const o of (shopify || []).filter(shopifyValide)) {
      const t = o.createdAt?.toMillis?.();
      if (!t) continue;
      plusAncienne = Math.min(plusAncienne, t);
      const quoi = (o.lineItems || []).map(l => l.title).filter(Boolean).slice(0, 2).join(', ') || `Commande ${o.name || ''}`.trim();
      v.push({ genre: 'boutique', quand: t, montant: o.totalPrice || 0, quoi });
    }
    return { ventes: v.sort((a, b) => b.quand - a.quand), depuisShopify: Number.isFinite(plusAncienne) ? plusAncienne : null };
  }, [stripe, shopify]);

  // ── Les ventes des dernières 24 heures ──────────────────────────────────
  const jour = useMemo(() => {
    const depuis = Date.now() - H24;
    const recentes = ventes.filter(v => v.quand >= depuis);
    const parGenre = (Object.keys(NOM_GENRE) as Genre[]).map(g => {
      const l = recentes.filter(v => v.genre === g);
      return { genre: g, n: l.length, total: l.reduce((s, v) => s + v.montant, 0) };
    });
    return { recentes, total: recentes.reduce((s, v) => s + v.montant, 0), parGenre };
  }, [ventes]);

  // ── Les ventes cumulées par mois (le mois en cours et les cinq d'avant) ──
  const mois = useMemo(() => {
    const m = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const debut = new Date(m.getFullYear(), m.getMonth() - i, 1).getTime();
      const fin = new Date(m.getFullYear(), m.getMonth() - i + 1, 1).getTime();
      const dans = ventes.filter(v => v.quand >= debut && v.quand < fin);
      const site = dans.filter(v => v.genre !== 'boutique');
      const boutique = dans.filter(v => v.genre === 'boutique');
      return {
        cle: debut,
        nom: new Date(debut).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
        enCours: i === 0,
        site: site.reduce((s, v) => s + v.montant, 0), nSite: site.length,
        boutique: boutique.reduce((s, v) => s + v.montant, 0), nBoutique: boutique.length,
        // La boutique n'a pas d'historique avant la première commande reçue.
        boutiqueConnue: depuisShopify !== null && fin > depuisShopify,
        total: dans.reduce((s, v) => s + v.montant, 0),
      };
    });
  }, [ventes, depuisShopify]);
  const maxMois = Math.max(1, ...mois.map(x => x.total));

  // ── Le quiz ─────────────────────────────────────────────────────────────
  const quiz = useMemo(() => {
    const maintenant = Date.now();
    const m = new Date();
    const debutMois = new Date(m.getFullYear(), m.getMonth(), 1).getTime();
    const t = (r: DoshaResult) => r.createdAt?.toMillis?.() ?? 0;
    const duMois = dosha.filter(r => t(r) >= debutMois);
    const repartition = (['vata', 'pitta', 'kapha'] as const).map(k => ({
      k, n: duMois.filter(r => r.dominant?.toLowerCase() === k).length,
    }));
    return {
      h24: dosha.filter(r => t(r) >= maintenant - H24).length,
      j7: dosha.filter(r => t(r) >= maintenant - 7 * H24).length,
      mois: duMois.length,
      total: dosha.length,
      repartition,
      nomMois: m.toLocaleDateString('fr-CA', { month: 'long' }),
    };
  }, [dosha]);

  const charge = stripe !== null && shopify !== null;
  const attente = <i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" />;
  const heureDepuis = new Date(Date.now() - H24).toLocaleString('fr-CA', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 1. Les ventes des dernières 24 heures */}
      <Card className="p-6">
        <Titre>Ventes des dernières 24 heures</Titre>
        {!charge ? <div className="mt-4">{attente}</div> : (
          <>
            <p className="mt-3 font-serif text-4xl text-[#293027] dark:text-white tabular-nums">{argent(jour.total)}</p>
            <p className="text-sm text-[#293027]/70 dark:text-white/70">
              {jour.recentes.length === 0 ? 'Aucune vente' : `${jour.recentes.length} vente${jour.recentes.length > 1 ? 's' : ''}`} depuis {heureDepuis}
            </p>
            <Explication>Toutes les ventes, le site et la boutique ensemble, taxes comprises. Les ventes test de 1 $ ne comptent pas.</Explication>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {jour.parGenre.map(g => (
                <div key={g.genre} className="rounded-[15px] border border-[#293027]/10 p-3 dark:border-white/10">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">{NOM_GENRE[g.genre]}</dt>
                  <dd className="mt-1 font-serif text-xl text-[#293027] dark:text-white tabular-nums">{argent(g.total)}</dd>
                  <dd className="text-[11px] text-[#293027]/60 dark:text-white/60">{g.n} vente{g.n > 1 ? 's' : ''}</dd>
                </div>
              ))}
            </dl>
            {jour.recentes.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {jour.recentes.slice(0, 6).map((v, i) => (
                  <li key={`${v.quand}-${i}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-[#293027]/80 dark:text-white/80">{v.quoi}</span>
                    <span className="shrink-0 tabular-nums font-bold text-[#293027] dark:text-white">{argent(v.montant)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {/* 2. Le mouvement : inscriptions, départs, visites */}
      <Card className="p-6">
        <Titre>Le mouvement</Titre>
        {mouvement === undefined ? <div className="mt-4">{attente}</div> : mouvement === null ? (
          <Explication>Les chiffres du mouvement n’ont pas pu être lus. Rechargez la page dans un moment.</Explication>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-5 gap-y-3">
              <span />
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">24 h</span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">7 jours</span>
              {[
                { nom: 'Nouvelles inscriptions à l’infolettre', a: mouvement.ins24, b: mouvement.ins7 },
                { nom: 'Désabonnements', a: mouvement.dep24, b: mouvement.dep7 },
                { nom: 'Solde de la liste', a: mouvement.ins24 - mouvement.dep24, b: mouvement.ins7 - mouvement.dep7, signe: true },
                { nom: 'Visites du site', a: mouvement.visAujourdhui, b: mouvement.vis7 },
              ].map(l => (
                <React.Fragment key={l.nom}>
                  <span className="text-sm text-[#293027] dark:text-white">{l.nom}</span>
                  {[l.a, l.b].map((x, i) => (
                    <span key={i} className="text-right font-serif text-2xl tabular-nums text-[#293027] dark:text-white">
                      {x === null ? '?' : `${l.signe && x > 0 ? '+' : ''}${nombre(x)}`}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
            <Explication>
              Le solde, ce sont les inscriptions moins les départs. Les visites se comptent par journée : la colonne 24 h montre aujourd’hui depuis minuit, la colonne 7 jours montre aujourd’hui et les six jours d’avant.
            </Explication>
          </>
        )}
      </Card>

      {/* 3. Les ventes cumulées par mois */}
      <Card className="p-6">
        <Titre>Ventes cumulées par mois</Titre>
        <Explication>Le total de chaque mois, taxes comprises. Le site, ce sont les formations, les niskas et les pourboires; la boutique, ce sont les commandes Shopify.</Explication>
        {!charge ? <div className="mt-4">{attente}</div> : (
          <ul className="mt-4 space-y-4">
            {mois.map(x => (
              <li key={x.cle}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm capitalize text-[#293027] dark:text-white">
                    {x.nom}{x.enCours && <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">en cours</span>}
                  </span>
                  <span className="font-serif text-xl tabular-nums text-[#293027] dark:text-white">{argent(x.total)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#293027]/8 dark:bg-white/10">
                  <div className="h-full rounded-full bg-[#BA7B39]" style={{ width: `${x.total > 0 ? Math.max(2, (x.total / maxMois) * 100) : 0}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-[#293027]/60 dark:text-white/60">
                  Site : {argent(x.site)} ({x.nSite}) · Boutique : {x.boutiqueConnue ? `${argent(x.boutique)} (${x.nBoutique})` : 'commandes non importées'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 4. Le quiz */}
      <Card className="p-6">
        <Titre>Le quiz</Titre>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { nom: '24 heures', n: quiz.h24 },
            { nom: '7 jours', n: quiz.j7 },
            { nom: `En ${quiz.nomMois}`, n: quiz.mois },
          ].map(c => (
            <div key={c.nom} className="rounded-[15px] border border-[#293027]/10 p-3 dark:border-white/10">
              <p className="font-serif text-3xl tabular-nums text-[#293027] dark:text-white">{nombre(c.n)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#BA7B39]">{c.nom}</p>
            </div>
          ))}
        </div>
        <Explication>Les quiz terminés, dont le résultat est enregistré. {nombre(quiz.total)} depuis le début.</Explication>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#293027]/60 dark:text-white/60">Les résultats en {quiz.nomMois}</p>
        <div className="mt-2 space-y-2">
          {quiz.repartition.map(({ k, n }) => {
            const pct = quiz.mois ? Math.round((n / quiz.mois) * 100) : 0;
            const couleur = k === 'vata' ? '#8F9779' : k === 'pitta' ? '#BC4A3C' : '#4A7C9D';
            return (
              <div key={k} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                <span className="font-serif text-sm capitalize text-[#293027] dark:text-white">{k}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#293027]/8 dark:bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: couleur }} />
                </div>
                <span className="w-20 text-right text-sm font-bold tabular-nums text-[#293027] dark:text-white">{n} · {pct} %</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default CoupDOeilCard;
