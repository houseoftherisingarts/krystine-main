import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import {
  createNewsletter, updateNewsletter, getNewsletter,
  type NewsletterBlock, type BlockType, type NewsletterStatus,
} from '../../../../firebase/firestore';
import { uploadImage } from '../../../../firebase/storage';
import { RenderBlocksWeb } from '../../../../lib/newsletterRenderer';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton } from '../../primitives';

interface Props {
  newsletterId: string | null;  // null → fresh draft
  onBack: () => void;
}

const BLOCK_PALETTE: Array<{ type: BlockType; icon: string; label: string; template: () => NewsletterBlock }> = [
  { type: 'heading',  icon: 'fa-heading',     label: 'Titre',      template: () => ({ type: 'heading',   content: { level: 2, text: 'Votre titre ici', align: 'center' } }) },
  { type: 'paragraph',icon: 'fa-paragraph',   label: 'Paragraphe', template: () => ({ type: 'paragraph', content: { text: 'Écrivez votre texte ici.' } }) },
  { type: 'image',    icon: 'fa-image',       label: 'Image',      template: () => ({ type: 'image',     content: { url: '', caption: '' } }) },
  { type: 'button',   icon: 'fa-hand-pointer',label: 'Bouton',     template: () => ({ type: 'button',    content: { label: 'Découvrir', href: 'https://www.krystinestlaurent.ca', variant: 'primary' } }) },
  { type: 'quote',    icon: 'fa-quote-left',  label: 'Citation',   template: () => ({ type: 'quote',     content: { text: '', attribution: '' } }) },
  { type: 'cta',      icon: 'fa-star',        label: 'Appel fort', template: () => ({ type: 'cta',       content: { eyebrow: 'Nouveauté', title: 'Titre fort', body: 'Un court paragraphe.', href: 'https://www.krystinestlaurent.ca', buttonLabel: 'En savoir plus' } }) },
  { type: 'divider',  icon: 'fa-minus',       label: 'Séparateur', template: () => ({ type: 'divider' }) },
  { type: 'spacer',   icon: 'fa-arrows-up-down', label: 'Espace', template: () => ({ type: 'spacer',    content: { size: 'md' } }) },
];

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
      if (id) {
        await updateNewsletter(id, { title, subject, preheader, fromName, blocks });
      } else {
        const ref = await createNewsletter({ title, subject, preheader, fromName, blocks, status: 'draft' });
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
    if (!subject) { setSendErr('Le sujet est requis avant d\u2019envoyer.'); return; }
    if (!blocks.length) { setSendErr('Ajoutez au moins un bloc avant d\u2019envoyer.'); return; }
    setSendBusy(testEmail ? 'test' : 'live');
    try {
      const savedId = await save();
      if (!savedId) throw new Error('Impossible d\u2019enregistrer le brouillon.');
      if (!app) throw new Error('Firebase n\u2019est pas configuré.');
      const fns = getFunctions(app, 'us-central1');
      const call = httpsCallable(fns, 'sendNewsletter');
      const res: any = await call({ newsletterId: savedId, testEmail });
      const data = res.data || {};
      if (testEmail) {
        setSendInfo(`Test envoyé à ${testEmail}.`);
      } else {
        setSendInfo(`Envoyée à ${data.recipients ?? '?'} personne(s) (${data.delivered ?? '?'} livrées, ${data.bounces ?? 0} échecs).`);
        setStatus('sent');
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

  const sendLive = async () => {
    if (!confirm('Envoyer cette infolettre à tous les abonnés actifs ? Cette action est irréversible.')) return;
    await triggerSend();
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <GhostButton onClick={onBack}><i className="fa-solid fa-arrow-left" /> Retour</GhostButton>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
          status === 'sent'     ? 'bg-green-50 text-green-600' :
          status === 'sending'  ? 'bg-yellow-50 text-yellow-600' :
          status === 'scheduled'? 'bg-blue-50 text-blue-600' :
          status === 'failed'   ? 'bg-red-50 text-red-500' :
          'bg-[#D4AF37]/15 text-[#D4AF37]'
        }`}>{status}</span>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {savedAt && <span className="text-xs text-[#0B1A36]/50 dark:text-white/50">Enregistré à {savedAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>}
          <PrimaryButton onClick={save} disabled={saving || isReadOnly || !subject}>
            {saving ? 'Enregistrement…' : (id ? 'Enregistrer' : 'Créer le brouillon')}
          </PrimaryButton>
          <GhostButton onClick={sendTest} disabled={sendBusy !== 'idle' || isReadOnly || !subject}>
            <i className="fa-solid fa-paper-plane" /> {sendBusy === 'test' ? 'Envoi…' : 'Envoyer un test'}
          </GhostButton>
          <button
            onClick={sendLive}
            disabled={sendBusy !== 'idle' || isReadOnly || !subject || !blocks.length}
            className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] text-[#0B1A36] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-md hover:bg-[#0B1A36] hover:text-[#D4AF37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-rocket" /> {sendBusy === 'live' ? 'Envoi…' : 'Envoyer maintenant'}
          </button>
        </div>
      </div>
      {(sendErr || sendInfo) && (
        <div className={`px-4 py-3 rounded-xl text-sm ${sendErr ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {sendErr || sendInfo}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4">
        {/* Block palette */}
        <Card className="p-4 h-fit">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60 mb-3">Blocs</h3>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_PALETTE.map(b => (
              <button
                key={b.type}
                disabled={isReadOnly}
                onClick={() => addBlock(b.type)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#F5F5F0] dark:bg-white/5 hover:bg-[#D4AF37]/10 border border-[#0B1A36]/5 dark:border-white/5 hover:border-[#D4AF37] transition-colors disabled:opacity-50"
              >
                <i className={`fa-solid ${b.icon} text-[#D4AF37]`} />
                <span className="text-[10px] uppercase tracking-wider text-[#0B1A36]/70 dark:text-white/70">{b.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Canvas */}
        <Card className="p-0 overflow-hidden">
          {/* Headers */}
          <div className="p-6 bg-[#F5F5F0] dark:bg-[#050C1A] border-b border-[#0B1A36]/5 dark:border-white/5 space-y-4">
            <div>
              <Label>Titre interne (non envoyé)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex. Infolettre d’octobre" disabled={isReadOnly} />
            </div>
            <div>
              <Label>Sujet du courriel *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex. Nouveau podcast : le rituel d’automne" disabled={isReadOnly} />
            </div>
            <div>
              <Label>Pré-en-tête (aperçu dans la boîte de réception)</Label>
              <Input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="Quelques mots d’intrigue…" disabled={isReadOnly} />
            </div>
            <div>
              <Label>Nom de l’expéditeur</Label>
              <Input value={fromName} onChange={e => setFromName(e.target.value)} disabled={isReadOnly} />
            </div>
          </div>

          {/* Preview / block list */}
          <div className="p-6 bg-white dark:bg-[#0B1A36] min-h-[400px]">
            {blocks.length === 0 ? (
              <div className="py-20 text-center text-[#0B1A36]/40 dark:text-white/40">
                <i className="fa-solid fa-envelope-open-text text-4xl mb-4 block" />
                <p className="text-sm">Ajoutez des blocs à gauche pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((block, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`relative rounded-xl border-2 p-2 cursor-pointer transition-colors ${
                      selectedIdx === idx
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                        : 'border-transparent hover:border-[#D4AF37]/30'
                    }`}
                  >
                    <RenderBlockWebPreview block={block} />
                    {!isReadOnly && (
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); moveBlock(idx, -1); }} className="w-7 h-7 bg-white shadow rounded-full text-[#0B1A36]/70 hover:text-[#D4AF37]" title="Monter"><i className="fa-solid fa-arrow-up text-xs" /></button>
                        <button onClick={e => { e.stopPropagation(); moveBlock(idx, +1); }} className="w-7 h-7 bg-white shadow rounded-full text-[#0B1A36]/70 hover:text-[#D4AF37]" title="Descendre"><i className="fa-solid fa-arrow-down text-xs" /></button>
                        <button onClick={e => { e.stopPropagation(); removeBlock(idx); }} className="w-7 h-7 bg-white shadow rounded-full text-red-400 hover:text-red-600" title="Supprimer"><i className="fa-solid fa-trash text-xs" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Inspector */}
        <Card className="p-4 h-fit">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60 mb-3">Propriétés</h3>
          {selectedIdx === null || !blocks[selectedIdx] ? (
            <p className="text-xs text-[#0B1A36]/40 dark:text-white/40">Sélectionnez un bloc pour modifier son contenu.</p>
          ) : (
            <BlockInspector block={blocks[selectedIdx]} onChange={patch => updateBlock(selectedIdx, patch)} disabled={isReadOnly} />
          )}
        </Card>
      </div>
    </div>
  );
};

// Preview wrapper — renders the block using site-like styles so the composer
// reflects what the user will see in the archive (email may differ slightly
// due to table-based inline styling).
const RenderBlockWebPreview: React.FC<{ block: NewsletterBlock }> = ({ block }) => (
  <div className="prose-preview"><RenderBlocksWeb blocks={[block]} /></div>
);

// ─── Inspector: per-block-type form ──────────────────────────────────────────
const BlockInspector: React.FC<{ block: NewsletterBlock; onChange: (patch: any) => void; disabled?: boolean }> = ({ block, onChange, disabled }) => {
  const c = (block.content || {}) as any;
  const [uploading, setUploading] = useState(false);
  const field = (k: string, v: any) => ({ [k]: v });

  const onImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'newsletters');
      onChange({ url });
    } finally { setUploading(false); e.target.value = ''; }
  };

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <Label>Niveau</Label>
          <select disabled={disabled} value={c.level || 2} onChange={e => onChange(field('level', Number(e.target.value)))} className="w-full px-3 py-2 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-sm">
            <option value={1}>H1 — Principal</option>
            <option value={2}>H2 — Section</option>
            <option value={3}>H3 — Sous-section</option>
          </select>
          <Label>Texte</Label>
          <Input disabled={disabled} value={c.text || ''} onChange={e => onChange(field('text', e.target.value))} />
          <Label>Alignement</Label>
          <select disabled={disabled} value={c.align || 'center'} onChange={e => onChange(field('align', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-sm">
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
          </select>
        </div>
      );
    case 'paragraph':
      return (
        <div className="space-y-3">
          <Label>Texte</Label>
          <Textarea disabled={disabled} rows={5} value={c.text || ''} onChange={e => onChange(field('text', e.target.value))} />
          <p className="text-[10px] text-[#0B1A36]/50 dark:text-white/50">Utilisez <code className="bg-[#D4AF37]/10 px-1 rounded">&#123;&#123;firstName&#125;&#125;</code> pour personnaliser.</p>
        </div>
      );
    case 'image':
      return (
        <div className="space-y-3">
          {c.url && <img src={c.url} alt="" className="w-full rounded-lg" />}
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs uppercase tracking-widest text-[#D4AF37] hover:underline">
            <i className="fa-solid fa-upload" /> {uploading ? 'Téléversement…' : (c.url ? 'Remplacer' : 'Téléverser')}
            <input type="file" accept="image/*" className="hidden" onChange={onImageFile} disabled={disabled || uploading} />
          </label>
          <Label>URL (alternative)</Label>
          <Input disabled={disabled} value={c.url || ''} onChange={e => onChange(field('url', e.target.value))} placeholder="https://…" />
          <Label>Légende</Label>
          <Input disabled={disabled} value={c.caption || ''} onChange={e => onChange(field('caption', e.target.value))} />
          <Label>Texte alternatif (a11y)</Label>
          <Input disabled={disabled} value={c.alt || ''} onChange={e => onChange(field('alt', e.target.value))} />
        </div>
      );
    case 'button':
      return (
        <div className="space-y-3">
          <Label>Texte du bouton</Label>
          <Input disabled={disabled} value={c.label || ''} onChange={e => onChange(field('label', e.target.value))} />
          <Label>Lien</Label>
          <Input disabled={disabled} value={c.href || ''} onChange={e => onChange(field('href', e.target.value))} placeholder="https://…" />
          <Label>Style</Label>
          <select disabled={disabled} value={c.variant || 'primary'} onChange={e => onChange(field('variant', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-sm">
            <option value="primary">Primaire (plein)</option>
            <option value="secondary">Secondaire (contour)</option>
          </select>
        </div>
      );
    case 'quote':
      return (
        <div className="space-y-3">
          <Label>Citation</Label>
          <Textarea disabled={disabled} rows={3} value={c.text || ''} onChange={e => onChange(field('text', e.target.value))} />
          <Label>Attribution</Label>
          <Input disabled={disabled} value={c.attribution || ''} onChange={e => onChange(field('attribution', e.target.value))} />
        </div>
      );
    case 'cta':
      return (
        <div className="space-y-3">
          <Label>Eyebrow (petit texte au-dessus)</Label>
          <Input disabled={disabled} value={c.eyebrow || ''} onChange={e => onChange(field('eyebrow', e.target.value))} />
          <Label>Titre</Label>
          <Input disabled={disabled} value={c.title || ''} onChange={e => onChange(field('title', e.target.value))} />
          <Label>Corps</Label>
          <Textarea disabled={disabled} rows={3} value={c.body || ''} onChange={e => onChange(field('body', e.target.value))} />
          <Label>Texte du bouton</Label>
          <Input disabled={disabled} value={c.buttonLabel || ''} onChange={e => onChange(field('buttonLabel', e.target.value))} />
          <Label>Lien</Label>
          <Input disabled={disabled} value={c.href || ''} onChange={e => onChange(field('href', e.target.value))} placeholder="https://…" />
        </div>
      );
    case 'spacer':
      return (
        <div>
          <Label>Taille</Label>
          <select disabled={disabled} value={c.size || 'md'} onChange={e => onChange(field('size', e.target.value))} className="w-full px-3 py-2 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-sm">
            <option value="sm">Petit</option>
            <option value="md">Moyen</option>
            <option value="lg">Grand</option>
          </select>
        </div>
      );
    case 'divider':
      return <p className="text-xs text-[#0B1A36]/50 dark:text-white/50">Aucune option — séparateur simple.</p>;
    default:
      return null;
  }
};

export default Composer;
