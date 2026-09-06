import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import type { NewsletterBlock } from '../../../../firebase/firestore';

// L'aperçu exact du courriel : le serveur rend le même HTML que celui qui
// part (previewNewsletter), l'admin l'affiche dans une iframe. Un seul moteur.

export interface EnTete { couverture?: 'podcast' | 'image' | 'aucune'; couvertureUrl?: string | null; signature?: boolean }

export async function fetchPreview(input: EnTete & { blocks?: NewsletterBlock[]; subject?: string; preheader?: string; kind?: string }): Promise<{ html: string; subject: string }> {
  if (!app) throw new Error('Firebase non configuré');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'previewNewsletter');
  const res: any = await call(input);
  return res.data;
}

const PreviewFrame: React.FC<EnTete & { blocks?: NewsletterBlock[]; subject?: string; preheader?: string; kind?: string; height?: number }> = ({ blocks, subject, preheader, kind, couverture, couvertureUrl, signature, height = 900 }) => {
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const key = JSON.stringify({ blocks, subject, preheader, kind, couverture, couvertureUrl, signature });

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setBusy(true); setErr(null);
      fetchPreview({ blocks, subject, preheader, kind, couverture, couvertureUrl, signature })
        .then(r => setHtml(r.html))
        .catch(e => setErr(e?.message || 'Aperçu indisponible'))
        .finally(() => setBusy(false));
    }, 600);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="relative rounded-[15px] overflow-hidden border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB]">
      {busy && <div className="absolute top-3 right-3 z-10 text-[10px] uppercase tracking-widest text-[#8B4A2F] bg-white/80 px-2 py-1 rounded-full"><i className="fa-solid fa-circle-notch fa-spin mr-1" />Rendu</div>}
      {err && <div className="p-4 text-sm text-red-600">{err}</div>}
      <iframe title="Aperçu du courriel" srcDoc={html} sandbox="" style={{ width: '100%', height, border: 0, display: 'block' }} />
    </div>
  );
};

export default PreviewFrame;
