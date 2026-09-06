import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import type { NewsletterAudience } from '../../../../firebase/firestore';
import { Label } from '../../primitives';

// Qui reçoit l'infolettre : tout le monde, une ou plusieurs listes
// (étiquettes), ou des personnes choisies une à une. Le compte, les listes et
// la recherche viennent de la fonction `audienceInfolettre`, qui applique la
// même règle que l'envoi (abonnés actifs, une adresse = un envoi). Le
// navigateur ne rapatrie plus la collection des 33 000 abonnés : c'est ce qui
// gelait l'onglet à chaque ouverture d'une infolettre.

export interface AudienceInfo { total: number; tags: Array<{ tag: string; n: number }>; personnes: Array<{ email: string; nom: string }> }

export async function fetchAudience(input: { audience?: NewsletterAudience; q?: string }): Promise<AudienceInfo> {
  if (!app) throw new Error('Firebase non configuré');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'audienceInfolettre');
  const res: any = await call(input);
  return res.data as AudienceInfo;
}

const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-colors ${on ? 'bg-[#293027] text-white border-[#293027] dark:bg-[#BA7B39] dark:text-[#293027]' : 'bg-white dark:bg-white/5 text-[#293027]/60 dark:text-white/60 border-[#293027]/10 dark:border-white/10 hover:text-[#8B4A2F]'}`;

const AudiencePicker: React.FC<{ value: NewsletterAudience; onChange: (a: NewsletterAudience) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const [info, setInfo] = useState<AudienceInfo | null>(null);
  const [q, setQ] = useState('');
  const [personnes, setPersonnes] = useState<Array<{ email: string; nom: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const key = JSON.stringify(value);

  // Le compte se recalcule à chaque changement d'audience, avec un court délai
  // pour ne pas appeler la fonction à chaque clic sur une liste.
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setBusy(true); setFailed(false);
      fetchAudience({ audience: value }).then(setInfo).catch(() => setFailed(true)).finally(() => setBusy(false));
    }, info ? 400 : 0);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const f = q.trim();
    if (f.length < 2) { setPersonnes([]); return; }
    const t = window.setTimeout(() => {
      fetchAudience({ audience: value, q: f }).then(r => setPersonnes(r.personnes)).catch(() => setPersonnes([]));
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const total = info?.total ?? null;
  const tags = info?.tags ?? [];
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
        <span className="font-serif text-2xl text-[#293027] dark:text-white">
          {total !== null ? total : failed ? '?' : <i className="fa-solid fa-circle-notch fa-spin text-sm text-[#8B4A2F]" />}
          {' '}<span className="text-xs text-[#8B4A2F]">{busy && total !== null ? '…' : `personne${(total || 0) > 1 ? 's' : ''}`}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={disabled} className={chip(value.mode === 'all')} onClick={() => onChange({ mode: 'all' })}>Tout le monde</button>
        <button disabled={disabled} className={chip(value.mode === 'tags')} onClick={() => onChange({ ...value, mode: 'tags', tags: value.tags || [] })}>Certaines listes</button>
        <button disabled={disabled} className={chip(value.mode === 'emails')} onClick={() => onChange({ ...value, mode: 'emails', emails: value.emails || [] })}>Des personnes</button>
      </div>

      {value.mode === 'tags' && (
        <div className="flex flex-wrap gap-1.5 max-h-64 overflow-auto">
          {!info && !failed && <p className="text-xs text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-circle-notch fa-spin mr-1" />Les listes arrivent…</p>}
          {info && tags.length === 0 && <p className="text-xs text-[#293027]/50 dark:text-white/50">Aucune liste pour le moment.</p>}
          {tags.map(({ tag: t, n }) => (
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
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une personne (deux lettres au moins)…" disabled={disabled}
            className="w-full px-3 py-2 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-sm outline-none focus:border-[#BA7B39]" />
          <ul className="max-h-48 overflow-auto divide-y divide-[#293027]/5 dark:divide-white/5 text-xs">
            {personnes.map(s => {
              const on = (value.emails || []).includes(s.email);
              return (
                <li key={s.email}>
                  <button disabled={disabled} onClick={() => toggleEmail(s.email)} className={`w-full text-left px-2 py-1.5 flex justify-between gap-2 hover:bg-[#BA7B39]/10 ${on ? 'text-[#8B4A2F]' : 'text-[#293027]/80 dark:text-white/80'}`}>
                    <span className="truncate">{s.nom || '—'} · {s.email}</span>
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
