import app from '../firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
