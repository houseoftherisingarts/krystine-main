#!/usr/bin/env node
// Ajoute une entrée au journal des publications (public/journal-publications.json),
// que l'admin affiche dans « Publications » : qui a publié, quand, quel commit,
// quoi, et quels fichiers. Appelé par scripts/publier.sh après le commit.
//   node scripts/journal-publication.mjs "<message>" "<cibles>"
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { hostname } from 'node:os';

const [message = '', cibles = 'hosting'] = process.argv.slice(2);
const git = (cmd) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

const FICHIER = 'public/journal-publications.json';
const journal = existsSync(FICHIER) ? JSON.parse(readFileSync(FICHIER, 'utf8')) : [];

const commit = git('rev-parse --short HEAD');
const fichiers = git("diff --name-only '@{u}..HEAD'").split('\n').filter(Boolean);
const entree = {
  quand: new Date().toISOString(),
  qui: git('config user.name') || 'inconnu',
  machine: hostname().replace(/\.local$/, ''),
  commit,
  message,
  cibles: cibles.split(',').filter(Boolean),
  fichiers,
};

// Une même publication relancée (même commit) remplace son entrée au lieu de la doubler.
const sans = journal.filter(e => e.commit !== commit);
sans.push(entree);
writeFileSync(FICHIER, JSON.stringify(sans, null, 2) + '\n');
console.log(`Journal : ${entree.qui} · ${commit} · ${fichiers.length} fichier(s)`);
