// L'état du plan du mois : un seul document, planAutomne/mois-2026-10 (la
// même porte de règles que le plan d'automne), qui porte une entrée par étape
// cochée et la fiche de chacun des trois livres déposés. Les textes du plan
// vivent dans src/lib/planMois.ts et ne bougent pas; ici on ne garde que ce
// que Krystine décide et ce qu'elle dépose.
import app, { db } from '../firebase';
import { deleteField, doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { deleteObject, getStorage, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import type { Qui } from '../lib/planMois';

export interface EtapePlanMois {
  fait: boolean;
  faitLe?: Timestamp;
  /** Une note libre, en une ligne, posée par Krystine ou par Alex. */
  note?: string;
}

/** La fiche d'un livre déposé : ce que la page montre sous le bouton. */
export interface LivreDepose {
  nom: string;
  taille: number;
  chemin: string;
  deposeLe?: Timestamp;
}

export type NumeroLivre = 1 | 2 | 3;

/** Une étape que Krystine (ou Alex) ajoute elle-même à un chantier, depuis l'admin. */
export interface AjoutPlanMois {
  texte: string;
  /** L'identifiant du chantier (c1, c2, c3) sous lequel l'étape s'affiche. */
  chantier: string;
  qui: Qui;
  creeLe?: Timestamp;
}

export interface EtatPlanMois {
  items: Record<string, EtapePlanMois>;
  livres: Partial<Record<`livre-${NumeroLivre}`, LivreDepose>>;
  ajouts: Record<string, AjoutPlanMois>;
}

export const ID_PLAN_MOIS = 'mois-2026-10';

// Les livres vivent dans livres-sources/, un dossier que les règles de
// Storage réservent à l'administration en lecture comme en écriture : ce sont
// des livres entiers, jamais publics. Le nom du fichier est fixe pour qu'Alex
// les retrouve depuis le code sans chercher (scripts/livres/telecharger.sh).
export const DOSSIER_LIVRES = 'livres-sources';
export const cheminLivre = (n: NumeroLivre): string => `${DOSSIER_LIVRES}/livre-${n}.pdf`;
export const TAILLE_MAX_LIVRE = 2 * 1024 * 1024 * 1024;  // 2 Go : un livre d'éditeur en PDF dépasse vite 300 Mo

const refPlan = () => doc(db, 'planAutomne', ID_PLAN_MOIS);
const store = () => {
  if (!app) throw new Error('[PlanMois] Firebase not configured');
  return getStorage(app);
};

/** Écoute le plan en temps réel. Rend une fonction pour arrêter d'écouter. */
export const ecouterPlanMois = (
  onEtat: (etat: EtatPlanMois) => void,
  onRefus: (message: string) => void,
): (() => void) => onSnapshot(
  refPlan(),
  snap => {
    const d = snap.data() ?? {};
    onEtat({
      items: (d.items as EtatPlanMois['items'] | undefined) ?? {},
      livres: (d.livres as EtatPlanMois['livres'] | undefined) ?? {},
      ajouts: (d.ajouts as EtatPlanMois['ajouts'] | undefined) ?? {},
    });
  },
  err => onRefus(err.code === 'permission-denied'
    ? 'Les règles du plan ne sont pas encore en ligne.'
    : 'Le plan ne s\'est pas chargé.'),
);

/** Coche ou décoche une étape, en datant le geste (la date part au décochage). */
export const cocherEtape = (id: string, fait: boolean): Promise<void> =>
  setDoc(
    refPlan(),
    { items: { [id]: { fait, faitLe: fait ? serverTimestamp() : deleteField() } } },
    { merge: true },
  );

/** Pose ou efface la note d'une étape, sans toucher au reste. */
export const noterEtape = (id: string, note: string): Promise<void> =>
  setDoc(refPlan(), { items: { [id]: { note: note ? note : deleteField() } } }, { merge: true });

/** Ajoute une étape à un chantier, dans les mots de la personne. L'identifiant ne se réutilise jamais. */
export const ajouterEtape = (chantier: string, texte: string, qui: Qui = 'Krystine'): Promise<string> => {
  const id = `ajout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return setDoc(refPlan(), { ajouts: { [id]: { texte, chantier, qui, creeLe: serverTimestamp() } } }, { merge: true }).then(() => id);
};

/** Retire une étape ajoutée, avec sa case et sa note. */
export const retirerEtape = (id: string): Promise<void> =>
  setDoc(refPlan(), { ajouts: { [id]: deleteField() }, items: { [id]: deleteField() } }, { merge: true });

interface EnvoiLivre { task: UploadTask; done: Promise<LivreDepose> }

/**
 * Dépose un livre à sa place fixe. L'appelante suit `task` pour la barre de
 * progression; `done` se résout quand le fichier est arrivé ET que sa fiche
 * est écrite dans le plan. Un livre déjà là est remplacé, sans autre geste.
 */
export function televerserLivre(n: NumeroLivre, file: File, onProgress: (pct: number) => void): EnvoiLivre {
  const chemin = cheminLivre(n);
  const task = uploadBytesResumable(ref(store(), chemin), file, {
    contentType: 'application/pdf',
    customMetadata: { nomOriginal: file.name },
  });
  const done = new Promise<LivreDepose>((resolve, reject) => {
    task.on('state_changed',
      s => onProgress((s.bytesTransferred / s.totalBytes) * 100),
      reject,
      async () => {
        try {
          const fiche: LivreDepose = { nom: file.name, taille: file.size, chemin };
          await setDoc(refPlan(), { livres: { [`livre-${n}`]: { ...fiche, deposeLe: serverTimestamp() } } }, { merge: true });
          resolve(fiche);
        } catch (e) { reject(e); }
      });
  });
  return { task, done };
}

/** Retire un livre : le fichier d'abord, la fiche ensuite. */
export async function retirerLivre(n: NumeroLivre): Promise<void> {
  try { await deleteObject(ref(store(), cheminLivre(n))); } catch { /* déjà parti */ }
  await setDoc(refPlan(), { livres: { [`livre-${n}`]: deleteField() } }, { merge: true });
}
