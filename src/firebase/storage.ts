import app from '../firebase';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { addMediaItem } from './firestore';

export async function uploadImage(file: File, folder = 'uploads'): Promise<{ url: string; path: string }> {
  if (!app) throw new Error('[Storage] Firebase not configured');
  const storage = getStorage(app);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  // Register in Firestore media library for reuse. Les dossiers personnels des
  // membres (photos de profil, bannières, mur, captures de bug) n'y entrent
  // pas : ils n'ont rien à faire dans la médiathèque de Krystine (Alex, 11
  // septembre 2026).
  const prive = /^(profils|avatars|bannieres|members|mur|bugs|verifications)\//.test(path);
  try {
    if (!prive) await addMediaItem({ url, path, name: file.name, contentType: file.type, size: file.size });
  } catch (e) {
    console.warn('[Storage] mediaLibrary register failed (non-fatal)', e);
  }
  return { url, path };
}

export async function deleteStoredImage(path: string): Promise<void> {
  if (!app) return;
  const storage = getStorage(app);
  await deleteObject(ref(storage, path));
}

// Média d'un billet du mur, téléversé par un membre : le chemin porte son
// uid (les règles Storage n'ouvrent que mur/{uid}/…), pas de médiathèque.
export function uploadMediaMur(file: File, uid: string, onProgress?: (pct: number) => void): Promise<{ url: string; path: string }> {
  if (!app) throw new Error('[Storage] Firebase not configured');
  const storage = getStorage(app);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `mur/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type || undefined });
    task.on('state_changed',
      s => onProgress?.((s.bytesTransferred / s.totalBytes) * 100),
      reject,
      async () => { try { resolve({ url: await getDownloadURL(storageRef), path }); } catch (e) { reject(e); } });
  });
}

/**
 * Réduit une photo avant l'envoi : un iPhone livre 4 000 pixels et plusieurs
 * mégaoctets, parfois en HEIC. Le navigateur décode ce qu'il sait décoder et
 * renvoie un JPEG de la taille demandée; s'il ne sait pas, le fichier part
 * tel quel.
 */
export async function reduireImage(file: File, maxCote = 1920, qualite = 0.86): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxCote / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1 && file.type === 'image/jpeg' && file.size < 2 * 1024 * 1024) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bitmap.width * ratio);
    c.height = Math.round(bitmap.height * ratio);
    const ctx = c.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', qualite));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
