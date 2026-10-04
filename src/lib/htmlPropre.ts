// Nettoie le HTML d'une description de produit avant de l'afficher (4 oct. 2026).
// La description vient de Shopify (descriptionHtml) ou de la personnalisation
// de Krystine dans l'admin : on ne garde que la structure du texte (paragraphes,
// gras, listes, liens), jamais de script, de style ni d'attribut. L'italique
// devient du texte droit (règle du site : jamais d'italique).

const GARDER = new Set(['P', 'BR', 'STRONG', 'B', 'UL', 'OL', 'LI', 'A', 'H2', 'H3', 'H4', 'BLOCKQUOTE']);
const DEPLIER = new Set(['SPAN', 'DIV', 'EM', 'I', 'U', 'FONT', 'SECTION', 'ARTICLE', 'META', 'H1', 'H5', 'H6']);

function nettoyerNoeud(n: Node, doc: Document): Node | DocumentFragment | null {
  if (n.nodeType === Node.TEXT_NODE) return doc.createTextNode(n.textContent || '');
  if (n.nodeType !== Node.ELEMENT_NODE) return null;
  const el = n as Element;
  const tag = el.tagName;
  const enfants = () => {
    const f = doc.createDocumentFragment();
    el.childNodes.forEach(c => { const r = nettoyerNoeud(c, doc); if (r) f.appendChild(r); });
    return f;
  };
  if (GARDER.has(tag)) {
    const out = doc.createElement(tag === 'B' ? 'strong' : tag.toLowerCase());
    if (tag === 'A') {
      const href = el.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return enfants();
      // Tout lien vers la boutique historique s'ouvre en français et en dollars canadiens.
      let propre = href;
      if (/inspiratanature\.com/i.test(href) && !/[?&]locale=/.test(href)) {
        propre += (href.includes('?') ? '&' : '?') + 'country=CA&locale=fr';
      }
      out.setAttribute('href', propre);
      out.setAttribute('target', '_blank');
      out.setAttribute('rel', 'noopener noreferrer');
    }
    out.appendChild(enfants());
    return out;
  }
  if (DEPLIER.has(tag)) {
    const f = enfants();
    // Un bloc déplié garde sa coupure de ligne.
    if (tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'H1' || tag === 'H5' || tag === 'H6') {
      const p = doc.createElement('p');
      p.appendChild(f);
      return p;
    }
    return f;
  }
  return null; // script, style, iframe, img, etc.
}

const echapper = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Du texte simple (sans balise) devient des paragraphes; du HTML est nettoyé. */
export function htmlPropre(source: string | null | undefined): string {
  const brut = (source || '').trim();
  if (!brut) return '';
  const html = /<[a-z][\s\S]*>/i.test(brut)
    ? brut
    : brut.split(/\n{2,}/).map(par => `<p>${echapper(par).replace(/\n/g, '<br>')}</p>`).join('');
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const sortie = doc.createElement('div');
  doc.body.childNodes.forEach(c => { const r = nettoyerNoeud(c, doc); if (r) sortie.appendChild(r); });
  // Paragraphes vides laissés par Shopify (<p><br></p>, <p>&nbsp;</p>).
  sortie.querySelectorAll('p').forEach(p => { if (!p.textContent?.replace(/ /g, ' ').trim()) p.remove(); });
  return sortie.innerHTML;
}
