// QA temporaire (LOT ADMIN+INFOLETTRE, docs/badge-bleu-plan.md 6.5) : dépose
// le brouillon d'infolettre « Le Badge Bleu » dans `newsletters`, statut
// `draft`, jamais envoyé ni programmé. Tous les champs que le Composer écrit
// lui-même (Composer.tsx:123-141) sont là. REST + jeton gcloud, comme
// ~/.claude/scripts/krystine_infolettre.py. Le script s'efface après usage.
import { execSync } from 'node:child_process';
const PROJET = 'krystinestlaurent-87566';
const gtoken = execSync('gcloud auth print-access-token').toString().trim();
// ENTETE_INFOLETTRE_PAR_DEFAUT.couvertureUrl (src/firebase/firestore.ts:413-416).
const COUVERTURE = 'https://firebasestorage.googleapis.com/v0/b/krystinestlaurent-87566.firebasestorage.app/o/site-edits%2F1788702513165_ChatGPT_Image_Sep_6__2026__09_48_02_AM.png?alt=media&token=20186c67-e55f-404e-ada6-612ecb8d1186';
const enc = v => v === null ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const p = text => ({ type: 'paragraph', content: { text } });
const blocks = [
  { type: 'heading', content: { level: 2, text: 'Un petit signe bleu, à côté de votre nom', align: 'center' } },
  p('Bonjour {{firstName}},\n\nQuand j’ai ouvert cet espace, nous étions une poignée à nous y retrouver le matin, et je reconnaissais chaque prénom qui passait dans le fil. Nous sommes bien plus nombreuses aujourd’hui (et j’en suis profondément reconnaissante), au point que je ne sais plus toujours qui se cache derrière un nom, ni si le compte qui m’écrit est bien celui de la personne que je crois. Il m’est venu l’envie d’un petit signe, discret, qui dise à toute la communauté : cette personne chemine avec moi depuis un moment, et ce compte est bien le sien.'),
  p('Je l’ai appelé le Badge Bleu. Une coche bleue vient se poser à côté de votre nom, partout dans votre espace, sur votre profil comme dans le fil de la communauté, et tout le monde peut la voir. Vous en avez sûrement croisé de semblables sur d’autres réseaux; ici, elle raconte quelque chose de plus simple que la célébrité. Elle dit la fidélité.'),
  p('Pour y avoir droit, il vous faut avoir suivi deux de mes programmes (l’Expérience Ayurveda de la saison Vata et le Foyer d’Origine, par exemple; les épisodes achetés à la pièce et la musique ne comptent pas ici), puis me montrer une pièce d’identité, votre permis de conduire ou votre passeport photographié avec le téléphone, pour que je sache que ce compte est bien le vôtre. C’est tout.'),
  p('Tout se passe dans l’onglet Profil de votre espace, où un nouveau bloc porte le nom du badge. Il compte pour vous les programmes déjà suivis et vous laisse choisir votre fichier; un seul bouton m’envoie ensuite la demande. Je regarde chaque demande moi-même, une à la fois, et vous recevez ma réponse dans votre messagerie.'),
  p('Le jour où je pose votre badge, deux cents niskas entrent dans votre bourse, et le Skin Vérifié apparaît dans la petite boutique de votre espace, section « Les skins ». Ce skin d’un bleu profond n’est en vente nulle part... il n’existe que pour les personnes qui portent le badge, et il s’active d’un clic.'),
  p('Un mot sur votre pièce d’identité, parce que je sais ce qu’elle représente. Je suis la seule à pouvoir la voir. Elle sert à une seule chose, confirmer que le compte est bien le vôtre, et elle est supprimée de nos serveurs à l’instant même où je prends ma décision, que je dise oui ou non. Nous ne gardons rien.'),
  p('J’ai déjà hâte de voir les premières coches bleues fleurir dans le fil !'),
  { type: 'cta', content: { eyebrow: 'Dans votre espace', title: 'Demander mon Badge Bleu', body: 'Le bloc Badge Bleu vous attend dans l’onglet Profil de votre espace, juste sous votre fiche.', href: 'https://www.krystinestlaurent.ca/compte?onglet=profile', buttonLabel: 'Ouvrir mon profil' } },
];
const now = new Date();
const doc = {
  title: 'Le Badge Bleu',
  subject: 'Le Badge Bleu arrive dans votre espace',
  preheader: 'Un signe de confiance pour celles qui cheminent avec moi depuis un moment.',
  fromName: 'Krystine St-Laurent',
  blocks,
  status: 'draft',
  audience: { mode: 'all' },
  scheduledFor: null,
  couverture: 'image',
  couvertureUrl: COUVERTURE,
  signature: true,
  lettreDor: null,
  createdAt: now,
  updatedAt: now,
  auteur: 'iris-campagne',
};
if (doc.subject.length > 60) throw new Error('sujet trop long');
if (doc.status !== 'draft') throw new Error('un brouillon, rien d’autre');
const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/newsletters`, {
  method: 'POST', headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: enc(doc).mapValue.fields }),
});
const j = await r.json();
if (!r.ok) throw new Error(JSON.stringify(j));
console.log('brouillon créé :', j.name.split('/').pop(), '| sujet', doc.subject.length, 'caractères |', blocks.length, 'blocs | status', doc.status);
