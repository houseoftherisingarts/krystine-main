#!/usr/bin/env node
// Archive un direct YouTube pour l'onglet « Rediffusions » de l'espace client.
// Ce qui est gardé : la fiche de la vidéo, les commentaires publiés sous la
// vidéo et le clavardage tel qu'il a défilé pendant le direct (chaque message
// porte son décalage en secondes, ce qui permet de le rejouer au fil de la
// lecture). Tout vit dans Firestore : la fiche dans rediffusions/{videoId},
// le reste dans la sous-collection pages (clavardage-n, commentaires-n).
//
// Usage : node scripts/rediffusions/archiver.mjs <url YouTube> [--live <id dans liveEvents>]
// Il faut yt-dlp et gcloud (compte houseoftherisingarts) sur la machine.
// Relancer la commande remplace l'archive existante de la même vidéo.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const PAR_PAGE = 400; // ~120 Ko par page; Firestore plafonne un document à 1 Mo

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));
const liveIdx = args.indexOf('--live');
const liveDemande = liveIdx >= 0 ? args[liveIdx + 1] : undefined;
if (!url) {
  console.error('Usage : node scripts/rediffusions/archiver.mjs <url YouTube> [--live <id liveEvents>]');
  process.exit(1);
}

// ── 1. yt-dlp : fiche, commentaires, clavardage ─────────────────────────────
const dossier = mkdtempSync(join(tmpdir(), 'rediffusion-'));
const r = spawnSync('yt-dlp', [
  '--skip-download', '--write-info-json', '--write-comments',
  '--write-subs', '--sub-langs', 'live_chat',
  '-o', join(dossier, '%(id)s'), url,
], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const fichiers = readdirSync(dossier);
const infoNom = fichiers.find(f => f.endsWith('.info.json'));
if (!infoNom) { console.error("yt-dlp n'a pas produit de fiche (.info.json)."); process.exit(1); }
const info = JSON.parse(readFileSync(join(dossier, infoNom), 'utf8'));
const chatNom = fichiers.find(f => f.endsWith('.live_chat.json'));
const videoId = info.id;

// ── 2. Le clavardage du direct ──────────────────────────────────────────────
const texteDesRuns = (runs = []) => runs.map(x => {
  if (x.text != null) return x.text;
  if (x.emoji) return x.emoji.isCustomEmoji ? (x.emoji.shortcuts?.[0] ?? '') : (x.emoji.emojiId ?? '');
  return '';
}).join('');

const roleDe = (badges = []) => {
  for (const b of badges) {
    const br = b.liveChatAuthorBadgeRenderer || {};
    const t = br.icon?.iconType;
    if (t === 'OWNER') return 'hote';
    if (t === 'MODERATOR') return 'moderation';
    if (br.customThumbnail) return 'membre';
  }
  return undefined;
};

const clavardage = [];
if (chatNom) {
  for (const ligne of readFileSync(join(dossier, chatNom), 'utf8').split('\n')) {
    if (!ligne.trim()) continue;
    let d;
    try { d = JSON.parse(ligne); } catch { continue; }
    const rc = d.replayChatItemAction;
    if (!rc) continue;
    const decalage = Math.round(Number(rc.videoOffsetTimeMsec || 0) / 100) / 10;
    for (const a of rc.actions || []) {
      const item = a.addChatItemAction?.item;
      if (!item) continue;
      const m = item.liveChatTextMessageRenderer || item.liveChatPaidMessageRenderer;
      if (!m) continue;
      const msg = { id: m.id, auteur: m.authorName?.simpleText || '', texte: texteDesRuns(m.message?.runs), decalage };
      const photo = m.authorPhoto?.thumbnails?.at(-1)?.url;
      if (photo) msg.photo = photo;
      const role = roleDe(m.authorBadges);
      if (role) msg.role = role;
      const montant = m.purchaseAmountText?.simpleText;
      if (montant) msg.montant = montant;
      if (msg.texte || msg.montant) clavardage.push(msg);
    }
  }
  clavardage.sort((a, b) => a.decalage - b.decalage);
}

// ── 3. Les commentaires sous la vidéo ───────────────────────────────────────
const commentaires = (info.comments || []).map(c => {
  const o = { id: c.id, auteur: c.author || '', texte: c.text || '', publieLe: c.timestamp || 0, jaimes: c.like_count || 0 };
  if (c.parent && c.parent !== 'root') o.parent = c.parent;
  if (c.author_thumbnail) o.photo = c.author_thumbnail;
  if (c.author_is_uploader) o.hote = true;
  return o;
});

// ── 4. Firestore par REST, avec le jeton gcloud ─────────────────────────────
const TOKEN = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
async function fs(method, chemin, corps) {
  const res = await fetch(`${BASE}/${chemin}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Firestore ${method} ${chemin} : ${j.error?.message || res.status}`);
  return j;
}
const enc = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: champs(v) } };
};
const champs = o => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)]));
const doc = o => ({ fields: champs(o) });

