// L'aperçu de la boutique du site (4 oct. 2026). Tant que le renvoi vers
// inspiratanature.com est allumé (settings/boutique.redirectEnabled), la
// boutique du site ne se voit qu'avec ?apercu=1. Le drapeau se garde pour la
// visite en cours, pour que les liens vers une collection ou une page produit
// restent dans l'aperçu au lieu de rebondir vers l'ancienne boutique.

const CLE = 'ksl.boutique.apercu';

export function modeApercu(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('apercu') === '1') {
      sessionStorage.setItem(CLE, '1');
      return true;
    }
    return sessionStorage.getItem(CLE) === '1';
  } catch {
    return new URLSearchParams(window.location.search).get('apercu') === '1';
  }
}

/** L'adresse d'un produit sur la boutique historique, en français et en dollars canadiens. */
export const urlProduitHistorique = (handle: string) =>
  `https://www.inspiratanature.com/products/${encodeURIComponent(handle)}?country=CA&locale=fr`;
