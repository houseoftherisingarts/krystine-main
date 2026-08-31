import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Card, ToggleSwitch } from '../primitives';
import MurSocial from '../../../components/communaute/MurSocial';

// ─── Le feed public, depuis l'admin ─────────────────────────────────────────
// Krystine publie ses annonces dans le fil de la communauté sans quitter
// l'admin : le même fil que /espace et que l'onglet Feed de l'espace client.
// Le réglage d'ouverture aux membres vit ici aussi (miroir de Paramètres).

const FeedPublicSection: React.FC = () => {
  const [membresOk, setMembresOk] = useState(false);
  const [charge, setCharge] = useState(true);
  useEffect(() => {
    getDoc(doc(db, 'settings', 'community'))
      .then(s => setMembresOk(!!s.data()?.membresPeuventPublier))
      .finally(() => setCharge(false));
  }, []);
  const basculer = async (v: boolean) => {
    setMembresOk(v);
    await setDoc(doc(db, 'settings', 'community'), { membresPeuventPublier: v }, { merge: true });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Qui peut publier</p>
            <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60 max-w-md">
              Fermé, le feed n'accueille que vos annonces. Ouvert, les billets des membres s'y ajoutent.
            </p>
          </div>
          {!charge && (
            <ToggleSwitch checked={membresOk} onChange={basculer} label={membresOk ? 'Ouvert aux membres' : 'Vous seule publiez'} />
          )}
        </div>
      </Card>
      <Card className="p-6">
        <p className="mb-5 text-sm text-[#293027]/60 dark:text-white/60">
          Ce que vous publiez ici paraît aussitôt sur le feed du site, pour toute la communauté.
        </p>
        <MurSocial fil="communaute" titre="" />
      </Card>
    </div>
  );
};

export default FeedPublicSection;
