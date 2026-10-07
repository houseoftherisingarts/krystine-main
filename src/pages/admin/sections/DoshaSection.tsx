import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, type Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getDoshaResults, deleteDoshaResult, getQuizTentatives, marquerTentativeRattrapee, type DoshaResult, type QuizTentative } from '../../../firebase/firestore';
import { Card, DangerButton, EmptyState, GhostButton, downloadCsv } from '../primitives';

// « Déjà cliente » : l'adresse était connue AVANT le quiz. Sources lues (lecture seule) :
// la liste d'infolettre (inscrite plus de 10 minutes avant le quiz, ou fiche importée
// de Shopify/Kajabi/CSV, ou étiquette client/palier), les commandes Shopify et les
// commandes payées du site, antérieures au quiz.
const MARGE_MS = 10 * 60 * 1000;
const TAGS_CLIENTE = /^(shopify-import|kajabi-abonne|import|csv-import|client|palier-\d+)$/;
const SOURCES_IMPORT = /import|kajabi|shopify|csv|migration|export/i;
type Connue = { infolettre?: number; import?: boolean; commande?: number };

const enLots = <T,>(l: T[], n: number) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));
const ms = (t?: Timestamp | null) => (t?.toMillis ? t.toMillis() : 0);

async function chargerConnues(emails: string[]): Promise<Map<string, Connue>> {
  const m = new Map<string, Connue>();
  if (!db || emails.length === 0) return m;
  const get = (e: string) => { let c = m.get(e); if (!c) { c = {}; m.set(e, c); } return c; };
  const lots = enLots(emails, 30);
  const lire = async (nom: string, fn: (d: any) => void) => {
    for (const groupe of enLots(lots, 6)) {
      const snaps = await Promise.all(groupe.map(lot =>
        getDocs(query(collection(db!, nom), where('email', 'in', lot))).catch(() => null)));
      snaps.forEach(sn => sn?.forEach(fn));
    }
  };
  await Promise.all([
    lire('newsletter', d => {
      const v = d.data(); const c = get(String(v.email || '').toLowerCase());
      const t = ms(v.subscribedAt);
      c.infolettre = Math.min(c.infolettre ?? Infinity, t || Infinity);
      if (SOURCES_IMPORT.test(String(v.source || '')) || (v.tags || []).some((x: string) => TAGS_CLIENTE.test(x))) c.import = true;
    }),
    lire('shopifyOrders', d => {
      const v = d.data(); const c = get(String(v.email || '').toLowerCase());
      const t = ms(v.createdAt); if (t) c.commande = Math.min(c.commande ?? Infinity, t);
    }),
    lire('clientOrders', d => {
      const v = d.data(); if (!['paid', 'shipped', 'delivered'].includes(v.status)) return;
      const c = get(String(v.email || '').toLowerCase());
      const t = ms(v.createdAt); if (t) c.commande = Math.min(c.commande ?? Infinity, t);
    }),
  ]);
  return m;
}

const estCliente = (c: Connue | undefined, quizMs: number): boolean => {
  if (!c) return false;
  if (c.import) return true;
  if (c.commande && (!quizMs || c.commande < quizMs)) return true;
  if (c.infolettre && Number.isFinite(c.infolettre) && quizMs && c.infolettre < quizMs - MARGE_MS) return true;
  return false;
};

const dateHeure = (t?: Timestamp) => {
  if (!t?.toDate) return '—';
  const p = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Toronto', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(t.toDate());
  const g = (k: string) => p.find(x => x.type === k)?.value || '';
  return `${g('day')} ${g('month')} ${g('year')}, ${g('hour')} h ${g('minute')}`;
};