// Le direct correspondant dans liveEvents : demandé en argument, sinon celui
// dont le lien (rediffusion ou diffusion) contient l'identifiant de la vidéo.
let liveEventId = liveDemande;
let titreDirect;
const lives = await fs('GET', 'liveEvents?pageSize=100');
const live = (lives.documents || []).find(d => liveEventId
  ? d.name.endsWith(`/${liveEventId}`)
  : ['replayUrl', 'youtubeUrl'].some(k => (d.fields?.[k]?.stringValue || '').includes(videoId)));
if (live) { liveEventId = live.name.split('/').pop(); titreDirect = live.fields?.title?.stringValue; }

const publieLe = new Date((info.release_timestamp || info.timestamp || Date.now() / 1000) * 1000);
const fiche = {
  videoId,
  url: `https://www.youtube.com/watch?v=${videoId}`,
  titre: titreDirect || info.title || '',
  titreYouTube: info.title || '',
  description: info.description || '',
  chaine: info.channel || '',
  vignette: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  duree: Math.round(info.duration || 0),
  publieLe,
  vues: info.view_count || 0,
  jaimes: info.like_count || 0,
  nbCommentaires: commentaires.length,
  nbMessages: clavardage.length,
  liveEventId,
  archiveLe: new Date(),
};

const pages = [];
const decouper = (type, items) => {
  for (let i = 0; i * PAR_PAGE < items.length; i++) pages.push({ type, index: i, items: items.slice(i * PAR_PAGE, (i + 1) * PAR_PAGE) });
};
decouper('clavardage', clavardage);
decouper('commentaires', commentaires);

await fs('PATCH', `rediffusions/${videoId}`, doc(fiche));
for (const p of pages) {
  const corps = doc(p);
  if (JSON.stringify(corps).length > 900_000) throw new Error(`Page ${p.type}-${p.index} trop grosse : baisser PAR_PAGE`);
  await fs('PATCH', `rediffusions/${videoId}/pages/${p.type}-${p.index}`, corps);
}
// Les pages d'une archive précédente plus longue que celle-ci ne doivent pas rester.
const gardees = new Set(pages.map(p => `${p.type}-${p.index}`));
const existantes = await fs('GET', `rediffusions/${videoId}/pages?pageSize=300`);
for (const d of existantes.documents || []) {
  const id = d.name.split('/').pop();
  if (!gardees.has(id)) await fs('DELETE', `rediffusions/${videoId}/pages/${id}`);
}
if (liveEventId) await fs('PATCH', `liveEvents/${liveEventId}?updateMask.fieldPaths=rediffusionId`, doc({ rediffusionId: videoId }));

console.log(`Archivé : ${fiche.titre} (${videoId}) · ${clavardage.length} messages du direct · ${commentaires.length} commentaires${liveEventId ? ` · direct ${liveEventId}` : ''}`);
