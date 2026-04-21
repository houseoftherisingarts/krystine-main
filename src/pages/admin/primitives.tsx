import React, { useRef, useState } from 'react';
import { uploadImage } from '../../firebase/storage';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#0B1A36]/60 rounded-[20px] shadow-sm border border-[#0B1A36]/5 dark:border-white/5 ${className}`}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 focus:border-[#D4AF37] outline-none bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white transition-colors ${props.className || ''}`}
  />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 focus:border-[#D4AF37] outline-none bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white transition-colors resize-y ${props.className || ''}`}
  />
);

export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <label className={`block text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2 ${className}`}>{children}</label>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-md hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
  />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] border border-[#0B1A36]/10 dark:border-white/10 text-[#0B1A36]/70 dark:text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors disabled:opacity-50 ${props.className || ''}`}
  />
);

export const DangerButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ${props.className || ''}`}
  />
);

export const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
    <span
      onClick={() => onChange(!checked)}
      className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-[#D4AF37]' : 'bg-[#0B1A36]/20 dark:bg-white/20'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
    {label && <span className="text-sm text-[#0B1A36] dark:text-white">{label}</span>}
  </label>
);

export const EmptyState: React.FC<{ icon?: string; children: React.ReactNode }> = ({ icon = 'fa-inbox', children }) => (
  <div className="text-center py-16 text-[#0B1A36]/40 dark:text-white/40">
    <i className={`fa-solid ${icon} text-4xl mb-4 block`} />
    <p className="text-sm">{children}</p>
  </div>
);

export const ImageUpload: React.FC<{ value?: string; onChange: (url: string) => void; folder?: string }> = ({ value, onChange, folder }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setBusy(true);
    try {
      const { url } = await uploadImage(file, folder);
      onChange(url);
    } catch (e: any) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div
        onClick={pick}
        className="relative w-full aspect-[16/10] rounded-xl border-2 border-dashed border-[#0B1A36]/20 dark:border-white/20 bg-[#F5F5F0] dark:bg-white/5 cursor-pointer flex items-center justify-center overflow-hidden hover:border-[#D4AF37] transition-colors"
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="text-center text-[#0B1A36]/40 dark:text-white/40">
            <i className="fa-solid fa-image text-3xl mb-2 block" />
            <p className="text-[11px] uppercase tracking-widest">Cliquer pour téléverser</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <i className="fa-solid fa-circle-notch fa-spin text-white text-2xl" />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex items-center justify-between mt-2 text-[11px] text-[#0B1A36]/50 dark:text-white/50">
        {value && <button type="button" onClick={() => onChange('')} className="hover:text-red-500">Retirer</button>}
        {err && <span className="text-red-500">{err}</span>}
      </div>
    </div>
  );
};

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
