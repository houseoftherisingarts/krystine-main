import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Import et ingestion du contenu Kajabi. Protégé par un secret dans l'URL.
// À retirer une fois la migration finie.
const JETON = 'kajabi-import-2026-08-29';

interface LeconIn {
  ordre: number;
  titre: string;
  moduleNom?: string;
  texte?: string;
  wistiaHash?: string;
  s3urls?: string[];
}

// 0) Relais : garde le squelette d'un cours (scrapé sur l'outline Kajabi) pour
//    que le moissonneur du storefront le relise, les deux étant sur des
//    origines différentes.
export const stashSkeleton = onRequest(
  { region: 'us-central1', cors: true },
  async (req, res) => {
    if (req.query.secret !== JETON) { res.status(403).send('non'); return; }
    const db = getFirestore();
    if (req.method === 'POST') {
      const id = String(req.body?.productId || '');
      if (!id) { res.status(400).send('id'); return; }
      await db.doc(`_kajabiStash/${id}`).set({ skeleton: req.body.skeleton || [], slug: req.body.slug || '' });
      res.status(200).json({ ok: true, n: (req.body.skeleton || []).length });
    } else {
      const id = String(req.query.productId || '');
      const snap = await db.doc(`_kajabiStash/${id}`).get();
      res.status(200).json(snap.exists ? snap.data() : { skeleton: [], slug: '' });
    }
  },
);

// 1) Écrit la structure + les textes d'un cours (rapide, sans média).
export const importKajabiStructure = onRequest(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', cors: true },
  async (req, res) => {
    if (req.query.secret !== JETON) { res.status(403).send('non'); return; }
    const body = req.body || {};
    const formationId: string = body.formationId;
    const lecons: LeconIn[] = body.lecons || [];
    if (!formationId || !lecons.length) { res.status(400).send('payload'); return; }

    const db = getFirestore();
    const col = db.collection(`formations/${formationId}/lecons`);
    const ordreModules: string[] = [];
    for (const l of lecons) { const m = l.moduleNom || ''; if (m && !ordreModules.includes(m)) ordreModules.push(m); }

    // Effacer l'ancien pour repartir propre.
    const vieux = await col.get();
    let batch = db.batch(); let n = 0;
    for (const d of vieux.docs) { batch.delete(d.ref); if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); } }
    await batch.commit();

    batch = db.batch(); n = 0;
    for (const l of lecons) {
      const id = String(l.ordre).padStart(3, '0');
      const aMedia = !!(l.wistiaHash || (l.s3urls && l.s3urls.length));
      batch.set(col.doc(id), {
        titre: l.titre,
        ordre: l.ordre,
        moduleNom: l.moduleNom || '',
        module: l.moduleNom ? ordreModules.indexOf(l.moduleNom) + 1 : 0,
        texte: l.texte || '',
        wistiaHash: l.wistiaHash || '',
        s3urls: l.s3urls || [],
        type: l.wistiaHash ? 'video' : (l.s3urls && /\.pdf/i.test(l.s3urls[0] || '') ? 'pdf' : l.s3urls && l.s3urls.length ? 'audio' : 'texte'),
        chemin: '',
        mediaPret: !aMedia, // sans média = prêt; avec média = en attente d'ingestion
        creeLe: FieldValue.serverTimestamp(),
      });
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
    res.status(200).json({ ok: true, ecrites: lecons.length, modules: ordreModules.length });
  },
);

// 2) Télécharge le média d'UNE leçon (vidéo Wistia + fichiers S3) côté serveur
//    et le ré-héberge dans Storage. Appelée en parallèle, une leçon par appel.
export const ingestMediaLecon = onRequest(
  { region: 'us-central1', timeoutSeconds: 540, memory: '4GiB', cors: true },
  async (req, res) => {
    if (req.query.secret !== JETON) { res.status(403).send('non'); return; }
    const formationId = String(req.query.formationId || req.body?.formationId || '');
    const ordre = String(req.query.ordre ?? req.body?.ordre ?? '');
    if (!formationId || ordre === '') { res.status(400).send('params'); return; }

    const db = getFirestore();
    const ref = db.doc(`formations/${formationId}/lecons/${ordre.padStart(3, '0')}`);
    const snap = await ref.get();
    if (!snap.exists) { res.status(404).send('lecon'); return; }
    const d = snap.data() as { wistiaHash?: string; s3urls?: string[]; mediaPret?: boolean };
    if (d.mediaPret) { res.status(200).json({ ok: true, deja: true }); return; }

    const bucket = getStorage().bucket();
    const base = `formations-contenu/${formationId}/${ordre.padStart(3, '0')}`;
    let chemin = '';
    let type = 'texte';
    const fichiers: string[] = [];

    try {
      // Vidéo Wistia : résoudre le MP4 HD via l'API publique.
      if (d.wistiaHash) {
        const j = await (await fetch(`https://fast.wistia.net/embed/medias/${d.wistiaHash}.json`)).json() as any;
        const assets = (j.media?.assets || []) as Array<{ type: string; url: string; size: number; ext?: string }>;
        // mp4 le plus LÉGER en HD (économie mémoire), sinon mp4 standard.
        const mp4s = assets.filter(a => /mp4/.test(a.type)).sort((a, b) => a.size - b.size);
        const hd = mp4s.find(a => a.type === 'hd_mp4_video') || mp4s[0] || assets.find(a => a.type === 'original');
        if (hd) {
          let url = hd.url;
          if (!/\.(mp4|bin)/.test(url)) url += '.mp4';
          chemin = `${base}/video.mp4`;
          // Streaming : la réponse se déverse directement dans Storage, sans
          // charger toute la vidéo en mémoire.
          const resp = await fetch(url);
          if (resp.ok && resp.body) {
            const { Readable } = await import('stream');
            const nodeStream = Readable.fromWeb(resp.body as any);
            await new Promise<void>((resolve, reject) => {
              const ws = bucket.file(chemin).createWriteStream({ contentType: 'video/mp4', resumable: false });
              nodeStream.pipe(ws).on('finish', () => resolve()).on('error', reject);
              nodeStream.on('error', reject);
            });
            fichiers.push(chemin);
            type = 'video';
          } else { chemin = ''; }
        }
      }
      // Fichiers S3 (audio, PDF).
      const s3 = d.s3urls || [];
      for (let i = 0; i < s3.length; i++) {
        const u = s3[i];
        const r = await fetch(u);
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        const ext = (u.split('?')[0].match(/\.([a-z0-9]{2,4})$/i) || [, 'bin'])[1].toLowerCase();
        const ct = ext === 'pdf' ? 'application/pdf' : ext === 'mp3' ? 'audio/mpeg' : ext === 'mp4' ? 'video/mp4' : 'application/octet-stream';
        const nom = `${base}/fichier-${i}.${ext}`;
        await bucket.file(nom).save(buf, { contentType: ct, resumable: false });
        fichiers.push(nom);
        if (!chemin) { chemin = nom; type = ext === 'pdf' ? 'pdf' : 'audio'; }
      }

      await ref.update({ chemin, type, fichiers, mediaPret: true, mediaMaj: FieldValue.serverTimestamp() });
      res.status(200).json({ ok: true, fichiers: fichiers.length, type });
    } catch (e: any) {
      res.status(500).json({ ok: false, err: String(e).slice(0, 200) });
    }
  },
);
