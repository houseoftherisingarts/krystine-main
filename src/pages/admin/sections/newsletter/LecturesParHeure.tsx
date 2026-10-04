import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebase';

// ─── Les lectures heure par heure (Krystine, 4 octobre 2026) ────────────────
// Chaque vraie lecture (hors ouvertures automatiques) est déjà notée avec son
// heure dans newsletters/{id}/ouvertures. Ce graphique les range par heure,
// depuis l'envoi, et se met à jour tout seul pendant que la lettre s'ouvre.

const heure = (d: Date) => d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' });
const jourCourt = (d: Date) => d.toLocaleDateString('fr-CA', { weekday: 'short', timeZone: 'America/Toronto' });
const cleHeure = (d: Date) => `${jourCourt(d)} ${d.toLocaleTimeString('fr-CA', { hour: '2-digit', hour12: false, timeZone: 'America/Toronto' })}`;
const heureLocale = (d: Date) => Number(d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Toronto' })) % 24;
const jourLocal = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });

const LecturesParHeure: React.FC<{ id: string; envoyeLe?: Date; recus: number }> = ({ id, envoyeLe, recus }) => {
  const [lectures, setLectures] = useState<Date[] | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(collection(db, 'newsletters', id, 'ouvertures'), snap => {
      setLectures(snap.docs
        .filter(d => d.get('humaine') === true || d.get('auto') === false)
        .map(d => (d.get('humaineAt') || d.get('at'))?.toDate?.() as Date | undefined)
        .filter((d): d is Date => !!d)
        .sort((a, b) => a.getTime() - b.getTime()));
    }, () => setLectures([]));
  }, [id]);

  const vue = useMemo(() => {
    if (!lectures || !lectures.length) return null;
    // L'heure notée est celle de la fin de l'envoi : les premières lectures
    // peuvent la précéder, le graphique part donc de la plus ancienne des deux.
    const depart = envoyeLe && envoyeLe < lectures[0] ? envoyeLe : lectures[0];
    const debut = new Date(Math.floor(depart.getTime() / 3.6e6) * 3.6e6);
    const fin = new Date(Math.min(Date.now(), debut.getTime() + 48 * 3.6e6));
    const barres: { cle: string; n: number; d: Date }[] = [];
    for (let t = debut.getTime(); t <= fin.getTime(); t += 3.6e6) barres.push({ cle: cleHeure(new Date(t)), n: 0, d: new Date(t) });
    let plusTard = 0;
    for (const l of lectures) {
      const i = Math.floor((l.getTime() - debut.getTime()) / 3.6e6);
      if (i >= 0 && i < barres.length) barres[i].n++; else if (i >= barres.length) plusTard++;
    }
    const jourEnvoi = jourLocal(depart);
    const lendemain = jourLocal(new Date(depart.getTime() + 24 * 3.6e6));
    const soir = lectures.filter(l => jourLocal(l) === jourEnvoi).length;
    const matin = lectures.filter(l => jourLocal(l) === lendemain && heureLocale(l) >= 5 && heureLocale(l) < 12).length;
    const max = Math.max(1, ...barres.map(b => b.n));
    const pic = barres.reduce((a, b) => (b.n > a.n ? b : a), barres[0]);
    return { barres, max, soir, matin, plusTard, pic };
  }, [lectures, envoyeLe]);

  if (!lectures) return <p className="text-sm text-[#293027]/55">Chargement des lectures…</p>;
  if (!vue) return <p className="text-sm text-[#293027]/55">Aucune lecture pour l’instant. Le graphique se remplit tout seul dès les premières.</p>;

  const pct = (x: number) => (recus ? ` (${Math.round((x / recus) * 100)} %)` : '');
  return (
    <div className="rounded-xl border border-[#293027]/10 bg-white p-5 dark:bg-[#293027]/40">
      <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50">Le soir même</p><p className="font-bold text-[#293027] dark:text-white">{vue.soir.toLocaleString('fr-CA')}{pct(vue.soir)}</p></div>
        <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50">Le lendemain matin</p><p className="font-bold text-[#293027] dark:text-white">{vue.matin.toLocaleString('fr-CA')}{pct(vue.matin)}</p></div>
        <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50">Total</p><p className="font-bold text-[#293027] dark:text-white">{lectures.length.toLocaleString('fr-CA')}{pct(lectures.length)}</p></div>
        <div><p className="text-[10px] uppercase tracking-widest text-[#293027]/50">L’heure la plus forte</p><p className="font-bold text-[#293027] dark:text-white">{vue.pic.cle} h · {vue.pic.n}</p></div>
      </div>
      <div className="flex h-40 items-end gap-[3px] overflow-x-auto pb-1" role="img" aria-label="Lectures par heure depuis l’envoi">
        {vue.barres.map(b => (
          <div key={b.d.getTime()} className="group relative flex h-full min-w-[10px] flex-1 flex-col justify-end" title={`${b.cle} h : ${b.n} lecture${b.n > 1 ? 's' : ''}`}>
            <div className="w-full rounded-t-[3px] bg-[#9c7a44] transition-all group-hover:bg-[#28352F]" style={{ height: `${(b.n / vue.max) * 100}%`, minHeight: b.n ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-[#293027]/45">
        <span>{jourCourt(vue.barres[0].d)} {heure(vue.barres[0].d)}</span>
        <span>{jourCourt(vue.barres[vue.barres.length - 1].d)} {heure(vue.barres[vue.barres.length - 1].d)}</span>
      </div>
      <p className="mt-3 text-xs text-[#293027]/55">Une barre par heure, sur les 48 heures qui suivent l’envoi. Se met à jour toute seule.{vue.plusTard ? ` ${vue.plusTard} lecture${vue.plusTard > 1 ? 's' : ''} plus tard.` : ''}</p>
    </div>
  );
};

export default LecturesParHeure;
