import React, { useEffect, useRef, useState } from 'react';
import { getMediaLibrary, deleteMediaItem, type MediaItem } from '../../../firebase/firestore';
import { uploadImage, deleteStoredImage } from '../../../firebase/storage';
import { Card, DangerButton, EmptyState, GhostButton, PrimaryButton } from '../primitives';

const MediaSection: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => getMediaLibrary().then(setItems).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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

  const copy = (url: string) => { navigator.clipboard?.writeText(url); };

  const del = async (m: MediaItem) => {
    if (!m.id) return;
    if (!confirm(`Supprimer « ${m.name} » ?`)) return;
    try { await deleteStoredImage(m.path); } catch { /* ignore if already gone */ }
    await deleteMediaItem(m.id);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60">{items.length} fichier{items.length > 1 ? 's' : ''}</p>
        <PrimaryButton onClick={() => fileRef.current?.click()} disabled={busy}>
          <i className={`fa-solid ${busy ? 'fa-circle-notch fa-spin' : 'fa-upload'}`} /> Téléverser
        </PrimaryButton>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon="fa-photo-film">Aucune image dans la médiathèque.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(m => (
            <Card key={m.id} className="overflow-hidden">
              <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${m.url})` }} />
              <div className="p-3 space-y-2">
                <p className="text-xs text-[#0B1A36]/70 dark:text-white/70 truncate" title={m.name}>{m.name}</p>
                <div className="flex gap-2">
                  <GhostButton onClick={() => copy(m.url)} className="flex-1"><i className="fa-solid fa-copy" /> URL</GhostButton>
                  <DangerButton onClick={() => del(m)}><i className="fa-solid fa-trash" /></DangerButton>
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
