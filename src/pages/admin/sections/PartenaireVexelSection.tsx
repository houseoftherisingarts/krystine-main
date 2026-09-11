import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PartenaireVexelPanneau } from '../../../vexel/PartenaireVexelPanneau';
import { Card } from '../primitives';

// L'identifiant et la clé déjà utilisés pour la boîte de demandes (voir
// src/components/admin/DemandeVexel.tsx) : le même slug, la même clé ouvrent
// la porte des partenaires chez vexel-integrations.
const SLUG = 'krystine';
const CLE = 'aT_yMR68NLyEW3weNDjwYdW_';

// La fonction devenirPartenaireSite ne connaît que vexel-integrations : c'est
// à ce site d'écrire settings/vexel dans SA propre base une fois la réponse
// reçue, pour que BadgeVexel (pied de page public) le lise.
async function enregistrerPartenaire(resultat: { code: string; lien: string; page: string }) {
  await setDoc(
    doc(db, 'settings', 'vexel'),
    { partenaire: { code: resultat.code, lien: resultat.lien, page: resultat.page, signeLe: new Date().toISOString() } },
    { merge: true },
  );
}

const PartenaireVexelSection: React.FC = () => {
  const [dejaPartenaire, setDejaPartenaire] = useState<{ code: string; lien: string } | null>(null);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'vexel'))
      .then((s) => setDejaPartenaire(s.data()?.partenaire ?? null))
      .finally(() => setCharge(false));
  }, []);

  // Écoute le succès du panneau (voir onSuccess plus bas) pour écrire dans la
  // base du site sans que le composant partagé n'ait à connaître Firestore.
  useEffect(() => {
    const onSucces = (e: Event) => {
      const resultat = (e as CustomEvent).detail;
      enregistrerPartenaire(resultat).then(() => setDejaPartenaire(resultat));
    };
    window.addEventListener('vexel-partenaire-fait', onSucces);
    return () => window.removeEventListener('vexel-partenaire-fait', onSucces);
  }, []);

  return (
    <Card className="p-6 md:p-8">
      <h2 className="font-serif text-2xl text-[#293027] dark:text-white mb-2">Devenir partenaire Vexel</h2>
      <p className="text-sm text-[#293027]/70 dark:text-white/70 mb-6 max-w-xl">
        Recommandez le studio, touchez une part de chaque abonnement des clients que vous amenez, et affichez le
        badge de représentant au pied de ce site.
      </p>
      {!charge && dejaPartenaire && (
        <div className="mb-6 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/10 p-4 text-sm text-[#293027] dark:text-white">
          Code actif : <strong>{dejaPartenaire.code}</strong>. Le badge est visible au pied du site public.
        </div>
      )}
      <div
        style={{
          // Canon Krystine (crème/brass, cf. primitives.tsx) redéfini sur les
          // variables --couleur-* que lit le panneau partagé.
          ['--couleur-surface' as string]: '#faf7f0',
          ['--couleur-texte' as string]: '#293027',
          ['--couleur-muted' as string]: 'rgba(41,48,39,0.6)',
          ['--couleur-bordure' as string]: 'rgba(41,48,39,0.12)',
          ['--couleur-accent' as string]: '#BA7B39',
          ['--rayon-carte' as string]: '20px',
        }}
      >
        <PartenaireVexelPanneau
          slug={SLUG}
          cle={CLE}
          onSucces={(resultat) => window.dispatchEvent(new CustomEvent('vexel-partenaire-fait', { detail: resultat }))}
        />
      </div>
    </Card>
  );
};

export default PartenaireVexelSection;
