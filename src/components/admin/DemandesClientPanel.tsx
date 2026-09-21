// DemandesClientPanel — la liste des demandes du client, avec le crochet quand c'est fait.
//
// Se pose dans l'admin d'un site client, en sous-onglet du journal des
// changements. Il range en quatre blocs ce que la prop `charger` lui rend : ce
// qui reste à faire, ce qui avance, ce qui est fait, et ce que le studio n'a
// pas retenu. Rien ne s'écrit d'ici, et aucun secret n'y vit.
//
// Le panneau ignore volontairement d'où viennent les demandes. La liste se
// relit chez Vexel par demandesClient, mais cette porte demande la clé du
// client, et cette clé ne doit jamais descendre dans une page. Le site hôte
// passe donc par son propre serveur : chez Krystine, la callable `mesDemandes`
// vérifie que l'appelante est admin, lit la clé dans un secret, appelle le
// studio et rend la liste.
//
// Couleurs : ce fichier ne porte aucune couleur de Vexel en dur. Tout passe
// par des variables CSS --dc-*, qui reprennent les mêmes noms d'hôte que
// PartenaireVexelPanneau (--couleur-surface, --couleur-texte, --couleur-muted,
// --couleur-bordure, --couleur-accent, --rayon-carte, --police-corps,
// --police-titre). Un site les redéfinit dans sa feuille et le panneau prend
// son canon sans qu'on touche à ce code.
//
// Aucune dépendance : pas de lucide, pas de framer-motion, pas de Tailwind.
// Le crochet est un SVG en ligne et la transition une règle CSS, pour que le
// fichier se copie tel quel dans n'importe quel site client.
import { useEffect, useMemo, useState } from 'react';

export type StatutDemande =
  | 'nouvelle'
  | 'a_appliquer'
  | 'en_cours'
  | 'appliquee'
  | 'reglee'
  | 'refusee'
  | 'echec';

/** Une demande telle que demandesClient la rend : rien d'interne, rien de nominatif. */
export interface DemandeVue {
  id: string;
  recu: string;
  type?: 'bug' | 'changement' | 'contact';
  texte: string;
  statut: StatutDemande | string;
  resultat?: string;
  fin?: string;
}

export interface DemandesClientPanelProps {
  /**
   * Va chercher les demandes. Le panneau ne sait pas d'où elles viennent, et
   * c'est voulu : la clé du client ne doit jamais descendre dans la page, donc
   * le site hôte passe par SON propre serveur (chez Krystine, la callable
   * `mesDemandes`, qui vérifie l'admin, lit la clé dans un secret et appelle
   * le studio). Une erreur levée ici s'affiche telle quelle au client.
   */
  charger: () => Promise<DemandeVue[]>;
  lang?: 'fr' | 'en';
  /**
   * Le nombre de demandes qui restent à faire ou qui avancent, rapporté dès
   * que la liste arrive. Sert au badge de l'onglet qui porte ce panneau : le
   * site hôte n'a pas à refaire l'appel pour compter.
   */
  onEnAttente?: (n: number) => void;
}

/* ------------------------------------------------------------ les mots */

