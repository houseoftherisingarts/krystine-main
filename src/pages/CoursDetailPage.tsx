import React, { useEffect, useMemo, useState, useRef } from 'react';
import { suivreLiveEnCours, type LiveEnCours } from '../firebase/lives';
import { PORTES, porteDuMois, foyerOuvert, DEBUT_LABEL } from './foyer/portesData';
import { rangSemaine, semaineOuverteRang } from './origine2/semaines';
import CoursOrigine from '../components/cours/origine/CoursOrigine';
import { LECON_CERTIFICAT, estOrigine, leconsVisibles } from './origine2/piliers';
import { FORMATION_VATA, SEMAINES_VATA, rangDeModule as rangModuleVata, semainesVataOuvertes, etiquetteSemaine } from './vata/semaines';
import { urlDeDocumentLecon, poserQuestion, suivreQuestions, repondreQuestion, type QuestionLecon } from '../firebase/formations';
import { Navigate, useParams, Link, useNavigate } from 'react-router-dom';
import {
  getFormation, getLecons, getProgression, marquerLecon, etatAchat, infosAchat, episodesPossedes,
  urlDeLecon, marquerFormationTerminee,
  type Formation, type Lecon,
} from '../firebase/formations';
import { useAuth, useUI } from '../contexts/AppContext';
import { SANTE_LA_VIE_ID } from '../lib/pointsConfig';
import CadreFoyer from '../components/communaute/CadreFoyer';
import { getMember } from '../firebase/firestore';
import { restaurerKajabiAuto } from '../firebase/kajabi';
import TexteLecon from '../lib/texteLecon';
import { LecteurVideoPleinEcran } from '../components/LecteurVideoEmbarque';
import SeuilVata from '../components/cours/SeuilVata';
import CheminSens, { type EtatSemaine } from '../components/cours/CheminSens';
import LecteurAudioCours from '../components/cours/LecteurAudioCours';
import VideoLecon, { vignetteDeLecon } from '../components/cours/VideoLecon';
import VignetteComposee, { compositionCours } from '../components/cours/VignetteComposee';
import { DocumentsLecon, FenetreDocument, PALETTE_COURS } from '../components/cours/DocumentsLecon';
import BravoSemaine from '../components/cours/BravoSemaine';
import BravoDiplome from '../components/cours/BravoDiplome';
import type { DiplomeInfos } from '../components/cours/Diplome';
import { programmeDe } from './cours/programmes';
import { nettoyerKajabi, sansRepetitions, nomDocumentLisible } from './cours/nettoyerKajabi';
import StickerFormat, { formatDe } from '../components/cours/StickerFormat';
import { prixEnVigueur } from '../lib/versements';
import { idDeCours, cheminCours, cheminPaiement, adresseADemenager } from '../lib/cheminCours';
import { monRabaisAmbassadrice } from '../firebase/ambassadrices';

// La fiche d'un cours et son lecteur, sur le patron de l'Académie Zéro
// Limite : liste des leçons et progression à gauche, contenu à droite,
// bouton Suivant, marquer comme terminée. L'accès au fichier passe par le
// serveur (URL signée après vérification de l'achat).

const ICONES: Record<Lecon['type'], string> = {
  video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file', texte: 'fa-align-left',
};

// La bannière d'une formation ACHETÉE (Alex, 7 sept. 2026 : « très fade
// visuellement »), sur le patron de CadreFoyer.tsx : média réel en fond,
// voile en dégradé du noir chaud (#141311) au vert profond (#28352F),
// jamais de backdrop-blur sur une image. Vata reprend son vrai fond de vente
// (src/pages/vata/constants.ts, ASSETS.images.heroBg) : aucune vidéo de fond
// n'existe pour ce programme. Les autres formations achetées retombent sur
// leur imageUrl de fiche, même voile — jamais une image inventée.
const BANNIERES_ACHETEES: Record<string, { image: string; duree?: { fr: string; en: string } }> = {
  'kajabi-2148687644': {
    // La couverture au canon (crème, sauge, laiton mat), générée le 10
    // septembre 2026 pour remplacer le visuel Kajabi de l'ancien branding. Le
    // titre se pose dessus en Cormorant Garamond, comme sur le diplôme.
    image: '/vata/couverture.webp',
    duree: { fr: '7 semaines', en: '7 weeks' },
  },
};

// La petite image d'une capsule audio : celle de la leçon si elle en a une,
// sinon la couverture de la formation (Alex, 7 sept 2026 : « un petit
// thumbnail aux audio » de l'expérience Ayurveda).
const vignetteAudio = (l: { imageUrl?: string } & Record<string, any>, formation?: { imageUrl?: string }): string | undefined =>
  vignetteDeLecon(l) || formation?.imageUrl;

// Une leçon rattachée à une porte reste verrouillée tant que cette porte
// n'est pas ouverte (le mois en cours ou un mois déjà passé du cycle), comme
// le drip de Kajabi. L'admin voit tout.
const rangPorte = (n?: string) => (n ? PORTES.findIndex(p => p.n === n) : -1);

