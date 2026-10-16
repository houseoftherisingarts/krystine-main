// Télécharge (lecture seule) les PDF des cours publiés depuis Storage, et le PDF « Le Vent » du site.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { jeton } from './firestore-lecture.mjs';
const BUCKET = 'krystinestlaurent-87566.firebasestorage.app';
const SORTIE = process.argv[2];
mkdirSync(SORTIE, { recursive: true });
const T = await jeton();
const H = { Authorization: `Bearer ${T}` };
for (const prefixe of ['formations-contenu/rituels-vivants/', 'formations-contenu/kajabi-2148687644/']) {
  let page = '';
  do {
    const r = await (await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=${encodeURIComponent(prefixe)}&maxResults=1000${page ? '&pageToken=' + page : ''}`, { headers: H })).json();
    if (r.error) { console.log('ERREUR', r.error.message); break; }
    for (const o of r.items || []) {
      if (!/\.pdf$/i.test(o.name)) continue;
      const nom = o.name.replace(/[^a-z0-9.-]+/gi, '_');
      const b = Buffer.from(await (await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(o.name)}?alt=media`, { headers: H })).arrayBuffer());
      writeFileSync(join(SORTIE, nom), b);
      console.log(nom, (b.length / 1e6).toFixed(1), 'Mo', o.updated);
    }
    page = r.nextPageToken || '';
  } while (page);
}
const v = Buffer.from(await (await fetch('https://www.krystinestlaurent.ca/telechargements/le-vent.pdf')).arrayBuffer());
writeFileSync(join(SORTIE, 'site_le-vent.pdf'), v); console.log('site_le-vent.pdf', (v.length / 1e6).toFixed(1), 'Mo');
