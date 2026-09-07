import React, { useEffect, useState } from 'react';
import { getTousLesSondages, type Sondage } from '../../../firebase/sondages';
import { Card, EmptyState, GhostButton, PrimaryButton } from '../primitives';
import SondageEditeur from './sondages/SondageEditeur';
import SondageReponses from './sondages/SondageReponses';

// « Sondages répondus » : la liste des sondages de Krystine (onglet Aider
// côté client), leur éditeur, et pour chacun le détail des réponses reçues.
// Trois vues locales plutôt que trois sections d'admin séparées : le
// va-et-vient entre la liste, une fiche et son éditeur reste sur place.

const LIBELLES_THEME: Record<string, string> = {
  technique: 'Technique',
  formation: 'Formations',
  accompagnement: 'Accompagnement',
};

type Vue = { nom: 'liste' } | { nom: 'editeur'; sondage: Sondage | null } | { nom: 'reponses'; sondage: Sondage };

const SondagesSection: React.FC = () => {
  const [sondages, setSondages] = useState<Sondage[]>([]);
  const [loading, setLoading] = useState(true);
  const [vue, setVue] = useState<Vue>({ nom: 'liste' });

  const refresh = () => getTousLesSondages().then(setSondages).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  if (vue.nom === 'editeur') {
    return (
      <SondageEditeur
        sondage={vue.sondage}
        prochainOrdre={sondages.length + 1}
        onFait={() => { setVue({ nom: 'liste' }); refresh(); }}
        onAnnuler={() => setVue({ nom: 'liste' })}
      />
    );
  }
  if (vue.nom === 'reponses') {
    return <SondageReponses sondage={vue.sondage} onRetour={() => setVue({ nom: 'liste' })} />;
  }

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">{sondages.length} sondage{sondages.length > 1 ? 's' : ''}</p>
        <PrimaryButton onClick={() => setVue({ nom: 'editeur', sondage: null })}>
          <i className="fa-solid fa-plus" /> Nouveau sondage
        </PrimaryButton>
      </div>

      {sondages.length === 0 ? (
        <EmptyState icon="fa-clipboard-question">Aucun sondage pour l'instant.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#EEE7DB] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
              <tr>
                <th className="text-left px-4 py-3">Ordre</th>
                <th className="text-left px-4 py-3">Titre</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Thème</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Questions</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sondages.map((s) => (
                <tr key={s.id} className="border-t border-[#293027]/5 dark:border-white/5 hover:bg-[#BA7B39]/5">
                  <td className="px-4 py-3 text-[#293027]/50 dark:text-white/50">{s.ordre}</td>
                  <td className="px-4 py-3 text-[#293027] dark:text-white font-medium">{s.titre}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#293027]/70 dark:text-white/70">{LIBELLES_THEME[s.theme] || s.theme}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#293027]/50 dark:text-white/50">{s.questions?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${s.actif ? 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'bg-[#293027]/10 text-[#293027]/50 dark:bg-white/10 dark:text-white/50'}`}>
                      {s.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <GhostButton onClick={() => setVue({ nom: 'reponses', sondage: s })} className="mr-2"><i className="fa-solid fa-chart-simple" /> Réponses</GhostButton>
                    <GhostButton onClick={() => setVue({ nom: 'editeur', sondage: s })}><i className="fa-solid fa-pen" /> Modifier</GhostButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default SondagesSection;