const DoshaSection: React.FC = () => {
  const [connues, setConnues] = useState<Map<string, Connue> | null>(null);
  const [rows, setRows] = useState<DoshaResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Les envois du résultat qui ont échoué (case anti-robot, courriel) : à rattraper à la main.
  const [tentatives, setTentatives] = useState<QuizTentative[]>([]);
  const refresh = () => {
    getQuizTentatives().then(setTentatives).catch(() => setTentatives([]));
    return getDoshaResults()
      .then(r => { setRows(r.sort((a, b) => ms(b.createdAt) - ms(a.createdAt))); return r; })
      .then(r => chargerConnues([...new Set(r.map(x => (x.email || '').trim().toLowerCase()).filter(Boolean))]).then(setConnues).catch(() => setConnues(new Map())))
      .finally(() => setLoading(false));
  };
  const aRattraper = tentatives.filter(t => t.statut !== 'rattrapee');
  useEffect(() => { refresh(); }, []);

  const statut = (r: DoshaResult): 'cliente' | 'nouvelle' | null =>
    connues ? (estCliente(connues.get((r.email || '').trim().toLowerCase()), ms(r.createdAt)) ? 'cliente' : 'nouvelle') : null;
  const decompte = useMemo(() => {
    let n = 0, c = 0;
    rows.forEach(r => { const s = statut(r); if (s === 'cliente') c++; else if (s === 'nouvelle') n++; });
    return { n, c };
  }, [rows, connues]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (r: DoshaResult) => {
    if (!r.id) return;
    if (!confirm(`Supprimer le résultat de ${r.email} ?`)) return;
    await deleteDoshaResult(r.id);
    await refresh();
  };

  const exportCsv = () => {
    downloadCsv(`quiz_dosha_${new Date().toISOString().slice(0, 10)}.csv`, rows.map(r => ({
      firstName: r.firstName, lastName: r.lastName, email: r.email,
      dominant: r.dominant, vata: r.vata, pitta: r.pitta, kapha: r.kapha,
      createdAt: r.createdAt?.toDate().toISOString() || '',
      dateHeure: dateHeure(r.createdAt),
      cliente: statut(r) === 'cliente' ? 'Déjà cliente' : statut(r) === 'nouvelle' ? 'Nouvelle' : '',
    })));
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;
  if (rows.length === 0) return <EmptyState icon="fa-circle-nodes">Aucun résultat de quiz pour l'instant.</EmptyState>;

  const totals = { vata: 0, pitta: 0, kapha: 0 };
  rows.forEach(r => { const k = r.dominant?.toLowerCase(); if (k === 'vata' || k === 'pitta' || k === 'kapha') totals[k]++; });

  return (
    <div className="space-y-4">
      {aRattraper.length > 0 && (
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#83322b]">
            <i className="fa-solid fa-life-ring mr-2" />{aRattraper.length} lecture{aRattraper.length > 1 ? 's' : ''} à rattraper
          </p>
          <p className="mt-1 text-xs text-[#293027]/60 dark:text-white/60">L’envoi du résultat a échoué pour ces personnes. Elles ne sont pas inscrites à l’infolettre : écrivez-leur, puis marquez la ligne comme rattrapée.</p>
          <ul className="mt-3 divide-y divide-[#293027]/5 dark:divide-white/5">
            {aRattraper.map(t => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <span className="text-[#293027] dark:text-white">{t.prenom || '(sans prénom)'}</span>
                <a href={`mailto:${t.email}`} className="text-[#8B4A2F] underline underline-offset-2">{t.email}</a>
                <span className="capitalize text-[#8B4A2F] font-bold">{t.dominant}</span>
                <span className="text-xs text-[#293027]/50 dark:text-white/50">{t.derniere?.toDate().toLocaleString('fr-CA') || ''} · {t.essais || 1} essai{(t.essais || 1) > 1 ? 's' : ''} · {t.raison}</span>
                <GhostButton onClick={async () => { await marquerTentativeRattrapee(t.id); refresh(); }}><i className="fa-solid fa-check" /> Rattrapée</GhostButton>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-3 gap-3">
        {(['vata', 'pitta', 'kapha'] as const).map(k => (
          <Card key={k} className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#8B4A2F]">{k}</p>
            <p className="text-2xl font-serif text-[#293027] dark:text-white mt-1">{totals[k]}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">{rows.length} résultat{rows.length > 1 ? 's' : ''}{connues ? ` · ${decompte.n} nouvelle${decompte.n > 1 ? 's' : ''} · ${decompte.c} déjà cliente${decompte.c > 1 ? 's' : ''}` : ' · vérification des clientes en cours'}</p>
        <GhostButton onClick={exportCsv}><i className="fa-solid fa-file-csv" /> Exporter CSV</GhostButton>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#EEE7DB] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3">Dominant</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Scores</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Date et heure</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-[#293027]/5 dark:border-white/5 hover:bg-[#BA7B39]/5">
                <td className="px-4 py-3 text-[#293027] dark:text-white">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-3 text-[#293027]/70 dark:text-white/70 hidden md:table-cell">{r.email}</td>
                <td className="px-4 py-3">
                  <span className="capitalize text-[#8B4A2F] font-bold">{r.dominant}</span>
                </td>
                <td className="px-4 py-3 text-[#293027]/50 dark:text-white/50 hidden md:table-cell font-mono text-xs">
                  V{r.vata} · P{r.pitta} · K{r.kapha}
                </td>
                <td className="px-4 py-3 text-[#293027]/50 dark:text-white/50 hidden md:table-cell">{dateHeure(r.createdAt)}</td>
                <td className="px-4 py-3 text-xs">
                  {statut(r) === 'cliente' && <span className="font-bold text-[#8B4A2F]">Déjà cliente</span>}
                  {statut(r) === 'nouvelle' && <span className="text-[#293027]/70 dark:text-white/70">Nouvelle</span>}
                  {statut(r) === null && <span className="text-[#293027]/30 dark:text-white/30">…</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <DangerButton onClick={() => del(r)}><i className="fa-solid fa-trash" /></DangerButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default DoshaSection;
