import React, { useEffect, useState } from 'react';
import { libelleTag } from '../../../../lib/paliers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import { Timestamp } from 'firebase/firestore';
import {
  createNewsletter, updateNewsletter, getNewsletter,
  type NewsletterBlock, type BlockType, type NewsletterStatus, type NewsletterAudience,
} from '../../../../firebase/firestore';
import AudiencePicker from './AudiencePicker';
import PreviewFrame from './PreviewFrame';
import AssistantPanel, { type Proposal } from './AssistantPanel';
import MediathequePicker from '../../../../components/edit/MediathequePicker';
import { RenderBlockWeb } from '../../../../lib/newsletterRenderer';
import { Input, Label, PrimaryButton, GhostButton } from '../../primitives';

interface Props {
  newsletterId: string | null;  // null → fresh draft
  onBack: () => void;
}

const BLOCK_PALETTE: Array<{ type: BlockType; icon: string; label: string; template: () => NewsletterBlock }> = [
  { type: 'heading',  icon: 'fa-heading',     label: 'Titre',      template: () => ({ type: 'heading',   content: { level: 2, text: '', align: 'center' } }) },
  { type: 'paragraph',icon: 'fa-paragraph',   label: 'Paragraphe', template: () => ({ type: 'paragraph', content: { text: '' } }) },
  { type: 'image',    icon: 'fa-image',       label: 'Image',      template: () => ({ type: 'image',     content: { url: '', caption: '' } }) },
  { type: 'button',   icon: 'fa-hand-pointer',label: 'Bouton',     template: () => ({ type: 'button',    content: { label: 'Découvrir', href: 'https://www.krystinestlaurent.ca', variant: 'primary' } }) },
  { type: 'quote',    icon: 'fa-quote-left',  label: 'Citation',   template: () => ({ type: 'quote',     content: { text: '', attribution: '' } }) },
  { type: 'cta',      icon: 'fa-star',        label: 'Appel fort', template: () => ({ type: 'cta',       content: { eyebrow: 'Nouveauté', title: '', body: '', href: 'https://www.krystinestlaurent.ca', buttonLabel: 'En savoir plus' } }) },
  { type: 'divider',  icon: 'fa-minus',       label: 'Séparateur', template: () => ({ type: 'divider' }) },
  { type: 'spacer',   icon: 'fa-arrows-up-down', label: 'Espace', template: () => ({ type: 'spacer',    content: { size: 'md' } }) },
];

