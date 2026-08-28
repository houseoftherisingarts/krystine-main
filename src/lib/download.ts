// Télécharge un fichier en gardant son nom, même quand il vient d'un autre
// domaine (Firebase Storage, Google Cloud Storage). L'attribut `download`
// d'un lien est ignoré en cross-origin, alors le fichier passe par un blob.
// Quand le CDN refuse le CORS, le fichier s'ouvre dans un onglet.
export async function downloadFile(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const ext = url.match(/\.([a-z0-9]{2,4})(\?|$)/i)?.[1] || 'bin';
    a.download = /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
