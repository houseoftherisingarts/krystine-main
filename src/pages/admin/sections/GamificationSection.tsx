import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ADMIN_EMAILS } from '../../../firebase/auth';
import { subscribeToGamification, setGamificationFlag, type GamificationSettings } from '../../../firebase/gamification';
import { SKINS } from '../../../lib/pointsConfig';
import { Card, ToggleSwitch } from '../primitives';
import { useSkinsOverrides } from './SkinsATravaillerSection';

// L'onglet Gamification : un interrupteur par module de jeu du site. Fermer
// un module le retire complètement de l'espace client (aucun message
// « désactivé » pour les clientes) sans toucher aux données déjà posées :
// une membre qui a déjà un badge, un skin ou des niskas les garde, invisibles
// tant que le module reste fermé. Sauvegarde immédiate dans
// settings/gamification (lu par functions/src/gamification.ts et par
// src/contexts/GamificationContext.tsx, en temps réel).

const MODULES: Array<{ cle: keyof GamificationSettings; nom: string; description: string }> = [
  { cle: 'acheterNiskas', nom: 'Acheter des niskas', description: 'L’achat de niskas contre de l’argent (Stripe), dans la petite boutique. Fermé : le bouton et les paquets disparaissent; les niskas déjà gagnées restent dépensables.' },
  { cle: 'coffres', nom: 'Coffres et clés', description: 'Achat et ouverture des coffres bronze, argent, or, et de leurs clés. Fermé : les coffres disparaissent de la boutique et de la roue; personne ne peut plus en ouvrir.' },
  { cle: 'badges', nom: 'Badges', description: 'Tous les badges honorifiques (première flamme, ambassadrice, voix du cercle…), sur les profils, le mur et les clavardages. Fermé : plus aucun badge ne s’affiche ni ne se gagne.' },
  { cle: 'roueQuotidienne', nom: 'Roue quotidienne', description: 'Le cadeau du jour, sept jours qui tournent. Fermé : la roue disparaît de l’espace client au complet, y compris la roue du Foyer.' },
  { cle: 'roueFoyer', nom: 'Roue du Foyer', description: 'La deuxième roue, réservée aux membres du Foyer d’Origine, avec ses propres cadeaux. Fermé : seule la roue quotidienne reste.' },
  { cle: 'recompenses', nom: 'Récompenses échangeables', description: 'Le catalogue de récompenses contre des niskas, dans l’onglet Niskas. Fermé : le catalogue disparaît de cet onglet.' },
  { cle: 'parrainage', nom: 'Parrainage', description: 'Le panneau d’invitation, le code personnel et les cadeaux de filleules. Fermé : le panneau disparaît de l’espace client.' },
  { cle: 'coffreBeta', nom: 'Coffre de bienvenue bêta', description: 'Le cadeau de bienvenue des comptes créés pendant la période bêta (7 sept.–1er oct. 2026). Fermé : plus aucun nouveau compte ne le reçoit.' },
  { cle: 'panneauJouer', nom: '« On oublie souvent de jouer »', description: 'Le pop-up d’explication du jeu au premier login, et son rappel dans l’onglet Niskas. Fermé : il ne s’affiche plus jamais.' },
  { cle: 'petiteBoutique', nom: 'Petite boutique (téléchargements)', description: 'Bannières, skins, musique, vidéos et Santé la vie contre des niskas. Fermé : toute la section disparaît de l’onglet Téléchargements.' },
];

