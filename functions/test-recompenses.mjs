// Test unitaire local, sans réseau ni clé, des corps de requête Stripe que
// echangerRecompense bâtit (functions/src/recompenses.ts, compilé dans
// lib/). `node test-recompenses.mjs`.
import assert from 'node:assert/strict';
import { corpsCouponFormation, corpsPromotionCode, genererCodePromo, RECOMPENSES_ECHANGEABLES } from './lib/recompenses.js';

// Le coupon : 50 $ CA, une seule fois.
const coupon = corpsCouponFormation();
assert.equal(coupon.get('amount_off'), '5000', '50 $ en cents');
assert.equal(coupon.get('currency'), 'cad');
assert.equal(coupon.get('duration'), 'once');

// Le code de promotion : une utilisation, jamais sous 50 $.
const promo = corpsPromotionCode('coupon_test123', 'NISKASABCDEF', 'uid-de-test');
assert.equal(promo.get('coupon'), 'coupon_test123');
assert.equal(promo.get('code'), 'NISKASABCDEF');
assert.equal(promo.get('max_redemptions'), '1', 'une seule utilisation');
assert.equal(promo.get('restrictions[minimum_amount]'), '5000', 'jamais sous 50 $');
assert.equal(promo.get('restrictions[minimum_amount_currency]'), 'cad');
assert.equal(promo.get('metadata[uid]'), 'uid-de-test');

// Le code généré est déterministe dans sa forme, unique dans le temps.
const c1 = genererCodePromo('AbCdEfGh12345');
assert.match(c1, /^NISKASABCDEF[0-9A-Z]+$/, 'préfixe + 6 premiers caractères de l’uid, en majuscules');

// Le catalogue échangeable : exactement les trois récompenses actives
// (les « bientôt » n'ont pas d'entrée, donc echangerRecompense les refuse).
assert.deepEqual(
  Object.keys(RECOMPENSES_ECHANGEABLES).sort(),
  ['masterclass-source', 'reb-10-boutique', 'reb-formation'].sort(),
);
assert.equal(RECOMPENSES_ECHANGEABLES['reb-formation'].cost, 435);
assert.equal(RECOMPENSES_ECHANGEABLES['reb-10-boutique'].cost, 500);
assert.equal(RECOMPENSES_ECHANGEABLES['masterclass-source'].cost, 725);

console.log('OK — test-recompenses : 13 assertions passées.');
