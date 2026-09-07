// Tour 2 du LOT B : les écrans corrigés seulement (voir tmp-lot-b.mjs pour la mise en place).
import fs from 'node:fs';
const src = fs.readFileSync('scripts/qa/tmp-lot-b.mjs', 'utf8');
const debut = src.slice(0, src.indexOf('try {'));
const fin = src.slice(src.indexOf('} finally {'));
const milieu = `
try {
  const a = await ouvrir(A, 'Marie Référence', false);
  await aller(a, '/membres?vue=demandes'); await shot(a, 'membres-demandes-1440');
  await aller(a, \`/membre/\${B.uid}\`); await shot(a, 'membre-autre-1440');
  await a.context().close();
  const m = await ouvrir(A, 'Marie Référence', true);
  await aller(m, '/membres'); await shot(m, 'membres-toutes-390');
  await aller(m, \`/membre/\${B.uid}\`); await shot(m, 'membre-autre-390');
  await aller(m, '/membres?vue=demandes'); await shot(m, 'membres-demandes-390');
  await aller(m, '/cours/foyer', 'h2');
  const section = m.locator('h2', { hasText: /Autour du feu/ }).first();
  if (await section.count()) { await section.scrollIntoViewIfNeeded(); await m.waitForTimeout(800); }
  await m.screenshot({ path: \`\${OUT}/cours-foyer-groupe-390.png\`, fullPage: false });
  const membresTitre = m.locator('p', { hasText: /^Membres · \\d+$/ }).first();
  if (await membresTitre.count()) { await membresTitre.scrollIntoViewIfNeeded(); await m.evaluate(() => window.scrollBy(0, -120)); await m.waitForTimeout(600); }
  await m.screenshot({ path: \`\${OUT}/cours-foyer-groupe-membres-390.png\`, fullPage: false });
  console.log('cours-foyer-groupe-390', JSON.stringify(await m.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))));
  await m.context().close();
`;
fs.writeFileSync('scripts/qa/tmp-lot-b-tour2.run.mjs', debut + milieu + fin);
