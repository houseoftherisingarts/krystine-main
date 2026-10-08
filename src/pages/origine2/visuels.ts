import type { Lecon } from '../../firebase/formations';
import { genreDeLecon, libelleDeLecon, type Composition } from '../../components/cours/VignetteComposee';
import { ORIGINE, pilierDeSemaine, semaineDeLecon, titreDeLecon } from './piliers';

// Les vrais visuels d'EXPÉRIENCE ORIGINE (cohorte fondatrice), ceux que
// Krystine avait faits pour l'ancienne plateforme (dossier « EXPÉRIENCE
// ORIGINE » de son bureau), retrouvés le 8 octobre 2026. Une leçon qui n'en a
// pas reçoit une vignette composée selon son genre. Une image déposée avec
// « Changer la vignette » passe toujours avant tout cela.

const V = '/origine2/lecons';

/** La bannière commune des leçons-documents (Krystine, 8 oct. 2026 : un seul visuel pour tous les PDF). */
export const BANNIERE_DOCUMENTS = `${V}/documents.webp`;

const PILIER_VISUEL: Record<number, string> = { 1: `${V}/lire.webp`, 2: `${V}/trier.webp`, 3: `${V}/ancrer.webp` };

const FORMATIONS_AVEC_VISUELS = new Set(['kajabi-2149348838']);

/** Le vrai visuel d'une leçon des fondatrices, s'il existe. */
export function visuelDOrigine(formationId: string, l: Lecon, lecons: Lecon[]): string | undefined {
  if (!FORMATIONS_AVEC_VISUELS.has(formationId)) return undefined;
  const g = genreDeLecon(l);
  const t = l.titre || '';
  if (g === 'meditation') return `${V}/meditations.webp`;
  if (g === 'questions') return `${V}/questions.webp`;
  if (g === 'document') return BANNIERE_DOCUMENTS;
  if (/musique [àa] d[ée]couvrir/i.test(t)) return `${V}/musique.webp`;
  if (/r[ée]flexions? d.origine/i.test(l.moduleNom || '') || /approfondissement.*r[ée]flexion/i.test(t)) return `${V}/reflexions.webp`;
  if (/^cl[ée]\s*1\b/i.test(t)) return `${V}/cle-1.webp`;
  const n = semaineDeLecon(l);
  if (n === 4 && /int[ée]gration/i.test(t)) return `${V}/integration.webp`;
  // La leçon qui ouvre chaque semaine porte le visuel de son pilier (Lire, Trier, Ancrer).
  const pilier = n >= 1 ? pilierDeSemaine(n) : undefined;
  if (pilier && (g === 'video' || g === 'audio')) {
    const ouvre = lecons.find(x => semaineDeLecon(x) === n && ['video', 'audio'].includes(genreDeLecon(x)));
    if (ouvre?.id === l.id) return PILIER_VISUEL[pilier.rang];
  }
  return undefined;
}

/** La vignette composée d'une leçon d'Origine : le fond de son pilier, sinon la crème. */
export function compositionOrigine(l: Lecon, fr = true): Composition {
  const n = semaineDeLecon(l);
  const p = n >= 1 ? pilierDeSemaine(n) : undefined;
  return {
    titre: titreDeLecon(l.titre),
    libelle: libelleDeLecon(l, n, fr),
    genre: genreDeLecon(l),
    fond: p?.fond || ORIGINE.cremeSombre,
    encre: p?.encre || ORIGINE.encre,
    accent: p ? p.liseret : '#7d6330',
  };
}
