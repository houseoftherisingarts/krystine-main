// Le titre long d'une formation se lit en deux temps : le nom, et sa
// collection en petit. Le titre officiel de VATA place la collection devant,
// « L'Expérience Ayurveda · VATA Essentiel » (Krystine, 6 oct. 2026); les
// autres titres la placent derrière (« Les 5 éléments · Extrait du livre »).
const COLLECTION_DEVANT = /^L['’]Exp[ée]rience Ayurveda$/i;

export function couperTitre(titre: string): [nom: string, collection: string] {
  const [a, ...reste] = (titre || '').split('·').map((s) => s.trim());
  const b = reste.join(' · ');
  if (!b) return [a || '', ''];
  return COLLECTION_DEVANT.test(a) ? [b, a] : [a, b];
}
