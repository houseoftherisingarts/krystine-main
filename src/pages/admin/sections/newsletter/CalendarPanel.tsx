import React, { useEffect, useMemo, useState } from 'react';
import { getNewsletters, getLiveEvents, type NewsletterDoc, type LiveEvent } from '../../../../firebase/firestore';
import { Card, GhostButton, PrimaryButton } from '../../primitives';

// Le calendrier des infolettres : ce qui est programmé, ce qui est parti,
// et les directs du podcast (leurs rappels partent tout seuls).

type Item = { date: Date; kind: 'scheduled' | 'sent' | 'draft' | 'live' | 'failed'; label: string; id: string };

const KIND: Record<Item['kind'], { dot: string; text: string }> = {
  scheduled: { dot: 'bg-blue-500', text: 'Programmée' },
  sent: { dot: 'bg-green-500', text: 'Envoyée' },
  draft: { dot: 'bg-[#bb9a5e]', text: 'Brouillon' },
  failed: { dot: 'bg-red-500', text: 'Échec' },
  live: { dot: 'bg-[#141311] dark:bg-[#e0b060]', text: 'Direct du podcast' },
};

const CalendarPanel: React.FC<{ onOpen: (id: string) => void; onNew: () => void }> = ({ onOpen, onNew }) => {
  const [news, setNews] = useState<NewsletterDoc[]>([]);
  const [lives, setLives] = useState<LiveEvent[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });

  useEffect(() => { Promise.all([getNewsletters(), getLiveEvents()]).then(([n, l]) => { setNews(n); setLives(l); }); }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const n of news) {
      const d = n.status === 'sent' ? n.sentAt?.toDate() : n.scheduledFor?.toDate();
      if (!d) continue;
      const kind: Item['kind'] = n.status === 'sent' ? 'sent' : n.status === 'scheduled' ? 'scheduled' : n.status === 'failed' ? 'failed' : 'draft';
      out.push({ date: d, kind, label: n.subject || n.title || 'Infolettre', id: n.id! });
    }
    for (const l of lives) out.push({ date: l.startsAt.toDate(), kind: 'live', label: l.title, id: `live:${l.id}` });
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [news, lives]);

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lundi en premier
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();
  const upcoming = items.filter(i => i.date >= today && i.kind !== 'sent').slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => setCursor(new Date(year, month - 1, 1))}><i className="fa-solid fa-chevron-left" /></GhostButton>
            <h3 className="font-serif text-2xl text-[#2a2015] dark:text-white capitalize min-w-[200px] text-center">{cursor.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</h3>
            <GhostButton onClick={() => setCursor(new Date(year, month + 1, 1))}><i className="fa-solid fa-chevron-right" /></GhostButton>
          </div>
          <PrimaryButton onClick={onNew}><i className="fa-solid fa-plus mr-2" />Nouvelle infolettre</PrimaryButton>
        </div>
        <div className="grid grid-cols-7 gap-px bg-[#2a2015]/10 dark:bg-white/10 rounded-xl overflow-hidden">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="bg-[#f6f3ee] dark:bg-[#16100a] px-2 py-1.5 text-[10px] uppercase tracking-widest text-[#2a2015]/50 dark:text-white/50">{d}</div>
          ))}
          {cells.map((d, i) => {
            const dayItems = d ? items.filter(it => sameDay(it.date, d)) : [];
            const isToday = d ? sameDay(d, today) : false;
            return (
              <div key={i} className={`min-h-[92px] p-1.5 bg-white dark:bg-[#2a2015] ${d ? '' : 'opacity-40'}`}>
                {d && <div className={`text-[11px] mb-1 ${isToday ? 'inline-block px-1.5 rounded-full bg-[#bb9a5e] text-[#2a2015] font-bold' : 'text-[#2a2015]/50 dark:text-white/50'}`}>{d.getDate()}</div>}
                <div className="space-y-1">
                  {dayItems.map(it => (
                    <button key={it.id} onClick={() => !it.id.startsWith('live:') && onOpen(it.id)} title={`${KIND[it.kind].text} · ${it.date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`}
                      className="w-full text-left flex items-center gap-1.5 text-[11px] leading-tight text-[#2a2015]/80 dark:text-white/80 hover:text-[#7d6330]">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${KIND[it.kind].dot}`} />
                      <span className="truncate">{it.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-[#2a2015]/60 dark:text-white/60">
          {(Object.keys(KIND) as Item['kind'][]).map(k => <span key={k} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${KIND[k].dot}`} />{KIND[k].text}</span>)}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#2a2015]/50 dark:text-white/50 mb-3">À venir</p>
        {upcoming.length === 0 && <p className="text-sm text-[#2a2015]/50 dark:text-white/50">Rien de programmé. Le calendrier est à vous.</p>}
        <ul className="divide-y divide-[#2a2015]/5 dark:divide-white/5">
          {upcoming.map(it => (
            <li key={it.id} className="py-2.5">
              <button onClick={() => !it.id.startsWith('live:') && onOpen(it.id)} className="w-full text-left">
                <div className="flex items-center gap-2 text-sm text-[#2a2015] dark:text-white"><span className={`w-2 h-2 rounded-full ${KIND[it.kind].dot}`} /><span className="truncate">{it.label}</span></div>
                <div className="text-[11px] text-[#2a2015]/50 dark:text-white/50 pl-4">{it.date.toLocaleString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · {KIND[it.kind].text}</div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default CalendarPanel;
