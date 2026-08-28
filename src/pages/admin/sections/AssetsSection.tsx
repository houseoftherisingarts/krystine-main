import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getMediaLibrary, type MediaItem } from '../../../firebase/firestore';
import { uploadImage } from '../../../firebase/storage';
import { downloadFile } from '../../../lib/download';
import { Card } from '../primitives';

// Assets et téléchargements : le visuel du Foyer prêt à publier, les images
// de la médiathèque et tous les fichiers du site, en pleine qualité.
// La liste des fichiers du site vient de public/assets-manifest.json, écrit
// par scripts/build-assets-manifest.mjs avant chaque build.

interface ManifestFile {
  path: string;
  name: string;
  folder: string;
  kind: 'image' | 'video' | 'audio' | 'modele' | 'document';
  size: number;
}

const KIND_LABEL: Record<ManifestFile['kind'], string> = {
  image: 'Images',
  video: 'Vidéos',
  audio: 'Sons',
  modele: 'Modèles 3D',
  document: 'Documents',
};

const poids = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);

const DownloadButton: React.FC<{ url: string; name: string; label?: string }> = ({ url, name, label }) => (
  <button
    type="button"
    onClick={() => downloadFile(url, name)}
    className="inline-flex items-center gap-2 rounded-full bg-[#2a2015] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#bb9a5e] hover:text-[#2a2015]"
  >
    <i className="fa-solid fa-download text-[10px]" /> {label || 'Télécharger'}
  </button>
);

const AssetsSection: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [files, setFiles] = useState<ManifestFile[]>([]);
  const [kind, setKind] = useState<'tous' | ManifestFile['kind']>('tous');
  const [terme, setTerme] = useState('');

  useEffect(() => {
    getMediaLibrary().then(setMedia).catch(() => {});
    fetch('/assets-manifest.json')
      .then(r => (r.ok ? r.json() : { files: [] }))
      .then(d => setFiles(d.files || []))
      .catch(() => {});
  }, []);

  const visibles = useMemo(() => {
    const q = terme.trim().toLowerCase();
    return files.filter(f => (kind === 'tous' || f.kind === kind) && (!q || f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q)));
  }, [files, kind, terme]);

  const parDossier = useMemo(() => {
    const groupes = new Map<string, ManifestFile[]>();
    visibles.forEach(f => {
      const liste = groupes.get(f.folder) || [];
      liste.push(f);
      groupes.set(f.folder, liste);
    });
    return [...groupes.entries()];
  }, [visibles]);

  return (
    <div className="space-y-8">
      {/* Le visuel du Foyer, prêt à publier */}
      <Card className="overflow-hidden border-[#bb9a5e]/20 bg-gradient-to-br from-[#2a2015] to-[#4A3228] text-white">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <video
            src="/assets/foyer-visuel-16x9.mp4"
            poster="/assets/foyer-visuel-16x9.jpg"
            autoPlay
            muted
            loop
            playsInline
            className="w-72 shrink-0 rounded-[15px] border border-[#bb9a5e]/30 shadow-lg"
          />
          <div className="min-w-0">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.3em] text-[#7d6330]">
              Le visuel du Foyer
            </span>
            <h2 className="mb-1 font-serif text-2xl">Le feu qui brûle, grand format</h2>
            <p className="max-w-xl text-sm text-white/70">
              La niche du Foyer et sa flamme, sur le mur de parchemin, avec votre signature.
              Le fichier fait 1920 × 1080 et tourne en boucle sans coupure, prêt pour un
              écran, une présentation ou une vidéo.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <DownloadButton url="/assets/foyer-visuel-16x9.mp4" name="foyer-visuel-16x9.mp4" label="Télécharger la vidéo" />
              <DownloadButton url="/assets/foyer-visuel-16x9.jpg" name="foyer-visuel-16x9.jpg" label="Télécharger l’image fixe" />
            </div>
          </div>
        </div>
      </Card>

      {/* La médiathèque */}
      <Card className="p-6">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60">
            Vos images téléversées
          </h3>
          <span className="text-xs text-[#2a2015]/40 dark:text-white/40">{media.length} fichiers</span>
        </div>
        {media.length === 0 ? (
          <p className="font-serif italic text-sm text-[#2a2015]/50 dark:text-white/50">
            La médiathèque est vide pour l’instant.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {media.map(item => (
              <div key={item.id || item.url} className="group relative">
                <img src={item.url} alt={item.name} className="aspect-square w-full rounded-xl object-cover" />
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#2a2015]/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <DownloadButton url={item.url} name={item.name} />
                </div>
                <p className="mt-2 truncate text-[11px] text-[#2a2015]/60 dark:text-white/50">{item.name}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tous les fichiers du site */}
      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h3 className="mr-auto text-sm font-bold uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60">
            Les fichiers du site
          </h3>
          <input
            value={terme}
            onChange={e => setTerme(e.target.value)}
            placeholder="Chercher un fichier"
            className="rounded-full border border-[#2a2015]/15 bg-transparent px-4 py-2 text-sm text-[#2a2015] outline-none focus:border-[#bb9a5e] dark:border-white/15 dark:text-white"
          />
          <div className="flex flex-wrap gap-2">
            {(['tous', 'image', 'video', 'audio', 'modele', 'document'] as const).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  kind === k
                    ? 'bg-[#bb9a5e] text-[#2a2015]'
                    : 'bg-[#2a2015]/5 text-[#2a2015]/60 hover:bg-[#2a2015]/10 dark:bg-white/5 dark:text-white/60'
                }`}
              >
                {k === 'tous' ? 'Tout' : KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        {parDossier.length === 0 ? (
          <p className="font-serif italic text-sm text-[#2a2015]/50 dark:text-white/50">Aucun fichier ne correspond.</p>
        ) : (
          <div className="space-y-7">
            {parDossier.map(([dossier, liste]) => (
              <div key={dossier}>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7d6330]">
                  {dossier} · {liste.length}
                </p>
                <ul className="divide-y divide-[#2a2015]/5 dark:divide-white/5">
                  {liste.map(f => (
                    <li key={f.path} className="flex items-center gap-4 py-2.5">
                      {f.kind === 'image' ? (
                        <img src={f.path} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#2a2015]/5 text-[#7d6330] dark:bg-white/5">
                          <i className={`fa-solid ${f.kind === 'video' ? 'fa-film' : f.kind === 'audio' ? 'fa-music' : f.kind === 'modele' ? 'fa-cube' : 'fa-file-lines'}`} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#2a2015] dark:text-white">{f.name}</p>
                        <p className="text-[11px] text-[#2a2015]/40 dark:text-white/40">{poids(f.size)}</p>
                      </div>
                      <DownloadButton url={f.path} name={f.name} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AssetsSection;
