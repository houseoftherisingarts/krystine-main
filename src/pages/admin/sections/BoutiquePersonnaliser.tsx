import React, { useRef, useState } from 'react';
import Portail from '../../../components/Portail';
import { formatMoney, type ShopifyProduct } from '../../../shopify';
import {
  enregistrerProduitPerso, televerserPhotoProduit,
  type ProduitPerso, type PhotoProduit,
} from '../../../firebase/boutiqueProduits';
import { htmlPropre } from '../../../lib/htmlPropre';
import { Input, Textarea, Label, PrimaryButton, GhostButton, ToggleSwitch } from '../primitives';

/**
 * Le panneau « Personnaliser » d'un produit (Krystine, 4 oct. 2026) : « il
 * sera possible d'ajuster les images et les descriptions facilement ». Chaque
 * champ rempli remplace Shopify sur le site; un champ laissé vide garde ce
 * que dit Shopify. Rien ne change dans Shopify.
 */
const BoutiquePersonnaliser: React.FC<{
  produit: ShopifyProduct;
  perso?: ProduitPerso;
  onClose: () => void;
}> = ({ produit, perso, onClose }) => {
  const [titre, setTitre] = useState(perso?.titre || '');
  const [accroche, setAccroche] = useState(perso?.accroche || '');
  const [description, setDescription] = useState(perso?.description || '');
  const [photos, setPhotos] = useState<PhotoProduit[]>(perso?.images || []);
  const [ordre, setOrdre] = useState<string>(perso?.ordre ? String(perso.ordre) : '');
  const [masque, setMasque] = useState(!!perso?.masque);
  const [envoi, setEnvoi] = useState(false);
  const [sauve, setSauve] = useState<'non' | 'encours' | 'fait'>('non');
  const [erreur, setErreur] = useState<string | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);

  const televerser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []);
    if (!fichiers.length) return;
    setEnvoi(true); setErreur(null);
    try {
      for (const f of fichiers) {
        const ph = await televerserPhotoProduit(produit.handle, f);
        setPhotos(prev => [...prev, ph]);
      }
    } catch (err: any) {
      setErreur(err?.message || 'Le téléversement a échoué.');
    } finally {
      setEnvoi(false);
      if (fichierRef.current) fichierRef.current.value = '';
    }
  };

  const deplacer = (i: number, d: -1 | 1) => setPhotos(prev => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const n = [...prev];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const enregistrer = async (data: ProduitPerso) => {
    setSauve('encours'); setErreur(null);
    try {
      await enregistrerProduitPerso(produit.handle, data);
      setSauve('fait');
    } catch (err: any) {
      setErreur(err?.message || 'Sauvegarde impossible.');
      setSauve('non');
    }
  };

  const valeurs = (): ProduitPerso => {
    const n = parseInt(ordre, 10);
    return {
      titre: titre.trim(),
      accroche: accroche.trim(),
      description: description.trim(),
      images: photos,
      ordre: Number.isFinite(n) && n > 0 ? n : null,
      masque,
    };
  };

  const revenirShopify = async () => {
    if (!window.confirm('Revenir entièrement à Shopify pour ce produit ? Le titre, l’accroche, la description, les photos et l’ordre choisis ici seront oubliés sur le site (les fichiers restent dans le stockage).')) return;
    setTitre(''); setAccroche(''); setDescription(''); setPhotos([]); setOrdre(''); setMasque(false);
    await enregistrer({ titre: '', accroche: '', description: '', images: [], ordre: null, masque: false });
  };

  // Aperçu : ce que verra le public avec les champs actuels.
  const apTitre = titre.trim() || produit.title;
  const apPhoto = photos[0]?.url || produit.featuredImage?.url || produit.images[0]?.url;
  const apDescription = htmlPropre(description.trim() || produit.description);

  return (
    <Portail>
      <div className="fixed inset-0 z-[120] flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="h-full w-full max-w-3xl overflow-y-auto overscroll-contain bg-[#f6f3ee] dark:bg-[#1d1a16] shadow-2xl"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label={`Personnaliser ${produit.title}`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-[#f6f3ee]/95 dark:bg-[#1d1a16]/95 backdrop-blur border-b border-[#293027]/10 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-[#8B4A2F] font-bold">Personnaliser sur le site</p>
              <h3 className="font-serif text-xl text-[#293027] dark:text-white truncate">{produit.title}</h3>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="w-10 h-10 grid place-items-center rounded-full hover:bg-[#293027]/5 dark:hover:bg-white/10">
              <i className="fa-solid fa-times text-lg" />
            </button>
          </div>

          <div className="p-6 space-y-7">
            <p className="text-sm text-[#293027]/70 dark:text-white/70 leading-relaxed">
              Ce que vous écrivez ici remplace Shopify sur le site seulement. Un champ laissé vide garde ce que dit Shopify. Le prix, les formats et le stock viennent toujours de Shopify.
            </p>

            <div>
              <Label>Titre</Label>
              <Input value={titre} onChange={e => setTitre(e.target.value)} placeholder={produit.title} />
            </div>

            <div>
              <Label>Accroche (une phrase sous le titre)</Label>
              <Input value={accroche} onChange={e => setAccroche(e.target.value)} placeholder="Ex. : L’huile des soirs où tout s’agite." />
            </div>

            <div>
              <div className="flex items-end justify-between gap-3 mb-1">
                <Label>Description</Label>
                {!description && produit.description && (
                  <button type="button" onClick={() => setDescription(produit.description)} className="text-[11px] uppercase tracking-widest text-[#8B4A2F] font-bold hover:underline">
                    Partir du texte de Shopify
                  </button>
                )}
              </div>
              <Textarea
                rows={9}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Laissez vide pour garder la description de Shopify. Une ligne vide sépare deux paragraphes."
              />
            </div>

            <div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <Label>Photos (la première est la photo principale)</Label>
                {photos.length === 0 && produit.images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPhotos(produit.images.map(i => ({ url: i.url, path: '' })))}
                    className="text-[11px] uppercase tracking-widest text-[#8B4A2F] font-bold hover:underline"
                  >
                    Reprendre les photos de Shopify
                  </button>
                )}
              </div>
              {photos.length === 0 ? (
                <p className="text-sm text-[#293027]/50 dark:text-white/50 mb-3">Aucune photo choisie : le site montre celles de Shopify.</p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {photos.map((ph, i) => (
                    <li key={`${ph.url}-${i}`} className="relative rounded-xl overflow-hidden border border-[#293027]/10 dark:border-white/10 bg-white/60 dark:bg-white/5">
                      <img src={ph.url} alt="" className="w-full aspect-[4/5] object-cover" />
                      {i === 0 && <span className="absolute top-2 left-2 text-[9px] uppercase tracking-widest font-bold bg-[#293027] text-white px-2 py-1 rounded-full">Principale</span>}
                      <div className="flex items-center justify-between gap-1 p-2">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Avancer" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[#293027]/5 disabled:opacity-30"><i className="fa-solid fa-arrow-left text-xs" /></button>
                          <button type="button" onClick={() => deplacer(i, 1)} disabled={i === photos.length - 1} aria-label="Reculer" className="w-8 h-8 grid place-items-center rounded-lg hover:bg-[#293027]/5 disabled:opacity-30"><i className="fa-solid fa-arrow-right text-xs" /></button>
                        </div>
                        <button type="button" onClick={() => setPhotos(prev => prev.filter((_, k) => k !== i))} className="text-[11px] text-red-600 hover:underline px-2">Retirer</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={fichierRef} type="file" accept="image/*" multiple className="hidden" onChange={televerser} />
              <GhostButton type="button" disabled={envoi} onClick={() => fichierRef.current?.click()}>
                {envoi ? <><i className="fa-solid fa-circle-notch fa-spin" /> Téléversement…</> : <><i className="fa-solid fa-upload" /> Ajouter des photos</>}
              </GhostButton>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 items-end">
              <div>
                <Label>Position dans la boutique (1 = en premier)</Label>
                <Input type="number" min={1} value={ordre} onChange={e => setOrdre(e.target.value)} placeholder="Ordre des ventes de Shopify" />
              </div>
              <ToggleSwitch checked={masque} onChange={setMasque} label={masque ? 'Masqué sur le site' : 'Affiché sur le site'} />
            </div>

            {/* Aperçu */}
            <div>
              <Label>Aperçu</Label>
              <div className="mt-2 grid sm:grid-cols-[180px_1fr] gap-5 p-5 rounded-xl bg-[#f4efe6] border border-[#9c7a44]/30">
                <div className="aspect-[4/5] bg-[#efe6d7] overflow-hidden">
                  {apPhoto && <img src={apPhoto} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 text-[#1c1712]">
                  <p className="font-serif text-2xl font-light leading-tight">{apTitre}</p>
                  {accroche.trim() && <p className="mt-2 font-serif font-light text-[#3a2f23]">{accroche.trim()}</p>}
                  <p className="mt-2 text-[#7d6330] font-serif">{formatMoney(produit.priceRange.minVariantPrice, 'FR')}</p>
                  <div className="mt-3 text-sm leading-relaxed text-[#3a2f23] max-h-40 overflow-hidden [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: apDescription }} />
                </div>
              </div>
              <a
                href={`/boutique/produit/${produit.handle}?apercu=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-[#8B4A2F] hover:underline"
              >
                Voir la page du produit (après l’enregistrement) <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
              </a>
            </div>

            {erreur && <p className="text-sm text-red-600">{erreur}</p>}

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#293027]/10 dark:border-white/10">
              <PrimaryButton type="button" disabled={sauve === 'encours' || envoi} onClick={() => enregistrer(valeurs())}>
                {sauve === 'encours' ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement…</> : <><i className="fa-solid fa-check" /> Enregistrer</>}
              </PrimaryButton>
              <GhostButton type="button" onClick={revenirShopify}>Revenir à Shopify</GhostButton>
              {sauve === 'fait' && <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B4A2F]"><i className="fa-solid fa-check mr-1" /> Enregistré, visible sur le site</span>}
            </div>
          </div>
        </div>
      </div>
    </Portail>
  );
};

export default BoutiquePersonnaliser;
