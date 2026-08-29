import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { getAllMembers, type MemberDoc } from '../firebase/firestore';
import Avatar from '../components/communaute/Avatar';

// ─── L'annuaire des membres ──────────────────────────────────────────
// Porté du mur social du FMM 2026 (le registre de l'Ordre), adapté à la
// collection `members` déjà en place ici. Chaque carte mène à la fiche
// publique du membre, /membre/:uid.
const CommunauteMembres: React.FC = () => {
  const { user, setSignInOpen } = useAuth();
  const [membres, setMembres] = useState<MemberDoc[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    getAllMembers()
      .then((m) => { if (vivant) setMembres(m); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-[#2a2015] dark:text-white mb-4">Membres</h1>
          <p className="text-[#3a3126]/60 dark:text-white/60 mb-8">
            Connectez-vous pour voir l’annuaire des membres.
          </p>
          <button
            onClick={() => setSignInOpen(true)}
            className="bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="font-serif text-3xl md:text-4xl text-[#2a2015] dark:text-white mb-8">Membres</h1>

        {chargement ? (
          <p className="text-sm text-[#3a3126]/50 dark:text-white/45">Un instant.</p>
        ) : membres.length === 0 ? (
          <p className="text-sm text-[#3a3126]/50 dark:text-white/45">Aucun membre pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {membres.map((m) => (
              <Link
                key={m.uid}
                to={`/membre/${m.uid}`}
                className="flex items-center gap-4 bg-white/55 backdrop-blur-md dark:bg-[#2a2015]/55 rounded-[20px] border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] p-4 hover:border-[#bb9a5e]/60 transition-colors"
              >
                <Avatar nom={m.displayName || m.email} url={m.photoURL} taille={52} />
                <div className="min-w-0">
                  <p className="font-serif text-base text-[#2a2015] dark:text-white truncate">
                    {m.displayName || m.email.split('@')[0]}
                  </p>
                  {m.dosha && (
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#7d6330] dark:text-[#bb9a5e] mt-0.5">
                      Dosha {m.dosha}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunauteMembres;
