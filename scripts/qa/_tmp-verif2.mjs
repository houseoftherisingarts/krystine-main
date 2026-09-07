import { chromium } from 'playwright';
const b = await chromium.launch();

async function scrollAndShoot(url, name, w, h) {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += Math.floor(h * 0.8)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(180);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/verif-krystine/${name}-${w}.png`, fullPage: true });
  const text = await page.evaluate(() => document.body.innerText);
  await page.close();
  return text;
}

const t1 = await scrollAndShoot('https://www.krystinestlaurent.ca/medias', 'medias2', 1440, 900);
console.log('--- medias contient "Titre à révéler" ?', t1.includes('Titre à révéler'));
console.log('--- medias contient "titre-a-reveler" affiché ?', /nature.*ayurveda.*féminité.*ayurveda/is.test(t1));

const t2 = await scrollAndShoot('https://www.krystinestlaurent.ca/foyer', 'foyer2', 1440, 900);
console.log('--- foyer contient "Élaguer pour mieux voir" ?', t2.includes('Élaguer pour mieux voir'));
console.log('--- foyer contient "Élaguer pour voir" (sans mieux) ?', /Élaguer pour voir[^ e]/i.test(t2));
console.log('--- foyer contient "fleur" / "thème du mois" (devrait être absent) ?', /thème du mois/i.test(t2));
console.log('--- foyer contient "Le Foyer, c\'est quoi" ?', t2.includes('Le Foyer, c’est quoi') || t2.includes("Le Foyer, c'est quoi"));
console.log('--- foyer contient "Pas de parcours à suivre" ?', t2.includes('Pas de parcours à suivre'));

await scrollAndShoot('https://www.krystinestlaurent.ca/medias', 'medias2m', 390, 844);
await scrollAndShoot('https://www.krystinestlaurent.ca/foyer', 'foyer2m', 390, 844);

await b.close();
console.log('fait');
