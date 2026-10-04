// Les avis Okendo d'un produit (4 oct. 2026). Okendo expose une lecture
// publique (sans clé, CORS ouvert) par identifiant d'abonné : c'est la même
// que le widget de la boutique Shopify. L'identifiant vient du métachamp
// okendo.SubscriberId de la boutique.

const ABONNE = 'a11e404d-9343-45e7-9fa3-7330a0f894f2';
const API = `https://api.okendo.io/v1/stores/${ABONNE}/products`;

export interface AvisOkendo {
  reviewId: string;
  rating: number;
  title?: string;
  body?: string;
  dateCreated: string;
  reviewer?: { displayName?: string };
}

export interface ResumeAvis { moyenne: number; nombre: number; avis: AvisOkendo[] }

export async function lireAvis(productNumericId: string, limite = 6): Promise<ResumeAvis | null> {
  if (!productNumericId) return null;
  try {
    const [agg, liste] = await Promise.all([
      fetch(`${API}/shopify-${productNumericId}/review_aggregate`).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/shopify-${productNumericId}/reviews?limit=${limite}&orderBy=date%20desc`).then(r => (r.ok ? r.json() : null)),
    ]);
    const a = agg?.reviewAggregate;
    const nombre = Number(a?.reviewCount || 0);
    if (!nombre) return { moyenne: 0, nombre: 0, avis: [] };
    const moyenne = Number(a.reviewRatingValuesTotal || 0) / nombre;
    // Okendo rend parfois le même avis deux fois (importé de deux sources).
    const vus = new Set<string>();
    const avis = ((liste?.reviews || []) as AvisOkendo[]).filter(r => {
      const cle = `${r.reviewer?.displayName || ''}|${(r.body || '').trim()}`;
      if (!(r.body || '').trim() || vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
    return { moyenne, nombre, avis };
  } catch (e) {
    console.warn('[okendo] avis indisponibles', e);
    return null;
  }
}
