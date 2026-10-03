import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/e5a38fa2-e2b8-4726-b3a3-ab51549a9e1a/scratchpad/relecture-quiz/';
const profils={equilibre:[4,4,3],double:[5,5,1],teinte:[5,4,2]};
const b=await chromium.launch();
for(const [nom,[v,p,k]] of Object.entries(profils)){
  const pick=[...Array(v).fill(1),...Array(p).fill(2),...Array(k).fill(3)];
  const ctx=await b.newContext({viewport:{width:1440,height:1000}});const pg=await ctx.newPage();
  await pg.goto('https://www.krystinestlaurent.ca/quiz',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(4000);
  const non=pg.getByRole('button',{name:/non merci/i}); if(await non.count()) await non.first().click();
  for(let i=0;i<11;i++){
    const L=pg.locator('button').filter({hasText:new RegExp('^0'+pick[i])}); if(!(await L.count())){console.log('absent à',i,await pg.locator('main').innerText().then(t=>t.slice(0,400)));break;}
    await L.first().click();
    await pg.waitForTimeout(900);
  }
  await pg.waitForTimeout(2500);
  const h=await pg.locator('h2').allInnerTexts(); console.log(nom,h);
  const txt=await pg.locator('main').innerText(); console.log(txt.slice(0,900));
  const el=pg.locator('h2:has-text("Vent"), h2:has-text("Feu"), h2:has-text("Terre")').first();
  await el.scrollIntoViewIfNeeded();
  await pg.screenshot({path:OUT+`site-${nom}.png`,fullPage:false});
  await ctx.close();
}
await b.close();
