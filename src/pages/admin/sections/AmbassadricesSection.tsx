import React, { useEffect, useMemo, useState } from 'react';
import { Card, Input, Label, PrimaryButton, GhostButton, ToggleSwitch, EmptyState, downloadCsv } from '../primitives';
import { setSiteFlag, subscribeToSiteFlags } from '../../../firebase/siteFlags';
import {
  listerAmbassadrices, listerCommissions, majAmbassadrice, marquerCommission, nommerAmbassadrice,
  getPartPremium, setPartPremium, getCadenceJours, partDe, rabaisDe, dollars, CADENCE_DEFAUT_JOURS,
  candidatesAmbassadrices, PART_DEFAUT, PART_MAX, PAS, type Ambassadrice, type Commission, type Candidate,
} from '../../../firebase/ambassadrices';

// La section Ambassadrices de l'admin : l'interrupteur du programme, la part
// des premium, la nomination par courriel, la liste des ambassadrices et le
// grand livre des commissions (en attente, à verser, versées, annulées).

const LIBELLE_STATUT: Record<Commission['statut'], string> = {
  'en-attente': 'en attente', due: 'à verser', versee: 'versée', annulee: 'annulée',
};
const dateFr = (t?: { toDate: () => Date } | null) => t?.toDate().toLocaleDateString('fr-CA') || '';

const PARTS = Array.from({ length: PART_MAX / PAS }, (_, i) => (i + 1) * PAS);
const surtitre = 'text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]';
const aide = 'mt-1 text-sm text-[#293027]/60 dark:text-white/60';
const selecteur = 'rounded-xl border border-[#38403a]/10 bg-white/60 px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white';

