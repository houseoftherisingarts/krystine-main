import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getMesFormations, type AchatFormation } from '../firebase/formations';
import CadreFoyer from '../components/communaute/CadreFoyer';
import EspaceGroupe from '../components/communaute/EspaceGroupe';

// ─── Les groupes du Foyer ────────────────────────────────────────────────────
// /groupes et /groupes/:id, dans la coquille du Foyer. Une rangée de pilules
// nomme les groupes de la membre : le Foyer d'Origine d'abord, toujours, puis
// chaque formation achetée. Dessous, l'espace du groupe choisi en variante
// « cadre » (la colonne centrale seule; le rail « Autour du feu » de la
// coquille tient lieu de colonne Membres). Une membre qui ouvre un groupe
// qu'elle n'a pas acheté voit ce que les règles laissent passer.
const GroupesPage: React.FC = () => {
  const { id = 'foyer' } = useParams<{ id?: string }>();
  const { user, lang } = useApp();
  const fr = lang === 'FR';
  const [formations, setFormations] = useState<AchatFormation[]>([]);

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    getMesFormations(user.uid).then(f => { if (vivant) setFormations(f.filter(x => x.id !== 'foyer')); }).catch(() => {});
    return () => { vivant = false; };
  }, [user]);

  const groupes = [{ id: 'foyer', titre: fr ? 'Le Foyer d’Origine' : 'The Origine Hearth' }, ...formations.map(f => ({ id: f.id, titre: f.titre || f.id }))];

  return (
    <CadreFoyer onglet="groupes">
      <div className="flex flex-wrap gap-2">
        {groupes.map(g => (
          <Link
            key={g.id}
            to={`/groupes/${g.id}`}
            aria-current={g.id === id ? 'page' : undefined}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              g.id === id ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]'
            }`}
          >
            <i className={`fa-solid ${g.id === 'foyer' ? 'fa-fire' : 'fa-people-group'} text-[10px]`} /> {g.titre}
          </Link>
        ))}
      </div>
      <EspaceGroupe key={id} formationId={id} variante="cadre" />
    </CadreFoyer>
  );
};

export default GroupesPage;
