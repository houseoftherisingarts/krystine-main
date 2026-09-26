import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [w,h] of [[1440,900],[390,844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.addInitScript(() => localStorage.setItem('inspirata.consent.v1', 'refused'));
  // Réponses simulées : aucune vraie fiche n'est touchée.
  await p.route('**/unsubscribeByToken**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(r.request().url().includes('annuler=1') ? { ok: true, email: 'exemple@courriel.com', reabonne: true } : { ok: true, email: 'exemple@courriel.com' }) }));
  await p.goto('http://localhost:5199/desinscription?t=abc123', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/f1048a60-6aa3-444b-9ef5-ea97f17e53df/scratchpad/u1-'+w+'.png' });
  await p.getByText('Oups').click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-ksl-Documents-Inspira-Nature/f1048a60-6aa3-444b-9ef5-ea97f17e53df/scratchpad/u2-'+w+'.png' });
  console.log(w, await p.locator('h1').first().innerText());
}
await b.close();