// Le composeur prend tout l'écran (par-dessus le menu de l'admin) : la page
// s'écrit comme elle sera lue, chaque texte se modifie au clic, chaque image
// se remplace au clic. Les réglages d'envoi vivent dans le rail de droite.
const Composer: React.FC<Props> = ({ newsletterId, onBack }) => {
  const [loading, setLoading] = useState(newsletterId !== null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [id, setId] = useState<string | null>(newsletterId);
  const [status, setStatus] = useState<NewsletterStatus>('draft');

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [fromName, setFromName] = useState('Krystine St-Laurent');
  const [blocks, setBlocks] = useState<NewsletterBlock[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [audience, setAudience] = useState<NewsletterAudience>({ mode: 'all' });
  const [when, setWhen] = useState('');          // datetime-local, heure du Québec
  const [side, setSide] = useState<'reglages' | 'preview' | 'iris'>('reglages');
  const [pickFor, setPickFor] = useState<number | null>(null);   // bloc image en attente d'une image

  // datetime-local <-> Date
  const toLocal = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  useEffect(() => {
    if (!newsletterId) { setLoading(false); return; }
    setLoading(true);
    getNewsletter(newsletterId)
      .then(n => {
        if (!n) { onBack(); return; }
        setTitle(n.title || '');
        setSubject(n.subject || '');
        setPreheader(n.preheader || '');
        setFromName(n.fromName || 'Krystine St-Laurent');
        setBlocks(n.blocks || []);
        setStatus(n.status || 'draft');
        setAudience(n.audience || (n.segmentTag ? { mode: 'tags', tags: [n.segmentTag] } : { mode: 'all' }));
        setWhen(n.scheduledFor ? toLocal(n.scheduledFor.toDate()) : '');
      })
      .finally(() => setLoading(false));
  }, [newsletterId, onBack]);

  const isReadOnly = status === 'sent' || status === 'sending';

  const addBlock = (t: BlockType) => {
    if (isReadOnly) return;
    const template = BLOCK_PALETTE.find(b => b.type === t)?.template();
    if (!template) return;
    setBlocks(prev => [...prev, template]);
    setSelectedIdx(blocks.length);
    if (t === 'image') setPickFor(blocks.length);
  };

  const updateBlock = (idx: number, patch: Partial<NewsletterBlock['content']>) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: { ...(b.content || {}), ...patch } } : b));
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setSelectedIdx(v => (v === idx ? idx + dir : v));
  };

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const save = async (): Promise<string | null> => {
    if (isReadOnly) return id;
    setSaving(true);
    try {
      const scheduledFor = when ? Timestamp.fromDate(new Date(when)) : null;
      if (id) {
        await updateNewsletter(id, { title, subject, preheader, fromName, blocks, audience, scheduledFor });
      } else {
        const ref = await createNewsletter({ title, subject, preheader, fromName, blocks, status: 'draft', audience, scheduledFor });
        if (ref) setId(ref.id);
        setSavedAt(new Date());
        return ref?.id || null;
      }
      setSavedAt(new Date());
      return id;
    } finally {
      setSaving(false);
    }
  };

  const [sendBusy, setSendBusy] = useState<'idle' | 'test' | 'live'>('idle');
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sendInfo, setSendInfo] = useState<string | null>(null);

  // Calls the Cloud Function. `testEmail` routes through the test-send path;
  // omitting it sends to every active subscriber (gated by admin rules).
  const triggerSend = async (testEmail?: string) => {
    setSendErr(null); setSendInfo(null);
    if (!subject) { setSendErr('Le sujet est requis avant d’envoyer.'); return; }
    if (!blocks.length) { setSendErr('Ajoutez au moins un bloc avant d’envoyer.'); return; }
    setSendBusy(testEmail ? 'test' : 'live');
    try {
      const savedId = await save();
      if (!savedId) throw new Error('Impossible d’enregistrer le brouillon.');
      if (!app) throw new Error('Firebase n’est pas configuré.');
      const fns = getFunctions(app, 'us-central1');
      const call = httpsCallable(fns, 'sendNewsletter');
      const res: any = await call({ newsletterId: savedId, testEmail });
      const data = res.data || {};
      if (testEmail) {
        setSendInfo(`Test envoyé à ${testEmail}.`);
      } else {
        if (data.done === false) {
          // Grande liste : le premier passage a rendu la main, le calendrier
          // du site reprend la suite tout seul toutes les 5 minutes.
          setSendInfo(`Envoi en cours : ${data.delivered ?? 0} sur ${data.recipients ?? '?'} parties (${data.bounces ?? 0} échecs). La suite part toute seule, le statut passera à « envoyée » quand tout sera parti.`);
          setStatus('sending');
        } else {
          setSendInfo(`Envoyée à ${data.recipients ?? '?'} personne(s) (${data.delivered ?? '?'} livrées, ${data.bounces ?? 0} échecs).`);
          setStatus('sent');
        }
      }
    } catch (e: any) {
      setSendErr(e?.message || 'Envoi échoué.');
    } finally {
      setSendBusy('idle');
    }
  };

  const sendTest = async () => {
    const email = window.prompt('Adresse courriel pour le test :');
    if (!email) return;
    await triggerSend(email);
  };

  // Une audience « Des listes » sans liste cochée (ou « Des personnes » sans
  // personne) n'enverrait à personne : le geste est refusé avec un mot clair.
  const audienceVide = (audience.mode === 'tags' && !(audience.tags || []).length) || (audience.mode === 'emails' && !(audience.emails || []).length);
  const audienceLibelle = audience.mode === 'all' ? 'tout le monde' : audience.mode === 'tags' ? `${(audience.tags || []).length} liste${(audience.tags || []).length > 1 ? 's' : ''}` : `${(audience.emails || []).length} personne${(audience.emails || []).length > 1 ? 's' : ''}`;

  const sendLive = async () => {
    if (audienceVide) { setSendErr(audience.mode === 'tags' ? 'Cochez au moins une liste dans « À qui l’envoyer », ou choisissez « Tout le monde ».' : 'Choisissez au moins une personne, ou une autre audience.'); return; }
    const who = audience.mode === 'all' ? 'tous les abonnés actifs' : audience.mode === 'tags' ? `les listes ${(audience.tags || []).map(libelleTag).join(', ')}` : `${(audience.emails || []).length} personne(s) choisie(s)`;
    if (!confirm(`Envoyer cette infolettre maintenant à ${who} ? Cette action est irréversible.`)) return;
    await triggerSend();
  };

  // Programmer : le brouillon passe « scheduled »; la fonction planifiée
  // l'enverra à l'heure dite. Déprogrammer le ramène en brouillon.
  const schedule = async () => {
    setSendErr(null); setSendInfo(null);
    if (!when) { setSendErr('Choisissez une date et une heure d’envoi.'); return; }
    if (new Date(when).getTime() < Date.now() + 5 * 60e3) { setSendErr('La date d’envoi doit être dans au moins cinq minutes.'); return; }
    if (!subject || !blocks.length) { setSendErr('Le sujet et au moins un bloc sont requis.'); return; }
    if (audienceVide) { setSendErr('Cochez au moins une liste dans « À qui l’envoyer », ou choisissez « Tout le monde ».'); return; }
    const savedId = await save();
    if (!savedId) return;
    await updateNewsletter(savedId, { status: 'scheduled' });
    setStatus('scheduled');
    setSendInfo(`Programmée pour le ${new Date(when).toLocaleString('fr-CA', { dateStyle: 'full', timeStyle: 'short' })}.`);
  };
  const unschedule = async () => {
    if (!id) return;
    await updateNewsletter(id, { status: 'draft' });
    setStatus('draft');
    setSendInfo('Déprogrammée : elle redevient un brouillon.');
  };

  // Iris propose; le composeur applique. Krystine garde le dernier geste.
  const applyProposal = (p: Proposal) => {
    setTitle(p.title || title);
    setSubject(p.subject || subject);
    setPreheader(p.preheader || '');
    setBlocks(p.blocks || []);
    setAudience(p.audience || { mode: 'all' });
    if (p.scheduledFor) setWhen(toLocal(new Date(p.scheduledFor)));
    setSelectedIdx(null);
    setSide('preview');
  };

  const railWide = side === 'preview';

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#EEE7DB] dark:bg-[#151d19] text-[#293027] dark:text-white">
      <style>{`
        .nl-inline{outline:none;cursor:text;min-width:2ch;border-radius:6px;transition:box-shadow .15s}
        .nl-inline:hover{box-shadow:0 0 0 2px rgba(186,123,57,.35)}
        .nl-inline:focus{box-shadow:0 0 0 2px #BA7B39;background:rgba(186,123,57,.06)}
        .nl-inline:empty:before{content:attr(data-placeholder);opacity:.4;pointer-events:none}
      `}</style>

      {/* Barre du haut */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 bg-white/70 dark:bg-[#293027]/70 backdrop-blur-xl border-b border-[#293027]/10 dark:border-white/10 shrink-0">
        <GhostButton onClick={onBack}><i className="fa-solid fa-arrow-left" /> Retour</GhostButton>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
          status === 'sent'     ? 'bg-green-50 text-green-600' :
          status === 'sending'  ? 'bg-yellow-50 text-yellow-600' :
          status === 'scheduled'? 'bg-blue-50 text-blue-600' :
          status === 'failed'   ? 'bg-red-50 text-red-500' :
          'bg-[#BA7B39]/15 text-[#8B4A2F]'
        }`}>{status}</span>
        <span className="hidden md:inline text-xs text-[#293027]/50 dark:text-white/50 truncate max-w-[24ch]">{title || 'Nouvelle infolettre'}</span>
        <div className="ml-auto flex items-center gap-2 md:gap-3 flex-wrap">
          {savedAt && <span className="text-xs text-[#293027]/50 dark:text-white/50">Enregistré à {savedAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>}
          <GhostButton onClick={() => setSide(side === 'iris' ? 'reglages' : 'iris')} disabled={isReadOnly}>
            <i className="fa-solid fa-terminal" /> {side === 'iris' ? 'Fermer Iris' : 'Rédiger avec Iris'}
          </GhostButton>
          <GhostButton onClick={() => setSide(side === 'preview' ? 'reglages' : 'preview')}>
            <i className={`fa-solid ${side === 'preview' ? 'fa-sliders' : 'fa-eye'}`} /> {side === 'preview' ? 'Réglages' : 'Aperçu du courriel'}
          </GhostButton>
          <PrimaryButton onClick={save} disabled={saving || isReadOnly || !subject}>
            {saving ? 'Enregistrement…' : (id ? 'Enregistrer' : 'Créer le brouillon')}
          </PrimaryButton>
          {status === 'scheduled' ? (
            <GhostButton onClick={unschedule}><i className="fa-solid fa-calendar-xmark" /> Déprogrammer</GhostButton>
          ) : (
            <GhostButton onClick={schedule} disabled={isReadOnly || !subject || !blocks.length}><i className="fa-solid fa-calendar-check" /> Programmer</GhostButton>
          )}
          <GhostButton onClick={sendTest} disabled={sendBusy !== 'idle' || isReadOnly || !subject}>
            <i className="fa-solid fa-paper-plane" /> {sendBusy === 'test' ? 'Envoi…' : 'Envoyer un test'}
          </GhostButton>
          <button onClick={() => setSide('reglages')} className="hidden xl:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#8B4A2F] hover:underline" title="Changer l’audience">
            <i className="fa-solid fa-users" /> {audienceLibelle}
          </button>
          <button
            onClick={sendLive}
            disabled={sendBusy !== 'idle' || isReadOnly || !subject || !blocks.length || audienceVide}
            className="inline-flex items-center justify-center gap-2 bg-[#BA7B39] text-[#293027] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-md hover:bg-[#293027] hover:text-[#8B4A2F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-rocket" /> {sendBusy === 'live' ? 'Envoi…' : 'Envoyer maintenant'}
          </button>
        </div>
      </div>
      {(sendErr || sendInfo) && (
        <div className={`px-6 py-3 text-sm shrink-0 ${sendErr ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {sendErr || sendInfo}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* La page, pleine largeur : on écrit dedans directement */}
          <main className="flex-1 min-w-0 overflow-y-auto" onClick={() => setSelectedIdx(null)}>
            <div className="px-4 md:px-8 lg:px-10 py-6 md:py-8">
              <div className="w-full bg-white dark:bg-[#293027] rounded-[24px] shadow-[0_20px_60px_-30px_rgba(41,48,39,0.35)] border border-[#293027]/5 dark:border-white/5">
                {/* En-tête du courriel : sujet et pré-en-tête, modifiables au clic aussi */}
                <div className="px-6 md:px-[8%] pt-8 pb-5 border-b border-[#293027]/5 dark:border-white/5" onClick={e => e.stopPropagation()}>
                  <Label>Sujet du courriel *</Label>
                  <input
                    value={subject} onChange={e => setSubject(e.target.value)} disabled={isReadOnly}
                    placeholder="Cliquez ici pour écrire le sujet…"
                    className="w-full bg-transparent outline-none font-serif text-2xl md:text-3xl text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/30 dark:placeholder:text-white/30 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1"
                  />
                  <input
                    value={preheader} onChange={e => setPreheader(e.target.value)} disabled={isReadOnly}
                    placeholder="Pré-en-tête : quelques mots d’intrigue vus dans la boîte de réception…"
                    className="mt-2 w-full bg-transparent outline-none text-sm text-[#3A251E]/60 dark:text-white/60 placeholder:text-[#3A251E]/30 dark:placeholder:text-white/30 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1"
                  />
                </div>

                <div className="px-6 md:px-[8%] py-8 min-h-[50vh]">
                  {blocks.length === 0 && (
                    <div className="py-16 text-center text-[#293027]/40 dark:text-white/40">
                      <i className="fa-solid fa-envelope-open-text text-4xl mb-4 block" />
                      <p className="text-sm">Ajoutez un premier bloc ci-dessous, puis cliquez sur un texte pour l’écrire.</p>
                    </div>
                  )}
                  {blocks.map((block, idx) => (
                    <BlockFrame
                      key={idx}
                      block={block}
                      selected={selectedIdx === idx}
                      readOnly={isReadOnly}
                      first={idx === 0}
                      last={idx === blocks.length - 1}
                      onSelect={() => setSelectedIdx(idx)}
                      onPatch={patch => updateBlock(idx, patch)}
                      onMove={dir => moveBlock(idx, dir)}
                      onRemove={() => removeBlock(idx)}
                      onPickImage={() => setPickFor(idx)}
                    />
                  ))}

                  {!isReadOnly && (
                    <div className="mt-8 pt-6 border-t border-dashed border-[#293027]/15 dark:border-white/15" onClick={e => e.stopPropagation()}>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50 mb-3"><i className="fa-solid fa-plus mr-1" /> Ajouter un bloc</p>
                      <div className="flex flex-wrap gap-2">
                        {BLOCK_PALETTE.map(b => (
                          <button key={b.type} onClick={() => addBlock(b.type)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEE7DB] dark:bg-white/5 hover:bg-[#BA7B39]/15 border border-[#293027]/5 dark:border-white/5 hover:border-[#BA7B39] text-xs uppercase tracking-wider text-[#293027]/80 dark:text-white/80 transition-colors">
                            <i className={`fa-solid ${b.icon} text-[#8B4A2F]`} /> {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Rail de droite : réglages d'envoi, aperçu exact, ou Iris */}
          <aside className={`shrink-0 max-h-[45vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-[#293027]/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] overflow-y-auto ${railWide ? 'lg:w-[640px]' : 'lg:w-[380px]'}`}>
            {side === 'iris' ? (
              <div className="p-4">
                <AssistantPanel
                  draft={{ title, subject, preheader, blocks, audience, scheduledFor: when ? new Date(when).toISOString() : null }}
                  onProposal={applyProposal}
                  onClose={() => setSide('reglages')}
                />
              </div>
            ) : side === 'preview' ? (
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50 mb-3">Le courriel tel qu’il partira</p>
                <PreviewFrame blocks={blocks} subject={subject} preheader={preheader} height={Math.max(700, window.innerHeight - 160)} />
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="font-serif text-xl text-[#293027] dark:text-white">À qui l’envoyer</h3>
                  <p className="text-xs text-[#293027]/60 dark:text-white/60 mt-1">Tout le monde, ou seulement les listes que vous cochez.</p>
                </div>
                <AudiencePicker value={audience} onChange={setAudience} disabled={isReadOnly || status === 'scheduled'} />
                {audienceVide && <p className="text-xs text-[#8B4A2F] bg-[#BA7B39]/10 rounded-xl px-3 py-2"><i className="fa-solid fa-circle-info mr-1" /> Cochez au moins une liste pour pouvoir envoyer.</p>}
                <h3 className="pt-4 border-t border-[#293027]/10 dark:border-white/10 text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60">Envoi</h3>
                <div>
                  <Label>Titre interne (non envoyé)</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex. Infolettre d’octobre" disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Nom de l’expéditeur</Label>
                  <Input value={fromName} onChange={e => setFromName(e.target.value)} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Date et heure d’envoi (heure du Québec)</Label>
                  <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={isReadOnly || status === 'scheduled'} />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <MediathequePicker
        open={pickFor !== null}
        onClose={() => setPickFor(null)}
        onSelect={url => { if (pickFor !== null) updateBlock(pickFor, { url }); }}
      />
    </div>
  );
};

// ─── Un bloc sur la page : rendu éditable + petite barre d'outils ───────────
const selectClass = 'px-2 py-1 rounded-md bg-white dark:bg-[#293027] border border-[#293027]/10 dark:border-white/10 text-xs text-[#293027] dark:text-white outline-none';
const iconBtn = 'w-8 h-8 rounded-full bg-white dark:bg-[#293027] border border-[#293027]/10 dark:border-white/10 text-[#293027]/70 dark:text-white/70 hover:text-[#8B4A2F] hover:border-[#BA7B39] shadow-sm flex items-center justify-center transition-colors disabled:opacity-30';

const BlockFrame: React.FC<{
  block: NewsletterBlock;
  selected: boolean;
  readOnly: boolean;
  first: boolean;
  last: boolean;
  onSelect: () => void;
  onPatch: (patch: Record<string, any>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onPickImage: () => void;
}> = ({ block, selected, readOnly, first, last, onSelect, onPatch, onMove, onRemove, onPickImage }) => {
  const c = (block.content || {}) as any;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      onClick={e => { e.stopPropagation(); onSelect(); }}
      className={`group/bloc relative rounded-xl border-2 px-3 -mx-3 transition-colors ${selected ? 'border-[#BA7B39]/70' : 'border-transparent hover:border-[#BA7B39]/30'}`}
    >
      {readOnly ? <RenderBlockWeb block={block} /> : <RenderBlockWeb block={block} edit={{ set: onPatch, pickImage: onPickImage }} />}

      {!readOnly && (
        <div
          onClick={stop}
          className={`absolute -top-4 right-2 z-10 flex items-center gap-1.5 bg-[#EEE7DB] dark:bg-[#151d19] rounded-full px-2 py-1 shadow-md border border-[#293027]/10 dark:border-white/10 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover/bloc:opacity-100'}`}
        >
          {block.type === 'heading' && (
            <>
              <select value={c.level || 2} onChange={e => onPatch({ level: Number(e.target.value) })} className={selectClass} title="Niveau du titre">
                <option value={1}>Grand titre</option>
                <option value={2}>Titre</option>
                <option value={3}>Sous-titre</option>
              </select>
              <button className={iconBtn} title={c.align === 'center' ? 'Aligner à gauche' : 'Centrer'} onClick={() => onPatch({ align: c.align === 'center' ? 'left' : 'center' })}>
                <i className={`fa-solid ${c.align === 'center' ? 'fa-align-left' : 'fa-align-center'} text-xs`} />
              </button>
            </>
          )}
          {block.type === 'paragraph' && (
            <button className={iconBtn} title={c.align === 'center' ? 'Aligner à gauche' : 'Centrer'} onClick={() => onPatch({ align: c.align === 'center' ? 'left' : 'center' })}>
              <i className={`fa-solid ${c.align === 'center' ? 'fa-align-left' : 'fa-align-center'} text-xs`} />
            </button>
          )}
          {block.type === 'image' && (
            <>
              <button className={`${iconBtn} w-auto px-3 gap-2 text-[10px] uppercase tracking-widest font-bold`} onClick={onPickImage} title="Choisir dans la médiathèque ou téléverser">
                <i className="fa-solid fa-images text-xs" /> Image
              </button>
              <input value={c.alt || ''} onChange={e => onPatch({ alt: e.target.value })} placeholder="Description (accessibilité)" className={`${selectClass} w-44`} />
            </>
          )}
          {(block.type === 'button' || block.type === 'cta') && (
            <input value={c.href || ''} onChange={e => onPatch({ href: e.target.value })} placeholder="https://… (lien du bouton)" className={`${selectClass} w-56`} />
          )}
          {block.type === 'button' && (
            <select value={c.variant || 'primary'} onChange={e => onPatch({ variant: e.target.value })} className={selectClass} title="Style du bouton">
              <option value="primary">Plein</option>
              <option value="secondary">Contour</option>
            </select>
          )}
          {block.type === 'spacer' && (
            <select value={c.size || 'md'} onChange={e => onPatch({ size: e.target.value })} className={selectClass} title="Hauteur de l'espace">
              <option value="sm">Petit</option>
              <option value="md">Moyen</option>
              <option value="lg">Grand</option>
            </select>
          )}
          <span className="w-px h-5 bg-[#293027]/10 dark:bg-white/10 mx-0.5" />
          <button className={iconBtn} onClick={() => onMove(-1)} disabled={first} title="Monter"><i className="fa-solid fa-arrow-up text-xs" /></button>
          <button className={iconBtn} onClick={() => onMove(1)} disabled={last} title="Descendre"><i className="fa-solid fa-arrow-down text-xs" /></button>
          <button className={`${iconBtn} text-red-400 hover:text-red-600 hover:border-red-300`} onClick={onRemove} title="Supprimer ce bloc"><i className="fa-solid fa-trash text-xs" /></button>
        </div>
      )}
    </div>
  );
};

export default Composer;