const MOTS = {
  fr: {
    titre: 'Vos demandes',
    intro:
      'Tout ce que vous avez demandé au studio, avec un crochet dès que c’est livré sur votre site.',
    compteur: (faites: number, total: number) =>
      `${faites} ${faites === 1 ? 'faite' : 'faites'} sur ${total}`,
    blocs: {
      afaire: 'À faire',
      encours: 'En cours',
      faites: 'Faites',
      refusees: 'Non retenues',
    },
    types: { bug: 'Problème technique', changement: 'Demande de changement', contact: 'Message' },
    reponse: 'La réponse du studio',
    videTitre: 'Rien pour le moment',
    videTexte:
      'Votre première demande apparaîtra ici dès que vous l’aurez envoyée, et le crochet se posera quand elle sera livrée.',
    chargement: 'Nous allons chercher vos demandes.',
    erreurTitre: 'Vos demandes ne se chargent pas',
    erreurAide: 'Réessayez dans un instant, et écrivez au studio si cela persiste.',
    reessayer: 'Réessayer',
    voir: (n: number) => (n === 1 ? 'Voir la demande non retenue' : `Voir les ${n} non retenues`),
    cacher: 'Cacher les non retenues',
    livreLe: (d: string) => `Livré le ${d}`,
    mois: [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ],
  },
  en: {
    titre: 'Your requests',
    intro: 'Everything you have asked the studio for, with a check mark once it is live on your site.',
    compteur: (faites: number, total: number) => `${faites} done out of ${total}`,
    blocs: { afaire: 'To do', encours: 'In progress', faites: 'Done', refusees: 'Not taken on' },
    types: { bug: 'Technical problem', changement: 'Change request', contact: 'Message' },
    reponse: 'What the studio wrote back',
    videTitre: 'Nothing yet',
    videTexte:
      'Your first request will show up here as soon as you send it, and the check mark lands when it ships.',
    chargement: 'Fetching your requests.',
    erreurTitre: 'Your requests did not load',
    erreurAide: 'Try again in a moment, and write to the studio if it keeps happening.',
    reessayer: 'Try again',
    voir: (n: number) => (n === 1 ? 'Show the one not taken on' : `Show the ${n} not taken on`),
    cacher: 'Hide the ones not taken on',
    livreLe: (d: string) => `Shipped ${d}`,
    mois: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
} as const;

/** « 21 septembre 2026 » / « September 21, 2026 », sans passer par toLocaleDateString. */
function enLettres(iso: string, lang: 'fr' | 'en', mois: readonly string[]): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const nom = mois[d.getMonth()];
  return lang === 'fr' ? `${d.getDate()} ${nom} ${d.getFullYear()}` : `${nom} ${d.getDate()}, ${d.getFullYear()}`;
}

type Bloc = 'afaire' | 'encours' | 'faites' | 'refusees';

/** Les sept statuts du studio, ramenés aux quatre blocs que le client comprend. */
function blocDe(statut: string): Bloc {
  if (statut === 'appliquee' || statut === 'reglee') return 'faites';
  if (statut === 'refusee') return 'refusees';
  if (statut === 'en_cours' || statut === 'echec') return 'encours';
  return 'afaire';
}

/* ------------------------------------------------------------ les styles */

