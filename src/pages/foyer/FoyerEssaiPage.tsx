import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask,
} from 'firebase/storage';
import app from '../../firebase';
import { subscribeToAuthState, isAdminUser } from '../../firebase/auth';
import { PORTES, type Porte } from './portesData';

// ─────────────────────────────────────────────────────────────────────────
// FOYER D'ORIGINE, PAGE D'ESSAI (bac à sable, hors page de vente réelle)
// Demande d'Alex, 10 septembre 2026 : Krystine veut s'entraîner à déposer
// ses leçons vidéo là où elle travaillera vraiment, dans l'espace tel
// qu'une membre le voit, avant l'ouverture du vrai Foyer. Cette page vit à
// /foyer-essai, réservée aux administratrices, jamais liée nulle part.
//
// CLOISONNEMENT TOTAL : les fichiers vivent dans le dossier Storage
// `foyer-essai/`, distinct de `formations-contenu/`, et les documents dans
// la collection Firestore `foyerEssai`, distincte de `formations`. Rien de
// ce qui est déposé ici ne touche le vrai Foyer, et Krystine peut tout
// supprimer sans conséquence.
// ─────────────────────────────────────────────────────────────────────────

interface LeconEssai {
  videoUrl: string;
  videoPath: string;
  titre: string;
  taille: number;
  contentType: string;
  creeLe?: Timestamp;
}

const COLLECTION = 'foyerEssai';
const DOSSIER = 'foyer-essai';

const db = () => {
  if (!app) throw new Error('[FoyerEssai] Firebase not configured');
  return getFirestore(app);
};
const store = () => {
  if (!app) throw new Error('[FoyerEssai] Firebase not configured');
  return getStorage(app);
};

const poids = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);

async function chargerLecons(): Promise<Record<string, LeconEssai>> {
  const snap = await getDocs(collection(db(), COLLECTION));
  const out: Record<string, LeconEssai> = {};
  snap.docs.forEach(d => { out[d.id] = d.data() as LeconEssai; });
  return out;
}

function televerser(porteId: string, file: File, onProgress: (pct: number) => void) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const chemin = `${DOSSIER}/${porteId}/${Date.now()}_${safeName}`;
  const storageRef = ref(store(), chemin);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });
  const done = new Promise<LeconEssai>((resolve, reject) => {
    task.on('state_changed',
      s => onProgress((s.bytesTransferred / s.totalBytes) * 100),
      reject,
      async () => {
        try {
          const videoUrl = await getDownloadURL(storageRef);
          resolve({ videoUrl, videoPath: chemin, titre: file.name, taille: file.size, contentType: file.type });
        } catch (e) { reject(e); }
      });
  });
  return { task, done };
}

interface EnCours { pct: number; task: UploadTask; nom: string; taille: number }

