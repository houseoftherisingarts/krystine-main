// Le crayon de Krystine : la couche qui laisse une administratrice récrire
// n'importe quel texte et remplacer n'importe quelle photo du site, sans code.
//
// Tout passe par le shim jsx-runtime (src/lib/i18n/jsx-runtime.ts), qui voit
// déjà chaque chaîne de caractères et chaque <img> du site au moment du rendu.
// Ce fichier ne fait que trois choses : lire les surcharges dans Firestore,
// les pousser dans les tables que le shim consulte, et tenir le brouillon en
// cours pendant qu'elle travaille.
//
// La clé d'un texte est la phrase française écrite dans le code, exactement la
// même que celle du dictionnaire anglais. La clé d'une photo est l'adresse
// écrite dans le code. Les deux survivent aux redéploiements, et le jour où le
// code change, la surcharge cesse d'être lue plutôt que d'écraser la nouveauté.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deleteField, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { poserSurcharges } from './i18n/lang';
import { poserPhotos, cadrePropre, type Cadre } from './i18n/photos';
import type { SiteLang } from './i18n/lang';

const CHEMIN = ['siteOverrides', 'singleton'] as const;
const CLE_CACHE = 'krystine.surcharges';

/** Ce qui est publié, tel qu'il vit dans Firestore. */
interface Publie {
  libre: Record<string, string>;
  libreEN: Record<string, string>;
  photos: Record<string, string>;
  cadres: Record<string, Cadre>;
}

const VIDE: Publie = { libre: {}, libreEN: {}, photos: {}, cadres: {} };

/** Une entrée de brouillon. `null` veut dire « revenir à la version du code ». */
type BrouillonTexte = Record<string, Partial<Record<SiteLang, string>> | null>;
type BrouillonPhoto = Record<string, { url?: string; cadre?: Cadre } | null>;

export interface EditionCtx {
  edition: boolean;
  ouvrir: () => void;
  fermer: () => void;
  publie: Publie;
  brouillonTexte: BrouillonTexte;
  brouillonPhoto: BrouillonPhoto;
  ecrireTexte: (source: string, langue: SiteLang, valeur: string) => void;
  remettreTexte: (source: string) => void;
  ecrirePhoto: (cle: string, valeur: { url?: string; cadre?: Cadre }) => void;
  remettrePhoto: (cle: string) => void;
  abandonner: () => void;
  sauvegarder: () => Promise<void>;
  nbModifs: number;
}

const Ctx = createContext<EditionCtx | null>(null);

const lireCache = (): Publie => {
  try {
    const brut = window.localStorage.getItem(CLE_CACHE);
    if (!brut) return VIDE;
    const p = JSON.parse(brut) as Partial<Publie>;
    return { libre: p.libre || {}, libreEN: p.libreEN || {}, photos: p.photos || {}, cadres: p.cadres || {} };
  } catch {
    return VIDE;
  }
};

const ecrireCache = (p: Publie): void => {
  try { window.localStorage.setItem(CLE_CACHE, JSON.stringify(p)); } catch { /* stockage bloqué */ }
};

const objet = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const textes = (v: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(objet(v))) if (typeof val === 'string') out[k] = val;
  return out;
};

