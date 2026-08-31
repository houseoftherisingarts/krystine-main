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
  // Register in Firestore media library for reuse.
  try {
    await addMediaItem({ url, path, name: file.name, contentType: file.type, size: file.size });
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
