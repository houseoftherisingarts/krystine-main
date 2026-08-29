import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getMesFormations, getFormationsPubliees, type AchatFormation, type Formation } from '../../firebase/formations';

// « Mes formations » : les cours que la cliente a achetés. La preuve d'achat
// est écrite par le serveur au paiement; l'admin peut aussi en accorder.

const ClientFormations: React.FC = () => {
  const { user, lang } = useApp();
  const [achats, setAchats] = useState<AchatFormation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMesFormations(user.uid).then(setAchats).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <p className="text-sm text-[#2a2015]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>;
  }

  if (achats.length === 0) {
    return (
      <div className="py-10 text-center">
        <i className="fa-solid fa-graduation-cap mb-4 text-3xl text-[#bb9a5e]/50" />
        <p className="font-serif text-lg text-[#2a2015] dark:text-white">
          {lang === 'FR' ? 'Aucune formation pour le moment' : 'No courses yet'}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#2a2015]/50 dark:text-white/50">
          {lang === 'FR'
            ? 'Les formations que vous achetez apparaissent ici, prêtes à suivre à votre rythme.'
            : 'The courses you purchase appear here, ready to follow at your own pace.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {achats.map(a => (
        <Link
          key={a.id}
          to={`/cours/${a.id}`}
          className="group overflow-hidden rounded-[15px] border border-[#2a2015]/10 transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10"
        >
          {a.imageUrl ? (
            <img src={a.imageUrl} alt={a.titre} className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-[#bb9a5e]/10">
              <i className="fa-solid fa-graduation-cap text-2xl text-[#7d6330]" />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="font-medium text-[#2a2015] dark:text-white">{a.titre}</p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#7d6330] opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'FR' ? 'Continuer' : 'Continue'} <i className="fa-solid fa-arrow-right" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ClientFormations;
