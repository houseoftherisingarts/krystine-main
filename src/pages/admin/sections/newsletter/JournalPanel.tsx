import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { getNewsletters, type NewsletterDoc } from '../../../../firebase/firestore';
import { libelleTag } from '../../../../lib/paliers';
import { Card, EmptyState, GhostButton, downloadCsv } from '../../primitives';
import PreviewFrame from './PreviewFrame';

// ─── Le journal des infolettres (Krystine, 26 septembre 2026) ────────────────
// Chaque lettre partie, mois par mois : le sujet, à qui elle s'adressait,
// combien l'ont reçue et lue, qui l'a reçue (envois), et la lettre elle-même,
// telle qu'elle est partie. Les lectures séparent les vraies lectures des
// ouvertures automatiques depuis le 26 septembre 2026.

type Personne = { email: string; recuLe?: Date; lu?: boolean; clic?: boolean };

const moisDe = (d: Date) => d.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });
const jourDe = (d: Date) => d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  + ' à ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

function audienceLisible(n: NewsletterDoc): string {
  const a = n.audience;
  if (!a || a.mode === 'all') return 'Toute la liste active';
  if (a.mode === 'emails') return `${a.emails?.length || 0} personne${(a.emails?.length || 0) > 1 ? 's' : ''} choisie${(a.emails?.length || 0) > 1 ? 's' : ''}`;
  return (a.tags || []).map(libelleTag).join(' · ') || 'Certaines listes';
}