const FoyerEssaiPage: React.FC = () => {
  // Sa propre vérification d'authentification, sur le même patron que
  // AdminDashboard.tsx : cette page ne vit derrière aucun lien du site, donc
  // chaque visite est un chargement à froid (URL tapée, favori). Le drapeau
  // `isAdmin` du contexte partagé (AppContext) part à `false` et ne se
  // confirme qu'une fois Firebase Auth revenu, de façon asynchrone; le juger
  // dès le premier rendu renvoyait une vraie administratrice vers l'accueil
  // avant même que sa session ait eu la chance de se confirmer. `pretAuth`
  // distingue « pas encore su » de « confirmée non admin ».
  const [pretAuth, setPretAuth] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const unsub = subscribeToAuthState((u) => { setIsAdmin(isAdminUser(u)); setPretAuth(true); });
    return unsub;
  }, []);
  const [lecons, setLecons] = useState<Record<string, LeconEssai>>({});
  const [charge, setCharge] = useState(true);
  const [vueCliente, setVueCliente] = useState(false);
  const [enCours, setEnCours] = useState<Record<string, EnCours>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // La page ne doit jamais s'indexer et porte son propre titre d'onglet, sur
  // le même patron que FoyerPage.tsx (document.title restauré au départ).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Essai de dépôt · Foyer d'Origine | Krystine St-Laurent";
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const metaCree = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const contenuPrecedent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = prevTitle;
      if (metaCree) meta?.remove();
      else if (contenuPrecedent) meta?.setAttribute('content', contenuPrecedent);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    chargerLecons().then(setLecons).finally(() => setCharge(false));
  }, [isAdmin]);

  // Réservée aux administratrices : quiconque d'autre repart vers l'accueil,
  // sans qu'aucun lien du site ne mène jamais ici.
  if (!isAdmin) return <Navigate to="/accueil" replace />;

  const choisirFichier = (porteId: string) => inputs.current[porteId]?.click();

  const surFichier = (porte: Porte, file: File | undefined) => {
    if (!file) return;
    setErreurs(e => ({ ...e, [porte.n]: '' }));
    if (!file.type.startsWith('video/')) {
      setErreurs(e => ({ ...e, [porte.n]: `Ce fichier n'est pas une vidéo (${file.type || 'type inconnu'}). Choisissez un fichier vidéo pour cette porte.` }));
      return;
    }
    const ancienne = lecons[porte.n];
    const { task, done } = televerser(porte.n, file, pct => {
      setEnCours(c => (c[porte.n] ? { ...c, [porte.n]: { ...c[porte.n], pct } } : c));
    });
    setEnCours(c => ({ ...c, [porte.n]: { pct: 0, task, nom: file.name, taille: file.size } }));
    done.then(async lecon => {
      await setDoc(doc(db(), COLLECTION, porte.n), { ...lecon, creeLe: serverTimestamp() });
      setLecons(l => ({ ...l, [porte.n]: lecon }));
      setEnCours(c => { const n = { ...c }; delete n[porte.n]; return n; });
      if (ancienne?.videoPath) { try { await deleteObject(ref(store(), ancienne.videoPath)); } catch { /* déjà partie */ } }
    }).catch((err: unknown) => {
      setEnCours(c => { const n = { ...c }; delete n[porte.n]; return n; });
      const code = (err as { code?: string } | null)?.code;
      if (code !== 'storage/canceled') {
        setErreurs(e => ({ ...e, [porte.n]: "Le téléversement n'a pas fonctionné. Réessayez." }));
      }
    });
  };

  const annuler = (porteId: string) => enCours[porteId]?.task.cancel();

  const supprimer = async (porte: Porte) => {
    const lecon = lecons[porte.n];
    if (!lecon) return;
    await deleteDoc(doc(db(), COLLECTION, porte.n));
    setLecons(l => { const n = { ...l }; delete n[porte.n]; return n; });
    try { await deleteObject(ref(store(), lecon.videoPath)); } catch { /* déjà partie */ }
  };

  return (
    <div className="min-h-screen bg-cream pb-24 pt-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-brass/30 pb-8">
          <div>
            <p className="font-sans text-fyLabel uppercase text-brassInk">Essai · réservé à l'administratrice</p>
            <h1 className="mt-2 max-w-xl font-serif text-fyH2 leading-[1.05] text-espresso">Les douze portes</h1>
            <p className="mt-3 max-w-xl font-sans text-fyBody text-ink/80">
              Un bac à sable pour déposer une leçon sur chaque porte, exactement là où vous
              travaillerez une fois le Foyer ouvert. Rien de ce qui est déposé ici ne touche
              le vrai Foyer, et tout peut être supprimé sans conséquence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVueCliente(v => !v)}
            aria-pressed={vueCliente}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 font-sans text-[11px] font-bold uppercase tracking-widest transition-colors ${
              vueCliente ? 'border-espresso bg-espresso text-cream' : 'border-brass/50 bg-cream2 text-brassInk hover:border-brassInk'
            }`}
          >
            <i className={`fa-solid ${vueCliente ? 'fa-eye' : 'fa-eye-slash'}`} />
            {vueCliente ? 'Vue d’une cliente' : 'Voir comme une cliente'}
          </button>
        </header>

        {charge ? (
          <p className="mt-10 text-sm text-ink/50">Chargement…</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {PORTES.map(porte => {
              const lecon = lecons[porte.n];
              const cours = enCours[porte.n];
              const erreur = erreurs[porte.n];
              return (
                <div key={porte.n} className="flex flex-col overflow-hidden rounded-[15px] border border-brass/30 bg-cream2">
                  {/* Le nom du mois est gravé dans l'image même de la porte (pas un
                      texte séparé) : on ne montre que la poignée et la matière, en
                      recadrant sur la moitié basse. Vérifié à l'œil sur les douze
                      portes, aucune lettre ne dépasse jamais de ce cadrage. */}
                  <img src={`/foyer/${porte.src}.webp`} alt="" loading="lazy" className="aspect-[2/1] w-full object-cover object-bottom" />
                  <div className="flex flex-1 flex-col p-5">
                  <p className="text-center font-serif text-lg leading-snug text-espresso">{porte.theme}</p>

                  {lecon && (
                    <div className="mt-4">
                      <p className="truncate text-center text-[11px] font-bold uppercase tracking-wide text-brassInk" title={lecon.titre}>
                        <i className="fa-solid fa-circle-check mr-1.5" />{lecon.titre}
                      </p>
                      <video controls preload="metadata" src={lecon.videoUrl} className="mt-2 w-full rounded-[10px] bg-espressoDeep" />
                    </div>
                  )}

                  {!vueCliente && (
                    <div className="mt-4">
                      <input
                        ref={el => { inputs.current[porte.n] = el; }}
                        type="file"
                        accept="video/*"
                        hidden
                        onChange={e => { surFichier(porte, e.target.files?.[0]); e.target.value = ''; }}
                      />
                      {cours ? (
                        <div>
                          <p className="truncate text-[10px] uppercase tracking-wide text-brassInk" title={cours.nom}>
                            {cours.nom} · {poids(cours.taille)}
                          </p>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brass/20">
                            <div className="h-full rounded-full bg-brass transition-[width] duration-300" style={{ width: `${Math.max(4, cours.pct)}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-brassInk">
                            <span>Envoi {Math.round(cours.pct)} %</span>
                            <button type="button" onClick={() => annuler(porte.n)} className="underline hover:text-espresso">Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => choisirFichier(porte.n)}
                          className="w-full rounded-full border border-brass/50 py-2 text-[11px] font-bold uppercase tracking-widest text-brassInk transition-colors hover:border-brassInk hover:text-espresso"
                        >
                          {lecon ? 'Remplacer la vidéo' : 'Ajouter une vidéo'}
                        </button>
                      )}
                      {lecon && !cours && (
                        <button type="button" onClick={() => supprimer(porte)} className="mt-2 w-full text-center text-[10px] uppercase tracking-wide text-ink/40 hover:text-red-700">
                          Supprimer la vidéo
                        </button>
                      )}
                      {lecon && !cours && !erreur && <p className="mt-2 text-center text-[10px] text-ink/40">{poids(lecon.taille)}</p>}
                      {erreur && <p className="mt-2 text-[11px] text-red-700">{erreur}</p>}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoyerEssaiPage;
