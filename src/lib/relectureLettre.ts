// ─── Le filtre de relecture des lettres (Krystine, 4 octobre 2026) ──────────
// Ce que nous avons appris ensemble en préparant la lettre « Même saison,
// effets opposés », appliqué tout seul au moment d'envoyer : la lettre était
// partie avant la relecture, alors la relecture vit maintenant dans le bouton.
// Miroir de scripts/newsletter/relire-lettre.mjs (et du skill relecture-lettre
// d'Iris, qui ajoute les filtres humains : la lectrice, Eric Edmeades, la voix).
// Chaque règle vient d'une correction réelle; en ajouter une, c'est ajouter une
// ligne ici et dans le script.

export interface Balise { gravite: 'bloquant' | 'à corriger' | 'à vérifier'; ou: string; quoi: string }

const MOTS: Array<[RegExp, string]> = [
  [/—/, 'un tiret long (—) à recomposer'],
  [/\bayurveda\b/, '« ayurveda » sans majuscule : Ayurveda'],
  [/\bgratuit\w*/i, 'le mot « gratuit » (proscrit)'],
  [/\bfatigu\w*/i, 'le mot « fatigue » (dire épuisement)'],
  [/\bseuil\b/i, 'le mot « seuil » (banni)'],
  [/\bvotre corps\b/i, '« votre corps » (dire « le corps »)'],
  [/\bvraie nature\b/i, 'la fermeture « vraie nature » (bannie)'],
  [/(?<!\.)\.\.(?!\.)/, '« .. » au lieu de « ... »'],
  [/[^\s\d]:(?!\/\/)/, 'un deux-points collé au mot (mettre une espace avant « : »)'],
  [/l' [A-ZÀ-Ü]/, 'une espace en trop après l’apostrophe'],
  [/\bressens\b/, '« ressens » : vérifier l’accord (le corps le ressent)'],
];

const nu = (t: string) => String(t || '').replace(/<[^>]+>/g, '');

export function relireLettre(l: { subject?: string; preheader?: string; blocks?: any[]; audience?: any; lettreDor?: any }): Balise[] {
  const out: Balise[] = [];
  const blocs = l.blocks || [];
  const sujet = (l.subject || '').trim();
  if (!sujet) out.push({ gravite: 'bloquant', ou: 'Sujet', quoi: 'le sujet est vide' });
  else if (sujet.length > 60) out.push({ gravite: 'à corriger', ou: 'Sujet', quoi: `${sujet.length} caractères (60 au plus, sinon il est coupé)` });
  if (!l.lettreDor && !(l.preheader || '').trim()) out.push({ gravite: 'à corriger', ou: 'Ligne d’aperçu', quoi: 'vide : la boîte de réception affichera n’importe quoi sous le sujet' });

  const textes: Array<[string, string]> = [['Sujet', l.subject || ''], ['Ligne d’aperçu', l.preheader || '']];
  blocs.forEach((b, i) => {
    const c = b?.content || {};
    for (const k of ['text', 'label', 'caption', 'attribution', 'titre', 'texte']) if (typeof c[k] === 'string') textes.push([`Bloc ${i + 1}`, c[k]]);
    if (b?.type === 'heading' && !nu(c.text).trim()) out.push({ gravite: 'à corriger', ou: `Bloc ${i + 1}`, quoi: 'titre vide (il laisse un trou blanc)' });
    if (b?.type === 'paragraph' && !nu(c.text).trim()) out.push({ gravite: 'à corriger', ou: `Bloc ${i + 1}`, quoi: 'paragraphe vide' });
    if (b?.type === 'image' && c.largeur !== 'kaleidoscope' && !c.url) out.push({ gravite: 'bloquant', ou: `Bloc ${i + 1}`, quoi: 'image sans fichier' });
  });
  for (const [ou, t] of textes) {
    for (const [re, quoi] of MOTS) if (re.test(nu(t))) out.push({ gravite: 'à corriger', ou, quoi });
    if (/ {2,}/.test(nu(t))) out.push({ gravite: 'à vérifier', ou, quoi: 'double espace' });
  }

  // Un seul but, présent au milieu et répété en bas.
  const boutons = blocs.filter(b => b?.type === 'button');
  const buts = new Set(boutons.map(b => String(b.content?.href || '').replace(/[?#].*$/, '')));
  if (!l.lettreDor && !boutons.length) out.push({ gravite: 'à vérifier', ou: 'Boutons', quoi: 'aucun bouton : quel geste attendons-nous de la lectrice ?' });
  if (buts.size > 1) out.push({ gravite: 'à vérifier', ou: 'Boutons', quoi: `${buts.size} buts différents : une lettre, un seul but` });
  const dernier = blocs.map(b => b?.type).lastIndexOf('button');
  if (boutons.length && dernier < blocs.length - 4) out.push({ gravite: 'à vérifier', ou: 'Bas de la lettre', quoi: 'pas de bouton près de la fin : celle qui lit jusqu’en bas doit le trouver' });
  for (const b of boutons) if (/^(faire|cliquer|en savoir plus|découvrir)\b/i.test(b.content?.label || '')) out.push({ gravite: 'à vérifier', ou: 'Bouton', quoi: `« ${b.content.label} » décrit une tâche : dire ce qu’elle obtient (« Voir où j’en suis »)` });

  // Les liens.
  blocs.forEach((b, i) => {
    const c = b?.content || {};
    const hrefs = [c.href, ...(String(c.text || '').match(/href="([^"]+)"/g) || []).map((s: string) => s.slice(6, -1))].filter(Boolean) as string[];
    for (const h of hrefs) {
      if (/krystinestlaurent\.ca\/quiz/.test(h) && !/via=/.test(h)) out.push({ gravite: 'à vérifier', ou: `Bloc ${i + 1}`, quoi: 'lien du quiz sans « ?via= » : nous ne saurons pas d’où viennent les gens' });
      if (/inspiratanature\.com/.test(h) && !/locale=fr/.test(h)) out.push({ gravite: 'à corriger', ou: `Bloc ${i + 1}`, quoi: 'lien de la boutique sans ?country=CA&locale=fr (elle s’ouvrirait en anglais)' });
      if (/mykajabi|kajabi\.com|bit\.ly|tinyurl/.test(h)) out.push({ gravite: 'bloquant', ou: `Bloc ${i + 1}`, quoi: `lien interdit : ${h}` });
    }
  });
  return out;
}

export function resumeRelecture(b: Balise[]): string {
  return b.map(x => `• ${x.ou} : ${x.quoi}`).join('\n');
}