const GamificationSection: React.FC<{ user?: User }> = ({ user }) => {
  const [g, setG] = useState<Required<GamificationSettings> | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [dit, setDit] = useState<string | null>(null);
  const [connexions, setConnexions] = useState<number | null>(null);

  useEffect(() => subscribeToGamification(setG), []);
  useEffect(() => {
    getDoc(doc(db, 'etat', 'admins'))
      .then(s => setConnexions(((s.data()?.uids as string[]) || []).length))
      .catch(() => setConnexions(null));
  }, []);

  const dire = (texte: string) => { setDit(texte); window.setTimeout(() => setDit(null), 3000); };

  const basculer = async (cle: keyof GamificationSettings, valeurActuelle: boolean) => {
    setOccupe(cle);
    try {
      await setGamificationFlag({ [cle]: !valeurActuelle }, user?.uid || 'admin');
      dire('Enregistré.');
    } catch {
      dire('L’enregistrement n’a pas fonctionné. Réessayez.');
    } finally {
      setOccupe(null);
    }
  };

  const { overrides: skinsOverrides, occupe: skinOccupe, basculer: basculerSkin } = useSkinsOverrides();

  if (!g) return <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-serif text-3xl text-[#293027] dark:text-white">Gamification</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#293027]/60 dark:text-white/60">
          Un interrupteur par module. Fermer un module le retire complètement de l’espace client : aucune donnée n’est perdue, tout redevient visible d’un clic.
        </p>
        {dit && <p className="mt-2 text-sm font-bold text-[#8B4A2F]">{dit}</p>}
      </div>

      <Card className="p-6">
        <ul className="divide-y divide-[#293027]/10 dark:divide-white/10">
          {MODULES.map(m => (
            <li key={m.cle} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-[240px] flex-1">
                <p className="font-serif text-lg text-[#293027] dark:text-white">{m.nom}</p>
                <p className="mt-0.5 max-w-xl text-xs text-[#293027]/55 dark:text-white/55">{m.description}</p>
              </div>
              <div className="flex items-center gap-3">
                {occupe === m.cle && <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#8B4A2F]" />}
                <ToggleSwitch checked={!!g[m.cle]} onChange={() => basculer(m.cle, !!g[m.cle])} label={g[m.cle] ? 'Ouvert' : 'Fermé'} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Skins : réemploie settings/skins et le hook de « Skins à travailler »
          (SkinsATravaillerSection.tsx), mais montre TOUTES les skins — pas
          seulement le roster par défaut — pour n'en garder que quelques-unes
          en circulation d'un seul geste. */}
      <Card className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Skins</p>
        <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
          Chaque skin retirée de la circulation disparaît de la boutique, des coffres et de la roue; une membre qui l’a déjà la garde.
        </p>
        <ul className="mt-4 divide-y divide-[#293027]/10 dark:divide-white/10">
          {SKINS.filter(s => s.rarete !== 'exclusif').map(s => {
            const id = `skin-${s.cle}`;
            const override = skinsOverrides[id]?.enTravail;
            const enCirculation = typeof override === 'boolean' ? !override : !s.enTravail;
            return (
              <li key={s.cle} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-[180px] flex-1">
                  <p className="text-sm text-[#293027] dark:text-white">{s.nomFR}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
                    {s.rarete === 'commun' ? 'Skin de base' : s.rarete === 'legendaire' ? 'Légendaire · coffre bronze' : `Rare · coffre ${s.coffre === 'or' ? 'd’or' : 'd’argent'}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {skinOccupe === id && <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#8B4A2F]" />}
                  <ToggleSwitch checked={enCirculation} onChange={(v) => basculerSkin(s.cle, v)} label={enCirculation ? 'Active' : 'Fermée'} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Badge bleu : la coche qui dit qui administre le site. */}
      <Card className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Badge bleu</p>
        <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
          Le badge bleu dit qui administre le site.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {occupe === 'badgeBleuEquipeSeulement' && <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#8B4A2F]" />}
          <ToggleSwitch
            checked={!!g.badgeBleuEquipeSeulement}
            onChange={() => basculer('badgeBleuEquipeSeulement', !!g.badgeBleuEquipeSeulement)}
            label={g.badgeBleuEquipeSeulement ? 'Équipe seulement' : 'Ouvert à tout le monde'}
          />
        </div>
        <div className="mt-4 rounded-2xl border border-[#293027]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Les comptes de l’équipe</p>
          <ul className="mt-2 space-y-1">
            {ADMIN_EMAILS.map(email => (
              <li key={email} className="text-sm text-[#293027] dark:text-white"><i className="fa-solid fa-circle-check mr-2 text-[#3b82f6]" />{email}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#293027]/50 dark:text-white/50">
            {connexions === null ? 'Le compte des connexions admin ne s’est pas chargé.' : `${connexions} compte${connexions > 1 ? 's' : ''} déjà connecté${connexions > 1 ? 's' : ''} (etat/admins).`}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GamificationSection;
