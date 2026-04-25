import React, { useEffect, useState } from 'react';
import { getMediaLibrary, type MediaItem } from '../../firebase/firestore';
import { uploadImage } from '../../firebase/storage';

// Fetch the image as a blob so the browser's download dialog opens with
// the desired filename. Cross-origin CDNs (Google Storage etc.) usually
// allow CORS; when they don't we fall back to opening in a new tab.
async function downloadImage(url: string, name: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
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

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

// A picker that lists existing media from the Firestore "mediaLibrary"
// collection and lets the admin upload a new file. Uploads are stored in
// Firebase Storage and auto-registered in the library (see firebase/storage.ts).
const MediathequePicker: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    getMediaLibrary()
      .then(setItems)
      .catch(e => setError(e?.message || 'Load failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) refresh(); }, [open]);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadImage(file, 'site-edits');
      onSelect(url);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] bg-[#3A251E]/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-[#3A251E] w-full max-w-4xl max-h-[85vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#3A251E]/10 dark:border-white/10 flex items-center justify-between bg-[#F4E7DD] dark:bg-[#2E1A14]">
          <div>
            <h3 className="text-2xl font-serif text-[#3A251E] dark:text-white">Médiathèque</h3>
            <p className="text-xs uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 mt-1">
              Choisissez une image ou téléversez-en une nouvelle
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#B8532F]/10 flex items-center justify-center">
            <i className="fa-solid fa-times text-lg" />
          </button>
        </div>

        <div className="p-6 border-b border-[#3A251E]/10 dark:border-white/10 flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs cursor-pointer hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-md">
            <i className="fa-solid fa-upload text-[11px]" />
            {uploading ? 'Téléversement…' : 'Téléverser une image'}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              className="hidden"
            />
          </label>
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={refresh}
            className="ml-auto text-xs uppercase tracking-widest font-bold text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F]"
          >
            <i className="fa-solid fa-rotate mr-1" /> Rafraîchir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-2 border-t-transparent border-[#B8532F] rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-[#3A251E]/50 dark:text-white/50 font-serif italic">
              La médiathèque est vide. Téléversez votre première image.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id || item.url} className="relative">
                  <button
                    type="button"
                    onClick={() => { onSelect(item.url); onClose(); }}
                    className="block w-full aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[#B8532F] bg-[#F4E7DD] dark:bg-[#2E1A14] transition-colors"
                    title={item.name}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); downloadImage(item.url, item.name); }}
                    className="absolute bottom-1.5 right-1.5 bg-white/95 dark:bg-[#3A251E]/95 backdrop-blur rounded-full w-8 h-8 flex items-center justify-center text-[#3A251E] dark:text-white hover:bg-[#B8532F] hover:text-[#3A251E] shadow-md transition-colors"
                    title="Télécharger"
                    aria-label="Télécharger l'image"
                  >
                    <i className="fa-solid fa-download text-xs" />
                  </button>
                  <p className="mt-1 text-[10px] text-[#3A251E]/50 dark:text-white/50 truncate">{item.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediathequePicker;
