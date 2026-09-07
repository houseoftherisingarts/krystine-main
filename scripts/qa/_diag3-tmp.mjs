import { chromium } from 'playwright';
const BASE = 'http://localhost:5196';
const cfg = { apiKey: 'AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk', authDomain: 'krystinestlaurent-87566.firebaseapp.com', projectId: 'krystinestlaurent-87566' };
const email = `qa-gamification-${Date.now()}@example.com`;
const password = 'motdepasse-qa-123';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

const res = await page.evaluate(async ({ cfg, email, password }) => {
  const appMod = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js');
  const authMod = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js');
  const app = appMod.initializeApp(cfg);
  const auth = authMod.getAuth(app);
  await authMod.setPersistence(auth, authMod.browserLocalPersistence);
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  return { uid: cred.user.uid, email: cred.user.email };
}, { cfg, email, password }).catch(e => ({ erreur: String(e) }));
console.log('résultat injection', JSON.stringify(res));

await page.goto(`${BASE}/compte`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/diag-client-1440.png', fullPage: true });
await browser.close();
