import fs from 'node:fs';
const src = fs.readFileSync('scripts/qa/tmp-lot-b.mjs', 'utf8');
const debut = src.slice(0, src.indexOf('try {'));
const fin = src.slice(src.indexOf('} finally {'));
const milieu = `
try {
  const m = await ouvrir(A, 'Marie Référence', true);
  await aller(m, '/membres'); await shot(m, 'membres-toutes-390');
  await aller(m, '/membres?vue=demandes'); await shot(m, 'membres-demandes-390');
  await aller(m, \`/membre/\${B.uid}\`); await shot(m, 'membre-autre-390');
  await m.context().close();
  const a = await ouvrir(A, 'Marie Référence', false);
  await aller(a, \`/membre/\${B.uid}\`); await shot(a, 'membre-autre-1440');
  await aller(a, '/membres?vue=demandes'); await shot(a, 'membres-demandes-1440');
  await aller(a, '/cours/foyer', 'h2');
  await a.evaluate(() => { const p = [...document.querySelectorAll('p')].find(e => /^Membres · \\d+/.test(e.textContent.trim())); if (p) window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - 260); });
  await a.waitForTimeout(800);
  await a.screenshot({ path: \`\${OUT}/cours-foyer-groupe-1440.png\`, fullPage: false });
  await a.context().close();
`;
fs.writeFileSync('scripts/qa/tmp-lot-b-tour4.run.mjs', debut + milieu + fin);
