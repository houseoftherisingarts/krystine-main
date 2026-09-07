// QA LOT C : la messagerie d'origine, la cloche, la navigation. Trois comptes
// jetables (A et B au Foyer, amies; C sans le Foyer), un fil A__B semé par REST,
// captures 1440 et 390 dans OUT, tout effacé à la fin.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const PROJET = 'krystinestlaurent-87566';
const BASE = process.env.BASE || 'http://localhost:5199';
const OUT = process.env.OUT || 'scripts/qa/shots';
const SEUL = process.env.SEUL || '';
fs.mkdirSync(OUT, { recursive: true });
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
const FS = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const fsdoc = async (path, fields, mask) => {
  const u = `${FS}/${path}` + (mask ? '?' + mask.map(m => 'updateMask.fieldPaths=' + m).join('&') : '');
  const r = await fetch(u, { method: 'PATCH', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!r.ok) console.log('firestore', path, r.status, await r.text());
};
const fsdel = async (path) => fetch(`${FS}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${gtoken}` } });
const now = { timestampValue: new Date().toISOString() };
const s = v => ({ stringValue: v });

const creer = async (nom, dosha, foyer) => {
  const email = `qa-${nom.toLowerCase().replace(/[^a-z]/g, '')}-${Date.now()}@vexel-qa.test`;
  const password = 'Qa!' + Math.random().toString(36).slice(2, 12);
  const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password, returnSecureToken: true });
  const uid = u.localId;
  const ecrits = [`members/${uid}`];
  await fsdoc(`members/${uid}`, { uid: s(uid), email: s(email), displayName: s(nom), dosha: s(dosha), joinedAt: now, lastSeenAt: now });
  if (foyer) {
    await fsdoc(`achatsFormations/${uid}/formations/foyer`, { titre: s('Le Foyer d’Origine'), source: s('qa'), acheteLe: now });
    await fsdoc(`groupes/foyer/membres/${uid}`, { ajouteLe: now });
    ecrits.push(`achatsFormations/${uid}/formations/foyer`, `groupes/foyer/membres/${uid}`);
  }
  const authUser = { uid, email, emailVerified: false, isAnonymous: false, displayName: nom, providerData: [{ providerId: 'password', uid: email, displayName: null, email, phoneNumber: null, photoURL: null }],
    stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + Number(u.expiresIn) * 1000 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
  console.log('compte', nom, uid);
  return { uid, email, idToken: u.idToken, authUser, ecrits };
};

const A = await creer('Aline Foyer', 'pitta', true);
const B = await creer('Béatrice Braise', 'vata', true);
const C = await creer('Claire Visiteuse', 'kapha', false);
const paire = [A.uid, B.uid].sort();
const cleAmitie = paire.join('__');
await fsdoc(`amities/${cleAmitie}`, { paire: { arrayValue: { values: paire.map(s) } }, de: s(A.uid), statut: s('amis'), maj: now });
// Un fil déjà commencé par B : la boîte de A a quelque chose à montrer, la cloche aussi.
await fsdoc(`dms/${cleAmitie}`, {
  participantUids: { arrayValue: { values: paire.map(s) } },
  participantNames: { mapValue: { fields: { [A.uid]: s('Aline Foyer'), [B.uid]: s('Béatrice Braise') } } },
  lastMessage: s('Bonsoir Aline, je garde le feu allumé ce soir. Tu passes ?'),
  lastMessageAt: now, lastSenderUid: s(B.uid),
  unread: { mapValue: { fields: { [A.uid]: { integerValue: '1' }, [B.uid]: { integerValue: '0' } } } },
});
await fsdoc(`dms/${cleAmitie}/messages/qa1`, { senderUid: s(B.uid), senderName: s('Béatrice Braise'), body: s('Bonsoir Aline, je garde le feu allumé ce soir. Tu passes ?'), createdAt: now });
const aEffacer = [...A.ecrits, ...B.ecrits, ...C.ecrits, `amities/${cleAmitie}`, `dms/${cleAmitie}/messages/qa1`, `dms/${cleAmitie}`];

