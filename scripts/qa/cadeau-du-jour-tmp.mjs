// Script TEMPORAIRE de vérification du cadeau du jour — à supprimer après usage.
// Orchestre les manipulations REST (Firestore) et les captures Playwright.
// Variables d'env requises : KRYSTINE_ADMIN_PW (mot de passe du compte de test).
import { chromium } from 'playwright';

const PROJECT = 'krystinestlaurent-87566';
const UID = 'NmRjefwpVEXGrMLF3mO47KXflJj2'; // admin@krystinestlaurent.ca
const EMAIL = 'admin@krystinestlaurent.ca';
const PW = process.env.KRYSTINE_ADMIN_PW;
const BASE = process.env.BASE || 'http://localhost:5195';
if (!PW) { console.error('KRYSTINE_ADMIN_PW manquant'); process.exit(1); }

const TOKEN = (await (await fetch('https://oauth2.googleapis.com/token')).text(), null); // placeholder, remplacé plus bas