const CoursDetailPage: React.FC = () => {
  const { id: idAdresse = '' } = useParams();
  // L'adresse dit « vata », la base dit l'identifiant d'import : on traduit.
  const id = idDeCours(idAdresse);
  const { user, isAdmin } = useAuth();
  const { lang } = useUI();
  const [formation, setFormation] = useState<Formation | null>(null);
  // Le rabais qui attend une membre arrivée par le code d'une ambassadrice.
  const [rabaisAmb, setRabaisAmb] = useState<{ rabaisPct: number; nom: string } | null>(null);
  useEffect(() => {
    if (!user) { setRabaisAmb(null); return; }
    monRabaisAmbassadrice().then(r => setRabaisAmb(r.rabaisPct > 0 ? r : null)).catch(() => {});
  }, [user]);
  const [replies, setReplies] = useState<Record<string, boolean>>({});
  const [lecons, setLecons] = useState<Lecon[]>([]);
  // Le programme refait (seuil, chemin, boîtes, diplôme) : tout cours sauf le Foyer.
  const programme = useMemo(() => programmeDe(formation ? { id, titre: formation.titre, imageUrl: formation.imageUrl } : null, lecons), [formation, lecons, id]);
  const rangDeModule = (nom?: string) => programme?.rangDeModule(nom) ?? -1;
  const chapitreDeModule = (nom?: string) => programme?.chapitres[rangDeModule(nom)];
  // « Introduction », puis « Semaine 1 » à 7 : les mêmes mots partout (Krystine, 29 sept. 2026).
  const libelleSemaine = (s: { rang: number; sens: { fr: string; en: string } }) =>
    `${(s as { etiquette?: { fr: string; en: string } }).etiquette ? etiquetteSemaine(s as never, lang === 'FR') : s.rang === 0 ? 'Introduction' : `${lang === 'FR' ? programme!.prefixe.fr : programme!.prefixe.en} ${s.rang}`} · ${lang === 'FR' ? s.sens.fr : s.sens.en}`;
  const CHAPITRES = programme?.chapitres ?? [];
  const [achete, setAchete] = useState(false);
  // Santé la vie achetée à l'épisode ou à la saison : seuls ces épisodes s'ouvrent
  // (même règle que obtenirLecon). Null : achat complet, ou aucun achat.
  const [episodesAchetes, setEpisodesAchetes] = useState<Set<string> | null>(null);
  // Un achat en versements dont un prélèvement a échoué : le cours se ferme
  // et un message remplace les leçons jusqu'au paiement.
  const [suspendu, setSuspendu] = useState(false);
  const [verifAcces, setVerifAcces] = useState(true);   // le temps de savoir si la personne possède le cours
  const [accesVie, setAccesVie] = useState(false);
  const [achatVata, setAchatVata] = useState<{ source?: string; acheteLe?: Date } | null>(null);
  // Tant que l'achat n'est pas lu, achatVata vaut null et le goutte-à-goutte
  // ouvrirait tout un instant : on attend la lecture.
  const [achatLu, setAchatLu] = useState(false);
  // Le petit avis d'une semaine encore fermée, au clic sur sa carte.
  const [avisVerrou, setAvisVerrou] = useState<string | null>(null);
  useEffect(() => {
    if (!avisVerrou) return;
    const t = window.setTimeout(() => setAvisVerrou(null), 5000);
    return () => window.clearTimeout(t);
  }, [avisVerrou]);
  // Au téléphone, l'aperçu d'un PDF en iframe est illisible : un bouton l'ouvre dans un onglet.
  const [etroit, setEtroit] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const suivre = () => setEtroit(mq.matches);
    mq.addEventListener('change', suivre);
    return () => mq.removeEventListener('change', suivre);
  }, []);
  // Le moment de référence d'une simulation ?jour=N (admin seulement).
  const [maintenantRef] = useState(() => Date.now());
  // Les petits sons des portes (hover) : le son de survol du Festival
  // Médiéval (orb/sfx/hover.mp3) pour l'ouverte, le petit verrou maison pour
  // les barrées. Volumes très discrets.
  const ambiance = useRef<HTMLAudioElement | null>(null);
  const [ambianceJoue, setAmbianceJoue] = useState(false);
  const basculerAmbiance = () => {
    if (!ambiance.current) {
      ambiance.current = new Audio('/foyer/sons/ambiance-feu.mp3');
      ambiance.current.loop = true;
      ambiance.current.volume = 0.18;
    }
    if (ambianceJoue) { ambiance.current.pause(); setAmbianceJoue(false); }
    else { void ambiance.current.play().then(() => setAmbianceJoue(true)).catch(() => {}); }
  };
  useEffect(() => () => { ambiance.current?.pause(); }, []);
  const sonFeu = useRef<HTMLAudioElement | null>(null);
  const sonVerrou = useRef<HTMLAudioElement | null>(null);
  const jouerSon = (ouverte: boolean) => {
    if (!sonFeu.current) { sonFeu.current = new Audio('/foyer/sons/porte-feu.mp3'); sonFeu.current.volume = 0.12; }
    if (!sonVerrou.current) { sonVerrou.current = new Audio('/foyer/sons/porte-verrou.m4a'); sonVerrou.current.volume = 0.15; }
    const el = ouverte ? sonFeu.current : sonVerrou.current;
    try { el.currentTime = 0; void el.play(); } catch { /* geste requis */ }
  };
  const [live, setLive] = useState<LiveEnCours | null>(null);
  useEffect(() => suivreLiveEnCours(setLive), []);
  const [liveOuvert, setLiveOuvert] = useState(false);
  const [terminees, setTerminees] = useState<Record<string, boolean>>({});
  // La dernière leçon ouverte, pour y revenir d'emblée à la prochaine visite.
  const [derniere, setDerniere] = useState<string | null>(null);
  const [progressionLue, setProgressionLue] = useState(false);
  const [courante, setCourante] = useState<Lecon | null>(null);
  // L'aperçu d'un PDF de la leçon, ouvert dans un volet à droite.
  const [apercuPdf, setApercu] = useState<{ nom: string; url: string } | null>(null);
  // Les cadeaux de Krystine se réclament dans la messagerie ou la cloche
  // seulement (Alex, 6 septembre 2026) : la fiche garde son bouton d'achat.
  const [urlCourante, setUrlCourante] = useState('');
  const [chargeLecon, setChargeLecon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Les deux moments de fête : une porte qui s'ouvre, et le programme
  // mené jusqu'au bout (Alex, 10 septembre 2026).
  const [bravo, setBravo] = useState<{ rang: number; avant: number; apres: number; achevees: number } | null>(null);
  const [diplome, setDiplome] = useState<DiplomeInfos | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getFormation(id), getLecons(id)])
      .then(([f, ls]) => { setFormation(f); setLecons(leconsVisibles(id, ls)); })
      .finally(() => setLoading(false));
  }, [id]);

  // Une formation de l'ancien site retrouvée à la connexion : on relit l'accès.
  const [relecture, setRelecture] = useState(0);
  useEffect(() => { if (user) restaurerKajabiAuto(user.uid).then(r => { if (r.restaurees) setRelecture(x => x + 1); }); }, [user]);
  useEffect(() => {
    if (!user || !id) { setAchete(false); setSuspendu(false); setAccesVie(false); setVerifAcces(false); setEpisodesAchetes(null); return; }
    setVerifAcces(true);
    episodesPossedes(user.uid, id).then(setEpisodesAchetes).catch(() => setEpisodesAchetes(null));
    etatAchat(user.uid, id)
      .then(e => { setAchete(e === 'actif'); setSuspendu(e === 'suspendu'); })
      .catch(() => {}).finally(() => setVerifAcces(false));
    if (id === FORMATION_VATA) {
      setAchatLu(false);
      infosAchat(user.uid, id).then(setAchatVata).catch(() => {}).finally(() => setAchatLu(true));
    } else setAchatLu(true);
    getMember(user.uid).then(m => setAccesVie(!!m?.accesVie)).catch(() => {});
    setProgressionLue(false);
    getProgression(user.uid, id).then(p => {
      setTerminees(p.terminees || {});
      setDerniere((p as { derniereLecon?: string }).derniereLecon || null);
    }).catch(() => {}).finally(() => setProgressionLue(true));
  }, [user, id, relecture]);

  // Le contenu s'ouvre à qui a acheté (ou reçu) la formation. L'admin voit
  // la même barrière que tout le monde; son aperçu passe par ?apercu (le
  // bouton « Aperçu » de l'admin), jamais par défaut.
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  // ?jour=N (admin seulement) : la vue d'une acheteuse au jour N du goutte-à-goutte, pour voir ce que voit une cliente.
  const jourSimule = isAdmin && params?.has('jour') ? Math.max(0, Math.floor(Number(params.get('jour')) || 0)) : null;
  const apercu = !!params && (params.has('apercu') || jourSimule != null);
  // Une formation en liste d'attente ne s'ouvre à personne, même sans
  // paywall : le prix ou l'accès libre laissent place au bouton d'attente.
  const accessible = useMemo(
    () => achete || accesVie || (formation ? !formation.paywall && !formation.listeAttente : false) || (isAdmin && apercu),
    [isAdmin, apercu, achete, accesVie, formation],
  );

  // Avant l'ouverture du cycle (OUVERTURE, foyer/portesData.ts), aucune porte n'est ouverte : tout reste barré.
  // L'Expérience Origine 2 suit le même principe, une semaine à la fois, à
  // partir de la date de départ posée dans l'admin (src/pages/origine2/semaines.ts).
  const estOrigine2 = id === 'origine2';
  const ouvert = estOrigine2 ? semaineOuverteRang(formation?.dateSortie) >= 0 : foyerOuvert();
  const porteOuverteRang = estOrigine2 ? semaineOuverteRang(formation?.dateSortie) : (ouvert ? rangPorte(porteDuMois().n) : -1);
  const rangDe = (n?: string) => (estOrigine2 ? rangSemaine(n) : rangPorte(n));
  // Vata en goutte-à-goutte (décision de Krystine, 29 septembre 2026) : une
  // semaine s'ouvre tous les 7 jours à partir de la date d'achat. Les
  // anciennes (Kajabi), l'accès à vie et l'admin gardent tout ouvert.
  // Simulation admin : on décale « maintenant » de N jours après un achat
  // fait à l'instant (un achat daté dans le passé tomberait avant
  // DRIP_VATA_DEPUIS et ouvrirait tout).
  const semainesVata = id !== FORMATION_VATA ? Infinity
    : jourSimule != null ? semainesVataOuvertes({ acheteLe: new Date(maintenantRef) }, new Date(maintenantRef + jourSimule * 86400000))
    : accesVie ? Infinity
    : !achatLu ? 1   // en lecture : l'introduction et la semaine 1 seulement
    : semainesVataOuvertes(achatVata);
  const departVata = jourSimule != null ? new Date(maintenantRef - jourSimule * 86400000) : achatVata?.acheteLe;
  // L'admin voit tout, sauf lorsqu'elle simule une acheteuse.
  const toutVoir = isAdmin && jourSimule == null;
  const nonAchete = (l: Lecon) => !!episodesAchetes && !episodesAchetes.has(l.id);
  const verrouillee = (l: Lecon) => !toutVoir && ((id === 'foyer' && !ouvert) || rangDe(l.mois) > porteOuverteRang
    || rangModuleVata(l.moduleNom) > semainesVata || nonAchete(l));
  /** Santé la vie : « Module 2 » se lit « Saison 2 » (le nom technique sert à la vente à la saison). */
  const nomModule = (nom?: string) => (id === SANTE_LA_VIE_ID && nom ? nom.replace(/^Module (\d+)$/, lang === 'FR' ? 'Saison $1' : 'Season $1') : nom);
  /** La date d'ouverture d'une semaine de Vata (« 12 octobre »), si elle est connue. */
  const ouvertureSemaine = (rang: number): string | undefined => {
    if (id !== FORMATION_VATA || !departVata || semainesVata === Infinity || rang < 2) return undefined;
    return new Date(departVata.getTime() + 7 * (rang - 1) * 86400000)
      .toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long', timeZone: 'America/Toronto' });
  };

  // « Reprendre » : une seule réponse pour toute la page et pour tous les cours.
  // La dernière leçon ouverte si elle n'est pas terminée, sinon la première
  // leçon ouverte encore à faire, sinon la première leçon ouverte.
  const leconDeReprise = (): Lecon | undefined =>
    (derniere && derniere !== LECON_CERTIFICAT[id] ? lecons.find(l => l.id === derniere && !terminees[l.id] && !verrouillee(l)) : undefined)
    || lecons.find(l => !terminees[l.id] && !verrouillee(l))
    || lecons.find(l => !verrouillee(l));

  // La page s'ouvre d'elle-même sur la leçon de reprise. Plus de « choisissez une leçon ».
  useEffect(() => {
    if (courante || !accessible || lecons.length === 0 || (user && !progressionLue) || (user && !achatLu)) return;
    const cible = leconDeReprise();
    if (cible) void ouvrir(cible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courante, accessible, lecons, derniere, progressionLue, user, achatLu]);

  const ouvrir = async (l: Lecon) => {
    if (verrouillee(l)) return;
    setCourante(l); setUrlCourante(''); setErreur(null);
    if (user) marquerLecon(user.uid, id, l.id, terminees[l.id] || false).catch(() => {});
    // Leçon sans fichier média : seul le texte s'affiche, pas d'appel serveur.
    if (!l.chemin) { setChargeLecon(false); return; }
    setChargeLecon(true);
    try {
      setUrlCourante(await urlDeLecon(id, l.id));
    } catch {
      setErreur(lang === 'FR' ? 'Cette leçon n\'a pas pu se charger.' : 'This lesson could not load.');
    } finally { setChargeLecon(false); }
  };

  const basculerTerminee = async (l: Lecon) => {
    if (!user) return;
    const v = !terminees[l.id];
    const apres = { ...terminees, [l.id]: v };
    setTerminees(apres);
    await marquerLecon(user.uid, id, l.id, v).catch(() => {});
    if (!v) return;   // décocher ne déclenche aucune fête

    // La porte vient-elle de s'ouvrir, et avec elle tout le programme ?
    const total = lecons.length;
    const faitesAvant = lecons.filter(x => terminees[x.id]).length;
    const faitesApres = lecons.filter(x => apres[x.id]).length;

    const rang = rangDeModule(l.moduleNom);
    if (rang >= 0) {
      const duModule = lecons.filter(x => rangDeModule(x.moduleNom) === rang);
      const restait = duModule.some(x => !terminees[x.id]);
      const fini = duModule.every(x => apres[x.id]);
      if (restait && fini) {
        const achevees = CHAPITRES.filter(s => {
          const items = lecons.filter(x => rangDeModule(x.moduleNom) === s.rang);
          return items.length > 0 && items.every(x => apres[x.id]);
        }).length;
        setBravo({
          rang,
          avant: total ? faitesAvant / total : 0,
          apres: total ? faitesApres / total : 0,
          achevees,
        });
      }
    }

    // Le programme entier : le parchemin, une seule fois.
    if (total > 0 && faitesApres >= total && faitesAvant < total) {
      const jour = new Date().toISOString().slice(0, 10);
      marquerFormationTerminee(user.uid, id, jour).catch(() => {});
      setDiplome({
        nom: user.displayName || user.email || (lang === 'FR' ? 'Membre' : 'Member'),
        programme: estOrigine(id) ? 'EXPÉRIENCE ORIGINE' : (formation?.titre || 'Expérience Ayurveda'),
        accompli: estOrigine(id) ? (lang === 'FR' ? 'les douze semaines' : 'the twelve weeks') : (lang === 'FR' ? `${total} leçons` : `${total} lessons`),
        ...(estOrigine(id) ? { habillage: 'origine' as const } : {}),
        date: jour,
        numero: `${id.slice(-6).toUpperCase()} · ${user.uid.slice(0, 6).toUpperCase()}`,
      });
    }
  };

  const iCourante = courante ? lecons.findIndex(l => l.id === courante.id) : -1;
  const prochaineOuverte = courante ? lecons.slice(iCourante + 1).find(l => !verrouillee(l)) : undefined;
  const precedenteOuverte = courante ? lecons.slice(0, Math.max(0, iCourante)).reverse().find(l => !verrouillee(l)) : undefined;
  // À la fin du contenu ouvert : quand la suite s'ouvre (sinon rien, c'est la fin).
  const suiteFermee = (() => {
    if (!courante || prochaineOuverte) return null;
    const l = lecons.slice(iCourante + 1).find(x => verrouillee(x));
    if (!l) return null;
    if (l.mois) return lang === 'FR' ? `La suite s'ouvre avec la porte de ${l.mois}.` : `What comes next opens with the ${l.mois} door.`;
    const date = ouvertureSemaine(rangModuleVata(l.moduleNom));
    return date
      ? (lang === 'FR' ? `La suite s'ouvre le ${date}.` : `What comes next opens on ${date}.`)
      : (lang === 'FR' ? 'La suite s\'ouvre bientôt.' : 'What comes next opens soon.');
  })();
  const suivante = () => { if (prochaineOuverte) void ouvrir(prochaineOuverte); };
  const precedente = () => { if (precedenteOuverte) void ouvrir(precedenteOuverte); };

  // L'achat passe par la page de choix (un paiement ou des versements),
  // commune à toutes les formations : src/pages/PaiementFormation.tsx.
  const navigate = useNavigate();
  const acheter = () => { setPaiement(true); navigate(cheminPaiement(id)); };

  const nbTerminees = lecons.filter(l => terminees[l.id]).length;
  const pct = lecons.length ? Math.round((nbTerminees / lecons.length) * 100) : 0;

  // ── L'Expérience Vata : le seuil plein cadre et le chemin des huit sens ──
  // La page se réchauffe à mesure que les portes s'ouvrent (plan complet :
  // docs/vata-plan-visuel.md, ordre d'Alex du 10 septembre 2026).
  const estVata = !!programme;
  const etatsSemaines = useMemo(() => {
    const par: Record<number, EtatSemaine> = {};
    for (const s of CHAPITRES) {
      const fermee = !toutVoir && s.rang > semainesVata;
      par[s.rang] = { terminees: 0, total: 0, verrouillee: fermee, ouvertureLe: fermee ? ouvertureSemaine(s.rang) : undefined };
    }
    for (const l of lecons) {
      const r = rangDeModule(l.moduleNom);
      if (r < 0) continue;
      par[r].total += 1;
      if (terminees[l.id]) par[r].terminees += 1;
    }
    return par;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecons, terminees, toutVoir, semainesVata, departVata?.getTime(), lang]);
  const semainesAchevees = CHAPITRES.filter(
    s => (etatsSemaines[s.rang]?.total ?? 0) > 0 && etatsSemaines[s.rang].terminees >= etatsSemaines[s.rang].total,
  ).length;
  const chaleur = lecons.length ? nbTerminees / lecons.length : 0;
  const chapitre = useRef<HTMLDivElement | null>(null);

  /** Ouvrir une semaine du chemin : sa première leçon encore à faire. */
  const ouvrirSemaine = (rang: number) => {
    const duModule = lecons.filter(l => rangDeModule(l.moduleNom) === rang);
    const cible = duModule.find(l => !terminees[l.id] && !verrouillee(l)) || duModule.find(l => !verrouillee(l));
    if (!cible && etatsSemaines[rang]?.verrouillee) {
      const c = CHAPITRES[rang] as { etiquette?: { fr: string; en: string } } | undefined;
      const date = ouvertureSemaine(rang);
      const nom = lang === 'FR'
        ? (c?.etiquette ? `La ${c.etiquette.fr.toLowerCase()}` : `La semaine ${rang}`)
        : (c?.etiquette ? `The ${c.etiquette.en.toLowerCase()}` : `Week ${rang}`);
      setAvisVerrou(date
        ? (lang === 'FR' ? `${nom} s'ouvre le ${date}.` : `${nom} opens on ${date}.`)
        : (lang === 'FR' ? `${nom} s'ouvre bientôt.` : `${nom} opens soon.`));
      return;
    }
    if (cible) {
      void ouvrir(cible);
      setReplies(r => ({ ...r, [cible.moduleNom || '']: false }));
    }
    requestAnimationFrame(() => chapitre.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Une adresse qui nomme encore l'identifiant d'import file vers la propre.
  if (adresseADemenager(idAdresse)) {
    return <Navigate to={cheminCours(idAdresse) + (typeof window !== 'undefined' ? window.location.search : '')} replace />;
  }
  if (loading) {
    return <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center text-sm text-[#38403a]/50 dark:bg-[#151d19] dark:text-white/50">…</div>;
  }
  // Un cours masqué reste ouvert pour qui le possède (achat accordé par
  // l'admin, accès à vie ou admin) : il est absent du catalogue, pas du compte.
  // Le Foyer a sa page de vente : qui ne le possède pas encore y est menée
  // (le bouton d'achat vit là, avec toute la promesse). Les membres passent.
  if (id === 'foyer' && formation && !accessible && !suspendu && (!user || !verifAcces)) {
    return <Navigate to="/foyer" replace />;
  }

  // Une formation en liste d'attente ne montre son pédigrée (leçons, modules
  // de la première cohorte) à personne qui ne l'a pas : la fiche renvoie à
  // sa page de vente, comme le Foyer ci-dessus. Qui la possède déjà (achat,
  // accès à vie) ou l'admin en aperçu passe tout droit (Alex, 7 sept. 2026).
  if (formation?.listeAttente && !accessible && !suspendu && (!user || !verifAcces)) {
    return <Navigate to={formation.lienFiche || '/origine'} replace />;
  }

  const masqueMaisPossede = formation && formation.statut !== 'publie' && (isAdmin || achete || suspendu || accesVie);
  if (formation && formation.statut !== 'publie' && !masqueMaisPossede && user && verifAcces) {
    return <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center text-sm text-[#38403a]/50 dark:bg-[#151d19] dark:text-white/50">…</div>;
  }
  if (!formation || (formation.statut !== 'publie' && !masqueMaisPossede)) {
    return (
      <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center dark:bg-[#151d19]">
        <p className="font-serif text-2xl text-[#293027] dark:text-white">{lang === 'FR' ? 'Cette formation n\'est pas disponible.' : 'This course is not available.'}</p>
        <Link to="/cours" className="mt-4 inline-block text-sm text-[#8B4A2F]">{lang === 'FR' ? 'Retour aux formations' : 'Back to courses'}</Link>
      </div>
    );
  }

  // L'Expérience Origine (les deux cohortes) a son propre espace : seuil
  // compact, piliers repliés, vignette et dépôt dans le volet de la leçon.
  if (estOrigine(id) && accessible) {
    const rafraichir = async () => {
      const ls = leconsVisibles(id, await getLecons(id));
      setLecons(ls);
      setCourante(c => (c ? ls.find(l => l.id === c.id) || c : c));
    };
    return (
      <CoursOrigine
        id={id}
        formation={formation}
        lecons={lecons}
        courante={courante}
        terminees={terminees}
        url={urlCourante}
        chargement={chargeLecon}
        erreur={erreur}
        isAdmin={isAdmin}
        lang={lang}
        verrouillee={verrouillee}
        reprise={leconDeReprise()}
        nomParticipante={user?.displayName || user?.email || ''}
        onDiplome={setDiplome}
        onOuvrir={l => { void ouvrir(l); }}
        onTerminee={l => { void basculerTerminee(l); }}
        onSuivante={suivante}
        onRafraichir={rafraichir}
        modales={diplome ? <BravoDiplome infos={diplome} lang={lang} onFermer={() => setDiplome(null)} /> : null}
      />
    );
  }

  // Le Foyer et Vata prennent toute la largeur : leur ouverture est une scène,
  // pas une carte posée dans une colonne (règle du plein cadre).
  const scenePleine = accessible && (id === 'foyer' || estVata);
  const page = (
    <div className={scenePleine ? (estVata ? 'min-h-screen bg-[#EEE7DB] pb-24 dark:bg-[#151d19]' : '') : 'min-h-screen bg-[#EEE7DB] pt-28 pb-24 dark:bg-[#151d19]'}>
      <div className={scenePleine ? '' : 'mx-auto max-w-[1720px] px-5 md:px-10'}>
        <Link
          to="/cours"
          className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${
            estVata && accessible
              ? 'absolute left-5 top-24 z-20 rounded-full border border-[#BA7B39]/45 bg-[#F7F3EA]/85 px-4 py-2.5 text-[#8B4A2F] shadow-[0_8px_22px_-12px_rgba(41,48,39,0.5)] backdrop-blur-sm transition-colors hover:border-[#BA7B39] hover:bg-[#F7F3EA] md:left-10'
              : 'text-[#8B4A2F]'
          }`}
        >
          <i className="fa-solid fa-arrow-left" />{lang === 'FR' ? 'Toutes les formations' : 'All courses'}
        </Link>
        {estVata && accessible && (
          <SeuilVata
            programme={programme!}
            format={formatDe(id, lecons)}
            image={id === FORMATION_VATA ? '/vata/carte-vata-essentiel.jpg' : programme!.couverture}
            uni={id === FORMATION_VATA}
            chaleur={chaleur}
            terminees={nbTerminees}
            total={lecons.length}
            semainesAchevees={semainesAchevees}
            reperSemaine={id === FORMATION_VATA ? (() => {
              // Goutte-à-goutte : la dernière semaine ouverte. Tout ouvert : la semaine de la reprise.
              const p = lecons.find(l => !terminees[l.id] && !verrouillee(l));
              const r = semainesVata !== Infinity ? semainesVata : p ? rangModuleVata(p.moduleNom) : SEMAINES_VATA.length - 1;
              const s = SEMAINES_VATA[Math.max(0, Math.min(r, SEMAINES_VATA.length - 1))];
              const nb = SEMAINES_VATA.filter(x => x.rang > 0 && !x.etiquette).length;
              if (s.rang === 0 || s.etiquette) return etiquetteSemaine(s, lang === 'FR');
              return lang === 'FR' ? `Semaine ${s.rang} sur ${nb}` : `Week ${s.rang} of ${nb}`;
            })() : undefined}
            lang={lang}
            reprise={(() => {
              const p = leconDeReprise();
              if (!p) return undefined;
              const s = chapitreDeModule(p.moduleNom);
              return {
                titre: p.titre,
                duree: p.duree,
                vignette: vignetteAudio(p, id === FORMATION_VATA ? undefined : formation || undefined) || s?.vignette,
                soustitre: s ? libelleSemaine(s) : undefined,
                onOuvrir: () => { void ouvrir(p); requestAnimationFrame(() => chapitre.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); },
              };
            })()}
          />
        )}
        {/* Les cartes restent visibles en rangée, toutes, numérotées dans
            l'ordre, avec un cadenas sur les semaines à venir (Krystine, 29 sept.
            2026). La liste des leçons ne les répète plus. */}
        {estVata && accessible && (
          <CheminSens programme={programme!} etats={etatsSemaines} courante={courante ? rangDeModule(courante.moduleNom) : -1} lang={lang} onOuvrir={ouvrirSemaine} />
        )}
        {avisVerrou && (
          <p role="status" className="fixed inset-x-4 bottom-6 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-[#BA7B39]/40 bg-[#151d19]/92 px-5 py-2.5 text-center text-[13px] text-[#EEE7DB] shadow-[0_14px_36px_-16px_rgba(20,19,17,0.8)] backdrop-blur-md">
            <i className="fa-solid fa-lock mr-2 text-[11px] text-[#d9a05b]" />{avisVerrou}
          </p>
        )}
        {jourSimule != null && id === FORMATION_VATA && (
          <p className="fixed left-4 top-24 z-50 rounded-full bg-[#8B4A2F] px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F7F3EA]">
            Aperçu : une acheteuse au jour {jourSimule}
          </p>
        )}
        {id === 'foyer' && accessible && (
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/60 shadow-[0_24px_60px_-24px_rgba(41,48,39,0.5)] dark:border-white/10">
            <video
              src="/assets/foyer-visuel-16x9.mp4"
              poster="/assets/foyer-visuel-16x9.jpg"
              autoPlay muted loop playsInline
              className="aspect-video w-full object-cover"
            />
            {/* Le médaillon de cuivre sous la niche : le feu s'écoute. */}
            <button
              type="button"
              onClick={basculerAmbiance}
              aria-label={ambianceJoue ? 'Mettre le feu en pause' : 'Écouter le feu crépiter'}
              aria-pressed={ambianceJoue}
              className="group absolute flex h-[11%] w-auto aspect-square items-center justify-center rounded-full"
              style={{ left: '68.2%', top: '72.5%' }}
            >
              <span className={`absolute inset-0 rounded-full transition-all duration-500 ${ambianceJoue ? 'shadow-[0_0_26px_8px_rgba(217,160,91,0.55)]' : 'shadow-[0_0_0_0_rgba(217,160,91,0)] group-hover:shadow-[0_0_20px_5px_rgba(217,160,91,0.4)]'}`} />
              <i className={`fa-solid ${ambianceJoue ? 'fa-pause' : 'fa-play'} relative text-sm text-[#EEE7DB]/0 transition-colors duration-300 group-hover:text-[#EEE7DB]/90 ${ambianceJoue ? 'text-[#EEE7DB]/80' : ''}`} />
            </button>
          </div>
        )}

        {id === 'foyer' && accessible && (
          <section className="mt-10 rounded-[24px] border border-[#BA7B39]/35 bg-gradient-to-br from-[#293027] to-[#1b241f] px-7 py-10 text-white md:px-12 md:py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a05b]">Espace VIP</p>
            <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight md:text-4xl">Bienvenue dans votre espace VIP du Foyer d'Origine</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80">
              Vous avez pris place autour du feu. Douze portes vous attendent, une par mois. Quand une porte s'ouvre,
              elle reçoit quatre dépôts au fil du mois, un par semaine : un texte, un audio ou une vidéo qui vient
              élargir ce que nous regardons. Chaque mois, une méditation guidée se vit en direct, et sa rediffusion
              reste dans le Foyer. Rien à rattraper, rien à terminer. Vous revenez quand vous en avez envie,
              et tout ce qui a été déposé reste là pendant vos douze mois d'accès.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[12px] font-bold uppercase tracking-widest text-[#d9a05b]">
              <span><i className="fa-solid fa-door-open mr-2" />Douze portes, une par mois</span>
              <span><i className="fa-solid fa-broadcast-tower mr-2" />Une méditation en direct par mois</span>
              <span><i className="fa-solid fa-feather mr-2" />Quatre dépôts par porte, un par semaine</span>
              <span><i className="fa-solid fa-fire mr-2" />Le feu et les saisons</span>
              <span><i className="fa-solid fa-users mr-2" />La communauté du Foyer</span>
            </div>
          </section>
        )}

        {id === 'foyer' && accessible && (() => {
          const ouverte = porteDuMois();
          return (
            <div className="mt-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Les douze portes</p>
              <h2 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">
                {ouvert ? `La porte de ${ouverte.mois.toLowerCase()} est ouverte` : 'La première porte s\'ouvrira bientôt'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[#38403a]/60 dark:text-white/60">
                {ouvert
                  ? 'Une seule porte s\'ouvre à la fois, celle du mois en cours. Les autres attendent leur tour.'
                  : 'Votre place est prise. La première porte reste barrée jusqu\'à l\'ouverture, dont la date vous sera annoncée, puis une seule porte s\'ouvre à la fois, celle du mois en cours.'}
              </p>

              <div className="mt-6 grid gap-6 rounded-[24px] border border-[#BA7B39]/40 bg-white/55 p-6 backdrop-blur-md md:grid-cols-[220px_1fr] md:p-8 dark:border-[#BA7B39]/30 dark:bg-[#293027]/55">
                <div className="relative mx-auto w-44 max-w-full md:w-full">
                  <img
                    src={`/foyer/${ouverte.src}.webp`}
                    alt={`La porte de ${ouverte.mois}`}
                    className={`w-full drop-shadow-[0_18px_30px_rgba(41,48,39,0.35)] ${ouvert ? '' : 'opacity-80 saturate-[.7]'}`}
                    loading="lazy"
                  />
                  {!ouvert && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#293027]/75 text-[#d9a05b] shadow-[0_8px_24px_rgba(41,48,39,0.45)]">
                        <i className="fa-solid fa-lock" />
                      </span>
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{ouverte.mois} · {ouverte.mouvement}</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#293027] dark:text-white">{ouverte.theme}</h3>
                  {!ouvert && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-[#BA7B39]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B4A2F] dark:text-[#d9a05b]">
                      <i className="fa-solid fa-lock text-[10px]" />{DEBUT_LABEL}
                    </p>
                  )}
                  <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-[#38403a]/80 dark:text-white/75">« {ouverte.question} »</p>
                  <p className="mt-4 text-sm text-[#38403a]/60 dark:text-white/60">
                    {ouvert
                      ? 'Le rituel du mois se vit ici : gardez la question près de vous, revenez-y chaque matin, et partagez ce qu\'elle remue dans le feed plus bas.'
                      : 'Le premier dépôt arrivera à l\'ouverture. D\'ici là, la question de la porte peut déjà vous accompagner.'}
                  </p>
                </div>
              </div>

              <style>{`
                @keyframes porteBraise { 0%,100% { box-shadow: 0 0 18px 2px rgba(186,123,57,.35); } 50% { box-shadow: 0 0 30px 8px rgba(217,160,91,.55); } }
                .porte-ouverte { animation: porteBraise 3.2s ease-in-out infinite; }
                .porte-ouverte:hover { animation-duration: 1.4s; transform: translateY(-3px); }
                .porte-barree:hover { box-shadow: 0 0 22px 4px rgba(168,178,188,.45); border-color: rgba(168,178,188,.65) !important; transform: translateY(-2px); }
                @media (prefers-reduced-motion: reduce) { .porte-ouverte { animation: none; box-shadow: 0 0 18px 2px rgba(186,123,57,.35); } .porte-ouverte:hover, .porte-barree:hover { transform: none; } }
              `}</style>
              <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {PORTES.map(pt => {
                  const estOuverte = ouvert && pt.n === ouverte.n;
                  return (
                    <div key={pt.n} className="text-center" onMouseEnter={() => jouerSon(estOuverte)}>
                      <div className={`porte-carte relative overflow-hidden rounded-[16px] border p-2 transition-all duration-300 ${estOuverte ? 'porte-ouverte border-[#BA7B39]/60 bg-[#BA7B39]/10' : 'porte-barree border-[#38403a]/10 bg-white/40 dark:border-white/10 dark:bg-white/5'}`}>
                        <img
                          src={`/foyer/${pt.src}.webp`}
                          alt={`Porte de ${pt.mois}`}
                          loading="lazy"
                          className={`mx-auto h-28 w-auto object-contain transition-all ${estOuverte ? '' : 'opacity-85'}`}
                        />
                        {!estOuverte && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#293027]/70 text-[#d9a05b]">
                              <i className="fa-solid fa-lock text-sm" />
                            </span>
                          </span>
                        )}
                      </div>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${estOuverte ? 'text-[#8B4A2F]' : 'text-[#38403a]/40 dark:text-white/40'}`}>{pt.mois}</p>
                      {!ouvert && pt.n === ouverte.n && (
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">{DEBUT_LABEL}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {(() => {
          // Vata a son seuil plein cadre plus haut : ni bannière en carte, ni
          // titre en double par-dessus une image qui le porte déjà.
          if (estVata && accessible) return null;
          if (id === 'foyer' || !accessible || lecons.length === 0) {
            return (
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#293027] md:text-4xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>
                {formation.titre}
              </h1>
            );
          }
          const banniere = BANNIERES_ACHETEES[id];
          const image = banniere?.image || formation.imageUrl;
          if (!image) {
            return (
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#293027] md:text-4xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>
                {formation.titre}
              </h1>
            );
          }
          const duree = banniere?.duree ? (lang === 'FR' ? banniere.duree.fr : banniere.duree.en) : null;
          const prochaineLecon = lecons.find(l => !terminees[l.id]);
          return (
            <div className="relative mt-4 h-64 w-full overflow-hidden rounded-[20px] border border-white/60 shadow-[0_24px_60px_-24px_rgba(41,48,39,0.5)] dark:border-white/10 md:h-80">
              <img src={image} alt="" className="h-full w-full object-cover" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(20,19,17,0.9) 0%, rgba(20,19,17,0.68) 28%, rgba(40,53,47,0.42) 60%, rgba(40,53,47,0.58) 100%)' }}
              />
              <div className="absolute inset-x-0 bottom-0 px-6 pb-5 md:px-10 md:pb-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>
                  {(lang === 'FR' ? 'Formation' : 'Course') + (duree ? ` · ${duree}` : '')}
                </p>
                <h1 className="mt-1.5 max-w-2xl font-serif text-2xl leading-[1.15] text-[#EEE7DB] md:text-4xl" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.5)', letterSpacing: '-0.01em' }}>
                  {formation.titre}
                </h1>
                <p className="mt-3 text-sm text-white/85" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                  {lang === 'FR' ? `${nbTerminees} leçons sur ${lecons.length}` : `${nbTerminees} of ${lecons.length} lessons`}
                  {prochaineLecon && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => ouvrir(prochaineLecon)}
                        className="underline decoration-white/40 underline-offset-2 transition-colors hover:text-[#d9a05b]"
                      >
                        {lang === 'FR' ? `Reprendre : ${prochaineLecon.titre}` : `Resume: ${prochaineLecon.titre}`}
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          );
        })()}

        {live?.formationId === id && (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[20px] border border-red-500/30 bg-[#293027] px-5 py-4 text-white">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-bold uppercase tracking-widest text-[11px] text-red-300">Live en cours</span>
              <span className="ml-2">{live.titre}</span>
              {!accessible && (
                <span className="block text-white/60">{lang === 'FR' ? 'Rejoignez la formation ci-dessous pour entrer dans le live.' : 'Join the course below to enter the live.'}</span>
              )}
            </p>
            {accessible && live.url && (
              <button type="button" onClick={() => setLiveOuvert(true)} className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-400">
                {lang === 'FR' ? 'Rejoindre le live' : 'Join the live'} <i className="fa-solid fa-arrow-right" />
              </button>
            )}
          </div>
        )}
        {liveOuvert && live?.url && (
          <LecteurVideoPleinEcran url={live.url} titre={live.titre} onFermer={() => setLiveOuvert(false)} />
        )}
        {bravo && CHAPITRES[bravo.rang] && (
          <BravoSemaine
            programme={programme!}
            semaine={CHAPITRES[bravo.rang]}
            avant={bravo.avant}
            apres={bravo.apres}
            semainesAchevees={bravo.achevees}
            lang={lang}
            onFermer={() => setBravo(null)}
          />
        )}
        {diplome && <BravoDiplome infos={diplome} lang={lang} onFermer={() => setDiplome(null)} />}

        {accessible && lecons.length > 0 && !estVata && (
          <div className="mt-6 flex flex-col items-start gap-5 rounded-[20px] border border-white/60 bg-white/55 px-6 py-5 backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 dark:border-white/10 dark:bg-white/5">
            {/* L'anneau de progression */}
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="7" className="text-[#38403a]/10 dark:text-white/10" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#BA7B39" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                  className="transition-[stroke-dashoffset] duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-serif text-lg text-[#293027] dark:text-white">{pct} %</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lang === 'FR' ? 'Votre progression' : 'Your progress'}</p>
              <p className="mt-0.5 font-serif text-xl text-[#293027] dark:text-white">{nbTerminees}/{lecons.length} {lang === 'FR' ? 'leçons terminées' : 'lessons complete'}</p>
              {/* Une flamme par leçon terminée */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lecons.map(l => (
                  <i key={l.id} title={l.titre} className={`fa-solid fa-fire text-sm ${terminees[l.id] ? 'text-[#BA7B39]' : 'text-[#38403a]/15 dark:text-white/15'}`} />
                ))}
              </div>
            </div>
            {(() => { const prochaine = lecons.find(l => !terminees[l.id]); return prochaine ? (
              <button
                onClick={() => ouvrir(prochaine)}
                className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#d9a05b] transition-colors"
              >
                <i className="fa-solid fa-play" /> {nbTerminees === 0 ? (lang === 'FR' ? 'Commencer' : 'Start') : (lang === 'FR' ? 'Continuer' : 'Continue')}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-green-700">
                <i className="fa-solid fa-fire" /> {lang === 'FR' ? 'Année complétée' : 'Year complete'}
              </span>
            ); })()}
          </div>
        )}

        {!accessible ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
            {formation.imageUrl && (
              <img src={formation.imageUrl} alt="" className="rounded-[20px] border border-white/60 shadow-[0_18px_50px_-25px_rgba(41,48,39,0.5)] dark:border-white/10" />
            )}
            <div>
              <StickerFormat format={formatDe(id, lecons)} lang={lang} className="mb-4" />
              {formation.description && (
                <p className="whitespace-pre-line text-[#38403a]/80 dark:text-white/80">{formation.description}</p>
              )}
              {suspendu ? (
                <p role="alert" className="mt-6 rounded-[14px] border border-[#8B4A2F]/30 bg-[#8B4A2F]/5 px-5 py-4 text-sm leading-relaxed text-[#38403a] dark:text-white/85">
                  Votre accès est suspendu : un versement n'a pas pu être prélevé. Il se rouvrira dès le paiement. Écrivez-nous à{' '}
                  <a href="mailto:teamksl@inspiratanature.com" className="underline">teamksl@inspiratanature.com</a>.
                </p>
              ) : formation.listeAttente ? (
                <>
                  <p className="mt-6 text-sm text-[#38403a]/70 dark:text-white/70">
                    {lang === 'FR'
                      ? "Cette formation n'est pas encore ouverte. Inscrivez-vous à la liste d'attente pour être avisée dès son ouverture."
                      : "This course isn't open yet. Join the waitlist to be notified as soon as it opens."}
                  </p>
                  <Link
                    to={`/liste-attente?programme=${id}&titre=${encodeURIComponent(formation.titre)}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_8px_22px_-10px_rgba(186,123,57,0.8)] transition-colors hover:bg-[#9c6630]"
                  >
                    <i className="fa-solid fa-hourglass-half" />
                    {lang === 'FR' ? "Rejoindre la liste d'attente" : 'Join the waitlist'}
                  </Link>
                </>
              ) : (
                <>
                  {rabaisAmb && formation.prix ? (
                    <>
                      <p className="mt-6 font-serif text-3xl text-[#293027] dark:text-white">
                        <span className="mr-3 text-xl text-[#38403a]/45 line-through dark:text-white/40">{prixEnVigueur(id, formation.prix)} $</span>
                        {(Math.round(prixEnVigueur(id, formation.prix) * (100 - rabaisAmb.rabaisPct)) / 100).toLocaleString('fr-CA')} $ CA
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#8B4A2F]">
                        {lang === 'FR'
                          ? `Rabais de ${rabaisAmb.rabaisPct} % offert par ${rabaisAmb.nom || 'votre ambassadrice'}`
                          : `${rabaisAmb.rabaisPct}% off, offered by ${rabaisAmb.nom || 'your ambassador'}`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-6 font-serif text-3xl text-[#293027] dark:text-white">{formation.prix == null ? formation.prix : prixEnVigueur(id, formation.prix)} $ CA</p>
                  )}
                  <button
                    onClick={acheter}
                    disabled={paiement}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_8px_22px_-10px_rgba(186,123,57,0.8)] transition-colors hover:bg-[#9c6630] disabled:opacity-50"
                  >
                    <i className="fa-solid fa-lock-open" />
                    {paiement ? (lang === 'FR' ? 'Redirection…' : 'Redirecting…') : (lang === 'FR' ? 'Rejoindre la formation' : 'Join the course')}
                  </button>
                  <p className="mt-3 text-xs text-[#38403a]/50 dark:text-white/50">
                    {lang === 'FR' ? 'Paiement sécurisé par Stripe. La formation apparaît dans votre espace dès le paiement.' : 'Secure payment by Stripe. The course appears in your space right after payment.'}
                  </p>
                </>
              )}
              {isAdmin && (
                <a href={cheminCours(id, '?apercu=1')} className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]/80 hover:text-[#8B4A2F]">
                  <i className="fa-solid fa-eye" /> Aperçu administratrice, sans acheter
                </a>
              )}
              {lecons.length > 0 && !suspendu && (
                <div className="mt-8">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lecons.length} {lang === 'FR' ? 'leçons' : 'lessons'}</p>
                  <ul className="mt-3 space-y-2">
                    {lecons.map(l => (
                      <li key={l.id} className="flex items-center gap-3 text-sm text-[#38403a]/70 dark:text-white/70">
                        {l.type === 'audio' && vignetteAudio(l, id === FORMATION_VATA ? undefined : formation || undefined) || (id === FORMATION_VATA ? chapitreDeModule(l.moduleNom)?.vignette : undefined) ? (
                          (id !== FORMATION_VATA && !vignetteDeLecon(l) ? <VignetteComposee c={compositionCours(l, lang === 'FR')} taille="pastille" cote="h-9 w-9" /> : (
                            <img src={vignetteAudio(l, id === FORMATION_VATA ? undefined : formation || undefined) || (id === FORMATION_VATA ? chapitreDeModule(l.moduleNom)?.vignette : undefined)} alt="" className="h-9 w-9 shrink-0 rounded-[9px] object-cover border border-[#BA7B39]/25" />
                          ))
                        ) : (
                          <i className={`fa-solid ${ICONES[l.type]} w-4 text-[#8B4A2F]/70`} />
                        )}
                        {l.titre}
                        {l.duree && <span className="ml-auto text-xs text-[#38403a]/40 dark:text-white/40">{l.duree}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}
            </div>
          </div>
        ) : (
          <div
            ref={chapitre}
            className={`mt-8 grid gap-6 ${estVata && accessible ? 'lg:grid-cols-[320px_1fr] xl:grid-cols-[300px_minmax(0,1fr)_280px]' : 'lg:grid-cols-[320px_1fr]'} ${
              estVata ? 'mx-auto max-w-[1720px] scroll-mt-24 px-5 pt-6 md:px-10' : ''
            }`}
          >
            {/* La liste des leçons */}
            {/* La liste colle en haut et défile seule : la page ne s'allonge plus
                à cause d'elle, donc plus de vide à droite quand on descend. */}
            <aside className="min-w-0 rounded-[20px] border border-white/60 bg-white/55 p-3 backdrop-blur-md lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto dark:border-white/10 dark:bg-[#293027]/55">
              {lecons.length === 0 && (
                <p className="p-3 text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Les leçons arrivent bientôt.' : 'Lessons coming soon.'}</p>
              )}
              {/* Groupé par module, dans l'ordre du cours */}
              {(() => {
                const groupes: { nom: string; items: Lecon[] }[] = [];
                for (const l of lecons) {
                  const nom = l.moduleNom || '';
                  const g = groupes[groupes.length - 1];
                  if (g && g.nom === nom) g.items.push(l);
                  else groupes.push({ nom, items: [l] });
                }
                return groupes.map((g, gi) => {
                  // Chaque module se replie; celui de la leçon courante reste ouvert.
                  const contientCourante = !!courante && g.items.some(l => l.id === courante.id);
                  const ouvert = g.nom ? (replies[g.nom] === undefined ? contientCourante || gi === 0 : !replies[g.nom]) : true;
                  // Sur Vata, chaque semaine devient sa propre boîte, dans sa
                  // teinte, et la boîte se marque achevée quand toutes ses
                  // leçons sont faites (Alex, 10 septembre 2026).
                  const sem = estVata ? chapitreDeModule(g.nom) : undefined;
                  const faites = g.items.filter(l => terminees[l.id]).length;
                  const achevee = g.items.length > 0 && faites >= g.items.length;
                  return (
                  <div
                    key={gi}
                    className={`mb-2 ${sem ? 'overflow-hidden rounded-[16px] border transition-colors duration-500' : ''}`}
                    style={sem ? {
                      borderColor: achevee ? sem.couleur.vive : `${sem.couleur.vive}44`,
                      background: achevee ? `${sem.couleur.vive}14` : `${sem.couleur.vive}09`,
                    } : undefined}
                  >
                    {g.nom && (
                      <button
                        type="button"
                        onClick={() => setReplies(r => ({ ...r, [g.nom]: ouvert }))}
                        aria-expanded={ouvert}
                        className={`flex w-full items-center justify-between gap-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] hover:bg-white/60 dark:hover:bg-white/10 ${
                          sem ? 'px-3.5 py-3' : 'rounded-[12px] px-3 pt-3 pb-1.5 text-[#8B4A2F]'
                        }`}
                        style={sem ? { color: sem.couleur.encre } : undefined}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {sem && (
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-serif text-[11px] normal-case tracking-normal text-[#F7F3EA]"
                              style={{ background: achevee ? sem.couleur.vive : `${sem.couleur.vive}bb` }}
                            >
                              {achevee ? <i className="fa-solid fa-check text-[9px]" /> : etatsSemaines[sem.rang]?.verrouillee ? <i className="fa-solid fa-lock text-[8px]" /> : sem.rang}
                            </span>
                          )}
                          {sem ? (
                            <span className="min-w-0">
                              <span className="block text-[9px] opacity-70">{(sem as { etiquette?: unknown }).etiquette ? etiquetteSemaine(sem as never, lang === 'FR') : sem.rang === 0 ? 'Introduction' : `${lang === 'FR' ? programme!.prefixe.fr : programme!.prefixe.en} ${sem.rang}`}</span>
                              <span className="block leading-snug">{lang === 'FR' ? sem.sens.fr : sem.sens.en}</span>
                            </span>
                          ) : <span className="min-w-0 truncate">{nomModule(g.nom)}</span>}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[#38403a]/50 dark:text-white/50">
                          <span className="normal-case tracking-normal">{faites}/{g.items.length}</span>
                          <i className={`fa-solid fa-chevron-down transition-transform ${ouvert ? '' : '-rotate-90'}`} aria-hidden="true" />
                        </span>
                      </button>
                    )}
                    {sem && (
                      <span className="mx-3.5 mb-1 block h-[3px] overflow-hidden rounded-full bg-[#38403a]/10 dark:bg-white/10">
                        <span
                          className="block h-full rounded-full transition-[width] duration-1000 ease-out"
                          style={{ width: `${g.items.length ? Math.round((faites / g.items.length) * 100) : 0}%`, background: sem.couleur.vive }}
                        />
                      </span>
                    )}
                    {ouvert && (
                    <div className={sem ? 'px-1.5 pb-1.5' : ''}>
                    {g.items.map(l => {
                      const verrou = verrouillee(l);
                      return (
                      <button
                        key={l.id}
                        onClick={() => ouvrir(l)}
                        disabled={verrou}
                        title={verrou ? (nonAchete(l) ? (lang === 'FR' ? 'Cet épisode ne vous appartient pas encore' : 'This episode is not yours yet') : l.mois ? (lang === 'FR' ? `S'ouvre avec la porte de ${l.mois}` : `Opens with the ${l.mois} door`) : ouvertureSemaine(rangModuleVata(l.moduleNom)) ? (lang === 'FR' ? `S'ouvre le ${ouvertureSemaine(rangModuleVata(l.moduleNom))}` : `Opens on ${ouvertureSemaine(rangModuleVata(l.moduleNom))}`) : (lang === 'FR' ? 'Cette semaine s\'ouvrira bientôt' : 'This week opens soon')) : undefined}
                        className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition-colors ${
                          courante?.id === l.id
                            ? (sem ? 'text-[#F7F3EA]' : 'bg-[#BA7B39] text-[#293027]')
                            : verrou
                              ? 'cursor-not-allowed text-[#38403a]/40 dark:text-white/35'
                              : 'text-[#38403a]/80 hover:bg-white/70 dark:text-white/80 dark:hover:bg-white/10'
                        }`}
                        style={sem && courante?.id === l.id ? { background: sem.couleur.encre } : undefined}
                      >
                        {l.type === 'audio' && !verrou && !terminees[l.id] && vignetteAudio(l, id === FORMATION_VATA ? undefined : formation || undefined) || (id === FORMATION_VATA ? chapitreDeModule(l.moduleNom)?.vignette : undefined) ? (
                          (id !== FORMATION_VATA && !vignetteDeLecon(l) ? <VignetteComposee c={compositionCours(l, lang === 'FR')} taille="pastille" cote="h-9 w-9" /> : (
                            <img src={vignetteAudio(l, id === FORMATION_VATA ? undefined : formation || undefined) || (id === FORMATION_VATA ? chapitreDeModule(l.moduleNom)?.vignette : undefined)} alt="" className={`h-9 w-9 shrink-0 rounded-[9px] object-cover border border-[#BA7B39]/25 ${courante?.id === l.id ? 'ring-2 ring-[#BA7B39]' : ''}`} />
                          ))
                        ) : (
                          <i className={`fa-solid ${verrou ? 'fa-lock' : terminees[l.id] ? 'fa-circle-check text-green-700' : ICONES[l.type] || 'fa-file'} w-4 ${courante?.id === l.id ? '' : verrou ? 'opacity-50' : 'text-[#8B4A2F]/70'}`} />
                        )}
                        <span className="min-w-0 flex-1 truncate">{l.titre}</span>
                        {verrou ? <span className="shrink-0 text-[10px] uppercase tracking-wider opacity-60">{l.mois || (ouvertureSemaine(rangModuleVata(l.moduleNom)) ? (lang === 'FR' ? `S'ouvre le ${ouvertureSemaine(rangModuleVata(l.moduleNom))}` : `Opens ${ouvertureSemaine(rangModuleVata(l.moduleNom))}`) : '')}</span>
                                : l.duree && <span className="text-[11px] opacity-60">{l.duree}</span>}
                      </button>
                      );
                    })}
                    </div>
                    )}
                  </div>
                  );
                });
              })()}
            </aside>

            {/* Le contenu de la leçon */}
            <section className="min-w-0 rounded-[20px] border border-white/60 bg-white/55 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
              {!courante ? (
                <div className="py-16 text-center text-[#38403a]/60 dark:text-white/60">
                  <i className="fa-solid fa-circle-play mb-4 block text-4xl text-[#BA7B39]" />
                  <p className="font-serif text-xl text-[#293027] dark:text-white">
                    {lang === 'FR' ? 'Choisissez une leçon pour commencer' : 'Pick a lesson to begin'}
                  </p>
                </div>
              ) : (
                <>
                  {(() => {
                    // Sur Vata, la leçon se situe dans sa semaine et son sens
                    // plutôt que dans un compte « 1 de 50 » qui ne dit rien.
                    const s = estVata ? chapitreDeModule(courante.moduleNom) : undefined;
                    if (!s) {
                      return (
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
                          {lang === 'FR' ? 'Leçon' : 'Lesson'} {lecons.findIndex(l => l.id === courante.id) + 1} {lang === 'FR' ? 'de' : 'of'} {lecons.length}
                        </p>
                      );
                    }
                    return (
                      <div className="-mx-6 -mt-6 mb-6 overflow-hidden rounded-t-[20px]">
                        <div className="relative h-36 w-full md:h-44">
                          {s.bandeau
                            ? <img src={s.bandeau} alt="" className="h-full w-full object-cover" />
                            : <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${s.couleur.vive} 0%, ${s.couleur.encre} 100%)` }} />}
                          <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,20,17,0.92) 6%, rgba(15,20,17,0.34) 60%, transparent 100%)' }} />
                          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-6 pb-4">
                            <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#EEE7DB]/80">
                              {libelleSemaine(s)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <h2 className="mt-1 font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.15] text-[#293027] dark:text-white">{courante.titre}</h2>
                  {/* Les documents de la leçon : à droite sur ordinateur, sous le titre sur téléphone (Krystine, 8 oct. 2026). */}
                  {(() => {
                    const docs = (courante.docs || []).map((d, i) => ({
                      cle: d.chemin,
                      nom: nomDocumentLisible(d.nom, courante.titre, courante.docs!.length),
                      pdf: /\.pdf$/i.test(d.nom),
                      fichier: /\.pdf$/i.test(d.nom) ? undefined : d.nom,
                      obtenirUrl: () => urlDeDocumentLecon(id, courante.id, i),
                    }));
                    // Une leçon dont les documents ne sont pas des PDF (une chanson à
                    // télécharger) garde toute sa largeur : le bouton passe sous le lecteur.
                    const aCote = docs.some(d => d.pdf);
                    const panneau = (className: string) => (
                          <DocumentsLecon
                            documents={docs}
                            lang={lang}
                            palette={PALETTE_COURS}
                            className={className}
                            onVoir={async d => {
                              try {
                                const url = await d.obtenirUrl();
                                if (d.pdf) setApercu({ nom: d.nom, url });
                                else window.open(url, '_blank', 'noopener');
                              }
                              catch { setErreur(lang === 'FR' ? 'Document indisponible pour le moment.' : 'Document unavailable right now.'); }
                            }}
                          />
                    );
                    return (
                      <div className={aCote ? 'mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start xl:grid-cols-[minmax(0,1fr)_290px]' : ''}>
                        {aCote && panneau('lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1')}
                        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                        <div className="mt-5">
                          {chargeLecon ? (
                            <p className="text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>
                          ) : erreur ? (
                            <p className="text-sm text-red-600">{erreur}</p>
                          ) : urlCourante ? (
                            courante.type === 'video' ? (
                              <VideoLecon
                                key={courante.id}
                                url={urlCourante}
                                affiche={vignetteDeLecon(courante) || chapitreDeModule(courante.moduleNom)?.bandeau || chapitreDeModule(courante.moduleNom)?.image || formation?.imageUrl || (id === FORMATION_VATA ? '/vata/couverture.webp' : '/assets/foyer-visuel-16x9.jpg')}
                                afficheNode={id !== FORMATION_VATA && !(vignetteDeLecon(courante) || chapitreDeModule(courante.moduleNom)?.bandeau || chapitreDeModule(courante.moduleNom)?.image)
                                  ? <VignetteComposee c={compositionCours(courante, lang === 'FR')} taille="banniere" /> : undefined}
                                lang={lang}
                                className="w-full rounded-[15px] bg-black"
                              />
                            ) : courante.type === 'audio' ? (
                              <LecteurAudioCours
                                key={courante.id}
                                url={urlCourante}
                                titre={courante.titre}
                                pochette={vignetteAudio(courante, id === FORMATION_VATA ? undefined : formation || undefined) || chapitreDeModule(courante.moduleNom)?.vignette}
                                soustitre={(() => {
                                  const s = chapitreDeModule(courante.moduleNom);
                                  return s ? libelleSemaine(s) : nomModule(courante.moduleNom);
                                })()}
                                lang={lang}
                                onFin={() => { if (!terminees[courante.id]) void basculerTerminee(courante); }}
                                onSuivante={prochaineOuverte ? suivante : undefined}
                                onPrecedente={precedenteOuverte ? precedente : undefined}
                              />
                            ) : (
                              <a
                                href={urlCourante} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]"
                              >
                                <i className={`fa-solid ${ICONES[courante.type]}`} />
                                {lang === 'FR' ? 'Ouvrir le document' : 'Open the document'}
                              </a>
                            )
                          ) : null}
                        </div>
                        {!aCote && docs.length > 0 && panneau('mt-5')}
                        <p className="mt-3 text-[12px] text-[#38403a]/55 dark:text-white/50">
                          {lang === 'FR' ? 'Un problème technique ? Écrivez-nous à ' : 'A technical issue? Write to us at '}
                          <a href="mailto:teamksl@inspiratanature.com" className="underline underline-offset-2 hover:text-[#8B4A2F]">teamksl@inspiratanature.com</a>
                        </p>
                        {/* Sur Vata, le texte se justifie sous le lecteur (Krystine n'aime pas
                            le drapeau à gauche); la coupure des mots évite les rivières de blanc. */}
                        {courante.texte?.trim() && (
                          <TexteLecon
                            texte={sansRepetitions(
                              nettoyerKajabi(courante.texte, courante.titre, formation?.titre),
                              lecons.slice(0, Math.max(0, lecons.findIndex(l => l.id === courante.id))).filter(l => l.moduleNom === courante.moduleNom && l.texte?.trim()).map(l => nettoyerKajabi(l.texte!, l.titre, formation?.titre)),
                            )}
                            className={`${courante.chemin ? 'mt-6' : 'mt-2'} max-w-[68ch] text-[#3a2f23] dark:text-white/80 ${estVata ? 'text-justify hyphens-auto [&_h3]:text-left [&_h4]:text-left' : ''}`}
                          />
                        )}
                        </div>
                      </div>
                    );
                  })()}

                  {!formation?.questionsFermees && !estVata && <QuestionsLecon formationId={id} lecon={courante} />}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => basculerTerminee(courante)}
                      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                        terminees[courante.id]
                          ? 'border-green-600 bg-green-600/10 text-green-700'
                          : 'border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]'
                      }`}
                    >
                      <i className="fa-solid fa-check" />
                      {terminees[courante.id]
                        ? (lang === 'FR' ? 'Leçon terminée' : 'Lesson complete')
                        : (lang === 'FR' ? 'Marquer comme terminée' : 'Mark as complete')}
                    </button>
                    {precedenteOuverte && (
                      <button
                        onClick={precedente}
                        className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]"
                      >
                        <i className="fa-solid fa-arrow-left" />
                        {lang === 'FR' ? 'Leçon précédente' : 'Previous lesson'}
                      </button>
                    )}
                    {prochaineOuverte ? (
                      <button
                        onClick={suivante}
                        className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]"
                      >
                        {lang === 'FR' ? 'Leçon suivante' : 'Next lesson'}
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    ) : suiteFermee && (
                      <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
                        <i className="fa-solid fa-lock text-[10px]" />{suiteFermee}
                      </p>
                    )}
                  </div>
                  {/* Au dernier module de Vata (« Clore la saison »), l'évaluation
                      de fin de saison (/evaluation/vata, 3 oct. 2026). */}
                  {id === FORMATION_VATA && chapitreDeModule(courante.moduleNom)?.rang === 8 && (
                    <div className="mt-8 border-t border-[#BA7B39]/25 pt-6">
                      <p className="max-w-[56ch] text-sm leading-relaxed text-[#3a2f23] dark:text-white/80">
                        {lang === 'FR'
                          ? 'Vous arrivez au bout des sept semaines. Dites-nous ce que vous en gardez : vos mots nous aident à préparer la suite.'
                          : 'You have reached the end of the seven weeks. Tell us what you are keeping from them.'}
                      </p>
                      <Link
                        to="/evaluation/vata"
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#293027] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#EEE7DB] hover:bg-[#1c1712]"
                      >
                        {lang === 'FR' ? 'Partager votre expérience' : 'Share your experience'}
                        <i className="fa-solid fa-arrow-right" />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* À télécharger (Krystine, 30 sept. 2026) : seulement les documents
                de la semaine de la leçon ouverte, chacun avec l'aperçu de sa
                première page (public/vata/documents/<leçon>.jpg). À droite sur
                grand écran, sous la leçon ailleurs. Un clic ouvre l'aperçu
                complet, qui porte son bouton « Ouvrir ». */}
            {estVata && accessible && (() => {
              const rang = courante ? rangDeModule(courante.moduleNom) : 0;
              // Les leçons PDF de la semaine, puis les documents joints aux autres
              // leçons (le journal de bord vit sous une leçon audio, 5 oct. 2026).
              const semaine = lecons.filter(l => !verrouillee(l) && rangDeModule(l.moduleNom) === rang);
              const docs: Array<{ cle: string; titre: string; image: string; url: () => Promise<string> }> = [];
              semaine.forEach(l => {
                if (l.type === 'pdf') docs.push({ cle: l.id, titre: l.titre, image: `/vata/documents/${l.id}.jpg`, url: () => urlDeLecon(id, l.id) });
                else (l.docs || []).forEach((d, i) => {
                  if (/\.pdf$/i.test(d.nom)) docs.push({ cle: `${l.id}-${i}`, titre: nomDocumentLisible(d.nom, l.titre, l.docs!.length), image: `/vata/documents/${l.id}-${i}.jpg`, url: () => urlDeDocumentLecon(id, l.id, i) });
                });
              });
              const c = programme!.chapitres[rang];
              if (!docs.length || !c) return null;
              return (
                <aside className="min-w-0 self-start rounded-[20px] border border-white/60 bg-white/55 p-4 backdrop-blur-md lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto dark:border-white/10 dark:bg-[#293027]/55">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8B4A2F] dark:text-[#d9a05b]">
                    <i className="fa-solid fa-file-arrow-down mr-2" />{lang === 'FR' ? 'À télécharger' : 'Downloads'}
                  </p>
                  <p className="mt-1 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#38403a]/55 dark:text-white/55">{libelleSemaine(c)}</p>
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2">
                    {docs.map(l => (
                      <li key={l.cle}>
                        <button
                          type="button"
                          onClick={async () => {
                            try { setApercu({ nom: l.titre, url: await l.url() }); }
                            catch { setErreur(lang === 'FR' ? 'Document indisponible pour le moment.' : 'Document unavailable right now.'); }
                          }}
                          className="group block w-full text-left"
                        >
                          <span className="block overflow-hidden rounded-[10px] border border-[#BA7B39]/25 bg-[#efe6d7] shadow-[0_10px_24px_-16px_rgba(41,48,39,0.6)]">
                            <img
                              src={l.image} alt="" loading="lazy"
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                              className="aspect-[368/520] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          </span>
                          <span className="mt-1.5 block text-[12px] leading-snug text-[#38403a]/85 group-hover:text-[#8B4A2F] dark:text-white/80">{l.titre}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>
              );
            })()}

            {/* Le PDF s'ouvre en grand dans la page, par-dessus (Krystine, 8 oct. 2026). */}
            <FenetreDocument doc={apercuPdf} lang={lang} onFermer={() => setApercu(null)} />
          </div>
        )}

      </div>
    </div>
  );

  // L'entrée du Foyer d'Origine porte la coquille sociale : les onglets en
  // haut (Le programme allumé) et la colonne de gauche se voient dès le
  // premier clic, sans rien chercher (Alex, 7 septembre 2026). Les autres
  // formations gardent leur page telle quelle.
  if (id === 'foyer' && accessible) {
    return <CadreFoyer onglet="programme" large>{page}</CadreFoyer>;
  }
  return page;
};


// ─── Les questions sous une leçon ───────────────────────────────────────────
const QuestionsLecon: React.FC<{ formationId: string; lecon: Lecon }> = ({ formationId, lecon }) => {
  const { user, member, isAdmin } = useAuth();
  const { lang } = useUI();
  const [questions, setQuestions] = useState<QuestionLecon[]>([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  useEffect(() => suivreQuestions(formationId, lecon.id, setQuestions), [formationId, lecon.id]);

  const poser = async () => {
    if (!user || !texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      await poserQuestion(formationId, lecon.id, { uid: user.uid, nom: (member?.displayName || user.displayName || '').trim() || 'Un membre', texte });
      setTexte('');
    } finally { setEnvoi(false); }
  };

  return (
    <div className="mt-8 border-t border-[#38403a]/10 pt-6 dark:border-white/10">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lang === 'FR' ? 'Vos questions' : 'Your questions'}</p>
      {user && (
        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={texte}
            onChange={e => setTexte(e.target.value.slice(0, 2000))}
            rows={2}
            placeholder={lang === 'FR' ? 'Posez votre question sur cette leçon…' : 'Ask your question about this lesson…'}
            className="min-h-[52px] flex-1 resize-y rounded-2xl border border-[#38403a]/10 bg-white/70 px-4 py-3 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={poser}
            disabled={envoi || !texte.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#BA7B39] text-[#293027] disabled:opacity-40"
            aria-label={lang === 'FR' ? 'Envoyer la question' : 'Send the question'}
          >
            <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-sm`} />
          </button>
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {questions.map(q => (
          <li key={q.id} className="rounded-2xl border border-[#38403a]/8 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[#293027] dark:text-white">{q.nom}</p>
              <span className="shrink-0 text-[11px] text-[#38403a]/45 dark:text-white/40">{q.creeLe?.toDate().toLocaleDateString('fr-CA')}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#38403a]/85 dark:text-white/80">{q.texte}</p>
            {q.reponse ? (
              <div className="mt-3 rounded-xl border-l-2 border-[#BA7B39] bg-[#BA7B39]/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">Krystine</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#293027] dark:text-white/90">{q.reponse}</p>
              </div>
            ) : isAdmin && (
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={reponses[q.id] || ''}
                  onChange={e => setReponses(r => ({ ...r, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Votre réponse…"
                  className="flex-1 resize-y rounded-xl border border-[#38403a]/10 bg-white px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/10 dark:text-white"
                />
                <button
                  onClick={async () => { const r = (reponses[q.id] || '').trim(); if (r) { await repondreQuestion(formationId, lecon.id, q.id, r); setReponses(x => ({ ...x, [q.id]: '' })); } }}
                  className="rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#d9a05b]"
                >
                  Répondre
                </button>
              </div>
            )}
          </li>
        ))}
        {questions.length === 0 && (
          <li className="text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Aucune question pour l\'instant. La vôtre ouvrira le bal.' : 'No questions yet. Yours will open the floor.'}</li>
        )}
      </ul>
    </div>
  );
};

export default CoursDetailPage;
