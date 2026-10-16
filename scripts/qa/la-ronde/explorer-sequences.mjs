// Montre la forme des séquences et des lettres seq-* (lecture seule).
import { lireCollection, requete } from './firestore-lecture.mjs';
const seqs = await lireCollection('sequences');
for (const s of seqs) {
  const resume = JSON.stringify(s, (k, v) => (typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' : v));
  console.log('SEQ', s.id, resume.slice(0, 1500));
}
const lettres = await requete({ from: [{ collectionId: 'newsletters' }], where: { compositeFilter: { op: 'AND', filters: [
  { fieldFilter: { field: { fieldPath: '__name__' }, op: 'GREATER_THAN_OR_EQUAL', value: { referenceValue: 'projects/krystinestlaurent-87566/databases/(default)/documents/newsletters/seq-' } } },
  { fieldFilter: { field: { fieldPath: '__name__' }, op: 'LESS_THAN', value: { referenceValue: 'projects/krystinestlaurent-87566/databases/(default)/documents/newsletters/seq.' } } },
] } } });
for (const l of lettres) console.log('LETTRE', l.id, '|', l.subject, '|', l.status, '| blocs', (l.blocks || []).length, '| couv', l.couverture, l.couvertureUrl ? 'url' : '');
