import React, { useEffect, useState } from 'react';
import { Card, ToggleSwitch } from '../primitives';
import { DEFAULT_FLAGS, setSiteFlag, subscribeToSiteFlags, type SiteFlags } from '../../../firebase/siteFlags';

/**
 * En préparation : la table des pages et des fonctions que Krystine peut
 * garder éteintes le temps de les finir. Chaque ligne vient d'un interrupteur
 * de src/firebase/siteFlags.ts, et une page éteinte reste visible pour une
 * administratrice connectée, ce qui lui permet de relire avant d'ouvrir.
 * Ajouter une page ici demande deux gestes : un drapeau dans siteFlags.ts,
 * puis une entrée dans PAGES ci-dessous.
 */

interface Reglage {
  cle: keyof SiteFlags;
  nom: string;
  /** Ce que l'interrupteur gouverne, en une ou deux phrases. */
  quoi: string;
  /** L'adresse montrée sous le nom, ou null quand la fonction n'a pas de page. */
  adresse: string | null;
  /** La page que le bouton Prévisualiser ouvre. */
  apercu: string;
  /** Ce que le public voit quand l'interrupteur est allumé, puis éteint. */
  allume: string;
  eteint: string;
  icone: string;
}

const PAGES: Reglage[] = [
  {
    cle: 'presseOuvert',
    nom: 'Salle de presse',
    quoi: "Vos visuels, vos portraits, vos biographies et le kit complet, prêts à télécharger par une journaliste ou une créatrice de contenu. Le lien Presse du pied de page n'apparaît qu'une fois la salle ouverte.",
    adresse: '/presse',
    apercu: '/presse',
    allume: 'Ouverte, visible par tout le monde',
    eteint: 'Éteinte, visible seulement par vous',
    icone: 'fa-newspaper',
  },
  {
    cle: 'origine2Ouvert',
    nom: 'L’Expérience Origine 2',
    quoi: "La page de vente de la deuxième cohorte, avec ses douze semaines et son inscription. Éteinte, une visiteuse qui arrive sur l'adresse est conduite à la liste d'attente.",
    adresse: '/origine-2',
    apercu: '/origine-2',
    allume: 'Ouverte, visible par tout le monde',
    eteint: 'Éteinte, visible seulement par vous',
    icone: 'fa-seedling',
  },
  {
    cle: 'foyerOuvert',
    nom: 'Le Foyer d’Origine',
    quoi: "L'abonnement au Foyer. Éteint, la page de vente reste en ligne et se lit normalement, mais le bouton d'achat ouvre la liste d'attente au lieu de vendre.",
    adresse: '/foyer',
    apercu: '/foyer',
    allume: 'Ouvert, l’abonnement se vend',
    eteint: 'Éteint, le bouton mène à la liste d’attente',
    icone: 'fa-fire',
  },
  {
    cle: 'chatbotOuvert',
    nom: 'L’assistante de conversation',
    quoi: "La pastille qui flotte en bas à droite de chaque page et répond aux questions des visiteuses. Éteinte, son bouton disparaît du site et plus aucune question ne part vers le serveur.",
    adresse: null,
    apercu: '/krystine',
    allume: 'Allumée, elle répond aux visiteuses',
    eteint: 'Éteinte, son bouton n’apparaît nulle part',
    icone: 'fa-comments',
  },
  {
    cle: 'showTedx',
    nom: 'Les mentions du TEDx',
    quoi: "Les rappels d'une conférence TEDx dans l'agenda de l'accueil. Ils restent éteints tant que la conférence n'est pas officiellement annoncée.",
    adresse: null,
    apercu: '/accueil-classic',
    allume: 'Allumées, le public les voit dans l’agenda',
    eteint: 'Éteintes, personne ne les voit',
    icone: 'fa-microphone-lines',
  },
];

const EnPreparationSection: React.FC = () => {
  const [flags, setFlags] = useState<SiteFlags>(DEFAULT_FLAGS);
  const [pret, setPret] = useState(false);
  useEffect(() => subscribeToSiteFlags(f => { setFlags(f); setPret(true); }), []);

  const basculer = (cle: keyof SiteFlags, v: boolean) => {
    setFlags(f => ({ ...f, [cle]: v }));
    void setSiteFlag(cle, v);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">
          Ce que cette page vous permet
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Tout ce qui est éteint ici reste invisible pour le public, et vous seule décidez du moment de l’ouvrir.
          Le bouton Prévisualiser ouvre la page dans un nouvel onglet, où vous la voyez exactement comme elle sera
          une fois allumée, parce que votre compte passe outre l’interrupteur. Quand elle vous convient, vous
          l’allumez et elle apparaît au public dans la seconde.
        </p>
      </Card>

      {PAGES.map(p => {
        const ouvert = !!flags[p.cle];
        return (
          <Card key={p.cle} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[13rem] flex-1 basis-[18rem]">
                <h4 className="flex items-center gap-3 text-base font-bold text-[#293027] dark:text-white">
                  <i className={`fa-solid ${p.icone} text-[#BA7B39]`} aria-hidden />
                  {p.nom}
                </h4>
                {p.adresse && (
                  <p className="mt-1.5 text-[11px] uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
                    {p.adresse}
                  </p>
                )}
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#293027]/65 dark:text-white/65">
                  {p.quoi}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                  ouvert
                    ? 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'
                    : 'bg-[#293027]/8 text-[#293027]/55 dark:bg-white/10 dark:text-white/55'
                }`}
              >
                {pret ? (ouvert ? p.allume : p.eteint) : 'Chargement'}
              </span>
            </div>

            {pret && (
              <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-[#293027]/10 pt-5 dark:border-white/10">
                <ToggleSwitch
                  checked={ouvert}
                  onChange={v => basculer(p.cle, v)}
                  label={ouvert ? 'Allumé' : 'Éteint'}
                />
                <a
                  href={p.apercu}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold uppercase tracking-widest text-[#293027]/55 transition-colors hover:text-[#8B4A2F] dark:text-white/55"
                >
                  <i className="fa-solid fa-up-right-from-square mr-1.5" aria-hidden />
                  Prévisualiser
                </a>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default EnPreparationSection;
