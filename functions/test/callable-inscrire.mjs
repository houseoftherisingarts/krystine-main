// La fonction `inscrireInfolettre`, vérifiée contre les émulateurs.
//
// Lancer (le build des fonctions doit être à jour) :
//   npm --prefix functions run build
//   firebase emulators:exec --only functions,firestore \
//     "node functions/test/callable-inscrire.mjs"
//
// Six cas : inscription ordinaire, alias jetable qui entre en quarantaine,
// deuxième inscription de la même adresse, pot de miel rempli, courriel
// invalide, puis la cadence par adresse IP au sixième appel de l'heure.

import assert from 'node:assert/strict';

const PROJET = process.env.GCLOUD_PROJECT || 'krystinestlaurent-87566';
const URL_FN = `http://127.0.0.1:5001/${PROJET}/us-central1/inscrireInfolettre`;
const URL_DB = `http://127.0.0.1:8080/v1/projects/${PROJET}/databases/(default)/documents`;

async function inscrire(data) {
  const r = await fetch(URL_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const rep = await r.json().catch(() => ({}));
  return { http: r.status, ok: r.ok && !rep.error, result: rep.result, error: rep.error };
}

/**
 * Les fiches d'une collection, lues par l'API REST de l'émulateur. Le jeton
 * « owner » est celui que l'émulateur reconnaît comme propriétaire : sans lui
 * les règles s'appliquent, et elles réservent la lecture à l'admin.
 */
async function fiches(col = 'newsletter') {
  const r = await fetch(`${URL_DB}/${col}?pageSize=300`, {
    headers: { Authorization: 'Bearer owner' },
  });
  const j = await r.json();
  return (j.documents || []).map(d => {
    const f = d.fields || {};
    const plat = {};
    for (const [k, v] of Object.entries(f)) {
      if ('stringValue' in v) plat[k] = v.stringValue;
      else if ('booleanValue' in v) plat[k] = v.booleanValue;
      else if ('timestampValue' in v) plat[k] = v.timestampValue;
      else if ('arrayValue' in v) plat[k] = (v.arrayValue.values || []).map(x => x.stringValue);
      else if ('mapValue' in v) plat[k] = Object.fromEntries(
        Object.entries(v.mapValue.fields || {}).map(([a, b]) => [a, b.stringValue ?? b.timestampValue]));
    }
    return plat;
  });
}

let reussis = 0, rates = 0;
function verifier(nom, fn) {
  try { fn(); reussis++; console.log(`  ✓ ${nom}`); }
  catch (e) { rates++; console.error(`  ✗ ${nom}\n      ${e.message}`); }
}

console.log('\ninscrireInfolettre');

// ── 1. Inscription ordinaire ────────────────────────────────────────────────
const r1 = await inscrire({
  email: '  Lectrice@Example.COM ', firstName: 'Lectrice', lang: 'fr',
  source: 'infolettre', tags: ['infolettre'], status: 'active',
});
verifier('inscription ordinaire acceptée', () => {
  assert.equal(r1.ok, true, `refusée : ${JSON.stringify(r1.error)}`);
  assert.equal(r1.result.status, 'active');
});

// ── 2. Alias jetable → quarantaine ──────────────────────────────────────────
const r2 = await inscrire({ email: 'quelquun@passmail.com', source: 'infolettre', tags: ['infolettre'] });
verifier('alias jetable accepté mais mis en quarantaine', () => {
  assert.equal(r2.ok, true, `refusée : ${JSON.stringify(r2.error)}`);
  assert.equal(r2.result.status, 'suspect');
});

// ── 3. Deuxième inscription de la même adresse ──────────────────────────────
const r3 = await inscrire({ email: 'lectrice@example.com', source: 'boutique', tags: ['boutique'] });
verifier('deuxième inscription de la même adresse acceptée', () => {
  assert.equal(r3.ok, true, `refusée : ${JSON.stringify(r3.error)}`);
});

// ── 4. Pot de miel ──────────────────────────────────────────────────────────
const r4 = await inscrire({ email: 'robot@example.com', source: 'infolettre', site: 'http://spam.example' });
verifier('pot de miel rempli → refus invalid-argument', () => {
  assert.equal(r4.ok, false);
  assert.equal(r4.error?.status, 'INVALID_ARGUMENT', JSON.stringify(r4.error));
});

// ── 5. Courriel invalide ────────────────────────────────────────────────────
const r5 = await inscrire({ email: 'pas-un-courriel', source: 'infolettre' });
verifier('courriel invalide → refus invalid-argument', () => {
  assert.equal(r5.ok, false);
  assert.equal(r5.error?.status, 'INVALID_ARGUMENT', JSON.stringify(r5.error));
});

// ── La forme du document ────────────────────────────────────────────────────
const liste = await fiches();
const ordinaire = liste.find(f => f.email === 'lectrice@example.com' && f.source === 'infolettre');
const suspecte = liste.find(f => f.email === 'quelquun@passmail.com');

verifier('le courriel est rangé en minuscules et sans espaces', () =>
  assert.ok(ordinaire, `pas trouvée parmi ${liste.map(f => f.email).join(', ')}`));
verifier('la fiche ordinaire porte les champs attendus', () => {
  assert.equal(ordinaire.status, 'active');
  assert.equal(ordinaire.firstName, 'Lectrice');
  assert.equal(ordinaire.lang, 'fr');
  assert.equal(ordinaire.source, 'infolettre');
  assert.deepEqual(ordinaire.tags, ['infolettre']);
  assert.match(ordinaire.unsubscribeToken, /^[0-9a-f]{36}$/);
  assert.ok(ordinaire.subscribedAt, 'subscribedAt manquant');
});
verifier('le pot de miel ne se retrouve JAMAIS dans la fiche', () =>
  assert.equal('site' in ordinaire, false));
verifier('aucune fiche créée pour le robot ni pour le courriel invalide', () => {
  assert.equal(liste.some(f => f.email === 'robot@example.com'), false);
  assert.equal(liste.some(f => String(f.email).includes('pas-un-courriel')), false);
});
verifier("l'alias jetable porte suspect, statusAvant, l'étiquette et le motif", () => {
  assert.ok(suspecte, 'fiche alias introuvable');
  assert.equal(suspecte.status, 'suspect');
  assert.equal(suspecte.statusAvant, 'active');
  assert.ok(suspecte.tags.includes('robot-potentiel'), JSON.stringify(suspecte.tags));
  assert.match(suspecte.robotPotentiel.raison, /passmail\.com/);
  assert.equal(suspecte.robotPotentiel.par, 'garde automatique');
});
verifier('la deuxième inscription est une fiche distincte, les deux existent', () =>
  assert.equal(liste.filter(f => f.email === 'lectrice@example.com').length, 2));

// ── 6. La cadence par adresse IP ────────────────────────────────────────────
// L'émulateur des fonctions ne remplit pas `rawRequest.ip` (vérifié : ni
// `req.ip`, ni `x-forwarded-for`, ni l'adresse du socket), et `limiterParIp`
// laisse passer tout appel qui arrive sans adresse, exprès : on ne ferme
// jamais la porte sur une donnée qu'on n'a pas. Le refus au sixième appel se
// vérifie donc sur le compteur lui-même, contre la même base émulée, avec une
// adresse explicite. C'est le même compteur que la fonction appelle, à la
// clé `infolettre` près.
const { initializeApp } = await import('firebase-admin/app');
const { limiterParIp, MESSAGE_CADENCE } = await import('../lib/newsletter/robots.js');
initializeApp({ projectId: PROJET });

const passages = [];
for (let i = 0; i < 6; i++) passages.push(await limiterParIp('203.0.113.7', 'infolettre'));
const autreIp = await limiterParIp('203.0.113.8', 'infolettre');

verifier('les cinq premiers appels d\'une même IP passent', () =>
  assert.deepEqual(passages.slice(0, 5), [true, true, true, true, true]));
verifier('le 6e appel de la même IP dans l\'heure est refusé', () =>
  assert.equal(passages[5], false));
verifier('une autre IP n\'est pas punie pour la première', () =>
  assert.equal(autreIp, true));
verifier('le message de refus est celui que la fonction renvoie', () =>
  assert.match(MESSAGE_CADENCE, /Trop de tentatives/));

console.log(`\n${reussis} réussis · ${rates} ratés`);
assert.equal(rates, 0, `${rates} test(s) de la callable en échec`);