const style = `
.dc-panneau {
  --dc-fond: var(--couleur-surface, #ffffff);
  --dc-texte: var(--couleur-texte, #1c1c1e);
  --dc-muted: var(--couleur-muted, #77767b);
  --dc-bordure: var(--couleur-bordure, rgba(0,0,0,0.12));
  --dc-accent: var(--couleur-accent, #BA7B39);
  --dc-fait: var(--couleur-fait, #3f8f5c);
  --dc-radius: var(--rayon-carte, 15px);
  --dc-font: var(--police-corps, system-ui, sans-serif);
  --dc-font-titre: var(--police-titre, var(--dc-font));
  color: var(--dc-texte);
  font-family: var(--dc-font);
}
.dc-panneau *, .dc-panneau *::before, .dc-panneau *::after { box-sizing: border-box; }
.dc-tete { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem 1.5rem; }
.dc-panneau h2 { font-family: var(--dc-font-titre); font-weight: 600; font-size: clamp(1.5rem, 3.4vw, 1.9rem); margin: 0; line-height: 1.2; }
.dc-panneau .dc-intro { color: var(--dc-muted); font-size: 0.9rem; line-height: 1.6; margin: 0.5rem 0 0; max-width: 46ch; }
.dc-compteur {
  flex-shrink: 0;
  border: 1px solid var(--dc-bordure);
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  background: color-mix(in srgb, var(--dc-accent) 10%, transparent);
  color: var(--dc-accent);
  border-color: color-mix(in srgb, var(--dc-accent) 35%, transparent);
}
.dc-blocs { margin-top: 2rem; display: flex; flex-direction: column; gap: 2rem; }
.dc-bloc-titre {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em;
  color: var(--dc-accent); margin: 0 0 0.9rem;
}
.dc-bloc-titre .dc-nb { color: var(--dc-muted); letter-spacing: 0.1em; font-weight: 600; }
.dc-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.dc-ligne {
  display: flex; gap: 0.9rem;
  border: 1px solid var(--dc-bordure);
  border-radius: var(--dc-radius);
  padding: 1rem 1.15rem;
  background: color-mix(in srgb, var(--dc-fond) 92%, var(--dc-texte) 2%);
}
.dc-ligne.dc-est-faite { border-color: color-mix(in srgb, var(--dc-fait) 32%, transparent); }
.dc-ligne.dc-est-refusee { opacity: 0.72; }
.dc-corps { min-width: 0; flex: 1; }
.dc-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em;
  color: var(--dc-muted); margin-bottom: 0.45rem;
}
.dc-meta .dc-type { color: var(--dc-accent); }
.dc-texte { margin: 0; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.dc-reponse {
  margin: 0.9rem 0 0;
  border: 1px solid var(--dc-bordure);
  border-left: 2px solid var(--dc-fait);
  border-radius: calc(var(--dc-radius) - 5px);
  padding: 0.8rem 1rem;
  background: color-mix(in srgb, var(--dc-fond) 84%, white 16%);
}
.dc-ligne.dc-est-refusee .dc-reponse { border-left-color: var(--dc-muted); }
.dc-reponse-titre { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: var(--dc-muted); margin: 0 0 0.35rem; }
.dc-reponse p { margin: 0; font-size: 0.88rem; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }

/* Le crochet : un rond vide qui se remplit, une seule transition douce. */
.dc-puce {
  flex-shrink: 0; width: 22px; height: 22px; margin-top: 2px;
  border-radius: 999px;
  border: 1.5px solid var(--dc-bordure);
  display: grid; place-items: center;
  background: transparent;
  transition: background-color 260ms ease, border-color 260ms ease;
}
.dc-puce svg { width: 12px; height: 12px; opacity: 0; transform: scale(0.6); transition: opacity 220ms ease 60ms, transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1.3) 60ms; }
.dc-puce.dc-p-faite { background: var(--dc-fait); border-color: var(--dc-fait); }
.dc-puce.dc-p-faite svg { opacity: 1; transform: scale(1); stroke: #ffffff; }
.dc-puce.dc-p-encours { border-color: var(--dc-accent); border-style: dashed; }
.dc-puce.dc-p-refusee { border-color: var(--dc-muted); position: relative; }
.dc-puce.dc-p-refusee::after {
  content: ''; position: absolute; left: 3px; right: 3px; top: 50%;
  height: 1.5px; background: var(--dc-muted); transform: rotate(-45deg);
}
@media (prefers-reduced-motion: reduce) {
  .dc-puce, .dc-puce svg { transition: none; }
}

.dc-repli { margin-top: 0.25rem; }
.dc-bouton {
  font: inherit; font-size: 0.82rem; font-weight: 600;
  color: var(--dc-muted); background: transparent; cursor: pointer;
  border: 1px solid var(--dc-bordure); border-radius: 999px;
  padding: 0.4rem 0.95rem;
  transition: color 180ms ease, border-color 180ms ease;
}
.dc-bouton:hover { color: var(--dc-texte); border-color: var(--dc-accent); }
.dc-etat {
  border: 1px dashed var(--dc-bordure);
  border-radius: var(--dc-radius);
  padding: clamp(1.5rem, 4vw, 2.5rem);
  text-align: left;
  margin-top: 1.75rem;
}
.dc-etat h3 { font-family: var(--dc-font-titre); font-weight: 600; font-size: 1.1rem; margin: 0 0 0.5rem; }
.dc-etat p { margin: 0; color: var(--dc-muted); font-size: 0.9rem; line-height: 1.6; max-width: 52ch; }
.dc-etat .dc-bouton { margin-top: 1rem; }
.dc-etat.dc-rate { border-style: solid; border-color: color-mix(in srgb, #b4432f 45%, transparent); }
.dc-rate h3 { color: #b4432f; }
`;

const Crochet = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 L9.5 18 L20 6.5" />
  </svg>
);

/* ------------------------------------------------------------ le panneau */

