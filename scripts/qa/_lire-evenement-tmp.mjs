import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
const env = Object.fromEntries(readFileSync(['.env.local','.env.production','.env'].find(f=>{try{readFileSync(f);return true}catch{return false}}),'utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const snap = await getDocs(query(collection(db,'events'), where('slug','==','lancement-anglicane')));
for (const d of snap.docs) console.log(JSON.stringify({ id: d.id, ...d.data() }, null, 1));
const all = await getDocs(collection(db,'events'));
console.log('---TOUS---'); for (const d of all.docs) { const x=d.data(); console.log(d.id, '|', x.title, '|', x.date, '|', 'pub=' + x.isPublished, '| slug=' + x.slug); }
process.exit(0);
