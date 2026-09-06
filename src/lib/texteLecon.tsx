import React from 'react';

// Le texte d'accompagnement d'une leçon, écrit par Krystine dans l'admin
// avec une mise en forme légère, comme l'éditeur de Kajabi mais sans
// barre d'outils : « ## Titre », « ### Petit titre », « **gras** »,
// « - liste », « 1. liste numérotée », « > citation », liens [mot](url) ou
// URL nue, et une ligne vide entre les paragraphes.

const inline = (s: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
  let last = 0, k = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++} className="font-semibold text-[#293027] dark:text-white">{m[1]}</strong>);
    else {
      const href = m[3] || m[4];
      out.push(<a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-[#BA7B39] underline-offset-4 hover:text-[#8B4A2F]">{m[2] || href}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
};

const lignesVersNoeud = (lignes: string[], key: number): React.ReactNode => {
  if (lignes.every(l => /^\s*[-*•]\s/.test(l)))
    return <ul key={key} className="list-disc space-y-1 pl-5">{lignes.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s/, ''))}</li>)}</ul>;
  if (lignes.every(l => /^\s*\d+[.)]\s/.test(l)))
    return <ol key={key} className="list-decimal space-y-1 pl-5">{lignes.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s/, ''))}</li>)}</ol>;
  if (lignes.every(l => /^>\s?/.test(l)))
    return <blockquote key={key} className="border-l-2 border-[#BA7B39] pl-4 font-serif text-lg text-[#293027]/85 dark:text-white/85">{lignes.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l.replace(/^>\s?/, ''))}</React.Fragment>)}</blockquote>;
  return <p key={key}>{lignes.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l)}</React.Fragment>)}</p>;
};

export const TexteLecon: React.FC<{ texte: string; className?: string }> = ({ texte, className = '' }) => {
  const blocs = texte.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  const noeuds: React.ReactNode[] = [];
  blocs.forEach((b, i) => {
    const lignes = b.split('\n');
    const m = /^(#{1,3})\s+(.*)$/.exec(lignes[0]);
    if (m) {
      const petit = m[1].length >= 3;
      noeuds.push(petit
        ? <h4 key={`h${i}`} className="pt-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{inline(m[2])}</h4>
        : <h3 key={`h${i}`} className="pt-3 font-serif text-xl text-[#293027] dark:text-white">{inline(m[2])}</h3>);
      if (lignes.length > 1) noeuds.push(lignesVersNoeud(lignes.slice(1), i));
    } else {
      noeuds.push(lignesVersNoeud(lignes, i));
    }
  });
  return <div className={`space-y-4 text-[0.95rem] leading-relaxed ${className}`}>{noeuds}</div>;
};

export default TexteLecon;
