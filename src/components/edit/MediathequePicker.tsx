import React, { useEffect, useState } from 'react';
import { getMediaLibrary, type MediaItem } from '../../firebase/firestore';
import { uploadImage } from '../../firebase/storage';

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
      className="fixed inset-0 z-[300] bg-[#0B1A36]/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-[#0B1A36] w-full max-w-4xl max-h-[85vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#0B1A36]/10 dark:border-white/10 flex items-center justify-between bg-[#F5F5F0] dark:bg-[#050C1A]">
          <div>
            <h3 className="text-2xl font-serif text-[#0B1A36] dark:text-white">Médiathèque</h3>
            <p className="text-xs uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 mt-1">
              Choisissez une image ou téléversez-en une nouvelle
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[#D4AF37]/10 flex items-center justify-center">
            <i className="fa-solid fa-times text-lg" />
          </button>
        </div>

        <div className="p-6 border-b border-[#0B1A36]/10 dark:border-white/10 flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs cursor-pointer hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-md">
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
            className="ml-auto text-xs uppercase tracking-widest font-bold text-[#0B1A36]/60 dark:text-white/60 hover:text-[#D4AF37]"
          >
            <i className="fa-solid fa-rotate mr-1" /> Rafraîchir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-[#0B1A36]/50 dark:text-white/50 font-serif italic">
              La médiathèque est vide. Téléversez votre première image.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id || item.url} className="group relative">
                  <button
                    type="button"
                    onClick={() => { onSelect(item.url); onClose(); }}
                    className="block w-full aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-[#D4AF37] bg-[#F5F5F0] dark:bg-[#050C1A] transition-colors"
                    title={item.name}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.name}
                    className="absolute bottom-1 right-1 bg-white/90 dark:bg-[#0B1A36]/90 backdrop-blur rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[#0B1A36] dark:text-white hover:text-[#D4AF37]"
                    title="Télécharger"
                    onClick={e => e.stopPropagation()}
                  >
                    <i className="fa-solid fa-download text-xs" />
                  </a>
                  <p className="mt-1 text-[10px] text-[#0B1A36]/50 dark:text-white/50 truncate">{item.name}</p>
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
