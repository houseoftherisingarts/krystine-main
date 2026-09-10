// Contrôle du moteur d'offres (src/lib/offres.ts), à la main, sans cadre de
// test : node --test aurait fait l'affaire mais un script direct suffit et
// reste lisible. Lance avec : node src/lib/offres.test.mjs
//
// Chaque cas construit son propre contexte minimal; si l'ordre des règles
// change, ou si une offre se propose un jour pour quelque chose que la
// personne possède déjà, une assertion casse ici.
import assert from 'node:assert/strict';
import { offrePour } from './offres.ts';

const JOUR_MS = 24 * 60 * 60 * 1000;

const VIDE = {
  dosha: undefined,
  joinedAtMs: Date.now() - 400 * JOUR_MS, // un vieux compte par défaut
  maintenantMs: Date.now(),
  familles: {},
  formationsPubliees: [],
  formationsPossedees: [],
  aCommandeBoutique: false,
};

let n = 0;
function cas(nom, fn) {
  n++;
  fn();
  console.log(`ok ${n} - ${nom}`);
}

// a) Vata, formation pas possédée → le programme Vata, page /vata.
cas('Vata sans le programme reçoit le Programme Vata', () => {
  const offre = offrePour({ ...VIDE, dosha: 'Vata' });
  assert.equal(offre.id, 'dosha-vata');
  assert.equal(offre.destination, '/vata');
});

// a) Vata qui possède déjà le programme ne le reçoit plus.
cas('Vata qui possède déjà le programme ne le revoit pas', () => {
  const offre = offrePour({
    ...VIDE,
    dosha: 'Vata',
    formationsPossedees: [{ id: 'kajabi-2148687644', titre: 'Programme Vata' }],
  });
  assert.notEqual(offre.id, 'dosha-vata');
  assert.equal(offre.id, 'origine2'); // rien d'autre ne s'applique : le repli.
});

// b) Pitta avec une formation publiée à son nom, pas possédée.
cas('Pitta avec une formation publiée reçoit cette formation', () => {
  const offre = offrePour({
    ...VIDE,
    dosha: 'Pitta',
    formationsPubliees: [{ id: 'f-pitta', titre: 'Saison Pitta', statut: 'publie', prix: 197, lienFiche: '/pitta' }],
  });
  assert.equal(offre.id, 'dosha-pitta');
  assert.equal(offre.destination, '/pitta');
  assert.match(offre.texte, /197 \$/);
});

// b) Kapha sans formation publiée correspondante ne reçoit rien de ce côté.
cas('Kapha sans formation publiée retombe sur la règle suivante', () => {
  const offre = offrePour({ ...VIDE, dosha: 'Kapha', formationsPubliees: [] });
  assert.notEqual(offre.id, 'dosha-kapha');
});

// b) Kapha qui possède déjà la formation ne la revoit pas.
cas('Kapha qui possède déjà sa formation ne la revoit pas', () => {
  const offre = offrePour({
    ...VIDE,
    dosha: 'Kapha',
    formationsPubliees: [{ id: 'f-kapha', titre: 'Saison Kapha', statut: 'publie', prix: 197 }],
    formationsPossedees: [{ id: 'f-kapha', titre: 'Saison Kapha' }],
  });
  assert.notEqual(offre.id, 'dosha-kapha');
});

// c) Famille Origine ouverte 3 fois, rien possédé.
cas("Origine ouverte 3 fois sans rien posséder reçoit l'Expérience Origine", () => {
  const offre = offrePour({ ...VIDE, familles: { Origine: 3 } });
  assert.equal(offre.id, 'origine');
});

// c) Sous le seuil, la règle ne s'applique pas.
cas('Origine ouverte seulement 2 fois ne déclenche rien', () => {
  const offre = offrePour({ ...VIDE, familles: { Origine: 2 } });
  assert.notEqual(offre.id, 'origine');
});

// c) Elle possède déjà une formation d'Origine : jamais reproposée.
cas("Origine déjà possédée n'est jamais reproposée", () => {
  const offre = offrePour({
    ...VIDE,
    familles: { Origine: 5 },
    formationsPossedees: [{ id: 'origine-1', titre: "L'Expérience Origine" }],
  });
  assert.notEqual(offre.id, 'origine');
});

// d) Famille Boutique ouverte 3 fois, aucune commande.
cas('Boutique ouverte 3 fois sans commande reçoit le coup d’œil boutique', () => {
  const offre = offrePour({ ...VIDE, familles: { Boutique: 3 } });
  assert.equal(offre.id, 'boutique');
});

// d) Une commande existe déjà : la relance ne se propose plus.
cas('Boutique avec une commande déjà passée ne relance pas', () => {
  const offre = offrePour({ ...VIDE, familles: { Boutique: 6 }, aCommandeBoutique: true });
  assert.notEqual(offre.id, 'boutique');
});

// e) Famille Podcast et médias ouverte 3 fois.
cas('Podcast ouvert 3 fois reçoit les rediffusions', () => {
  const offre = offrePour({ ...VIDE, familles: { 'Podcast et médias': 3 } });
  assert.equal(offre.id, 'podcast');
});

// f) Compte de moins de sept jours, rien d'autre ne s'applique.
cas('Compte tout neuf reçoit le coffre de bienvenue', () => {
  const offre = offrePour({ ...VIDE, joinedAtMs: Date.now() - 2 * JOUR_MS });
  assert.equal(offre.id, 'bienvenue');
});

// g) Rien de tout cela : le repli, jamais de prix ni de compte à rebours inventés.
cas('Rien ne s’applique donne le repli doux', () => {
  const offre = offrePour(VIDE);
  assert.equal(offre.id, 'origine2');
  assert.doesNotMatch(offre.texte, /\$/);
});

// L'ORDRE COMPTE : Vata gagne même si la famille Origine qualifie aussi.
cas("L'ordre des règles est respecté : Vata avant Origine", () => {
  const offre = offrePour({ ...VIDE, dosha: 'Vata', familles: { Origine: 10 } });
  assert.equal(offre.id, 'dosha-vata');
});

// L'ORDRE COMPTE : Origine (c) gagne sur Boutique (d) quand les deux qualifient.
cas('Origine avant Boutique quand les deux qualifient', () => {
  const offre = offrePour({ ...VIDE, familles: { Origine: 4, Boutique: 4 } });
  assert.equal(offre.id, 'origine');
});

console.log(`${n} cas passés.`);
