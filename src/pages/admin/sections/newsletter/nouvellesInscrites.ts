import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { journee } from '../../../../lib/pointsConfig';

// ─── Les nouvelles inscrites, en direct (Krystine, 6 oct. 2026) ─────────────
// « Quand je clique sur Infolettre dans l'admin, je veux voir les nouveaux
// inscrits en visuel. » Quatre écoutes bornées aux 30 derniers jours, jamais
// les 33 000 fiches : créations (subscribedAt), retours d'une adresse déjà
// connue (derniereInscriptionLe, reabonneeLe, reinscriteLe) et départs
// (unsubscribedAt). Une « vraie nouvelle » est une adresse jamais vue avant
// dans la collection : la fiche créée doit être la plus ancienne de son
// adresse, vérifié par lots de 30 adresses (where email in), une seule fois
// par adresse. Les essais techniques, les adresses en quarantaine et les
// fiches en attente ne comptent pas.

export const JOURS = 30;
const RETOURS = ['derniereInscriptionLe', 'reabonneeLe', 'reinscriteLe'] as const;

export interface Jour { jour: string; nouvelles: number; connues: number; desabonnees: number }
export interface Nouvelle { email: string; prenom: string; le: Date; provenance: string; quiz: string }
export interface DonneesInscrites { jours: Jour[]; dernieres: Nouvelle[] }

const ms = (t: unknown) => (t instanceof Timestamp ? t.toMillis() : undefined);
const estEssai = (x: Record<string, any>) => x.source === 'essai-technique' || (x.tags || []).includes('essai-technique');
const estRobot = (x: Record<string, any>) => x.status === 'suspect' || !!x.robotPotentiel || (x.tags || []).includes('robot-potentiel');

// ─── La provenance en mots clairs ────────────────────────────────────────────
const ACCUEIL: Record<string, string> = { tome3: 'tome 3', 'foyer-attente': 'Foyer', loeuvre: 'L’Œuvre', pulsation: 'La Pulsation' };
const ATTENTE: Record<string, string> = { 'foyer-origine': 'Foyer d’Origine', 'parution-livre-3': 'parution du tome 3', origine: 'EXPÉRIENCE ORIGINE', retraite: 'retraite', general: 'générale' };

function formulaire(source: string): string {
  const s = source.replace(/_google$/, '');
  if (/^quiz|dosha-quiz/.test(s)) return 'Quiz des doshas';
  if (/^podcast/.test(s)) return 'Podcast';
  if (/shopify/.test(s)) return 'Boutique Shopify';
  if (/kajabi/.test(s)) return 'Ancien site Kajabi';
  if (/import/.test(s)) return 'Import d’une liste';
  if (s.startsWith('waitlist-')) { const r = s.slice(9); return `Liste d’attente · ${ATTENTE[r] || r.replace(/-/g, ' ')}`; }
  if (s.startsWith('accueil')) { const r = s.replace(/^accueil-?/, ''); return r ? `Accueil · ${ACCUEIL[r] || r.replace(/-/g, ' ')}` : 'Accueil'; }
  const NOMS: Record<string, string> = { compte: 'Compte créé sur le site', medias: 'Page Médias', krystine: 'Page Krystine', guide: 'Laissez-vous guider', conferenciere: 'Demande de conférence', main: 'Infolettre (bas de page)', site: 'Infolettre (bas de page)', origine: 'EXPÉRIENCE ORIGINE', musique: 'Musique d’Origine', 'cinq-elements': 'Extrait des cinq éléments' };
  return NOMS[s] || s.replace(/-/g, ' ');
}

