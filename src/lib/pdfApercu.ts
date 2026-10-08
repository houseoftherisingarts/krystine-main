// L'aperçu d'un PDF dessiné dans le navigateur (pdf.js, chargé seulement
// quand un document s'affiche). La première page devient une petite image,
// gardée en mémoire et dans le navigateur : la deuxième visite ne télécharge
// plus rien. Le fichier reste derrière la même garde serveur (adresse signée).

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjs: Promise<PdfJs> | null = null;
const charger = (): Promise<PdfJs> => {
  if (!pdfjs) {
    pdfjs = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjs;
};

// Un document à la fois : la bibliothèque dépliée n'ouvre pas quinze téléchargements d'un coup.
let file: Promise<unknown> = Promise.resolve();
const aTour = <T,>(travail: () => Promise<T>): Promise<T> => {
  const p = file.then(travail, travail);
  file = p.catch(() => undefined);
  return p;
};

const enCours = new Map<string, Promise<string>>();
const CLE = (cle: string) => `pdf-p1:v1:${cle}`;

/** L'image déjà dessinée de la première page, s'il y en a une, sans rien télécharger. */
export function premierePageEnCache(cle: string): string | null {
  try { return localStorage.getItem(CLE(cle)); } catch { return null; }
}

async function dessiner(pdf: Awaited<ReturnType<PdfJs['getDocument']>['promise']>, n: number, largeur: number, qualite: number): Promise<string> {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: largeur / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas.toDataURL('image/jpeg', qualite);
}

const ouvrir = async (url: string) => (await charger()).getDocument({ url, disableAutoFetch: true, disableStream: true, rangeChunkSize: 65536 }).promise;

/**
 * La première page d'un PDF en image (jpeg). `cle` identifie le fichier
 * (son chemin dans Storage) ; `obtenirUrl` n'est appelé que si l'image
 * n'est pas déjà gardée.
 */
export function premierePage(cle: string, obtenirUrl: () => Promise<string>, largeur = 560): Promise<string> {
  const deja = premierePageEnCache(cle);
  if (deja) return Promise.resolve(deja);
  const actif = enCours.get(cle);
  if (actif) return actif;
  const p = aTour(async () => {
    const pdf = await ouvrir(await obtenirUrl());
    try {
      const image = await dessiner(pdf, 1, largeur, 0.8);
      try { localStorage.setItem(CLE(cle), image); } catch { /* navigateur plein ou privé : l'image reste en mémoire */ }
      return image;
    } finally { void pdf.destroy(); }
  });
  enCours.set(cle, p);
  p.catch(() => enCours.delete(cle));
  return p;
}

/** Toutes les pages d'un PDF, une image à la fois, pour la lecture en grand format. */
export async function toutesLesPages(url: string, largeur: number, surPage: (n: number, total: number, image: string) => void, annule: () => boolean): Promise<void> {
  const pdf = await ouvrir(url);
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      if (annule()) return;
      surPage(n, pdf.numPages, await dessiner(pdf, n, largeur, 0.86));
    }
  } finally { void pdf.destroy(); }
}

/**
 * Télécharge le fichier sous son vrai nom. Si le navigateur refuse (adresse
 * d'un autre domaine sans permission), le fichier s'ouvre simplement.
 */
export async function telechargerFichier(url: string, nom: string): Promise<void> {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const lien = URL.createObjectURL(await r.blob());
    const a = document.createElement('a');
    a.href = lien;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(lien), 30_000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
