import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getMesFormations, getFormationsPubliees, type AchatFormation, type Formation } from '../../firebase/formations';

// « Mes formations » : les cours que la cliente a achetés. La preuve d'achat
// est écrite par le serveur au paiement; l'admin peut aussi en accorder.

const ClientFormations: React.FC = () => {
  const { user, lang } = useApp();
  const [achats, setAchats] = useState<AchatFormation[]>([]);
  const [catalogue, setCatalogue] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getMesFormations(user.uid), getFormationsPubliees()])
      .then(([a, c]) => { setAchats(a); setCatalogue(c); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <p className="text-sm text-[#2a2015]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>;
  }

  const possedees = new Set(achats.map(a => a.id));
  const aDecouvrir = catalogue.filter(f => !possedees.has(f.id));

  return (
    <div className="space-y-10">
      {/* La première moitié : les formations de la personne */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330]">
          {lang === 'FR' ? 'Vos formations' : 'Your courses'}
        </p>
        {achats.length === 0 ? (
          <div className="mt-4 rounded-[15px] bg-[#bb9a5e]/8 py-8 text-center dark:bg-white/5">
            <i className="fa-solid fa-graduation-cap mb-3 block text-2xl text-[#bb9a5e]/60" />
            <p className="font-serif text-lg text-[#2a2015] dark:text-white">
              {lang === 'FR' ? 'Aucune formation pour le moment' : 'No courses yet'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#2a2015]/50 dark:text-white/50">
              {lang === 'FR' ? 'Choisissez votre premier parcours juste en dessous.' : 'Pick your first path just below.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
        )}
      </section>

      {/* La deuxième moitié : les formations à découvrir et à rejoindre */}
      {aDecouvrir.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330]">
              {lang === 'FR' ? 'À découvrir' : 'Discover'}
            </p>
            <Link to="/cours" className="text-[11px] font-bold uppercase tracking-widest text-[#7d6330] hover:text-[#bb9a5e]">
              {lang === 'FR' ? 'Toutes les formations' : 'All courses'} <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {aDecouvrir.map(f => (
              <Link
                key={f.id}
                to={f.lienFiche || `/cours/${f.id}`}
                className="group overflow-hidden rounded-[15px] border border-[#bb9a5e]/30 transition-transform duration-300 hover:-translate-y-0.5"
              >
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.titre} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[#bb9a5e]/10">
                    <i className="fa-solid fa-graduation-cap text-2xl text-[#7d6330]" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="min-w-0 truncate font-medium text-[#2a2015] dark:text-white">{f.titre}</p>
                  <span className="shrink-0 rounded-full bg-[#bb9a5e] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2a2015]">
                    {f.paywall && f.prix ? `${f.prix} $` : (lang === 'FR' ? 'Libre' : 'Free')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientFormations;