export const EditionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publie, setPublie] = useState<Publie>(() => (typeof window === 'undefined' ? VIDE : lireCache()));
  const [brouillonTexte, setBrouillonTexte] = useState<BrouillonTexte>({});
  const [brouillonPhoto, setBrouillonPhoto] = useState<BrouillonPhoto>({});
  const [edition, setEdition] = useState(false);
  // Ce compteur ne sert qu'à faire repasser l'arbre par le shim quand les
  // surcharges changent : sans lui, un texte déjà rendu resterait tel quel.
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      doc(db, CHEMIN[0], CHEMIN[1]),
      (snap) => {
        const data = objet(snap.data());
        const cadres: Record<string, Cadre> = {};
        for (const [k, v] of Object.entries(objet(data.cadres))) {
          const c = cadrePropre(v);
          if (c) cadres[k] = c;
        }
        const p: Publie = { libre: textes(data.libre), libreEN: textes(data.libreEN), photos: textes(data.photos), cadres };
        setPublie(p);
        ecrireCache(p);
      },
      () => { /* hors ligne ou règles fermées : le code fait le travail */ },
    );
    return () => unsub();
  }, []);

  // Publié + brouillon : ce que le site affiche pendant qu'elle travaille.
  const effectif = useMemo(() => {
    const libre = { ...publie.libre };
    const libreEN = { ...publie.libreEN };
    for (const [source, val] of Object.entries(brouillonTexte)) {
      if (val === null) { delete libre[source]; delete libreEN[source]; continue; }
      if (val.fr !== undefined) libre[source] = val.fr;
      if (val.en !== undefined) libreEN[source] = val.en;
    }
    const photos = { ...publie.photos };
    const cadres = { ...publie.cadres };
    for (const [cle, val] of Object.entries(brouillonPhoto)) {
      if (val === null) { delete photos[cle]; delete cadres[cle]; continue; }
      if (val.url !== undefined) photos[cle] = val.url;
      if (val.cadre !== undefined) cadres[cle] = val.cadre;
    }
    return { libre, libreEN, photos, cadres };
  }, [publie, brouillonTexte, brouillonPhoto]);

  useEffect(() => {
    poserSurcharges(effectif.libre, effectif.libreEN);
    poserPhotos(effectif.photos, effectif.cadres);
    setVersion((v) => v + 1);
  }, [effectif]);

  const ecrireTexte = useCallback((source: string, langue: SiteLang, valeur: string) => {
    setBrouillonTexte((prev) => {
      const courant = prev[source];
      return { ...prev, [source]: { ...(courant ?? {}), [langue]: valeur } };
    });
  }, []);

  const remettreTexte = useCallback((source: string) => {
    setBrouillonTexte((prev) => ({ ...prev, [source]: null }));
  }, []);

  const ecrirePhoto = useCallback((cle: string, valeur: { url?: string; cadre?: Cadre }) => {
    setBrouillonPhoto((prev) => {
      const courant = prev[cle];
      return { ...prev, [cle]: { ...(courant ?? {}), ...valeur } };
    });
  }, []);

  const remettrePhoto = useCallback((cle: string) => {
    setBrouillonPhoto((prev) => ({ ...prev, [cle]: null }));
  }, []);

  const abandonner = useCallback(() => {
    setBrouillonTexte({});
    setBrouillonPhoto({});
  }, []);

  const sauvegarder = useCallback(async () => {
    if (!db) throw new Error('Firebase absent');
    const ref = doc(db, CHEMIN[0], CHEMIN[1]);
    const patch: Record<string, unknown> = { _maj: serverTimestamp() };
    // Firestore prend un point comme séparateur de chemin : une clé qui en
    // contient un se pose donc par son objet parent entier, jamais en chemin.
    const parClef: Record<string, Record<string, unknown>> = { libre: {}, libreEN: {}, photos: {}, cadres: {} };
    let parClefUtilise = false;
    const poser = (champ: keyof Publie, cle: string, valeur: unknown) => {
      parClef[champ][cle] = valeur;
      parClefUtilise = true;
    };

    for (const [source, val] of Object.entries(brouillonTexte)) {
      if (val === null) { poser('libre', source, deleteField()); poser('libreEN', source, deleteField()); continue; }
      if (val.fr !== undefined) poser('libre', source, val.fr);
      if (val.en !== undefined) poser('libreEN', source, val.en);
    }
    for (const [cle, val] of Object.entries(brouillonPhoto)) {
      if (val === null) { poser('photos', cle, deleteField()); poser('cadres', cle, deleteField()); continue; }
      if (val.url !== undefined) poser('photos', cle, val.url);
      if (val.cadre !== undefined) poser('cadres', cle, val.cadre);
    }
    if (!parClefUtilise) return;
    for (const champ of Object.keys(parClef) as (keyof Publie)[]) {
      if (Object.keys(parClef[champ]).length) patch[champ] = parClef[champ];
    }
    // Un merge récursif garde les clés déjà en place et n'écrase que celles-ci.
    await setDoc(ref, { _maj: serverTimestamp() }, { merge: true });
    await updateDoc(ref, patch as never);
    setBrouillonTexte({});
    setBrouillonPhoto({});
  }, [brouillonTexte, brouillonPhoto]);

  const nbModifs = useMemo(
    () => Object.keys(brouillonTexte).length + Object.keys(brouillonPhoto).length,
    [brouillonTexte, brouillonPhoto],
  );

  const valeur = useMemo<EditionCtx>(
    () => ({
      edition,
      ouvrir: () => setEdition(true),
      fermer: () => setEdition(false),
      publie,
      brouillonTexte,
      brouillonPhoto,
      ecrireTexte,
      remettreTexte,
      ecrirePhoto,
      remettrePhoto,
      abandonner,
      sauvegarder,
      nbModifs,
    }),
    [edition, publie, brouillonTexte, brouillonPhoto, ecrireTexte, remettreTexte, ecrirePhoto, remettrePhoto, abandonner, sauvegarder, nbModifs],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
};

export const useEdition = (): EditionCtx | null => useContext(Ctx);
