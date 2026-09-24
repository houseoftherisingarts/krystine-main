// Les leçons importées de Kajabi arrivent avec le gabarit de la page d'origine
// collé devant le vrai texte : titre du programme, « Modules », « / », numéro de
// semaine, minuteur de lecture automatique, « Mark As Complete », « Next Lesson »…
// Ce filtre retire ce décor et garde le texte de Krystine tel quel.

const DECOR = /^(modules?|lessons?|mark as complete|great job! keep going!|next (lesson|module)|previous (lesson|module)|play now|cancel|will begin in \d+ seconds?|\/|\d+|\d+:\d{2}(:\d{2})?)$/i;
const SEMAINE = /^(semaine|module|pilier|partie)\s+\d+(\s+(pilier|partie)\s+\d+)?$/i;

const plat = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function nettoyerKajabi(texte: string, titreLecon?: string, titreFormation?: string, moduleNom?: string, autresTitres: string[] = []): string {
  if (!texte) return texte;
  const lignes = texte.split(/\r?\n/);
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