export function DemandesClientPanel({
  charger,
  lang = 'fr',
  onEnAttente,
}: DemandesClientPanelProps) {
  const m = MOTS[lang];
  const [demandes, setDemandes] = useState<DemandeVue[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [tour, setTour] = useState(0);
  const [refusOuvert, setRefusOuvert] = useState(false);

  useEffect(() => {
    let vivant = true;
    setDemandes(null);
    setErreur('');
    charger()
      .then((lot) => {
        if (vivant) setDemandes(Array.isArray(lot) ? lot : []);
      })
      .catch((e: unknown) => {
        if (vivant) setErreur(e instanceof Error ? e.message : String(e));
      });
    return () => {
      vivant = false;
    };
    // charger vient souvent d'une fonction fléchée recréée à chaque rendu : la
    // garder hors des dépendances évite de rappeler le serveur en boucle. Le
    // tour, lui, force une relecture quand on la demande.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  const groupes = useMemo(() => {
    const vides: Record<Bloc, DemandeVue[]> = { afaire: [], encours: [], faites: [], refusees: [] };
    for (const d of demandes ?? []) vides[blocDe(String(d.statut))].push(d);
    return vides;
  }, [demandes]);

  const total = demandes?.length ?? 0;
  const faites = groupes.faites.length;
  const enAttente = groupes.afaire.length + groupes.encours.length;

  useEffect(() => {
    if (demandes !== null) onEnAttente?.(enAttente);
    // onEnAttente vient souvent d'un setState inline : le garder hors des
    // dépendances évite une boucle si le parent le recrée à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandes, enAttente]);

  function ligne(d: DemandeVue, bloc: Bloc) {
    const estFaite = bloc === 'faites';
    const estRefusee = bloc === 'refusees';
    const type = m.types[(d.type as keyof typeof m.types) ?? 'changement'] ?? m.types.changement;
    const recu = enLettres(d.recu, lang, m.mois);
    const fin = estFaite ? enLettres(d.fin ?? '', lang, m.mois) : '';
    const puce = estFaite ? 'dc-p-faite' : estRefusee ? 'dc-p-refusee' : bloc === 'encours' ? 'dc-p-encours' : '';
    return (
      <li
        key={d.id}
        className={`dc-ligne${estFaite ? ' dc-est-faite' : ''}${estRefusee ? ' dc-est-refusee' : ''}`}
      >
        <span className={`dc-puce ${puce}`} aria-hidden="true">
          <Crochet />
        </span>
        <div className="dc-corps">
          <div className="dc-meta">
            <span className="dc-type">{type}</span>
            {recu && <span>{recu}</span>}
            {fin && <span>{m.livreLe(fin)}</span>}
          </div>
          <p className="dc-texte">{d.texte}</p>
          {(estFaite || estRefusee) && d.resultat && (
            <div className="dc-reponse">
              <p className="dc-reponse-titre">{m.reponse}</p>
              <p>{d.resultat}</p>
            </div>
          )}
        </div>
      </li>
    );
  }

  function bloc(nom: Exclude<Bloc, 'refusees'>) {
    const lot = groupes[nom];
    if (!lot.length) return null;
    return (
      <section key={nom}>
        <h3 className="dc-bloc-titre">
          {m.blocs[nom]}
          <span className="dc-nb">{lot.length}</span>
        </h3>
        <ul className="dc-liste">{lot.map((d) => ligne(d, nom))}</ul>
      </section>
    );
  }

  return (
    <div className="dc-panneau">
      <style>{style}</style>

      <div className="dc-tete">
        <div>
          <h2>{m.titre}</h2>
          <p className="dc-intro">{m.intro}</p>
        </div>
        {total > 0 && <span className="dc-compteur">{m.compteur(faites, total)}</span>}
      </div>

      {erreur && (
        <div className="dc-etat dc-rate" role="alert">
          <h3>{m.erreurTitre}</h3>
          <p>{`${m.erreurAide} (${erreur})`}</p>
          <button type="button" className="dc-bouton" onClick={() => setTour((t) => t + 1)}>
            {m.reessayer}
          </button>
        </div>
      )}

      {!erreur && demandes === null && (
        <div className="dc-etat">
          <p>{m.chargement}</p>
        </div>
      )}

      {!erreur && demandes !== null && total === 0 && (
        <div className="dc-etat">
          <h3>{m.videTitre}</h3>
          <p>{m.videTexte}</p>
        </div>
      )}

      {!erreur && total > 0 && (
        <div className="dc-blocs">
          {bloc('afaire')}
          {bloc('encours')}
          {bloc('faites')}

          {groupes.refusees.length > 0 && (
            <section className="dc-repli">
              <button type="button" className="dc-bouton" onClick={() => setRefusOuvert((o) => !o)}>
                {refusOuvert ? m.cacher : m.voir(groupes.refusees.length)}
              </button>
              {refusOuvert && (
                <>
                  <h3 className="dc-bloc-titre" style={{ marginTop: '1.25rem' }}>
                    {m.blocs.refusees}
                    <span className="dc-nb">{groupes.refusees.length}</span>
                  </h3>
                  <ul className="dc-liste">{groupes.refusees.map((d) => ligne(d, 'refusees'))}</ul>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default DemandesClientPanel;