/** D'où la personne est arrivée : le formulaire, plus la voie marquée (utm, via) quand elle dit quelque chose. */
export function provenanceClaire(x: Record<string, any>): string {
  const f = formulaire(String(x.source || 'site'));
  const p = x.provenance || {};
  const via = String(p.source || (x.tags || []).find((t: string) => t.startsWith('via-'))?.slice(4) || '');
  if (!via || via === 'direct' || /krystinestlaurent/.test(via)) return f;
  const payee = /paid|cpc|ads?$|pub|sponsor/.test(String(p.medium || '')) || !!p.campagne;
  let voie = via;
  if (/^(facebook|fb|instagram|ig|meta)|facebook\.com|instagram\.com/.test(via)) voie = payee ? 'pub Meta (Facebook, Instagram)' : /insta|^ig/.test(via) ? 'Instagram' : 'Facebook';
  else if (/google/.test(via)) voie = payee ? 'pub Google' : 'recherche Google';
  else if (/youtube/.test(via)) voie = 'YouTube';
  return `${f} · ${voie}`;
}

const DOSHA: Record<string, string> = { vata: 'Vata (Vent et Espace)', pitta: 'Pitta (Feu et Eau)', kapha: 'Kapha (Eau et Terre)' };
export const quizDe = (tags: string[]) => { const t = tags.find(x => /^dosha-(vata|pitta|kapha)$/.test(x)); return t ? DOSHA[t.slice(6)] : ''; };

// ─── Le calcul, séparé de Firestore pour se tester avec des données factices ─
export interface Fiche { id: string; [k: string]: any }
interface Adresse { premiere: number; premiereId: string; tags: Set<string>; prenom: string }

export function calculer(fiches: Map<string, Fiche>, adresses: Map<string, Adresse>, maintenant = Date.now()): DonneesInscrites {
  const jours: Jour[] = [];
  for (let i = JOURS - 1; i >= 0; i--) jours.push({ jour: journee(maintenant - i * 86_400_000), nouvelles: 0, connues: 0, desabonnees: 0 });
  const idx = new Map(jours.map((j, i) => [j.jour, i]));
  const debut = maintenant - JOURS * 86_400_000;
  const vus = { nouvelles: new Set<string>(), connues: new Set<string>(), desab: new Set<string>() };
  const dernieres: Nouvelle[] = [];

  for (const x of fiches.values()) {
    if (estEssai(x) || estRobot(x)) continue;
    const email = String(x.email || '').trim().toLowerCase();
    if (!email) continue;
    const a = adresses.get(email);

    const cree = ms(x.subscribedAt);
    if (cree && cree >= debut && x.status !== 'pending' && a) {
      const jour = journee(cree);
      const premiere = a.premiereId === x.id;
      const cle = `${email}|${jour}`;
      if (premiere && !vus.nouvelles.has(email)) {
        vus.nouvelles.add(email);
        const i = idx.get(jour); if (i !== undefined) jours[i].nouvelles++;
        dernieres.push({ email, prenom: a.prenom, le: new Date(cree), provenance: provenanceClaire(x), quiz: quizDe([...a.tags]) });
      } else if (!premiere && !vus.connues.has(cle)) {
        vus.connues.add(cle);
        const i = idx.get(jour); if (i !== undefined) jours[i].connues++;
      }
    }
    for (const champ of RETOURS) {
      const t = ms(x[champ]);
      if (!t || t < debut) continue;
      const cle = `${email}|${journee(t)}`;
      if (vus.connues.has(cle)) continue;
      vus.connues.add(cle);
      const i = idx.get(journee(t)); if (i !== undefined) jours[i].connues++;
    }
    const parti = ms(x.unsubscribedAt);
    if (parti && parti >= debut && x.status === 'unsubscribed') {
      const cle = `${email}|${journee(parti)}`;
      if (!vus.desab.has(cle)) { vus.desab.add(cle); const i = idx.get(journee(parti)); if (i !== undefined) jours[i].desabonnees++; }
    }
  }
  // Une adresse vraie nouvelle qui remplit un deuxième formulaire le même jour ne compte pas deux fois.
  for (const n of dernieres) {
    const i = idx.get(journee(n.le.getTime()));
    if (i !== undefined && vus.connues.has(`${n.email}|${jours[i].jour}`) && jours[i].connues > 0) jours[i].connues--;
  }
  dernieres.sort((p, q) => q.le.getTime() - p.le.getTime());
  return { jours, dernieres: dernieres.slice(0, 20) };
}

