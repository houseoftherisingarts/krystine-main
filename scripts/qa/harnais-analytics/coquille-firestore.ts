// L'habillage du back-office écoute les conversations privées : ici, aucune
// conversation n'est écoutée. Le reste du module passe tel quel, parce que le
// pré-chargement de Vite partage la résolution entre fichiers voisins.
export * from '../../../src/firebase/firestore';
export function subscribeToConversations(_rappel: unknown): () => void { return () => {}; }
