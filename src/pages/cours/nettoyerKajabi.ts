// Les leçons importées de Kajabi arrivent avec le gabarit de la page d'origine
// collé devant le vrai texte : titre du programme, « Modules », « / », numéro de
// semaine, minuteur de lecture automatique, « Mark As Complete », « Next Lesson »…
// Ce filtre retire ce décor et garde le texte de Krystine tel quel.

const DECOR = /^(modules?|lessons?|mark as complete|great job! keep going!|next (lesson|module)|previous (lesson|module)|play now|cancel|will begin in \d+ seconds?|\/|\d+|\d+:\d{2}(:\d{2})?)$/i;
const SEMAINE = /^(semaine|module|pilier|partie)\s+\d+(\s+(pilier|partie)\s+\d+)?$/i;

// Certaines leçons arrivent en HTML (<p>…</p>) : les balises deviennent des
// sauts de ligne et les liens gardent leur adresse.
export const ADRESSE_SURE = /^(https?:\/\/[^\s)]+|mailto:[^\s)]+|\/(?!\/)[^\s)]*)$/i;
export function sansBalises(texte: string): string {
  if (!/<\/?[a-z][^>]*>/i.test(texte)) return texte;
  return texte
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (_m, href: string, mot: string) => {
      const texteLien = mot.replace(/<[^>]+>/g, '');
      // Seules les adresses sûres deviennent des liens (jamais « javascript: »).
      return ADRESSE_SURE.test(href.trim()) ? `[${texteLien}](${href.trim()})` : texteLien;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, '’')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const plat = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function nettoyerKajabi(texte: string, titreLecon?: string, titreFormation?: string, moduleNom?: string, autresTitres: string[] = []): string {
  if (!texte) return texte;
  const lignes = corrigerTexteCours(sansBalises(texte)).split(/\r?\n/);
  const cibles = [titreLecon, titreFormation, moduleNom, ...autresTitres].filter(Boolean).map(t => plat(t as string));

  // Le vrai texte commence après la dernière répétition du titre de la leçon
  // dans le préambule (au plus les cinquante premières lignes).
  let depart = 0;
  if (titreLecon) {
    const t = plat(titreLecon);
    for (let i = 0; i < Math.min(lignes.length, 50); i += 1) {
      if (plat(lignes[i]) === t) depart = i + 1;
    }
    if (lignes.slice(depart).join('\n').trim().length < 80) depart = 0;
  }

  const gardees = lignes.slice(depart).filter(l => {
    const p = l.trim();
    if (!p) return true;
    if (DECOR.test(p) || SEMAINE.test(p)) return false;
    return !cibles.includes(plat(p));
  });
  return gardees.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Corrections d'affichage des textes venus de Kajabi (Krystine, 5 oct. 2026) :
// l'ancien nom du programme devient VATA Essentiel, les coquilles connues se
// corrigent et le libellé du quiz redevient un lien. La base n'est pas touchée.
const CORRECTIONS: Array<[RegExp, string]> = [
  [/l['’]Exp[ée]rience Ayurveda\s*:\s*saison VATA/gi, 'VATA Essentiel'],
  [/l['’]Exp[ée]rience VATA/gi, 'VATA Essentiel'],
  [/\bbonis\b/g, 'bonus'],
  [/\bDynacharia\b/gi, 'dinacharya'],
  [/(?<!\[)Quiz Dosha - Inspirata(?!\])/g, '[Quiz Dosha - Inspirata](https://www.krystinestlaurent.ca/quiz)'],
];
export function corrigerTexteCours(texte: string): string {
  return CORRECTIONS.reduce((t, [re, par]) => t.replace(re, par), texte || '');
}

// Kajabi colle le même paragraphe de semaine sous chaque leçon de la semaine.
// Il ne s'affiche qu'à la première leçon qui le porte : les leçons suivantes
// de la même semaine le retirent (les phrases courtes, comme « Cliquez sur ▶ »,
// restent). Sert à tous les cours.
const cle = (s: string) => plat(s);
export function sansRepetitions(texte: string, textesPrecedents: string[]): string {
  if (!texte || !textesPrecedents.length) return texte;
  const vus = new Set<string>();
  textesPrecedents.forEach(t => (t || '').replace(/\r\n/g, '\n').split(/\n{2,}/).forEach(b => { if (b.trim().length >= 120) vus.add(cle(b)); }));
  return texte.replace(/\r\n/g, '\n').split(/\n{2,}/).filter(b => b.trim().length < 120 || !vus.has(cle(b))).join('\n\n').trim();
}

// Le nom d'un document joint, lisible par la cliente : un seul document prend
// le titre de la leçon; sinon le nom du fichier perd son code d'import
// (« EA_VATA_S0-4._ »), ses soulignés et son extension.
export function nomDocumentLisible(nom: string, titreLecon: string, total: number): string {
  if (total <= 1 && titreLecon) return titreLecon;
  let n = nom.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/^[A-Z]{2,}_[A-Z]+_S\d+-\d+\.?_/, '').replace(/_pdf$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  n = n.replace(/\sN B$/i, ', noir et blanc').replace(/\sCOULEUR$/i, ', couleur');
  return n.charAt(0).toUpperCase() + n.slice(1);
}
