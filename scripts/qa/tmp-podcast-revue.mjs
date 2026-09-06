import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/revue/podcast';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'https://krystinestlaurent.ca/podcast';

const report = {};

const browser = await chromium.launch();

// ---------- DESKTOP 1440 ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  // D1 — carte de rediffusion : capture pleine page desktop (état initial)
  await page.screenshot({ path: `${OUT}/d1-desktop-full.png`, fullPage: true });

  // Localiser la carte noire LiveSignup et son iframe
  const cardBox = await page.evaluate(() => {
    // La carte LiveSignup: motion.div relative avec bg-[#161311]
    const el = [...document.querySelectorAll('div')].find(d =>
      getComputedStyle(d).backgroundColor === 'rgb(22, 19, 17)'
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const iframeInfo = await page.evaluate(() => {
    const ifr = document.querySelector('iframe[src*="youtube.com/embed"]');
    if (!ifr) return null;
    const r = ifr.getBoundingClientRect();
    return { src: ifr.src, x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 };
  });
  const blankYoutubeLinks = await page.evaluate(() =>
    [...document.querySelectorAll('a[target="_blank"]')]
      .filter(a => a.href.includes('youtube'))
      .map(a => ({ href: a.href, text: a.textContent.trim() }))
  );
  report.d1 = { cardBox, iframeInfo, blankYoutubeLinks };

  // Screenshot ciblé de la carte noire (zone rediffusion) pour D1
  const cardHandle = await page.$('div.bg-\\[\\#161311\\]');
  if (cardHandle) {
    await cardHandle.screenshot({ path: `${OUT}/d1-carte-noire.png` });
  }

  // ---------- D2 — ouvrir les deux saisons ----------
  // Cliquer sur "Saison 1" pour l'ouvrir (Saison 2 est ouverte par défaut, openSeason=2)
  const saison1Btn = await page.locator('button:has-text("Saison 1")').first();
  await saison1Btn.scrollIntoViewIfNeeded();
  await saison1Btn.click();
  await page.waitForTimeout(600);
  // S'assurer que Saison 2 reste ouverte aussi -> on doit avoir les deux ouvertes.
  // Le state est un seul openSeason (1 OU 2) donc on ne peut ouvrir qu'une à la fois.
  const openSeasonState = await page.evaluate(() => {
    // Repère les boutons Saison et regarde s'ils ont une liste de boutons d'épisodes juste après
    const btns = [...document.querySelectorAll('button')].filter(b => /Saison \d/.test(b.textContent || ''));
    return btns.map(b => {
      const parent = b.closest('div');
      const hasOpenList = parent ? !!parent.querySelector('button + div, div > button') : false;
      return { label: b.textContent.trim(), rotated: b.querySelector('svg')?.getAttribute('class')?.includes('rotate-180') };
    });
  });
  report.d2_afterClickSaison1 = openSeasonState;
  await page.screenshot({ path: `${OUT}/d2-saison1-ouverte.png`, fullPage: true });

  // Lire la liste des épisodes affichés sous Saison 1
  const saison1Episodes = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const s1btn = btns.find(b => /^Saison 1/.test(b.textContent.replace(/\s+/g,' ').trim()));
    if (!s1btn) return null;
    const container = s1btn.parentElement; // div key={s}
    const list = container.nextElementSibling ? null : null;
    // Le conteneur de la liste est le div sibling du bouton à l'intérieur du div key={s}
    const listDiv = s1btn.nextElementSibling;
    if (!listDiv) return { found: false };
    const nums = [...listDiv.querySelectorAll('h3')].map((h3, i) => {
      const numSpan = h3.parentElement.querySelector('span');
      return { num: numSpan ? numSpan.textContent.trim() : null, title: h3.textContent.trim() };
    });
    return { found: true, count: nums.length, first3: nums.slice(0,3), last3: nums.slice(-3) };
  });
  report.d2_saison1_list = saison1Episodes;

  // Rouvrir Saison 2 pour vérifier son contenu (0 = Quand le vide crée le plein, 1 = rediffusion)
  const saison2Btn = await page.locator('button:has-text("Saison 2")').first();
  await saison2Btn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/d2-saison2-ouverte.png`, fullPage: true });
  const saison2Episodes = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const s2btn = btns.find(b => /^Saison 2/.test(b.textContent.replace(/\s+/g,' ').trim()));
    if (!s2btn) return null;
    const listDiv = s2btn.nextElementSibling;
    if (!listDiv) return { found: false };
    const nums = [...listDiv.querySelectorAll('h3')].map((h3) => {
      const numSpan = h3.parentElement.querySelector('span');
      return { num: numSpan ? numSpan.textContent.trim() : null, title: h3.textContent.trim() };
    });
    return { found: true, count: nums.length, items: nums };
  });
  report.d2_saison2_list = saison2Episodes;

  // Vue combinée : rouvrir Saison 1 en plus si le layout permet les deux simultanément
  // (le state React n'autorise qu'une saison ouverte à la fois -> capturer côte à côte impossible nativement)
  report.d2_note = 'Le state React (openSeason: 1|2|null) n\'autorise qu\'UNE saison ouverte à la fois ; capturé successivement.';

  // ---------- D3 — mesures pleine largeur ----------
  const boxes = await page.evaluate(() => {
    function boxOf(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: window.innerWidth - r.right, width: r.width };
    }
    // Carte rediffusion (LiveSignup outer)
    const liveCard = [...document.querySelectorAll('div')].find(d => getComputedStyle(d).backgroundColor === 'rgb(22, 19, 17)');
    const liveBox = liveCard ? (() => { const r = liveCard.getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, width: r.width }; })() : null;

    // Grille des saisons: le div.grid.gap-8.lg:grid-cols-2 (archive)
    const archiveGrid = document.querySelector('.grid.gap-8.lg\\:grid-cols-2');
    const archiveBox = archiveGrid ? (() => { const r = archiveGrid.getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, width: r.width }; })() : null;

    // Infolettre: la section bg-[#efe6d7] avec le formulaire
    const sections = [...document.querySelectorAll('section')];
    const newsletterSection = sections.find(s => getComputedStyle(s).backgroundColor === 'rgb(239, 230, 215)');
    const newsletterInner = newsletterSection ? newsletterSection.querySelector('div.grid') : null;
    const newsletterBox = newsletterInner ? (() => { const r = newsletterInner.getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, width: r.width }; })() : null;

    // Clôture: footer, la div text-left interne
    const footer = document.querySelector('footer');
    const footerInner = footer ? footer.querySelector('div.text-left') : null;
    const footerBox = footerInner ? (() => { const r = footerInner.getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, width: r.width }; })() : null;

    return { viewportWidth: window.innerWidth, liveBox, archiveBox, newsletterBox, footerBox };
  });
  report.d3_boxes = boxes;

  await page.close();
}

// ---------- MOBILE 390 ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/d5-mobile-full.png`, fullPage: true });
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const innerWidth = await page.evaluate(() => window.innerWidth);
  report.d5 = { scrollWidth, innerWidth, overflow: scrollWidth > innerWidth };
  await page.close();
}

await browser.close();

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
