// QA temporaire : capture du fil de la communauté (CommunauteEspace), monté sur /tmp-fil-qa le temps de la capture.
import { chromium } from 'playwright';
import fs from 'node:fs';
const API_KEY = fs.readFileSync('.env.local', 'utf8').match(/VITE_FIREBASE_API_KEY=(.+)/)[1].trim();
const BASE = 'http://localhost:5199';
const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/avant';
const rest = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const email = `qa-fil-${Date.now()}@vexel-qa.test`;
const u = await rest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { email, password: 'Qa!' + Math.random().toString(36).slice(2, 12), returnSecureToken: true });
const session = { uid: u.localId, email, emailVerified: false, isAnonymous: false, displayName: 'Test QA Fil', providerData: [], stsTokenManager: { refreshToken: u.refreshToken, accessToken: u.idToken, expirationTime: Date.now() + 3600e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()), apiKey: API_KEY, appName: '[DEFAULT]' };
const browser = await chromium.launch();
try {
  for (const [vp, viewport] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${BASE}/robots.txt`);
    await page.evaluate(([key, val]) => new Promise((res, rej) => { localStorage.setItem('krystine-jeu-vu', '2099-01-01'); localStorage.setItem('krystine-roue-vue', '2099-01-01'); const req = indexedDB.open('firebaseLocalStorageDb', 1); req.onupgradeneeded = () => req.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' }); req.onsuccess = () => { const tx = req.result.transaction('firebaseLocalStorage', 'readwrite'); tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value: val }); tx.oncomplete = () => res(true); }; req.onerror = rej; }), [`firebase:authUser:${API_KEY}:[DEFAULT]`, session]);
    await page.goto(`${BASE}/tmp-fil-qa`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${OUT}/fil-communaute-${vp}.png`, fullPage: true });
    const m = await page.evaluate(() => {
      const h1 = document.querySelector('h1'); const grille = document.querySelector('#root .grid');
      const ital = [...document.querySelectorAll('#root *')].filter(el => getComputedStyle(el).fontStyle === 'italic' && el.textContent.trim()).map(el => el.textContent.trim().slice(0, 50));
      return { h1: h1 && { texte: h1.textContent, font: getComputedStyle(h1).fontFamily.split(',')[0], taille: getComputedStyle(h1).fontSize, couleur: getComputedStyle(h1).color }, grille: grille && Math.round(grille.getBoundingClientRect().width), fond: getComputedStyle(document.querySelector('#root > div > div') || document.body).backgroundColor, articles: document.querySelectorAll('article').length, italiques: ital, hauteur: document.documentElement.scrollHeight };
    });
    console.log(vp, JSON.stringify(m));
    await page.close();
  }
} finally {
  await browser.close();
  await rest(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, { idToken: u.idToken });
  console.log('nettoyé');
}
