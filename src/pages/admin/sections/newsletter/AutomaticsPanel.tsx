import React, { useEffect, useMemo, useState } from 'react';
import { getNewsletterSubscribers, getLiveEvents, type NewsletterSubscriber, type LiveEvent } from '../../../../firebase/firestore';
import { Card } from '../../primitives';
import PreviewFrame from './PreviewFrame';
import { sourceLabel } from './SubscribersPanel';

// Les courriels qui partent tout seuls : le mot de bienvenue quand quelqu'un
// s'inscrit par un formulaire, et la suite du direct du podcast (confirmation,
// trois jours avant, la veille, une heure avant, rediffusion). Chaque ligne
// dit qui le reçoit, combien l'ont reçu, et montre le courriel tel qu'il part.

type Auto = { key: string; kind: string; title: string; when: string; who: string; count?: number };

const AutomaticsPanel: React.FC = () => {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [lives, setLives] = useState<LiveEvent[]>([]);
  const [open, setOpen] = useState<string>('welcome');
  useEffect(() => { Promise.all([getNewsletterSubscribers(), getLiveEvents()]).then(([s, l]) => { setSubs(s); setLives(l); }); }, []);

  const bySource = useMemo(() => {
    const m = new Map<string, { total: number; welcomed: number }>();
    for (const s of subs) {
      const k = s.source || '';
      if (k === 'csv-import' || k === 'podcast-live') continue;
      const e = m.get(k) || { total: 0, welcomed: 0 };
      e.total++; if ((s as any).welcomeSentAt) e.welcomed++;
      m.set(k, e);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [subs]);

  const liveSubs = subs.filter(s => s.source === 'podcast-live').length;
  const latest = lives[0];
  const stat = (k: 'd3' | 'veille' | 'h1' | 'replay') => latest?.stats?.[k];
  const sentAt = (k: 'd3' | 'veille' | 'h1' | 'replay') => latest?.reminders?.[k]?.toDate().toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const autos: Auto[] = [
    { key: 'welcome', kind: 'welcome', title: 'Mot de bienvenue', when: 'À l\'inscription, tout de suite', who: 'Toute personne qui s\'inscrit par un formulaire du site (sauf import CSV et direct du podcast)', count: bySource.reduce((n, [, v]) => n + v.welcomed, 0) },
    { key: 'live-confirm', kind: 'live-confirm', title: 'Confirmation du direct', when: 'À l\'inscription au direct, tout de suite', who: 'Les inscrits au direct du podcast', count: liveSubs },
    { key: 'live-d3', kind: 'live-d3', title: 'Rappel : trois jours avant', when: sentAt('d3') ? `Parti le ${sentAt('d3')}` : '72 h avant le direct', who: 'Les inscrits au direct', count: stat('d3') },
    { key: 'live-veille', kind: 'live-veille', title: 'Rappel : la veille', when: sentAt('veille') ? `Parti le ${sentAt('veille')}` : '24 h avant le direct', who: 'Les inscrits au direct', count: stat('veille') },
    { key: 'live-h1', kind: 'live-h1', title: 'Rappel : une heure avant', when: sentAt('h1') ? `Parti le ${sentAt('h1')}` : '1 h avant le direct', who: 'Les inscrits au direct', count: stat('h1') },
    { key: 'live-replay', kind: 'live-replay', title: 'Rediffusion', when: sentAt('replay') ? `Parti le ${sentAt('replay')}` : 'Dès que le lien de rediffusion est posé', who: 'Les inscrits au direct', count: stat('replay') },
  ];
  const current = autos.find(a => a.key === open) || autos[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <Card className="p-2">
          {autos.map(a => (
            <button key={a.key} onClick={() => setOpen(a.key)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${open === a.key ? 'bg-[#141311] text-[#EEE7DB]' : 'hover:bg-[#bb9a5e]/10 text-[#2a2015] dark:text-white'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-lg">{a.title}</span>
                {typeof a.count === 'number' && <span className={`text-xs ${open === a.key ? 'text-[#e0b060]' : 'text-[#7d6330]'}`}>{a.count} envoyé{a.count > 1 ? 's' : ''}</span>}
              </div>
              <div className={`text-[11px] ${open === a.key ? 'text-white/60' : 'text-[#2a2015]/50 dark:text-white/50'}`}>{a.when}</div>
            </button>
          ))}
        </Card>

        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#2a2015]/50 dark:text-white/50 mb-3">Mot de bienvenue, par formulaire</p>
          <ul className="divide-y divide-[#2a2015]/5 dark:divide-white/5 text-sm">
            {bySource.map(([k, v]) => (
              <li key={k} className="py-2 flex justify-between gap-3">
                <span className="truncate text-[#2a2015]/80 dark:text-white/80">{k ? sourceLabel(k) : 'Sans source'}</span>
                <span className="shrink-0 text-[#7d6330] text-xs">{v.welcomed} / {v.total}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-[#2a2015]/50 dark:text-white/50">Envoyés / inscrits. Les inscrits d'avant le 26 août 2026 n'ont pas reçu le mot de bienvenue : il n'existait pas encore.</p>
        </Card>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#2a2015]/50 dark:text-white/50">{current.title}</p>
          <p className="text-sm text-[#2a2015]/70 dark:text-white/70">{current.who}. {current.when}.</p>
        </div>
        <PreviewFrame kind={current.kind} height={1100} />
      </div>
    </div>
  );
};

export default AutomaticsPanel;
