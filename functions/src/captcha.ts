import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const RECAPTCHA_SECRET = defineSecret('RECAPTCHA_SECRET');

// Vérifie un jeton reCAPTCHA v2 avant la création d'un compte par courriel.
// Le client bloque le formulaire tant que cette vérification n'a pas répondu
// oui. ponytail: la barrière vit au formulaire; un appel direct à Firebase
// Auth la contourne. L'étape au-dessus est Identity Platform + blocking
// function beforeUserCreated, à brancher si le spam de comptes devient réel.
export const verifierCaptcha = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET] },
  async (req) => {
    const token = String(req.data?.token || '');
    if (!token) throw new HttpsError('invalid-argument', 'Jeton captcha manquant.');
    const body = new URLSearchParams({ secret: RECAPTCHA_SECRET.value(), response: token });
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await r.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      throw new HttpsError('permission-denied', 'Vérification captcha refusée.');
    }
    return { ok: true };
  },
);
