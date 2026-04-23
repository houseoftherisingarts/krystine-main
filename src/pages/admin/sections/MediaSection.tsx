import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getMediaLibrary, deleteMediaItem, seedLinkedMedia, type MediaItem,
} from '../../../firebase/firestore';
import { uploadImage, deleteStoredImage } from '../../../firebase/storage';
import { Card, DangerButton, EmptyState, GhostButton, PrimaryButton } from '../primitives';
import { SITE_MEDIA_SEED, MEDIA_CATEGORIES } from '../../../lib/mediaSeed';

// Download helper — tries fetch+blob first so the browser's download
// dialog appears with the desired filename. Cross-origin CDNs (Google
// Storage etc.) usually return CORS-friendly responses; when they don't,
// we fall back to opening the URL in a new tab so Krystine can still
// right-click → Save as.
async function downloadImage(url: string, name: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    // Preserve the original extension if present; otherwise default to
    // .png which is the most common on the site.
    const ext = url.match(/\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i)?.[1] || 'png';
    a.download = /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

const MediaSection: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => getMediaLibrary().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) await uploadImage(f, 'library');
      await refresh();
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const seed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const { added, skipped } = await seedLinkedMedia(SITE_MEDIA_SEED);
      setSeedMsg(`${added} ajouté${added === 1 ? '' : 's'}, ${skipped} déjà présent${skipped === 1 ? '' : 's'}.`);
      await refresh();
    } catch (e: any) {
      setSeedMsg(e?.message || 'Erreur lors du préréférencement.');
    } finally {
      setSeeding(false);
    }
  };

  const copy = (url: string) => { navigator.clipboard?.writeText(url); };

  const del = async (m: MediaItem) => {
    if (!m.id) return;
    const label = m.source === 'linked'
      ? `Retirer « ${m.name} » de la médiathèque ? (le fichier distant n'est pas supprimé)`
      : `Supprimer « ${m.name} » ?`;
    if (!confirm(label)) return;
    if (m.source !== 'linked') {
      try { await deleteStoredImage(m.path); } catch { /* ignore if already gone */ }
    }
    await deleteMediaItem(m.id);
    await refresh();
  };

  // Build the category counts for the filter pills. "upload" is a special
  // category — it shows only entries Krystine has uploaded herself.
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, upload: 0 };
    for (const m of items) {
      if (m.source === 'upload' || !m.source) c.upload++;
      const key = m.category || (m.source === 'upload' ? 'upload' : 'misc');
      c[key] = (c[key] || 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(m => {
      if (category === 'upload') {
        if (m.source && m.source !== 'upload') return false;
      } else if (category !== 'all') {
        if ((m.category || '') !== category) return false;
      }
      if (q && !`${m.name} ${m.url}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, category, search]);

  return (
    <div className="space-y-5">
      {/* Intro / actions */}
      <Card className="p-5">
        <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 leading-relaxed">
          Médiathèque centrale. Les images hardcodées du site (logos, portraits, couvertures, chakras)
          peuvent être préréférencées en un clic pour les parcourir et les télécharger d'ici. Les
          fichiers que vous téléversez ici vivent dans Firebase Storage.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PrimaryButton onClick={seed} disabled={seeding}>
            <i className={`fa-solid ${seeding ? 'fa-circle-notch fa-spin' : 'fa-download'}`} />
            Préréférencer les médias du site
          </PrimaryButton>
          <GhostButton onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className={`fa-solid ${busy ? 'fa-circle-notch fa-spin' : 'fa-upload'}`} /> Téléverser des fichiers
          </GhostButton>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
          {seedMsg && <span className="text-[11px] text-[#0B1A36]/60 dark:text-white/60 italic">· {seedMsg}</span>}
        </div>
      </Card>

      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2">
        {MEDIA_CATEGORIES.map(cat => {
          const active = category === cat.id;
          const n = counts[cat.id] || 0;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold border transition-colors ${
                active
                  ? 'bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] border-transparent'
                  : 'border-[#0B1A36]/10 dark:border-white/10 text-[#0B1A36]/70 dark:text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]'
              }`}
            >
              <i className={`fa-solid ${cat.icon} text-[10px] mr-1.5`} />
              {cat.label}
              <span className={`ml-2 text-[10px] ${active ? 'opacity-70' : 'opacity-60'}`}>{n}</span>
            </button>
          );
        })}

        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#0B1A36]/30 dark:text-white/30 text-[11px]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-[#0B1A36]/10 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50">
        {filtered.length} fichier{filtered.length === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="fa-photo-film">
          {items.length === 0
            ? 'Aucune image. Cliquez « Préréférencer » pour indexer les visuels du site.'
            : 'Rien ne correspond à ces filtres.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(m => (
            <Card key={m.id} className="overflow-hidden">
              <div className="relative">
                <div className="aspect-square bg-cover bg-center bg-[#F5F5F0] dark:bg-white/5" style={{ backgroundImage: `url(${m.url})` }} />
                {m.source === 'linked' && (
                  <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur">
                    <i className="fa-solid fa-link text-[8px] mr-1" /> Lié
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-[#0B1A36]/80 dark:text-white/80 truncate font-medium" title={m.name}>{m.name}</p>
                {m.category && (
                  <p className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">{m.category}</p>
                )}
                <div className="flex gap-1.5">
                  <GhostButton onClick={() => downloadImage(m.url, m.name)} className="flex-1" title="Télécharger">
                    <i className="fa-solid fa-download" />
                  </GhostButton>
                  <GhostButton onClick={() => copy(m.url)} className="flex-1" title="Copier l'URL">
                    <i className="fa-solid fa-copy" />
                  </GhostButton>
                  <GhostButton onClick={() => window.open(m.url, '_blank', 'noopener,noreferrer')} title="Ouvrir">
                    <i className="fa-solid fa-up-right-from-square" />
                  </GhostButton>
                  <DangerButton onClick={() => del(m)} title="Supprimer"><i className="fa-solid fa-trash" /></DangerButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaSection;
