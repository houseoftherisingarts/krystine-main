import { build } from 'esbuild';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const OUT='/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/e5a38fa2-e2b8-4726-b3a3-ab51549a9e1a/scratchpad/relecture-quiz/';
await build({entryPoints:['functions/src/quizCourriel.ts'],bundle:true,format:'esm',outfile:OUT+'_q.mjs',platform:'node',logLevel:'error'});
const q=await import(OUT+'_q.mjs');
const cas={equilibre:{vata:40,pitta:30,kapha:30},double:{vata:40,pitta:40,kapha:20},teinte:{vata:50,pitta:40,kapha:10}};
const b=await chromium.launch();
const textes={};
for(const [n,p] of Object.entries(cas)){
  const r={prenom:'Krystine',dominant:'vata',pourcentages:p,suite:true};
  const h=q.renderResultatHtml(r);
  writeFileSync(OUT+`_mail-${n}.html`,h);
  textes[n]={branche:q.lireProfil(p).branche,second:q.phraseSecond(q.lireProfil(p)),etiq:q.lireProfil(p).etiquettes};
  const pg=await b.newPage({viewport:{width:640,height:900}});
  await pg.setContent(h,{waitUntil:'networkidle'}).catch(()=>{});
  await pg.waitForTimeout(1500);
  await pg.screenshot({path:OUT+`courriel-${n}.png`,fullPage:true});
  await pg.close();
}
console.log(JSON.stringify(textes,null,1));
await b.close();
