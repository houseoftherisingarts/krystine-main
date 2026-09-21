// Le journal des changements, tel que Krystine le lit. Le contenu vit dans
// src/lib/changelog.ts et s'ajoute en tête à chaque journée de travail.
//
// Deux sous-onglets depuis le 21 septembre 2026, à sa demande : « Journal »,
// ce que le studio a livré, et « Vos demandes », ce qu'elle a demandé, avec un
// crochet dès que c'est fait. Les deux racontent la même histoire vue des deux
// bords, donc ils vivent sous la même entrée de navigation. Le panneau des
// demandes vient de _vexel-base/src/vexel/DemandesClientPanel.tsx et se nourrit
// de la callable `mesDemandes` (functions/src/mesDemandes.ts), qui vérifie
// l'admin et va chercher la liste chez Vexel côté serveur : aucune clé du
// studio ne descend dans cette page. Les deux vues restent montées pour que le
// compte des demandes en attente alimente le badge sans attendre le premier clic.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { JOURNAL, nombreEtapes, type Etape } from '../../../lib/changelog';
import DemandesClientPanel from '../../../components/admin/DemandesClientPanel';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../firebase';
import type { DemandeVue } from '../../../components/admin/DemandesClientPanel';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 21 avril 2026 », sans passer par Date pour éviter le décalage de fuseau. */
const enLettres = (iso: string): string => {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j} ${MOIS[(m || 1) - 1]} ${a}`;
};

/**
 * La liste passe par notre propre serveur, jamais par le studio en direct : la
 * callable `mesDemandes` vérifie que l'appelante est admin, lit la clé du
 * dossier Vexel dans un secret et rapporte la liste. Aucune clé ici.
 */
const chargerDemandes = async (): Promise<DemandeVue[]> => {
  const appel = httpsCallable<unknown, { demandes: DemandeVue[] }>(
    getFunctions(app!, 'us-central1'),
    'mesDemandes',
  );
  return (await appel()).data.demandes ?? [];
};

// TEMPORAIRE (capture du 21 septembre 2026) : ?demoDemandes=1 remplit le
// panneau sans appeler la fonction, le temps de regarder le rendu. À retirer.
const DEMO = [
  { id: 'd1', recu: '2026-09-20T14:02:00.000Z', type: 'changement' as const, texte: 'Sur la page du Foyer, la photo de groupe passe avant le paragraphe de présentation. Elle donne le ton et on la voit à peine où elle est.', statut: 'nouvelle' },
  { id: 'd2', recu: '2026-09-19T09:40:00.000Z', type: 'bug' as const, texte: 'Le bouton d’inscription à l’infolettre ne fait rien sur mon téléphone, alors qu’il fonctionne sur l’ordinateur.', statut: 'nouvelle' },
  { id: 'd3', recu: '2026-09-18T18:12:00.000Z', type: 'changement' as const, texte: 'J’aimerais une page pour les conférences, avec les dates à venir et un formulaire pour m’inviter.', statut: 'en_cours' },
  { id: 'd4', recu: '2026-09-15T11:25:00.000Z', type: 'changement' as const, texte: 'Le titre de la page des médias devrait dire « Krystine dans les médias » plutôt que « Médias ».', statut: 'appliquee', fin: '2026-09-16T08:30:00.000Z', resultat: 'Le titre a été changé sur la page et dans la vignette de partage. La page se retrouve aussi plus facilement dans les recherches.' },
  { id: 'd5', recu: '2026-09-12T16:48:00.000Z', type: 'bug' as const, texte: 'Les commandes de la boutique n’arrivent plus dans ma boîte de réception depuis vendredi.', statut: 'reglee', fin: '2026-09-13T10:05:00.000Z', resultat: 'Les avis partaient dans les indésirables depuis un changement chez le fournisseur de courriel. L’adresse d’envoi a été réauthentifiée et les commandes rentrent de nouveau.' },
  { id: 'd6', recu: '2026-09-08T13:00:00.000Z', type: 'changement' as const, texte: 'Est-ce qu’on pourrait mettre de la musique qui joue toute seule à l’ouverture de la page d’accueil ?', statut: 'refusee', fin: '2026-09-09T09:15:00.000Z', resultat: 'Un son qui part sans qu’on l’ait demandé fait fermer l’onglet, et les moteurs de recherche le pénalisent. Nous avons plutôt ajouté le lecteur du podcast bien en vue sur l’accueil.' },
];

/** Le canon de l'admin, passé au panneau portable par variables CSS. */
const CANON_DEMANDES = `
.kr-demandes {
  --couleur-surface: #FBF8F2;
  --couleur-texte: #293027;
  --couleur-muted: rgba(41, 48, 39, 0.62);
  --couleur-bordure: rgba(56, 64, 58, 0.16);
  --couleur-accent: #8B4A2F;
  --couleur-fait: #4a7c59;
  --rayon-carte: 20px;
  --police-corps: Inter, system-ui, sans-serif;
  --police-titre: "Cormorant Garamond", serif;
}
.dark .kr-demandes {
  --couleur-surface: #222b26;
  --couleur-texte: #ffffff;
  --couleur-muted: rgba(255, 255, 255, 0.62);
  --couleur-bordure: rgba(255, 255, 255, 0.14);
  --couleur-accent: #d9a05b;
  --couleur-fait: #6fae86;
}
`;

const ONGLETS = [
  { id: 'journal', libelle: 'Journal' },
  { id: 'demandes', libelle: 'Vos demandes' },
] as const;

type OngletId = (typeof ONGLETS)[number]['id'];

/* ------------------------------------------------------------ le journal */

const Journal: React.FC = () => {
  const journees = JOURNAL.length;
  const premiere = JOURNAL[JOURNAL.length - 1];

  return (
    <div className="space-y-8">
      {/* La seule rupture de la page : le compte, en gros, avant la frise. */}
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[20px] bg-[#BA7B39] px-6 py-8 text-[#1a1410] md:px-10 md:py-10">
        <div>
          <div className="font-serif text-6xl leading-none md:text-7xl">{journees}</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
            {journees === 1 ? 'journée de travail' : 'journées de travail'}
          </div>
        </div>
        <div className="hidden w-px self-stretch bg-[#1a1410]/20 md:block" />
        <div className="max-w-md">
          <p className="font-serif text-xl leading-snug">
            {nombreEtapes()} changements livrés depuis le {enLettres(premiere.date)}.
          </p>
          <p className="mt-2 text-sm leading-relaxed opacity-75">
            Chaque nouvelle journée de travail s’ajoute ici d’elle-même, en haut de la liste.
          </p>
        </div>
      </div>

      <ol className="relative ml-2 space-y-8 border-l border-[#38403a]/15 md:ml-3 dark:border-white/10">
        {JOURNAL.map((entree, i) => (
          <li key={entree.date} className="relative pl-6 md:pl-10">
            <span
              aria-hidden
              className={`absolute -left-[7px] top-7 h-3.5 w-3.5 rounded-full border-2 border-[#EEE7DB] dark:border-[#151d19] ${
                i === 0 ? 'bg-[#BA7B39]' : 'bg-[#38403a]/35 dark:bg-white/25'
              }`}
            />
            <article className="rounded-[20px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-[#293027]/55">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
                  {enLettres(entree.date)}
                </span>
                {i === 0 && (
                  <span className="rounded-full bg-[#BA7B39]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">
                    Dernière livraison
                  </span>
                )}
              </div>

              <h2 className="mb-3 font-serif text-xl leading-snug text-[#293027] md:text-2xl dark:text-white">{entree.titre}</h2>
              <p className="mb-6 leading-relaxed text-[#38403a]/80 dark:text-white/75">{entree.intro}</p>

              <ul className="space-y-3">
                {entree.etapes.map((etape: Etape, j) => {
                  const texte = typeof etape === 'string' ? etape : etape.texte;
                  const ou = typeof etape === 'string' ? null : etape.ou;
                  return (
                    <li key={j} className="flex gap-3 text-sm leading-relaxed text-[#38403a]/85 md:text-[15px] dark:text-white/75">
                      <i className="fa-solid fa-check mt-1 shrink-0 text-[#BA7B39]" aria-hidden="true" />
                      <span>
                        {texte}
                        {ou && (
                          <Link
                            to={ou}
                            className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#BA7B39]/35 px-2.5 py-[3px] align-middle text-[11px] font-bold text-[#8B4A2F] transition-colors hover:border-[#BA7B39] hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" aria-hidden="true" />
                            {(typeof etape === 'string' ? '' : etape.libelle) || 'Voir'}
                          </Link>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-2 pl-2 text-sm text-[#38403a]/55 dark:text-white/50">
        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
        Une question sur l’une de ces journées se pose dans l’onglet « Demander un changement ».
      </p>
    </div>
  );
};

/* ------------------------------------------------------------ la section */

const ChangelogSection: React.FC = () => {
  const [onglet, setOnglet] = useState<OngletId>('journal');
  const [enAttente, setEnAttente] = useState(0);

  return (
    <div className="space-y-8">
      <style>{CANON_DEMANDES}</style>

      <div>
        <h1 className="font-serif text-3xl text-[#293027] dark:text-white">Journal des changements</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Tout ce qui a été bâti sur votre site depuis le premier jour, et la liste de ce que vous
          avez demandé, avec un crochet dès que c’est livré.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Journal et demandes">
        {ONGLETS.map((o) => {
          const actif = onglet === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => setOnglet(o.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] transition-colors ${
                actif
                  ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'
                  : 'border-[#38403a]/20 text-[#38403a]/60 hover:border-[#BA7B39]/50 hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/55 dark:hover:text-[#d9a05b]'
              }`}
            >
              {o.libelle}
              {o.id === 'demandes' && enAttente > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#BA7B39] px-1.5 text-[10px] font-bold tracking-normal text-[#1a1410]">
                  {enAttente}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Les deux vues restent montées : le panneau compte ses demandes dès
          l'arrivée sur la page, donc le badge est juste avant le premier clic. */}
      <div className={onglet === 'journal' ? '' : 'hidden'} role="tabpanel">
        <Journal />
      </div>
      <div className={`kr-demandes ${onglet === 'demandes' ? '' : 'hidden'}`} role="tabpanel">
        <DemandesClientPanel
          charger={chargerDemandes}
          lang="fr"
          onEnAttente={setEnAttente}
          donneesDemo={new URLSearchParams(window.location.search).get('demoDemandes') ? DEMO : undefined}
        />
      </div>
    </div>
  );
};

export default ChangelogSection;
