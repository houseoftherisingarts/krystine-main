// Les photos du site, avec la couche que Krystine règle elle-même.
//
// Vit à côté de lang.ts et pour la même raison : le shim jsx-runtime lit ces
// tables à chaque rendu, donc il lui faut un module simple, sans React et sans
// contexte. C'est src/lib/edition.tsx qui les remplit depuis Firestore
// (siteOverrides/singleton, champs `photos` et `cadres`) et qui prévient
// l'application quand elles changent.
//
// La clé d'une photo est l'adresse écrite dans le code. Elle survit aux
// redéploiements, et le jour où le code change d'image la surcharge cesse
// d'être lue plutôt que d'écraser la nouvelle.

export interface Cadre {
  /** Point focal horizontal, en pour cent (0 = bord gauche, 100 = bord droit). */
  x: number;
  /** Point focal vertical, en pour cent. */
  y: number;
  /** Zoom, 1 = la photo telle que le code la cadre. */
  z: number;
}

export const ZOOM_MAX = 3;
export const CADRE_NEUTRE: Cadre = { x: 50, y: 50, z: 1 };

let photos: Record<string, string> = {};
let cadres: Record<string, Cadre> = {};

const auditeurs = new Set<() => void>();

const borne = (v: unknown, min: number, max: number, defaut: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

export const cadrePropre = (c: unknown): Cadre | undefined => {
  if (!c || typeof c !== 'object') return undefined;
  const o = c as Record<string, unknown>;
  return { x: borne(o.x, 0, 100, 50), y: borne(o.y, 0, 100, 50), z: borne(o.z, 1, ZOOM_MAX, 1) };
};

export function poserPhotos(p: Record<string, string>, c: Record<string, Cadre>): void {
  photos = p || {};
  cadres = c || {};
  auditeurs.forEach((f) => { try { f(); } catch { /* un auditeur qui plante n'arrête pas les autres */ } });
}

export function ecouterPhotos(f: () => void): () => void {
  auditeurs.add(f);
  return () => { auditeurs.delete(f); };
}

export const photoDe = (cle: string): string | undefined => photos[cle];
export const cadreDe = (cle: string): Cadre | undefined => cadres[cle];

/** Le point focal en object-position, le zoom en scale avec l'origine sur le point focal. */
export function styleDeCadre(c: Cadre): React.CSSProperties {
  const s: React.CSSProperties = { objectPosition: `${c.x}% ${c.y}%` };
  if (c.z !== 1) {
    s.transformOrigin = `${c.x}% ${c.y}%`;
    (s as Record<string, unknown>).scale = String(c.z);
  }
  return s;
}
