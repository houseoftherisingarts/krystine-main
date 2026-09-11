import { jsPDF } from 'jspdf';
import { SIGNATURE_NOIRE } from '../components/client/Signature';
import type { DiplomeInfos } from '../components/cours/Diplome';
import { enLettres } from '../components/cours/Diplome';

// Le diplôme en PDF, dessiné en vectoriel plutôt que capturé en image : le
// texte reste net à l'impression et sélectionnable, et le fichier pèse moins
// de cent kilo-octets. Même méthode que le billet d'événement et le paquet de
// cartes du direct, qui passent déjà par jsPDF dans ce dépôt.
//
// jsPDF n'embarque que Helvetica, Times et Courier. Times tient le registre
// universitaire du diplôme sans qu'il faille charger une police maison dans
// le bundle, ce qui alourdirait le site pour tout le monde.

const CREME: [number, number, number] = [247, 243, 234];
const LAITON: [number, number, number] = [186, 123, 57];
const LAITON_PALE: [number, number, number] = [212, 176, 126];
const ENCRE: [number, number, number] = [31, 26, 18];
const ENCRE_DOUCE: [number, number, number] = [90, 74, 55];
const BRUN: [number, number, number] = [139, 74, 47];

/** Le WebP de la signature converti en PNG : jsPDF ne lit pas le WebP. */
async function signatureEnPng(): Promise<{ data: string; ratio: number } | null> {
  try {
    const im = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error('signature introuvable'));
      i.src = SIGNATURE_NOIRE;
    });
    const c = document.createElement('canvas');
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(im, 0, 0);
    return { data: c.toDataURL('image/png'), ratio: im.naturalHeight / im.naturalWidth };
  } catch {
    return null;   // le diplôme s'imprime quand même, avec sa ligne seule
  }
}

/** Une équerre de coin avec sa perle, le seul ornement du parchemin. */
function coin(doc: jsPDF, x: number, y: number, sx: number, sy: number, taille: number) {
  doc.setDrawColor(...LAITON);
  doc.setLineWidth(1.1);
  doc.line(x, y, x + sx * taille, y);
  doc.line(x, y, x, y + sy * taille);
  doc.setFillColor(...LAITON);
  doc.circle(x + sx * 7, y + sy * 7, 2.1, 'F');
}

export async function telechargerDiplome(infos: DiplomeInfos, lang: 'FR' | 'EN'): Promise<void> {
  const fr = lang === 'FR';
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const W = doc.internal.pageSize.getWidth();    // 842
  const H = doc.internal.pageSize.getHeight();   // 595
  const centre = W / 2;

  // Le parchemin
  doc.setFillColor(...CREME);
  doc.rect(0, 0, W, H, 'F');

  // Le double filet
  const m1 = 26, m2 = 34;
  doc.setDrawColor(...LAITON); doc.setLineWidth(1.6);
  doc.rect(m1, m1, W - m1 * 2, H - m1 * 2);
  doc.setDrawColor(...LAITON_PALE); doc.setLineWidth(0.5);
  doc.rect(m2, m2, W - m2 * 2, H - m2 * 2);

  // Les quatre coins
  const t = 26;
  coin(doc, m1 + t, m1, 1, 1, t);
  coin(doc, W - m1 - t, m1, -1, 1, t);
  coin(doc, W - m1 - t, H - m1, -1, -1, t);
  coin(doc, m1 + t, H - m1, 1, -1, t);

  let y = 104;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BRUN);
  doc.text('INSPIRATA AYURVEDA', centre, y, { align: 'center', charSpace: 3.6 });
  y += 16;

  doc.setDrawColor(...LAITON); doc.setLineWidth(0.7);
  doc.line(centre - 32, y, centre + 32, y);
  y += 44;

  doc.setFont('times', 'normal'); doc.setFontSize(42); doc.setTextColor(...ENCRE);
  doc.text(fr ? 'Diplôme de complétion' : 'Certificate of Completion', centre, y, { align: 'center' });
  y += 46;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ENCRE_DOUCE);
  doc.text(fr ? 'DÉCERNÉ À' : 'AWARDED TO', centre, y, { align: 'center', charSpace: 2.6 });
  y += 44;

  doc.setFont('times', 'normal'); doc.setFontSize(38); doc.setTextColor(...ENCRE);
  const nom = doc.splitTextToSize(infos.nom, W - 260);
  doc.text(nom, centre, y, { align: 'center' });
  y += (nom.length - 1) * 40 + 16;

  doc.setDrawColor(150, 130, 105); doc.setLineWidth(0.5);
  doc.line(centre - 150, y, centre + 150, y);
  y += 34;

  doc.setFont('times', 'normal'); doc.setFontSize(13); doc.setTextColor(...ENCRE_DOUCE);
  const phrase = fr
    ? `pour avoir traversé ${infos.accompli} de l’${infos.programme},\net refermé une à une les portes de ses sens.`
    : `for completing ${infos.accompli} of the ${infos.programme},\nclosing the doors of the senses one by one.`;
  const lignes = doc.splitTextToSize(phrase, W - 300);
  doc.text(lignes, centre, y, { align: 'center', lineHeightFactor: 1.7 });
  y += lignes.length * 22 + 46;

  // La signature à gauche, la date à droite, sur la même ligne de base
  const baseY = Math.max(y + 40, H - 108);
  const gauche = centre - 150;
  const droite = centre + 150;

  const sig = await signatureEnPng();
  if (sig) {
    const largeur = 124;
    const hauteur = Math.min(46, largeur * sig.ratio);
    doc.addImage(sig.data, 'PNG', gauche - largeur / 2, baseY - hauteur - 4, largeur, hauteur);
  }
  doc.setDrawColor(150, 130, 105); doc.setLineWidth(0.5);
  doc.line(gauche - 82, baseY, gauche + 82, baseY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...ENCRE_DOUCE);
  doc.text('KRYSTINE ST-LAURENT', gauche, baseY + 15, { align: 'center', charSpace: 2 });

  doc.setFont('times', 'normal'); doc.setFontSize(17); doc.setTextColor(...ENCRE);
  doc.text(enLettres(infos.date, fr), droite, baseY - 8, { align: 'center' });
  doc.setDrawColor(150, 130, 105); doc.setLineWidth(0.5);
  doc.line(droite - 82, baseY, droite + 82, baseY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...ENCRE_DOUCE);
  doc.text('DATE', droite, baseY + 15, { align: 'center', charSpace: 2 });

  doc.setFontSize(7); doc.setTextColor(150, 136, 118);
  doc.text(infos.numero, centre, H - 48, { align: 'center', charSpace: 1.6 });

  const glisse = infos.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  doc.save(`diplome-${glisse || 'krystine'}-${infos.date}.pdf`);
}
