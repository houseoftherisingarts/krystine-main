// La fiche produit telle que Krystine la personnalise sur le site (4 oct. 2026).
// ─────────────────────────────────────────────────────────────────────────────
// `boutiqueProduits/{handle}` : un document par produit Shopify, créé seulement
// lorsque Krystine enregistre une personnalisation dans l'admin. Chaque champ
// rempli PRIME sur Shopify; un champ vide laisse passer Shopify. La collection
// peut rester vide : tout le site fonctionne alors avec Shopify seul.
// Les photos vivent dans Storage sous boutique-produits/{handle}/. Retirer une
// photo de la fiche ne supprime pas le fichier (rien ne se perd par erreur).

import { useEffect, useState } from 'react';
import app, { db } from '../firebase';
import {
  collection, doc, onSnapshot, setDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { reduireImage } from './storage';
import type { ShopifyProduct } from '../shopify';

export interface PhotoProduit { url: string; path: string }

export interface ProduitPerso {
  titre?: string;
  accroche?: string;
  /** Texte simple ou HTML; nettoyé à l'affichage (src/lib/htmlPropre.ts). */
  description?: string;
  /** Si la liste a au moins une photo, elle remplace les photos de Shopify. */
  images?: PhotoProduit[];
  /** Position dans la boutique (1 en premier). Vide : l'ordre des ventes de Shopify. */
  ordre?: number | null;
  masque?: boolean;
  updatedAt?: Timestamp;
}

const plein = (s?: string | null) => !!s && s.trim().length > 0;

/** Toutes les personnalisations, en direct. Une Map vide si la collection l'est. */
export function subscribeProduitsPerso(cb: (m: Map<string, ProduitPerso>) => void): () => void {
  if (!db) { cb(new Map()); return () => {}; }
  return onSnapshot(
    collection(db, 'boutiqueProduits'),
    snap => cb(new Map(snap.docs.map(d => [d.id, d.data() as ProduitPerso]))),
    err => { console.warn('[boutiqueProduits] lecture impossible', err); cb(new Map()); },
  );
}

/** Le crochet des pages publiques : la Map des personnalisations et l'état de chargement. */
export function useProduitsPerso(): { perso: Map<string, ProduitPerso>; pret: boolean } {
  const [perso, setPerso] = useState<Map<string, ProduitPerso>>(new Map());
  const [pret, setPret] = useState(false);
  useEffect(() => subscribeProduitsPerso(m => { setPerso(m); setPret(true); }), []);
  return { perso, pret };
}

export async function enregistrerProduitPerso(handle: string, data: ProduitPerso): Promise<void> {
  if (!db) throw new Error('[Firestore] Firebase non configuré.');
  await setDoc(doc(db, 'boutiqueProduits', handle), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Téléverse une photo (réduite à 1920 px) dans boutique-produits/{handle}/. */
export async function televerserPhotoProduit(handle: string, file: File): Promise<PhotoProduit> {
  if (!app) throw new Error('[Storage] Firebase non configuré.');
  const reduite = await reduireImage(file, 1920, 0.86);
  const nom = reduite.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `boutique-produits/${handle}/${Date.now()}_${nom}`;
  const r = ref(getStorage(app), path);
  await uploadBytes(r, reduite, { contentType: reduite.type || 'image/jpeg' });
  return { url: await getDownloadURL(r), path };
}

// ── Fusion Shopify + personnalisation ───────────────────────────────────────

/** Le produit tel qu'il s'affiche : titre, photos et description, le site d'abord. */
export function appliquerPerso<T extends ShopifyProduct>(p: T, perso?: ProduitPerso): T & { accroche?: string; descriptionPerso?: string } {
  if (!perso) return p;
  const photos = (perso.images || []).filter(i => i?.url);
  return {
    ...p,
    title: plein(perso.titre) ? perso.titre!.trim() : p.title,
    featuredImage: photos.length ? { url: photos[0].url, altText: perso.titre || p.title } : p.featuredImage,
    images: photos.length ? photos.map(i => ({ url: i.url, altText: perso.titre || p.title })) : p.images,
    accroche: plein(perso.accroche) ? perso.accroche!.trim() : undefined,
    descriptionPerso: plein(perso.description) ? perso.description : undefined,
  };
}

/** Visible au public : ni masqué dans settings/boutique, ni masqué dans sa fiche. */
export function estVisible(handle: string, hiddenProducts: Set<string>, perso: Map<string, ProduitPerso>): boolean {
  return !hiddenProducts.has(handle) && !perso.get(handle)?.masque;
}

/** L'ordre choisi par Krystine d'abord (1, 2, 3…), puis l'ordre des ventes de Shopify. */
export function trierSelonPerso<T extends { handle: string }>(liste: T[], perso: Map<string, ProduitPerso>): T[] {
  const rang = (h: string) => {
    const o = perso.get(h)?.ordre;
    return typeof o === 'number' && o > 0 ? o : Number.POSITIVE_INFINITY;
  };
  return liste
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (rang(a.p.handle) - rang(b.p.handle)) || (a.i - b.i))
    .map(x => x.p);
}