// ─── L'écoute en direct ──────────────────────────────────────────────────────
export function useNouvellesInscrites(): { donnees: DonneesInscrites | null; erreur: string | null } {
  const [donnees, setDonnees] = useState<DonneesInscrites | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const fiches = useRef(new Map<string, Fiche>());
  const adresses = useRef(new Map<string, Adresse>());

  useEffect(() => {
    if (!db) { setErreur('Base de données indisponible.'); return; }
    const depuis = Timestamp.fromMillis(Date.now() - JOURS * 86_400_000);
    const champs = ['subscribedAt', ...RETOURS, 'unsubscribedAt'];
    const recus = new Set<string>();
    const parChamp = new Map<string, Set<string>>();
    let vivant = true;
    let enCours = Promise.resolve();

    // Pour chaque adresse créée dans la fenêtre : sa toute première fiche, ses étiquettes et son prénom (toutes fiches confondues).
    const verifier = async () => {
      const a = new Set<string>();
      for (const x of fiches.current.values()) {
        const e = String(x.email || '').trim().toLowerCase();
        if (e && (ms(x.subscribedAt) ?? 0) >= depuis.toMillis() && !adresses.current.has(e)) a.add(e);
      }
      const liste = [...a];
      for (let i = 0; i < liste.length; i += 30) {
        const snap = await getDocs(query(collection(db!, 'newsletter'), where('email', 'in', liste.slice(i, i + 30))));
        const parAdresse = new Map<string, Adresse>();
        snap.forEach(d => {
          const x = d.data();
          const e = String(x.email || '').trim().toLowerCase();
          const t = ms(x.subscribedAt) ?? Number.MAX_SAFE_INTEGER;
          const p = parAdresse.get(e) || { premiere: Number.MAX_SAFE_INTEGER, premiereId: '', tags: new Set<string>(), prenom: '' };
          if (t < p.premiere || (t === p.premiere && d.id < p.premiereId)) { p.premiere = t; p.premiereId = d.id; }
          (x.tags || []).forEach((g: string) => p.tags.add(g));
          if (!p.prenom && x.firstName) p.prenom = String(x.firstName);
          parAdresse.set(e, p);
        });
        parAdresse.forEach((v, k) => adresses.current.set(k, v));
      }
    };

    const recalculer = () => {
      enCours = enCours.then(async () => {
        if (!vivant || recus.size < champs.length) return;
        await verifier();
        if (vivant) setDonnees(calculer(fiches.current, adresses.current));
      }).catch(e => { console.error('[nouvelles inscrites]', e); if (vivant) setErreur('Les chiffres n’ont pas pu se charger.'); });
    };

    const desabonner = champs.map(champ => onSnapshot(
      query(collection(db!, 'newsletter'), where(champ, '>=', depuis)),
      snap => {
        const ids = new Set<string>();
        snap.forEach(d => { ids.add(d.id); fiches.current.set(d.id, { id: d.id, ...d.data() }); });
        // Une fiche sortie de toutes les écoutes (rare : un champ effacé) quitte le calcul.
        for (const id of parChamp.get(champ) || []) if (!ids.has(id) && ![...parChamp.entries()].some(([c, s]) => c !== champ && s.has(id))) fiches.current.delete(id);
        parChamp.set(champ, ids);
        // Une nouvelle étiquette (résultat du quiz posé après l'inscription) se relit.
        snap.docChanges().forEach(c => { if (c.type === 'modified') adresses.current.delete(String(c.doc.get('email') || '').trim().toLowerCase()); });
        recus.add(champ);
        recalculer();
      },
      e => { console.error('[nouvelles inscrites]', champ, e); if (vivant) setErreur('Les chiffres n’ont pas pu se charger.'); },
    ));
    return () => { vivant = false; desabonner.forEach(f => f()); };
  }, []);

  return { donnees, erreur };
}