async function chargerPersonnes(id: string): Promise<Personne[]> {
  if (!db) return [];
  const [envois, ouvertures, clics] = await Promise.all([
    getDocs(collection(db, 'newsletters', id, 'envois')),
    getDocs(collection(db, 'newsletters', id, 'ouvertures')).catch(() => null),
    getDocs(collection(db, 'newsletters', id, 'clics')).catch(() => null),
  ]);
  const lus = new Set((ouvertures?.docs || []).filter(d => d.get('humaine') === true || d.get('auto') === false).map(d => d.id));
  const cliques = new Set((clics?.docs || []).map(d => d.id));
  return envois.docs
    .map(d => ({ email: String(d.get('email') || ''), recuLe: d.get('at')?.toDate?.(), lu: lus.has(d.id), clic: cliques.has(d.id) }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

const Lettre: React.FC<{ n: NewsletterDoc }> = ({ n }) => {
  const [vue, setVue] = useState<'rien' | 'lettre' | 'personnes'>('rien');
  const [personnes, setPersonnes] = useState<Personne[] | null>(null);
  const [filtre, setFiltre] = useState('');
  const s = n.stats || {};
  const recus = s.recipients || s.delivered || 0;
  const lectures = s.opensHumaines ?? s.opens ?? 0;
  const pct = (x: number) => (recus ? Math.round((x / recus) * 100) : 0);
  const date = n.sentAt?.toDate?.();

  const ouvrirPersonnes = async () => {
    setVue(vue === 'personnes' ? 'rien' : 'personnes');
    if (!personnes && n.id) setPersonnes(await chargerPersonnes(n.id));
  };
  const visibles = useMemo(() => (personnes || []).filter(p => p.email.includes(filtre.trim().toLowerCase())), [personnes, filtre]);

  return (
    <li className="border-t border-[#293027]/10 dark:border-white/10 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8B4A2F]">{date ? jourDe(date) : 'Date inconnue'}{n.status === 'sending' ? ' · envoi en cours' : ''}</p>
          <p className="mt-1 font-serif text-lg text-[#293027] dark:text-white">{n.subject || n.title}</p>
          {n.title && n.title !== n.subject && <p className="text-xs text-[#293027]/50 dark:text-white/50">{n.title}</p>}
          <p className="mt-2 text-sm text-[#293027]/70 dark:text-white/70">Pour : {audienceLisible(n)}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right text-sm tabular-nums">
          <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Reçue</p><p className="font-bold text-[#293027] dark:text-white">{recus.toLocaleString('fr-CA')}</p></div>
          <div title="Lectures probables (hors ouvertures automatiques d'Apple Mail et des filtres, depuis le 26 septembre 2026)"><p className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Lue</p><p className="font-bold text-[#293027] dark:text-white">{lectures.toLocaleString('fr-CA')} <span className="text-xs font-normal text-[#293027]/50">({pct(lectures)} %)</span></p></div>
          <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Clics</p><p className="font-bold text-[#293027] dark:text-white">{s.clicks === undefined ? '—' : s.clicks.toLocaleString('fr-CA')}</p></div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <GhostButton type="button" onClick={() => setVue(vue === 'lettre' ? 'rien' : 'lettre')}><i className="fa-solid fa-envelope-open" /> {vue === 'lettre' ? 'Fermer la lettre' : 'Relire la lettre'}</GhostButton>
        <GhostButton type="button" onClick={ouvrirPersonnes}><i className="fa-solid fa-users" /> {vue === 'personnes' ? 'Fermer la liste' : 'Qui l’a reçue'}</GhostButton>
      </div>

      {vue === 'lettre' && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#293027]/10">
          <PreviewFrame blocks={n.blocks} subject={n.subject} preheader={n.preheader} couverture={n.couverture} couvertureUrl={n.couvertureUrl} entete={n.couverture === 'titre' ? n.entete : null} signature={n.signature} lang={n.lang} bandeau={n.bandeau} fond={n.fond} tailleLecture={n.tailleLecture} height={900} />
        </div>
      )}

      {vue === 'personnes' && (
        <div className="mt-4">
          {!personnes ? <p className="text-sm text-[#293027]/55">Chargement…</p> : personnes.length === 0 ? (
            <p className="text-sm text-[#293027]/55">La liste des destinataires n’a pas été gardée pour cette lettre.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <input value={filtre} onChange={e => setFiltre(e.target.value)} placeholder="Chercher un courriel…" className="min-w-[220px] flex-1 rounded-full border border-[#293027]/10 bg-white px-4 py-2 text-sm dark:bg-[#293027]/60 dark:text-white" />
                <span className="text-xs text-[#293027]/60 dark:text-white/60">{visibles.length} / {personnes.length}</span>
                <GhostButton type="button" onClick={() => downloadCsv(`destinataires-${(n.subject || 'lettre').slice(0, 40)}.csv`, personnes.map(p => ({ courriel: p.email, recue_le: p.recuLe?.toISOString() || '', lue: p.lu ? 'oui' : '', clic: p.clic ? 'oui' : '' })))}>
                  <i className="fa-solid fa-file-csv" /> Télécharger
                </GhostButton>
              </div>
              <ul className="max-h-[420px] divide-y divide-[#293027]/10 overflow-y-auto rounded-xl border border-[#293027]/10 bg-white dark:bg-[#293027]/40">
                {visibles.slice(0, 500).map(p => (
                  <li key={p.email} className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-[#293027] dark:text-white">
                    <span className="truncate">{p.email}</span>
                    <span className="flex shrink-0 gap-1.5 text-[11px]">
                      {p.lu && <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">lue</span>}
                      {p.clic && <span className="rounded-full bg-[#BA7B39]/15 px-2 py-0.5 text-[#8B4A2F]">clic</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {visibles.length > 500 && <p className="mt-2 text-xs text-[#293027]/50">Les 500 premières s’affichent; le téléchargement contient toute la liste.</p>}
            </>
          )}
        </div>
      )}
    </li>
  );
};

const JournalPanel: React.FC = () => {
  const [lettres, setLettres] = useState<NewsletterDoc[] | null>(null);
  useEffect(() => {
    getNewsletters()
      .then(all => setLettres(all
        .filter(n => (n.status === 'sent' || n.status === 'sending') && n.role !== 'sequence')
        .sort((a, b) => (b.sentAt?.toMillis?.() ?? 0) - (a.sentAt?.toMillis?.() ?? 0))))
      .catch(() => setLettres([]));
  }, []);

  const parMois = useMemo(() => {
    const m = new Map<string, NewsletterDoc[]>();
    for (const n of lettres || []) {
      const d = n.sentAt?.toDate?.();
      const k = d ? moisDe(d) : 'Sans date';
      m.set(k, [...(m.get(k) || []), n]);
    }
    return [...m.entries()];
  }, [lettres]);

  if (!lettres) return <p className="text-sm text-[#293027]/55">Chargement du journal…</p>;
  if (!lettres.length) return <EmptyState icon="fa-book">Aucune lettre envoyée pour l’instant.</EmptyState>;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-[#293027]/70 dark:text-white/70">
        Chaque lettre partie, mois par mois : le sujet, à qui elle s’adressait, combien l’ont reçue et lue, qui l’a reçue, et la lettre elle-même, telle qu’elle est partie.
        Les lectures comptent seulement les vraies ouvertures depuis le 26 septembre 2026; avant cette date, elles incluent les ouvertures automatiques.
      </p>
      {parMois.map(([mois, liste]) => (
        <Card key={mois} className="p-6">
          <h3 className="font-serif text-xl capitalize text-[#293027] dark:text-white">{mois} <span className="text-sm font-sans normal-case text-[#293027]/50">· {liste.length} lettre{liste.length > 1 ? 's' : ''}</span></h3>
          <ul className="mt-2">{liste.map(n => <Lettre key={n.id} n={n} />)}</ul>
        </Card>
      ))}
    </div>
  );
};

export default JournalPanel;
