import { chromium } from 'playwright';
const S=process.argv[2]; const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
await ctx.addInitScript(()=>{try{localStorage.setItem('krystine-lang','fr');localStorage.setItem('consent-v1','accepted');}catch{}});
const h1info=async(p)=>p.evaluate(()=>{const h=document.querySelector('h1'); if(!h) return null; const cs=getComputedStyle(h); const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.2; return {t:h.textContent.trim().slice(0,50), lines:Math.round(h.getBoundingClientRect().height/lh)};});
// Foyer : bas d'écran après un peu de défilement, puis le calendrier
let p=await ctx.newPage(); await p.goto('https://krystinestlaurent.ca/foyer',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(6000);
console.log('foyer h1', JSON.stringify(await h1info(p)));
for(let i=0;i<3;i++){ await p.mouse.wheel(0,760); await p.waitForTimeout(600); }
await p.screenshot({path:`${S}/v-foyer-band.png`});
// jusqu'à la grille des mois
let found=false; for(let i=0;i<40;i++){ await p.mouse.wheel(0,600); await p.waitForTimeout(350); const r=await p.evaluate(()=>{const g=document.querySelector('[aria-label="Les douze portes"]'); if(!g) return null; const b=g.getBoundingClientRect(); return b.top;}); if(r!==null && r<500 && r>0){found=true;break;} }
await p.waitForTimeout(800); await p.screenshot({path:`${S}/v-foyer-grid.png`}); console.log('grid found', found);
await p.tap('[aria-label="Les douze portes"] button:nth-child(3)').catch(e=>console.log('tap fail', e.message.slice(0,80))); await p.waitForTimeout(1500); await p.screenshot({path:`${S}/v-foyer-grid-open.png`});
await p.close();
// Accueil et communauté : lignes du h1
for (const r of ['/accueil','/communaute']) { p=await ctx.newPage(); await p.goto('https://krystinestlaurent.ca'+r,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(7000); console.log(r, JSON.stringify(await h1info(p))); if(r==='/accueil') await p.screenshot({path:`${S}/v-accueil.png`}); await p.close(); }
// Origine : stabilité sur trois chargements
for (let i=0;i<3;i++){ p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120))); await p.goto('https://krystinestlaurent.ca/origine',{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(6000); console.log('origine', i, JSON.stringify(await h1info(p)), errs.slice(0,2)); await p.close(); }
await b.close();
