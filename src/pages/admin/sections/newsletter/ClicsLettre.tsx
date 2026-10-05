import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import type { NewsletterDoc } from '../../../../firebase/firestore';

// ─── Les clics d'une lettre : vraies lectrices contre robots (4 oct. 2026) ───
// Les filtres de sécurité des messageries (Outlook, antivirus d'entreprise)
// ouvrent tous les liens d'une lettre en une seconde pour les vérifier. On les
// reconnaît à la rafale (trois liens ou plus en moins de dix secondes) ou au
// lien de la politique de confidentialité, que personne ne clique pour lire.
// Chaque lien de la lettre affiche ses vraies personnes et ses robots.

const sansSuivi = (u: string) => u.replace(/([?&])utm_[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
const cle = (u: string) => sansSuivi(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const nu = (t: string) => String(t || '').replace(/<[^>]+>/g, '').trim();

type Ligne = { cle: string; libelle: string; vraies: number; robots: number };

function libellesDeLaLettre(n: NewsletterDoc): Map<string, string> {
  const m = new Map<string, string>();
  (n.blocks || []).forEach((b: any) => {
    const c = b?.content || {};
    if (b.type === 'button' && c.href) m.set(cle(c.href), `Bouton « ${c.label || ''} »`);
    if (b.type === 'image' && c.href && !m.has(cle(c.href))) m.set(cle(c.href), `Image${c.caption ? ` « ${c.caption} »` : c.alt ? ` (${String(c.alt).slice(0, 50)})` : ''}`);
    if (b.type === 'cta' && c.href) m.set(cle(c.href), `Appel « ${c.buttonLabel || c.title || ''} »`);
    for (const a of String(c.text || '').matchAll(/<a href="([^"]+)">(.*?)<\/a>/g)) if (!m.has(cle(a[1]))) m.set(cle(a[1]), `Lien « ${nu(a[2]).slice(0, 60)} »`);
  });
  return m;
}

const ClicsLettre: React.FC<{ n: NewsletterDoc; recus: number }> = ({ n, recus }) => {
  const [docs, setDocs] = useState<any[] | null>(null);
  useEffect(() => {
    if (!db || !n.id) return;
    getDocs(collection(db, 'newsletters', n.id, 'clics')).then(s => setDocs(s.docs.map(d => d.data()))).catch(() => setDocs([]));
  }, [n.id]);

  const vue = useMemo(() => {
    if (!docs) return null;
    const libelles = libellesDeLaLettre(n);
    const lignes = new Map<string, Ligne>();
    let vraies = 0, robots = 0;
    for (const d of docs) {
      const liens: string[] = Array.isArray(d.liens) ? d.liens : d.url ? [d.url] : [];
      const heures: number[] = (Array.isArray(d.heures) ? d.heures : []).map(Number).sort((a, b) => a - b);
      const robot = (new Set(liens.map(cle)).size >= 3 && heures.length >= 2 && heures[heures.length - 1] - heures[0] < 10000)
        || liens.some(u => /politique-de-confidentialite|desinscription|unsubscribe/.test(u));
      if (robot) robots++; else vraies++;
      for (const u of new Set(liens.map(cle))) {
        if (/politique-de-confidentialite|desinscription|unsubscribe/.test(u)) continue;
        const l = lignes.get(u) || { cle: u, libelle: libelles.get(u) || (u.startsWith('krystinestlaurent.ca/mes-choix') ? 'Cases « Mes choix »' : u), vraies: 0, robots: 0 };
        if (robot) l.robots++; else l.vraies++;
        lignes.set(u, l);
      }
    }
    // Les cases personnelles de « Mes choix » se regroupent en une ligne.
    const groupees = new Map<string, Ligne>();
    for (const l of lignes.values()) {
      const k = l.libelle === 'Cases « Mes choix »' ? 'mes-choix' : l.cle;
      const g = groupees.get(k) || { ...l, vraies: 0, robots: 0 };
      g.vraies += l.vraies; g.robots += l.robots; groupees.set(k, g);
    }
    const liste = [...groupees.values()].sort((a, b) => b.vraies - a.vraies || b.robots - a.robots);
    const max = Math.max(1, ...liste.map(l => l.vraies + l.robots));
    return { vraies, robots, liste, max };
  }, [docs, n]);

  if (!vue) return <p className="text-sm text-[#293027]/55">Chargement des clics…</p>;
  if (!vue.vraies && !vue.robots) return <p className="text-sm text-[#293027]/55">Aucun clic pour l’instant.</p>;
  const pct = (x: number) => (recus ? `${((x / recus) * 100).toFixed(1).replace('.', ',')} %` : '');
  const total = vue.vraies + vue.robots;

  return (
    <div className="rounded-xl border border-[#293027]/10 bg-white p-5 dark:bg-[#293027]/40">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#293027]/50">Vraies personnes qui ont cliqué</p>
          <p className="font-serif text-3xl text-[#28352F] dark:text-white">{vue.vraies.toLocaleString('fr-CA')} <span className="text-sm font-sans text-[#293027]/55">{pct(vue.vraies)} des personnes qui l’ont reçue</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-[#293027]/50">Robots de sécurité (mis de côté)</p>
          <p className="font-serif text-2xl text-[#293027]/45">{vue.robots.toLocaleString('fr-CA')}</p>
        </div>
      </div>
      <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-[#293027]/10" title="Vraies personnes contre robots">
        <div className="bg-[#28352F]" style={{ width: `${(vue.vraies / total) * 100}%` }} />
        <div className="bg-[repeating-linear-gradient(45deg,#c9bfae,#c9bfae_4px,#e6dfd2_4px,#e6dfd2_8px)]" style={{ width: `${(vue.robots / total) * 100}%` }} />
      </div>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-[#293027]/50">Ce qui a fait cliquer, lien par lien</p>
      <ul className="space-y-3">
        {vue.liste.map(l => (
          <li key={l.cle}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-[#293027] dark:text-white" title={l.cle}>{l.libelle}</span>
              <span className="shrink-0 tabular-nums"><b className="text-[#28352F] dark:text-white">{l.vraies}</b> <span className="text-[#293027]/45">· {l.robots} robot{l.robots > 1 ? 's' : ''}</span></span>
            </div>
            <div className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-[#293027]/[0.06]">
              <div className="bg-[#28352F]" style={{ width: `${(l.vraies / vue.max) * 100}%` }} />
              <div className="bg-[repeating-linear-gradient(45deg,#c9bfae,#c9bfae_4px,#e6dfd2_4px,#e6dfd2_8px)]" style={{ width: `${(l.robots / vue.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[#293027]/55">Vert : de vraies personnes. Hachuré : les robots de sécurité des messageries, qui ouvrent tous les liens d’un coup pour les vérifier (on les reconnaît à la rafale ou au clic sur la politique de confidentialité).</p>
    </div>
  );
};

export default ClicsLettre;
