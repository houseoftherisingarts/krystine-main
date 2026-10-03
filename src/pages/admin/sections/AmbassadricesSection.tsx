import React, { useEffect, useMemo, useState } from 'react';
import { Card, Input, Label, PrimaryButton, GhostButton, ToggleSwitch, EmptyState, downloadCsv } from '../primitives';
import { setSiteFlag, subscribeToSiteFlags } from '../../../firebase/siteFlags';
import {
  listerAmbassadrices, listerCommissions, majAmbassadrice, marquerCommission, nommerAmbassadrice,
  getPartPremium, setPartPremium, partDe, rabaisDe, dollars,
  PART_DEFAUT, PART_MAX, PAS, type Ambassadrice, type Commission,
} from '../../../firebase/ambassadrices';

// La section Ambassadrices de l'admin : l'interrupteur du programme, la part
// des premium, la nomination par courriel, la liste des ambassadrices et le
// grand livre des commissions (à verser, versées).

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
  const [charge, setCharge] = useState(true);
  const [email, setEmail] = useState('');
  const [premium, setPremium] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => subscribeToSiteFlags(f => { setOuvert(f.ambassadricesOuvert); setPret(true); }), []);

  const charger = () => Promise.all([listerAmbassadrices(), listerCommissions(), getPartPremium()])
    .then(([l, v, pp]) => { setListe(l); setVentes(v); setPP(pp); })
    .catch(() => {})
    .finally(() => setCharge(false));
  useEffect(() => { void charger(); }, []);

  const parAmbassadrice = useMemo(() => {
    const m: Record<string, { ventes: number; du: number }> = {};
    for (const v of ventes) {
      const e = (m[v.ambassadriceUid] ||= { ventes: 0, du: 0 });
      e.ventes += 1;
      if (v.statut !== 'versee') e.du += v.commission;
    }
    return m;
  }, [ventes]);
  const nomDe = (uid: string) => liste.find(a => a.uid === uid)?.nom || uid.slice(0, 6);
  const totalDu = ventes.filter(v => v.statut !== 'versee').reduce((s, v) => s + v.commission, 0);

  const modifier = async (a: Ambassadrice, patch: Partial<Pick<Ambassadrice, 'premium' | 'part' | 'actif'>>) => {
    setListe(l => l.map(x => (x.uid === a.uid ? { ...x, ...patch } : x)));
    await majAmbassadrice(a.uid, patch).catch(() => charger());
  };
  const verser = async (v: Commission, versee: boolean) => {
    setVentes(l => l.map(x => (x.id === v.id ? { ...x, statut: versee ? 'versee' : 'due' } : x)));
    await marquerCommission(v.id, versee).catch(() => charger());
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
            <p className={aide}>Chaque vente d'une ambassadrice s'inscrit ici d'elle-même. Vous versez la commission, puis vous cochez la ligne.</p>
          </div>
          <GhostButton
            disabled={!ventes.length}
            onClick={() => downloadCsv('commissions-ambassadrices.csv', ventes.map(v => ({
              date: v.at?.toDate().toLocaleDateString('fr-CA') || '',
              ambassadrice: nomDe(v.ambassadriceUid),
              formation: v.titre,
              paye_hors_taxes: (v.payeHT / 100).toFixed(2),
              rabais_pct: v.rabaisPct,
              commission_pct: v.commissionPct,
              commission: (v.commission / 100).toFixed(2),
              statut: v.statut === 'versee' ? 'versée' : 'à verser',
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
                <span className="w-24 shrink-0 text-xs text-[#293027]/55 dark:text-white/55">{v.at?.toDate().toLocaleDateString('fr-CA') || ''}</span>
                <span className="min-w-[160px] flex-1">
                  <span className="font-semibold">{nomDe(v.ambassadriceUid)}</span>
                  <span className="block text-xs text-[#293027]/55 dark:text-white/55">{v.titre} · {dollars(v.payeHT)} payés · {v.commissionPct} %</span>
                </span>
                <span className="font-serif text-lg tabular-nums">{dollars(v.commission)}</span>
                {v.statut === 'versee'
                  ? <GhostButton onClick={() => verser(v, false)}>Versée · annuler</GhostButton>
                  : <PrimaryButton onClick={() => verser(v, true)} className="!px-4 !py-2">Marquer versée</PrimaryButton>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AmbassadricesSection;