const browser = await chromium.launch();
const logs = [];
const session = async (compte, mobile) => {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (/\[dms\]|permission|index/i.test(t)) logs.push(`${compte.authUser.displayName}: ${t.slice(0, 300)}`); });
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(([key, val]) => new Promise((res, rej) => {
    localStorage.setItem('krystine-jeu-vu', new Date().toISOString().slice(0, 10));
    localStorage.setItem('krystine-banniere-flash-vu', '1');
    localStorage.setItem('inspirata.consent.v1', 'rejected');
    const req = indexedDB.open('firebaseLocalStorageDb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
    req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); tx.onerror = rej; };
    req.onerror = rej;
  }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, compte.authUser]);
  const fermerRoue = async () => { const r = page.locator('.fixed.inset-0.z-\\[125\\]'); if (await r.count()) { await r.first().click({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500); } };
  const aller = async (chemin, attente = 3000) => {
    await page.goto(`${BASE}${chemin}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[class*="h-80"] img', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(attente); await fermerRoue();
  };
  const shot = async (nom, opts = {}) => { await page.screenshot({ path: `${OUT}/${nom}.png`, fullPage: true, ...opts }); console.log('capture', nom); };
  const mesures = async () => page.evaluate(() => {
    const nav = document.querySelector('nav');
    const boutons = [...nav.querySelectorAll('button, a')].filter(b => b.getBoundingClientRect().width > 0);
    const dernier = boutons[boutons.length - 1].getBoundingClientRect();
    const marque = nav.querySelector('a[title]')?.getBoundingClientRect();
    return { largeurDoc: document.documentElement.scrollWidth, dernierDroite: Math.round(dernier.right), marqueLargeur: Math.round(marque?.width || 0), marqueDroite: Math.round(marque?.right || 0), nbBoutons: boutons.length };
  });
  return { ctx, page, aller, shot, fermerRoue, mesures };
};

try {
  // ── A, bureau ──
  {
    const { ctx, page, aller, shot } = await session(A, false);
    await aller('/messages');
    await shot('messages-liste-1440');
    await aller(`/messages/${B.uid}`, 3500);
    const zone = page.locator('textarea');
    if (await zone.count()) {
      await zone.fill('Bonsoir Béatrice, j’arrive avec le thé.');
      await zone.press('Enter');
      await page.waitForTimeout(3000);
    } else console.log('fil : aucune zone de texte');
    await shot('messages-fil-1440');
    await aller('/compte?onglet=amis');
    await shot('compte-amis-1440');
    await aller('/compte?onglet=messagerie');
    await shot('compte-messagerie-1440');
    await aller('/compte');
    await page.locator('nav button[aria-label^="Notifications"]').click(); await page.waitForTimeout(700);
    await shot('cloche-notifications-1440', { fullPage: false });
    await page.locator('nav button[title="Messagerie"]').click(); await page.waitForTimeout(700);
    await shot('cloche-messages-1440', { fullPage: false });
    // Le skin nuit, en dernier
    await fsdoc(`members/${A.uid}`, { personnalisation: { mapValue: { fields: { skin: s('nuit') } } } }, ['personnalisation.skin']);
    await aller('/messages', 3500);
    await shot('messages-nuit-1440');
    await ctx.close();
  }
  // ── A, mobile ──
  {
    const { ctx, page, aller, shot, mesures } = await session(A, true);
    await fsdoc(`members/${A.uid}`, { personnalisation: { mapValue: { fields: { skin: s('') } } } }, ['personnalisation.skin']);
    await aller('/messages');
    console.log('mesures /messages 390', JSON.stringify(await mesures()));
    await shot('messages-liste-390');
    await aller(`/messages/${B.uid}`, 3500);
    await shot('messages-fil-390');
    await aller('/compte');
    console.log('mesures /compte 390', JSON.stringify(await mesures()));
    await shot('entete-390', { fullPage: false, clip: { x: 0, y: 0, width: 390, height: 120 } });
    await ctx.close();
  }
  // ── C, sans le Foyer ──
  {
    const { ctx, aller, shot } = await session(C, false);
    await aller('/messages');
    await shot('messages-garde-1440');
    await ctx.close();
  }
} finally {
  await browser.close();
  console.log('console :', logs.length ? '\n' + [...new Set(logs)].join('\n') : 'rien');
  for (const c of [A, B, C]) await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: c.idToken });
  for (const p of aEffacer) await fsdel(p);
  console.log('fini, comptes et documents effacés');
}
