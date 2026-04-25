// VexelPage — hidden inbox at /vexel for the Salon des Inconnus contact-card
// submissions. Not linked from anywhere on the site (the URL is the access
// token by convention). Lists every entry in `vexelInquiries` with a
// minimal triage UI: copy email, mark/delete, full message expand.
//
// Visual tone is deliberately spartan compared to the host site — this is
// Alex's tool, not a Krystine surface — but the colour register stays in
// the same brun/cuivre family so it doesn't fight the rest of the app
// when navigating here from the same browser tab.

import React, { useEffect, useState } from 'react';
import { getVexelInquiries, deleteVexelInquiry, type VexelInquiry } from '../firebase/firestore';

const projectLabel = (v?: string) => {
  switch (v) {
    case 'site-vitrine': return 'Site vitrine';
    case 'e-commerce':   return 'E-commerce';
    case 'sur-mesure':   return 'Sur mesure';
    case 'refonte':      return 'Refonte';
    case 'autre':        return 'Autre';
    default:             return v || '—';
  }
};
const budgetLabel = (v?: string) => {
  switch (v) {
    case '<5k':     return '< 5 000 $';
    case '5-15k':   return '5 – 15 k$';
    case '15-30k':  return '15 – 30 k$';
    case '30k+':    return '> 30 000 $';
    case 'discuss': return 'À discuter';
    default:        return v || '—';
  }
};

const fmtDate = (ts?: any): string => {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return '—'; }
};

const VexelPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<VexelInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await getVexelInquiries();
      setInquiries(list);
    } catch (e: any) {
      setErr(e?.message || 'Lecture impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Supprimer cette demande ?')) return;
    await deleteVexelInquiry(id);
    setInquiries(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#1A0E08] text-[#F4E7DD] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10 pb-6 border-b border-[#B8532F]/30 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.4em] font-bold text-[#B07A3C] mb-2">
              Le Salon des Inconnus · /vexel
            </span>
            <h1
              className="font-serif text-3xl md:text-4xl"
              style={{
                backgroundImage: 'linear-gradient(95deg, #B07A3C 0%, #D7A858 35%, #8C5A28 70%, #B07A3C 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Boîte de réception · vexel
            </h1>
            <p className="text-sm text-[#F4E7DD]/55 mt-1">
              Demandes entrantes via la carte « Plateforme développée par Le Salon des Inconnus ».
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#B8532F] text-[#1A0E08] hover:bg-[#D7A858] text-[11px] uppercase tracking-[0.25em] font-bold transition-colors"
          >
            <i className="fa-solid fa-rotate" /> Rafraîchir
          </button>
        </header>

        {/* States */}
        {loading && (
          <p className="text-[#F4E7DD]/60"><i className="fa-solid fa-circle-notch fa-spin mr-2" /> Chargement…</p>
        )}
        {err && (
          <p className="text-red-300 mb-6">Erreur : {err}</p>
        )}
        {!loading && !err && inquiries.length === 0 && (
          <p className="text-[#F4E7DD]/55 italic">Aucune demande pour l'instant.</p>
        )}

        {/* List */}
        <ul className="space-y-3">
          {inquiries.map(q => {
            const isOpen = openId === q.id;
            return (
              <li
                key={q.id}
                className="rounded-2xl border border-[#B8532F]/25 bg-[#2E1A14]/70 hover:border-[#B8532F]/60 transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : q.id || null)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-serif text-lg text-[#F4E7DD]">{q.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[#B07A3C] font-bold">
                        {projectLabel(q.projectType)} · {budgetLabel(q.budget)}
                      </span>
                    </div>
                    <div className="text-sm text-[#F4E7DD]/65 truncate">
                      {q.email}{q.phone ? ` · ${q.phone}` : ''}{q.timeline ? ` · ${q.timeline}` : ''}
                    </div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#F4E7DD]/40 whitespace-nowrap">
                    {fmtDate(q.createdAt)}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#B8532F]/15">
                    {q.message && (
                      <p className="font-serif italic text-[#F4E7DD]/85 leading-relaxed whitespace-pre-line my-4">
                        {q.message}
                      </p>
                    )}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-4">
                      <Row k="Courriel" v={<a href={`mailto:${q.email}`} className="underline hover:text-[#D7A858]">{q.email}</a>} />
                      {q.phone && <Row k="Téléphone" v={<a href={`tel:${q.phone}`} className="underline hover:text-[#D7A858]">{q.phone}</a>} />}
                      <Row k="Type" v={projectLabel(q.projectType)} />
                      <Row k="Budget" v={budgetLabel(q.budget)} />
                      {q.timeline && <Row k="Échéance" v={q.timeline} />}
                      {q.sourceSite && <Row k="Provenance" v={q.sourceSite} />}
                    </dl>
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${q.email}?subject=${encodeURIComponent('Votre projet — Le Salon des Inconnus')}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B8532F] text-[#1A0E08] hover:bg-[#D7A858] text-[11px] uppercase tracking-[0.25em] font-bold transition-colors"
                      >
                        <i className="fa-solid fa-reply" /> Répondre
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(q.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10 text-[11px] uppercase tracking-[0.25em] font-bold transition-colors"
                      >
                        <i className="fa-solid fa-trash" /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex gap-2">
    <dt className="text-[#F4E7DD]/45 uppercase tracking-[0.2em] text-[10px] font-bold w-24 shrink-0 pt-1">{k}</dt>
    <dd className="text-[#F4E7DD]/85">{v}</dd>
  </div>
);

export default VexelPage;
