import React, { useEffect, useState } from 'react';
import { collection, getDocs, type Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Card } from '../../primitives';

// Le miroir des Rituels (Krystine, 15 oct. 2026) : la réponse de chaque
// acheteuse des Rituels essentiels à « Où en êtes-vous avec vos Rituels ? »
// (courriel du jour 7). Écrit par enregistrerRituels dans reponsesRituels.

interface Reponse { id: string; email: string; firstName?: string; reponse: string; le?: Timestamp }
const LIBELLE: Record<string, string> = {
  quotidien: 'Presque chaque jour',
  commence: 'A commencé',
  'pas-encore': 'Pas encore',
};
const ORDRE = ['pas-encore', 'commence', 'quotidien'];

const MiroirRituelsCard: React.FC = () => {
  const [liste, setListe] = useState<Reponse[] | null>(null);
  useEffect(() => {
    if (!db) { setListe([]); return; }
    getDocs(collection(db, 'reponsesRituels'))
      .then(s => setListe(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Reponse, 'id'>) }))))
      .catch(() => setListe([]));
  }, []);

  return (
    <Card className="p-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Le miroir des Rituels</h3>
      <p className="mt-1 text-[12px] text-[#293027]/55 dark:text-white/50">Où en est chaque acheteuse des Rituels essentiels, d'après sa réponse au courriel du jour 7.</p>
      {liste === null ? (
        <p className="mt-4 text-[13px] text-[#293027]/60 dark:text-white/60">Lecture…</p>
      ) : !liste.length ? (
        <p className="mt-4 text-[13px] text-[#293027]/60 dark:text-white/60">Aucune réponse pour l'instant.</p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {ORDRE.map(r => {
            const gens = liste.filter(x => x.reponse === r);
            return (
              <div key={r}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#BA7B39]">{LIBELLE[r]} · {gens.length}</p>
                <ul className="mt-2 space-y-1.5">
                  {gens.map(g => (
                    <li key={g.id} className="text-[13px] text-[#293027] dark:text-white">
                      {g.firstName || g.email}
                      <span className="block text-[11px] text-[#293027]/55 dark:text-white/50">
                        {g.email}{g.le?.toDate ? ` · ${g.le.toDate().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default MiroirRituelsCard;
