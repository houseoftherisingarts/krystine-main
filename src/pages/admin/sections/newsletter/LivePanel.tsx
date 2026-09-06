import React, { useEffect, useMemo, useState } from 'react';
import { Timestamp, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../../../firebase';
import {
  getLiveEvents, saveLiveEvent, getNewsletterSubscribers, getAllMembers,
  type LiveEvent, type NewsletterSubscriber, type MemberDoc,
} from '../../../../firebase/firestore';
import { Card, Input, Label, PrimaryButton, GhostButton, ToggleSwitch, downloadCsv } from '../../primitives';
import QuestionCards, { type QuestionCard } from './QuestionCards';
import { envoyerRappelDirect, type EtapeDirect, type AudienceDirect } from '../../../../firebase/live';

// Onglet « Direct » : un direct du podcast à la fois. Krystine règle la date,
// le lien YouTube et, après coup, le lien de rediffusion (ce qui déclenche le
// dernier envoi). Le panneau montre qui s'est inscrit et quels rappels sont partis.

const STEPS: Array<{ key: 'd3' | 'veille' | 'h1' | 'replay'; label: string }> = [
  { key: 'd3', label: 'Trois jours avant' },
  { key: 'veille', label: 'La veille' },
  { key: 'h1', label: 'Une heure avant' },
  { key: 'replay', label: 'Rediffusion' },
];

// Les trois rappels partent un certain nombre d'heures avant le direct.
// Krystine règle ces heures ici; sans réglage, la série garde 72, 24 et 1.
const DELAIS: Array<{ key: 'd3' | 'veille' | 'h1'; label: string; defaut: number }> = [
  { key: 'd3', label: 'Premier rappel', defaut: 72 },
  { key: 'veille', label: 'Deuxième rappel', defaut: 24 },
  { key: 'h1', label: 'Dernier rappel', defaut: 1 },
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
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [cartes, setCartes] = useState(false);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [envoiMsg, setEnvoiMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<LiveEvent | null>(null);
  const [when, setWhen] = useState('');
  const [whenReplay, setWhenReplay] = useState('');   // date d'envoi de la rediffusion
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = async () => {
    // Sans ce filet, un échec de lecture (droits, réseau, règles Firestore)
    // laissait le panneau à zéro inscrit : Krystine croyait que personne ne
    // s'était inscrit alors que la liste n'avait tout simplement pas chargé.
    try {
      const [ev, s, m] = await Promise.all([
        getLiveEvents(),
        getNewsletterSubscribers(),
        getAllMembers().catch(() => [] as MemberDoc[]),
      ]);
      setEvents(ev);
      setSubs(s);
      setMembers(m);
      setLoadErr(null);
      if (ev[0]) { setSel(ev[0]); setWhen(toLocalInput(ev[0].startsAt)); setWhenReplay(toLocalInput(ev[0].replayAt)); }
    } catch (e: any) {
      setLoadErr(e?.message || 'Impossible de charger les inscrits. Réessayez ou vérifiez votre connexion.');
    }
  };
  useEffect(() => { load(); }, []);

  const pick = (ev: LiveEvent) => { setSel(ev); setWhen(toLocalInput(ev.startsAt)); setWhenReplay(toLocalInput(ev.replayAt)); setMsg(null); setEnvoiMsg(null); };

  // Envoi immédiat d'une étape, aux inscrits de ce direct ou à toute la liste.
  const envoyer = async (step: EtapeDirect, audience: AudienceDirect) => {
    if (!sel || envoi) return;
    const qui = audience === 'tous' ? 'toute la liste' : 'les inscrits au direct';
    const etape = STEPS.find(x => x.key === step)?.label.toLowerCase() || step;
    if (!window.confirm(`Envoyer « ${etape} » à ${qui}, maintenant ?`)) return;
    setEnvoi(`${step}-${audience}`); setEnvoiMsg(null);
    try {
      const r = await envoyerRappelDirect(sel.id, step, audience);
      const base = `Parti à ${r.sent} personne${r.sent > 1 ? 's' : ''} sur ${r.total}.`;
      const deja = r.dejaServis > 0 ? ` ${r.dejaServis} l'avaient déjà reçu.` : '';
      setEnvoiMsg(r.quotaAtteint
        ? `${base}${deja} Le fournisseur de courriel a atteint son quota du jour, ${r.restants} personne${r.restants > 1 ? 's attendent' : ' attend'} encore. Reprenez demain avec le même bouton, celles qui ont reçu sont sautées.`
        : `${base}${deja}`);
      await load();
    } catch (e: any) {
      setEnvoiMsg(e?.message || 'L\'envoi n\'a pas fonctionné.');
    } finally { setEnvoi(null); }
  };

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
      await saveLiveEvent({
        ...sel,
        startsAt: Timestamp.fromDate(new Date(when)),
        ...(whenReplay ? { replayAt: Timestamp.fromDate(new Date(whenReplay)) } : {}),
      });
      setMsg('Enregistré.');
      await load();
    } catch (e: any) { setMsg(e?.message || 'Échec de l\'enregistrement'); }
    finally { setSaving(false); }
  };

  // Le bloc public LiveSignup pose trois étiquettes : 'podcast',
  // 'podcast-live' et celle du direct (podcast-live-AAAA-MM-JJ). Un
  // formulaire monté à la main ne pose souvent que 'podcast-live' : ces
  // inscrites, faute d'étiquette datée, n'apparaissaient nulle part dans cet
  // onglet — seulement dans « toutes » chez les abonnés. On les rattache au
  // direct le plus proche (events est trié du plus récent au plus ancien).
  const GENERIQUE = 'podcast-live';
  const estGenerique = (s: NewsletterSubscriber) =>
    (s.tags || []).includes(GENERIQUE) || (s.source || '').replace(/_google$/, '') === GENERIQUE;
  const porteUneDate = (s: NewsletterSubscriber) =>
    (s.tags || []).some(t => t.startsWith(`${GENERIQUE}-`));
  const principal = events[0]?.id;

  // Balayer les 33 000 abonnés à chaque rendu (une frappe dans un champ de
  // date suffisait) coûtait une dizaine de millisecondes pour rien, et rendait
  // le mémo des cartes inutile puisque `uniq` était un nouveau tableau chaque
  // fois. Le tri se fait une fois par direct choisi.
  const uniq = useMemo(() => {
    if (!sel) return [] as NewsletterSubscriber[];
    const vus = new Set<string>();
    const out: NewsletterSubscriber[] = [];
    for (const s of subs) {
      if (s.status === 'unsubscribed') continue;
      const inscrit = (s.tags || []).includes(sel.tag)
        // Inscrite sans date : elle revient au direct à venir, pas aux anciens.
        || (sel.id === principal && estGenerique(s) && !porteUneDate(s));
      if (!inscrit || vus.has(s.email)) continue;
      vus.add(s.email);
      out.push(s);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, sel, principal]);
  const nbSansDate = uniq.filter(s => !(s.tags || []).includes(sel?.tag || '')).length;

  // Le paquet de cartes du direct : une carte par question posée à
  // l'inscription, la photo et le dosha récupérés sur la fiche du membre quand
  // la personne en a une. Les questions posées pendant le direct s'ajoutent
  // toutes seules à la fin, elles arrivent de /podcast/question.
  const cartesQuestions = useMemo<QuestionCard[]>(() => {
    const parUid = new Map(members.map(m => [m.uid, m]));
    const parEmail = new Map(members.map(m => [(m.email || '').toLowerCase(), m]));
    return uniq
      .filter(s => s.question && s.question.trim())
      .sort((a, b) => (a.subscribedAt?.toMillis?.() || 0) - (b.subscribedAt?.toMillis?.() || 0))
      .map(s => {
        const m = (s.uid && parUid.get(s.uid)) || parEmail.get(s.email.toLowerCase());
        const nom = [s.firstName, s.lastName].filter(Boolean).join(' ').trim()
          || m?.displayName
          || s.email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const meta = [s.region || s.province, m?.dosha ? `Dosha ${m.dosha}` : ''].filter(Boolean).join(' · ');
        return {
          id: s.id || s.email,
          name: nom,
          email: s.email,
          question: s.question!.trim(),
          photoURL: m?.photoURL,
          meta: meta || undefined,
          at: s.subscribedAt?.toDate?.(),
        };
      });
  }, [uniq, members]);

  return (
    <div className="space-y-6">
      {loadErr && (
        <Card className="p-4 border-2 border-red-500/40">
          <p className="text-sm text-red-600">
            <i className="fa-solid fa-triangle-exclamation mr-2" />
            {loadErr}
          </p>
          <div className="mt-3"><GhostButton onClick={load}><i className="fa-solid fa-rotate-right mr-2" />Réessayer</GhostButton></div>
        </Card>
      )}
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
            <div>
              <Label>Envoi de la rediffusion (pas avant)</Label>
              <Input type="datetime-local" value={whenReplay} onChange={e => setWhenReplay(e.target.value)} />
              <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50">
                Vide : le courriel part dès que le lien de rediffusion est posé, après le direct.
              </p>
              {!!sel.reminders?.replay && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!db || !confirm('Ré-armer la rediffusion ? Le courriel repartira à la prochaine fenêtre (lien et date ci-dessus).')) return;
                    await updateDoc(doc(db, 'liveEvents', sel.id), { 'reminders.replay': deleteField() });
                    setMsg('Rediffusion ré-armée.');
                    await load();
                  }}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:bg-[#BA7B39]/10"
                >
                  <i className="fa-solid fa-rotate-left" /> Ré-armer la rediffusion (déjà envoyée)
                </button>
              )}
            </div>
            <div>
              <ToggleSwitch
                checked={!sel.envoisDesactives}
                onChange={async v => {
                  setSel({ ...sel, envoisDesactives: !v });
                  await saveLiveEvent({ ...sel, envoisDesactives: !v });
                  setMsg(v ? 'Envois automatiques réactivés.' : 'Envois automatiques coupés.');
                }}
                label={sel.envoisDesactives ? 'Envois automatiques coupés' : 'Envois automatiques actifs'}
              />
            </div>
            <div>
              <Label>Quand partent les rappels (heures avant le direct)</Label>
              <div className="grid grid-cols-3 gap-3">
                {DELAIS.map(d => (
                  <div key={d.key}>
                    <Input
                      type="number" min={1} max={336}
                      value={String(sel.offsets?.[d.key] ?? d.defaut)}
                      onChange={e => setSel({
                        ...sel,
                        offsets: { ...(sel.offsets || {}), [d.key]: Math.max(1, Number(e.target.value) || d.defaut) },
                      })}
                    />
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">{d.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#293027]/50 dark:text-white/50">
                Le serveur vérifie toutes les quinze minutes, donc un rappel part dans le quart d'heure qui suit l'heure réglée. Enregistrez pour appliquer.
              </p>
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
                {nbSansDate > 0 && (
                  <p className="mt-1 text-[11px] text-[#293027]/50 dark:text-white/50">
                    dont {nbSansDate} inscrite{nbSansDate > 1 ? 's' : ''} par le formulaire « Podcast en direct » (sans date)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
              <GhostButton onClick={() => setCartes(true)} disabled={cartesQuestions.length === 0}>
                <i className="fa-solid fa-id-card mr-2" />Cartes
              </GhostButton>
              <GhostButton onClick={() => downloadCsv(`${sel.tag}.csv`, uniq.map(s => ({ email: s.email, firstName: s.firstName || '', question: s.question || '', subscribedAt: s.subscribedAt?.toDate?.().toISOString() || '' })))} disabled={uniq.length === 0}>
                <i className="fa-solid fa-download mr-2" />CSV
              </GhostButton>
              </div>
            </div>
            <ul className="divide-y divide-[#293027]/5 dark:divide-white/5">
              {STEPS.map(st => {
                const at = sel.reminders?.[st.key];
                const n = sel.stats?.[st.key];
                return (
                  <li key={st.key} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#293027]/80 dark:text-white/80">{st.label}</span>
                      <span className={`text-xs shrink-0 ${at ? 'text-[#8B4A2F]' : 'text-[#293027]/40 dark:text-white/40'}`}>
                        {at ? `Envoyé le ${at.toDate().toLocaleString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${typeof n === 'number' ? ` · ${n}` : ''}` : 'À venir'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => envoyer(st.key, 'inscrits')}
                        disabled={!!envoi}
                        className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#BA7B39]/50 text-[#8B4A2F] hover:bg-[#BA7B39]/10 disabled:opacity-40 transition-colors">
                        {envoi === `${st.key}-inscrits` ? 'Envoi…' : 'Envoyer aux inscrits'}
                      </button>
                      <button
                        onClick={() => envoyer(st.key, 'tous')}
                        disabled={!!envoi}
                        className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#293027] text-white hover:bg-[#8B4A2F] disabled:opacity-40 transition-colors">
                        {envoi === `${st.key}-tous` ? 'Envoi…' : 'Envoyer à tous'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {envoiMsg && <p className="text-xs text-[#8B4A2F]">{envoiMsg}</p>}
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

      {cartes && sel && (
        <QuestionCards
          cards={cartesQuestions}
          eventTag={sel.tag}
          eventTitle={`${sel.title} · ${sel.startsAt.toDate().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}`}
          onClose={() => setCartes(false)}
        />
      )}
    </div>
  );
};

export default LivePanel;