const AmbassadricesSection: React.FC = () => {
  const [ouvert, setOuvert] = useState(false);
  const [pret, setPret] = useState(false);
  const [liste, setListe] = useState<Ambassadrice[]>([]);
  const [ventes, setVentes] = useState<Commission[]>([]);
  const [partPremium, setPP] = useState(30);
  const [cadence, setCadence] = useState(CADENCE_DEFAUT_JOURS);
  const [charge, setCharge] = useState(true);
  const [email, setEmail] = useState('');
  const [premium, setPremium] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  useEffect(() => subscribeToSiteFlags(f => { setOuvert(f.ambassadricesOuvert); setPret(true); }), []);

  const charger = () => Promise.all([listerAmbassadrices(), listerCommissions(), getPartPremium(), getCadenceJours()])
    .then(([l, v, pp, c]) => {
      setListe(l); setVentes(v); setPP(pp); setCadence(c);
      // Les candidates : tout le monde sauf les ambassadrices déjà inscrites et l'équipe.
      candidatesAmbassadrices([...l.map(a => a.uid), 'houseoftherisingarts@gmail.com', 'krystinestterredhysope@gmail.com', 'alex@lesalondesinconnus.com', 'krystinestlaurent@gmail.com'])
        .then(setCandidates).catch(() => setCandidates([]));
    })
    .catch(() => {})
    .finally(() => setCharge(false));
  useEffect(() => { void charger(); }, []);

  const parAmbassadrice = useMemo(() => {
    const m: Record<string, { ventes: number; du: number }> = {};
    for (const v of ventes) {
      const e = (m[v.ambassadriceUid] ||= { ventes: 0, du: 0 });
      e.ventes += 1;
      if (v.statut === 'due') e.du += v.commission;
    }
    return m;
  }, [ventes]);
  const nomDe = (uid: string) => liste.find(a => a.uid === uid)?.nom || uid.slice(0, 6);
  const totalDu = ventes.filter(v => v.statut === 'due').reduce((s, v) => s + v.commission, 0);
  const totalAttente = ventes.filter(v => v.statut === 'en-attente').reduce((s, v) => s + v.commission, 0);
  // Le prochain versement, à titre indicatif : le dernier versement plus la
  // cadence; sans versement encore, la première commission devenue due ou à
  // échoir. Rien n'est versé automatiquement.
  const prochainVersement = useMemo(() => {
    const derniers = ventes.map(v => v.verseeLe?.toMillis() || 0).filter(Boolean);
    if (derniers.length) return new Date(Math.max(...derniers) + cadence * 86400000);
    const echeances = ventes.filter(v => v.statut === 'due' || v.statut === 'en-attente').map(v => v.dueLe?.toMillis() || 0).filter(Boolean);
    return echeances.length ? new Date(Math.min(...echeances)) : null;
  }, [ventes, cadence]);

  const modifier = async (a: Ambassadrice, patch: Partial<Pick<Ambassadrice, 'premium' | 'part' | 'actif'>>) => {
    setListe(l => l.map(x => (x.uid === a.uid ? { ...x, ...patch } : x)));
    await majAmbassadrice(a.uid, patch).catch(() => charger());
  };
  const verser = async (v: Commission, versee: boolean) => {
    setVentes(l => l.map(x => (x.id === v.id ? { ...x, statut: versee ? 'versee' : 'due' } : x)));
    await marquerCommission(v.id, versee).catch(() => charger());
  };
  const inviter = async (c: Candidate) => {
    setCandidates(l => (l || []).filter(x => x.uid !== c.uid));
    try { await nommerAmbassadrice(c.email, false); await charger(); }
    catch { setMessage(`${c.nom} n'a pas pu être nommée. Réessayez.`); }
  };
  const nommer = async () => {
    setOccupe(true); setMessage('');
    try {
      await nommerAmbassadrice(email, premium);
      setMessage(`${email} fait maintenant partie de vos ambassadrices.`);
      setEmail('');
      await charger();
    } catch (e) {
      setMessage((e as { message?: string }).message || 'La nomination n\'a pas abouti. Réessayez.');
    } finally { setOccupe(false); }
  };

  const actives = liste.filter(a => a.actif !== false);

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <p className={surtitre}>Le programme</p>
        <h2 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">Vos ambassadrices</h2>
        <p className={aide}>
          Une membre devient ambassadrice depuis son espace et partage son code. La personne qui crée son compte avec ce
          code obtient un rabais sur vos formations, et l'ambassadrice reçoit une commission sur ce qui est payé. Chaque
          ambassadrice dispose de {PART_DEFAUT} %, soit 10 % pour sa cliente et 10 % pour elle au départ, et elle peut
          déplacer ce partage jusqu'à tout offrir à sa cliente.
        </p>
        <a href="/ambassadrices" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block border-b border-[#BA7B39] pb-0.5 text-sm font-semibold text-[#8B4A2F]">
          Voir la page qui explique le programme à vos membres
        </a>
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[#38403a]/10 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <ToggleSwitch checked={ouvert} onChange={v => { setOuvert(v); void setSiteFlag('ambassadricesOuvert', v); }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#293027] dark:text-white">
              {!pret ? 'Le programme…' : ouvert ? 'Le programme est ouvert' : 'Le programme est fermé'}
            </p>
            <p className="text-xs text-[#293027]/60 dark:text-white/60">
              {ouvert
                ? 'La section « Devenir ambassadrice » paraît au bas de la page d\'accueil et vos membres peuvent s\'inscrire.'
                : 'Rien ne paraît sur le site. Les ambassadrices déjà inscrites gardent leur code et leurs commissions.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-2">
        <Card className="p-6">
          <p className={surtitre}>Les premium</p>
          <p className={aide}>
            La part des personnes que vous choisissez vous-même. À {partPremium} %, une premium reçoit {partPremium - 10} % de
            commission quand elle laisse 10 % de rabais à sa cliente.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Label className="!mb-0">Part des premium</Label>
            <select
              className={selecteur}
              value={partPremium}
              onChange={e => { const n = Number(e.target.value); setPP(n); void setPartPremium(n); }}
            >
              {PARTS.filter(p => p > PART_DEFAUT).map(p => <option key={p} value={p}>{p} %</option>)}
            </select>
          </div>
        </Card>

        <Card className="p-6">
          <p className={surtitre}>Nommer quelqu'un</p>
          <p className={aide}>Écrivez le courriel de son compte sur votre site. La personne trouvera son code dans son espace membre.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Input type="email" placeholder="courriel@exemple.com" value={email} onChange={e => setEmail(e.target.value)} className="!w-auto min-w-[220px] flex-1" />
            <ToggleSwitch checked={premium} onChange={setPremium} label="Premium" />
            <PrimaryButton onClick={nommer} disabled={occupe || !email.includes('@')}>
              {occupe ? 'Un instant…' : 'Nommer ambassadrice'}
            </PrimaryButton>
          </div>
          {message && <p className="mt-3 text-sm text-[#8B4A2F]">{message}</p>}
        </Card>
      </div>

      <Card className="p-6">
        <p className={surtitre}>À qui en parler d'abord</p>
        <h3 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">Vos meilleures candidates</h3>
        <p className={aide}>
          Vos membres classées par leurs chances de bien porter votre parole. L'indice vient de ce que leur fiche montre déjà :
          les formations suivies, les personnes qu'elles ont invitées, celles qui ont acheté grâce à elles et leur présence récente.
          Écrivez-leur un mot personnel, puis nommez-les d'un geste.
        </p>
        {candidates === null ? (
          <p className="mt-6 text-sm text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Lecture de vos membres…</p>
        ) : candidates.length === 0 ? (
          <EmptyState icon="fa-seedling">Aucune candidate ne ressort pour l'instant. La liste se remplira avec les achats et les invitations.</EmptyState>
        ) : (
          <ol className="mt-4 divide-y divide-[#38403a]/10 dark:divide-white/10">
            {candidates.map((c, i) => (
              <li key={c.uid} className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3.5">
                <span className="w-6 shrink-0 text-xs tabular-nums text-[#293027]/45 dark:text-white/45">{i + 1}</span>
                <div className="w-[74px] shrink-0">
                  <p className="font-serif text-2xl leading-none tabular-nums text-[#8B4A2F]">{c.indice} %</p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#BA7B39]/20" aria-hidden="true">
                    <div className="h-full w-full origin-left rounded-full bg-[#BA7B39]" style={{ transform: `scaleX(${c.indice / 100})` }} />
                  </div>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="font-semibold text-[#293027] dark:text-white">{c.nom}</p>
                  <p className="text-xs text-[#293027]/55 dark:text-white/55">{c.raisons.join(' · ') || c.email}</p>
                </div>
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#38403a]/15 bg-white/40 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#38403a]/70 transition-[border-color,color,transform] hover:border-[#BA7B39] hover:text-[#8B4A2F] active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                >
                  Lui écrire
                </a>
                <GhostButton onClick={() => inviter(c)}>Nommer ambassadrice</GhostButton>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="p-6">
        <p className={surtitre}>Les ambassadrices</p>
        <h3 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">
          {charge ? 'Votre cercle' : `${actives.length} ambassadrice${actives.length > 1 ? 's' : ''}`}
        </h3>
        {!charge && liste.length === 0 ? (
          <EmptyState icon="fa-handshake-angle">Personne encore. Ouvrez le programme ou nommez une première ambassadrice.</EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-[#38403a]/10 dark:divide-white/10">
            {liste.map(a => {
              const part = partDe(a, partPremium);
              const rabais = rabaisDe(a, partPremium);
              const s = parAmbassadrice[a.uid];
              return (
                <li key={a.uid} className={`flex flex-wrap items-center gap-x-6 gap-y-3 py-4 ${a.actif === false ? 'opacity-50' : ''}`}>
                  <div className="min-w-[200px] flex-1">
                    <p className="font-semibold text-[#293027] dark:text-white">{a.nom || a.email}</p>
                    <p className="text-xs text-[#293027]/55 dark:text-white/55">{a.email} · code {a.code}</p>
                  </div>
                  <p className="text-xs text-[#293027]/70 dark:text-white/70">
                    Cliente {rabais} % · elle {part - rabais} %
                    <span className="block text-[#293027]/50 dark:text-white/50">{s ? `${s.ventes} vente${s.ventes > 1 ? 's' : ''} · ${dollars(s.du)} à verser` : 'Aucune vente encore'}</span>
                  </p>
                  <ToggleSwitch checked={!!a.premium} onChange={v => modifier(a, { premium: v })} label="Premium" />
                  <select
                    className={selecteur}
                    aria-label="Part de cette ambassadrice"
                    value={typeof a.part === 'number' ? a.part : ''}
                    onChange={e => modifier(a, { part: e.target.value === '' ? null : Number(e.target.value) })}
                  >
                    <option value="">Part habituelle ({a.premium ? partPremium : PART_DEFAUT} %)</option>
                    {PARTS.map(p => <option key={p} value={p}>{p} %</option>)}
                  </select>
                  <GhostButton onClick={() => modifier(a, { actif: a.actif === false })}>
                    {a.actif === false ? 'Réactiver' : 'Retirer'}
                  </GhostButton>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={surtitre}>Le grand livre</p>
            <h3 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">{dollars(totalDu)} à verser</h3>
            <p className={aide}>
              {dollars(totalAttente)} en attente de la fin de la garantie de 15 jours. Versement aux {cadence} jours
              {prochainVersement ? `, prochain versement le ${prochainVersement.toLocaleDateString('fr-CA')}` : ''}.
            </p>
            <p className={aide}>Chaque paiement reçu d'une ambassadrice s'inscrit ici de lui-même (un par versement payé). Un remboursement annule la commission. Vous versez la commission, puis vous cochez la ligne.</p>
          </div>
          <GhostButton
            disabled={!ventes.length}
            onClick={() => downloadCsv('commissions-ambassadrices.csv', ventes.map(v => ({
              date: dateFr(v.at),
              ambassadrice: nomDe(v.ambassadriceUid),
              formation: v.titre,
              paye_hors_taxes: (v.payeHT / 100).toFixed(2),
              rabais_pct: v.rabaisPct,
              commission_pct: v.commissionPct,
              commission: (v.commission / 100).toFixed(2),
              versement: v.versements && v.versements > 1 ? `${v.versement || 1}/${v.versements}` : '',
              statut: LIBELLE_STATUT[v.statut] || v.statut,
              due_le: dateFr(v.dueLe),
              raison_annulation: v.raisonAnnulation || '',
            })))}
          >
            Télécharger en CSV
          </GhostButton>
        </div>
        {ventes.length === 0 ? (
          <EmptyState icon="fa-book-open">Aucune vente encore. La première s'inscrira ici.</EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-[#38403a]/10 dark:divide-white/10">
            {ventes.map(v => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-sm text-[#293027] dark:text-white">
                <span className="w-24 shrink-0 text-xs text-[#293027]/55 dark:text-white/55">{dateFr(v.at)}</span>
                <span className="min-w-[160px] flex-1">
                  <span className="font-semibold">{nomDe(v.ambassadriceUid)}</span>
                  <span className="block text-xs text-[#293027]/55 dark:text-white/55">
                    {v.titre} · {dollars(v.payeHT)} payés · {v.commissionPct} %
                    {v.versements && v.versements > 1 ? ` · versement ${v.versement || 1} de ${v.versements}` : ''}
                  </span>
                  {v.remboursePartiel ? <span className="block text-xs text-[#8B4A2F]">Remboursement partiel de {dollars(v.remboursePartiel)} : à trancher</span> : null}
                  {v.rembourseApresVersement ? <span className="block text-xs text-[#8B4A2F]">Remboursée après versement : à reprendre sur le prochain versement</span> : null}
                </span>
                <span className={`font-serif text-lg tabular-nums ${v.statut === 'annulee' ? 'line-through opacity-50' : ''}`}>{dollars(v.commission)}</span>
                {v.statut === 'versee'
                  ? <GhostButton onClick={() => verser(v, false)}>Versée · annuler</GhostButton>
                  : v.statut === 'due'
                    ? <PrimaryButton onClick={() => verser(v, true)} className="!px-4 !py-2">Marquer versée</PrimaryButton>
                    : v.statut === 'en-attente'
                      ? <span className="text-xs text-[#293027]/55 dark:text-white/55">En attente jusqu'au {dateFr(v.dueLe)}</span>
                      : <span className="text-xs text-[#8B4A2F]">Annulée{v.raisonAnnulation === 'remboursement' ? ' (remboursement)' : v.raisonAnnulation === 'meme-personne' ? ' (l\'acheteuse est l\'ambassadrice)' : ''}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AmbassadricesSection;
