import React, { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  getLiveEvents, saveLiveEvent, getNewsletterSubscribers,
  type LiveEvent, type NewsletterSubscriber,
} from '../../../../firebase/firestore';
import { Card, Input, Label, PrimaryButton, GhostButton, downloadCsv } from '../../primitives';

// Onglet « Direct » : un direct du podcast à la fois. Krystine règle la date,
// le lien YouTube et, après coup, le lien de rediffusion (ce qui déclenche le
// dernier envoi). Le panneau montre qui s'est inscrit et quels rappels sont partis.

const STEPS: Array<{ key: 'd3' | 'veille' | 'h1' | 'replay'; label: string }> = [
  { key: 'd3', label: 'Trois jours avant' },
  { key: 'veille', label: 'La veille' },
  { key: 'h1', label: 'Une heure avant' },
  { key: 'replay', label: 'Rediffusion' },
];

const toLocalInput = (t?: Timestamp) => {
  if (!t) return '';
  const d = t.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const LivePanel: React.FC = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [sel, setSel] = useState<LiveEvent | null>(null);
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [ev, s] = await Promise.all([getLiveEvents(), getNewsletterSubscribers()]);
    setEvents(ev);
    setSubs(s);
    if (ev[0]) { setSel(ev[0]); setWhen(toLocalInput(ev[0].startsAt)); }
  };
  useEffect(() => { load(); }, []);

  const pick = (ev: LiveEvent) => { setSel(ev); setWhen(toLocalInput(ev.startsAt)); setMsg(null); };

  const fresh = () => {
    const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(12, 0, 0, 0);
    const id = `podcast-live-${d.toISOString().slice(0, 10)}`;
    const ev: LiveEvent = { id, title: 'Podcast en direct', startsAt: Timestamp.fromDate(d), youtubeUrl: 'https://www.youtube.com/@KrystineStLaurent/live', tag: id };
    setSel(ev); setWhen(toLocalInput(ev.startsAt)); setMsg(null);
  };

  const save = async () => {
    if (!sel || !when) return;
    setSaving(true); setMsg(null);
    try {
      await saveLiveEvent({ ...sel, startsAt: Timestamp.fromDate(new Date(when)) });
      setMsg('Enregistré.');
      await load();
    } catch (e: any) { setMsg(e?.message || 'Échec de l\'enregistrement'); }
    finally { setSaving(false); }
  };

  const registered = sel ? subs.filter(s => s.status !== 'unsubscribed' && (s.tags || []).includes(sel.tag)) : [];
  const uniq = registered.filter((s, i, a) => a.findIndex(o => o.email === s.email) === i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {events.map(ev => (
          <button key={ev.id} onClick={() => pick(ev)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors ${sel?.id === ev.id ? 'bg-[#293027] text-white border-[#293027]' : 'bg-white text-[#293027]/60 border-[#293027]/10 hover:text-[#8B4A2F]'}`}>
            {ev.startsAt.toDate().toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} · {ev.title}
          </button>
        ))}
        <GhostButton onClick={fresh}><i className="fa-solid fa-plus mr-2" />Nouveau direct</GhostButton>
      </div>

      {sel && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Titre</Label>
              <Input value={sel.title} onChange={e => setSel({ ...sel, title: e.target.value })} />
            </div>
            <div>
              <Label>Date et heure (heure du Québec)</Label>
              <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
            </div>
            <div>
              <Label>Lien YouTube du direct</Label>
              <Input value={sel.youtubeUrl} onChange={e => setSel({ ...sel, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <div>
              <Label>Lien de la rediffusion (à poser après le direct : déclenche le dernier courriel)</Label>
              <Input value={sel.replayUrl || ''} onChange={e => setSel({ ...sel, replayUrl: e.target.value || undefined })} placeholder="https://www.youtube.com/watch?v=…" />
            </div>
            <p className="text-[11px] text-[#293027]/50 dark:text-white/50">Étiquette CRM : <code className="bg-[#BA7B39]/10 px-1 rounded">{sel.tag}</code></p>
            <div className="flex items-center gap-3">
              <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
              {msg && <span className="text-xs text-[#8B4A2F]">{msg}</span>}
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#293027]/50 dark:text-white/50">Inscrits au direct</p>
                <p className="font-serif text-4xl text-[#293027] dark:text-white">{uniq.length} <span className="text-base text-[#8B4A2F]">· {uniq.filter(s => s.question).length} question{uniq.filter(s => s.question).length > 1 ? 's' : ''}</span></p>
              </div>
              <GhostButton onClick={() => downloadCsv(`${sel.tag}.csv`, uniq.map(s => ({ email: s.email, firstName: s.firstName || '', question: s.question || '', subscribedAt: s.subscribedAt?.toDate?.().toISOString() || '' })))} disabled={uniq.length === 0}>
                <i className="fa-solid fa-download mr-2" />CSV
              </GhostButton>
            </div>
            <ul className="divide-y divide-[#293027]/5 dark:divide-white/5">
              {STEPS.map(st => {
                const at = sel.reminders?.[st.key];
                const n = sel.stats?.[st.key];
                return (
                  <li key={st.key} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-[#293027]/80 dark:text-white/80">{st.label}</span>
                    <span className={`text-xs ${at ? 'text-[#8B4A2F]' : 'text-[#293027]/40 dark:text-white/40'}`}>
                      {at ? `Envoyé le ${at.toDate().toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${typeof n === 'number' ? ` · ${n}` : ''}` : 'À venir'}
                    </span>
                  </li>
                );
              })}
            </ul>
            <ul className="max-h-72 overflow-auto text-xs space-y-1.5">
              {uniq.map(s => (
                <li key={s.id} className="text-[#293027]/70 dark:text-white/70">
                  <div className="flex justify-between gap-3">
                    <span className="truncate">{s.firstName ? `${s.firstName} · ` : ''}{s.email}</span>
                    <span className="shrink-0 text-[#293027]/40 dark:text-white/40">{s.subscribedAt?.toDate?.().toLocaleDateString('fr-CA')}</span>
                  </div>
                  {s.question && <p className="mt-1 pl-3 border-l-2 border-[#BA7B39]/60 text-[#293027]/80 dark:text-white/80 whitespace-pre-wrap">{s.question}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LivePanel;
