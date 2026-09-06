import React, { useEffect, useMemo, useState } from 'react';
import { getNewsletterSubscribers, type NewsletterAudience, type NewsletterSubscriber } from '../../../../firebase/firestore';
import { Label } from '../../primitives';

// Qui reçoit l'infolettre : tout le monde, une ou plusieurs listes
// (étiquettes), ou des personnes choisies une à une. Le compte se calcule
// ici, avec la même règle que le serveur (actifs, une adresse = un envoi).

export function countRecipients(subs: NewsletterSubscriber[], a: NewsletterAudience): number {
  const norm = (e: string) => e.trim().toLowerCase();
  const wanted = new Set((a.emails || []).map(norm));
  const seen = new Set<string>();
  for (const s of subs) {
    if (s.status === 'unsubscribed') continue;
    const ok = a.mode === 'all' || (a.mode === 'tags' ? (s.tags || []).some(t => (a.tags || []).includes(t)) : wanted.has(norm(s.email)));
    if (ok) seen.add(norm(s.email));
  }
  return seen.size;
}

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-colors ${on ? 'bg-[#293027] text-white border-[#293027] dark:bg-[#BA7B39] dark:text-[#293027]' : 'bg-white dark:bg-white/5 text-[#293027]/60 dark:text-white/60 border-[#293027]/10 dark:border-white/10 hover:text-[#8B4A2F]'}`;

const AudiencePicker: React.FC<{ value: NewsletterAudience; onChange: (a: NewsletterAudience) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { getNewsletterSubscribers().then(setSubs); }, []);

  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subs) if (s.status !== 'unsubscribed') for (const t of s.tags || []) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [subs]);

  // Le dédoublonnage se fait en une passe avec un Set, et une seule fois par
  // chargement de la liste. L'ancienne version rappelait `findIndex` pour
  // chaque abonné : sur 33 000 contacts, ça faisait un demi-milliard de
  // comparaisons, près de quatre secondes de fil principal bloqué, refaites à
  // chaque frappe dans le champ de recherche. C'est ce qui déclenchait le
  // « la page ne répond pas » de Chrome.
  const uniques = useMemo(() => {
    const vus = new Set<string>();
    const out: NewsletterSubscriber[] = [];
    for (const s of subs) {
      if (s.status === 'unsubscribed') continue;
      if (vus.has(s.email)) continue;
      vus.add(s.email);
      out.push(s);
    }
    return out;
  }, [subs]);

  const people = useMemo(() => {
    const f = q.trim().toLowerCase();
    if (!f) return uniques.slice(0, 40);
    // On s'arrête aux 40 premières trouvailles au lieu de balayer les 33 000.
    const out: NewsletterSubscriber[] = [];
    for (const s of uniques) {
      if (s.email.toLowerCase().includes(f) || `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(f)) {
        out.push(s);
        if (out.length >= 40) break;
      }
    }
    return out;
  }, [uniques, q]);

  const total = useMemo(() => countRecipients(subs, value), [subs, value]);
  const toggleTag = (t: string) => {
    const cur = value.tags || [];
    onChange({ ...value, mode: 'tags', tags: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] });
  };
  const toggleEmail = (e: string) => {
    const cur = value.emails || [];
    onChange({ ...value, mode: 'emails', emails: cur.includes(e) ? cur.filter(x => x !== e) : [...cur, e] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label>Destinataires</Label>
        <span className="font-serif text-2xl text-[#293027] dark:text-white">{total} <span className="text-xs text-[#8B4A2F]">personne{total > 1 ? 's' : ''}</span></span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={disabled} className={chip(value.mode === 'all')} onClick={() => onChange({ mode: 'all' })}>Tout le monde</button>
        <button disabled={disabled} className={chip(value.mode === 'tags')} onClick={() => onChange({ ...value, mode: 'tags', tags: value.tags || [] })}>Des listes</button>
        <button disabled={disabled} className={chip(value.mode === 'emails')} onClick={() => onChange({ ...value, mode: 'emails', emails: value.emails || [] })}>Des personnes</button>
      </div>

      {value.mode === 'tags' && (
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-auto">
          {tags.length === 0 && <p className="text-xs text-[#293027]/50 dark:text-white/50">Aucune liste pour le moment.</p>}
          {tags.map(([t, n]) => (
            <button key={t} disabled={disabled} onClick={() => toggleTag(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${(value.tags || []).includes(t) ? 'bg-[#BA7B39] text-[#293027] border-[#BA7B39]' : 'bg-[#EEE7DB] dark:bg-white/5 text-[#293027]/70 dark:text-white/70 border-transparent hover:border-[#BA7B39]'}`}>
              {t} <span className="opacity-60">· {n}</span>
            </button>
          ))}
        </div>
      )}

      {value.mode === 'emails' && (
        <div className="space-y-2">
          {(value.emails || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(value.emails || []).map(e => (
                <button key={e} disabled={disabled} onClick={() => toggleEmail(e)} className="px-2.5 py-1 rounded-full text-[11px] bg-[#BA7B39] text-[#293027]" title="Retirer">{e} ×</button>
              ))}
            </div>
          )}
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une personne…" disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-sm outline-none focus:border-[#BA7B39]" />
          <ul className="max-h-48 overflow-auto divide-y divide-[#293027]/5 dark:divide-white/5 text-xs">
            {people.map(s => {
              const on = (value.emails || []).includes(s.email);
              return (
                <li key={s.email}>
                  <button disabled={disabled} onClick={() => toggleEmail(s.email)} className={`w-full text-left px-2 py-1.5 flex justify-between gap-2 hover:bg-[#BA7B39]/10 ${on ? 'text-[#8B4A2F]' : 'text-[#293027]/80 dark:text-white/80'}`}>
                    <span className="truncate">{[s.firstName, s.lastName].filter(Boolean).join(' ') || '—'} · {s.email}</span>
                    {on && <i className="fa-solid fa-check shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AudiencePicker;
