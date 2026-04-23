import React, { useEffect, useMemo, useState } from 'react';
import {
  getBoutiqueSettings, updateBoutiqueSettings, setProductHidden,
  type BoutiqueSettings, DEFAULT_BOUTIQUE_SETTINGS,
} from '../../../firebase/firestore';
import {
  getProducts, invalidateProductsCache, isShopifyConfigured,
  formatMoney, type ShopifyProduct,
} from '../../../shopify';
import { COLLECTIONS, assignCollection } from '../../../lib/collections';
import { Card, Input, Label, PrimaryButton, GhostButton, ToggleSwitch } from '../primitives';

const BoutiqueSection: React.FC = () => {
  // ── Redirect switch ────────────────────────────────────────────────────
  const [settings, setSettings] = useState<BoutiqueSettings>(DEFAULT_BOUTIQUE_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    getBoutiqueSettings().then(s => setSettings(s)).finally(() => setSettingsLoading(false));
  }, []);

  const save = async (patch: Partial<BoutiqueSettings>) => {
    setSaving(true); setSettingsError(null);
    try {
      await updateBoutiqueSettings(patch);
      setSettings(prev => ({ ...prev, ...patch }));
      setSavedAt(Date.now());
    } catch (e: any) {
      setSettingsError(e?.message || 'Sauvegarde impossible.');
    } finally {
      setSaving(false);
    }
  };

  // ── Shopify products ───────────────────────────────────────────────────
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  const loadProducts = async (forceFresh = false) => {
    if (!isShopifyConfigured) {
      setProductsLoading(false);
      setProductsError('Shopify non configuré — vérifiez VITE_SHOPIFY_DOMAIN / VITE_SHOPIFY_STOREFRONT_TOKEN.');
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      if (forceFresh) invalidateProductsCache();
      const list = await getProducts(50, 'FR');
      setProducts(list);
      setRefreshedAt(Date.now());
    } catch (e: any) {
      setProductsError(e?.message || 'Erreur Shopify.');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => { loadProducts(false); }, []);

  // Pre-compute the collection each product maps to. Products that match no
  // manifest surface at the top as warnings — they're invisible to shoppers
  // until Krystine fixes the tag / title.
  const assignments = useMemo(() => {
    return products.map(p => ({ product: p, collection: assignCollection(p) }));
  }, [products]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { collection } of assignments) {
      if (collection) counts.set(collection.id, (counts.get(collection.id) || 0) + 1);
    }
    return counts;
  }, [assignments]);

  const unmatched = assignments.filter(a => !a.collection);

  return (
    <div className="space-y-6">
      {/* Redirect switch — the "emergency fallback" */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">
              Redirect switch
            </h3>
            <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 max-w-xl">
              Active cette option pour remplacer tous les liens « Boutique » du site par un renvoi vers votre ancienne boutique. Utile en cas de bug : vous pouvez revenir en arrière à tout moment.
            </p>
          </div>
          {settingsLoading ? (
            <i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-xl" />
          ) : (
            <ToggleSwitch
              checked={settings.redirectEnabled}
              onChange={v => save({ redirectEnabled: v })}
              label={settings.redirectEnabled ? 'Actif — renvoi externe' : 'Désactivé — boutique Inspirata'}
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label>URL de redirection</Label>
            <Input
              type="url"
              value={settings.redirectUrl}
              placeholder="https://www.inspiratanature.com"
              onChange={e => setSettings(s => ({ ...s, redirectUrl: e.target.value }))}
            />
          </div>
          <PrimaryButton
            type="button"
            disabled={saving}
            onClick={() => save({ redirectUrl: settings.redirectUrl })}
          >
            {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-solid fa-check" /> Enregistrer</>}
          </PrimaryButton>
        </div>

        {settings.redirectEnabled && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <span>
              Tous les liens <strong>/boutique</strong> du site (menu, pied de page, page d'accueil) renvoient actuellement vers <code className="px-1 bg-white/60 dark:bg-white/10 rounded text-[11px]">{settings.redirectUrl}</code>.
            </span>
          </div>
        )}
        {settingsError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{settingsError}</p>
        )}
        {savedAt && !settingsError && (
          <p className="mt-3 text-[11px] uppercase tracking-widest text-[#D4AF37] font-bold">
            <i className="fa-solid fa-check mr-1" /> Enregistré à {new Date(savedAt).toLocaleTimeString('fr-CA')}
          </p>
        )}
      </Card>

      {/* Collections overview */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">
              Collections
            </h3>
            <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 max-w-xl">
              Les six collections éditoriales de la boutique. Le nombre indique combien de produits Shopify correspondent automatiquement à chaque collection via leurs tags / titre.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COLLECTIONS.map(c => {
            const n = collectionCounts.get(c.id) || 0;
            return (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#F5F5F0] dark:bg-white/5 border border-[#0B1A36]/5 dark:border-white/5">
                <div className="w-14 h-14 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${c.bannerImage})` }} />
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[#0B1A36] dark:text-white truncate">{c.labelFR}</p>
                  <p className="text-[11px] text-[#0B1A36]/60 dark:text-white/60 truncate">/boutique/{c.slug}</p>
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                  n > 0 ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-[#0B1A36]/5 dark:bg-white/5 text-[#0B1A36]/40 dark:text-white/40'
                }`}>
                  {n} {n === 1 ? 'produit' : 'produits'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Products — sync + list */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-2">
              Produits Shopify
            </h3>
            <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 max-w-xl">
              La liste complète tirée de votre boutique Shopify. Les produits sont synchronisés automatiquement (cache 10 min) — utilisez le bouton ci-dessous pour forcer un rafraîchissement après avoir ajouté ou modifié un produit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {refreshedAt && (
              <span className="text-[11px] text-[#0B1A36]/50 dark:text-white/50">
                <i className="fa-solid fa-clock mr-1" /> {new Date(refreshedAt).toLocaleTimeString('fr-CA')}
              </span>
            )}
            <PrimaryButton type="button" disabled={productsLoading} onClick={() => loadProducts(true)}>
              {productsLoading
                ? <><i className="fa-solid fa-circle-notch fa-spin" /> Synchronisation…</>
                : <><i className="fa-brands fa-shopify" /> Synchroniser Shopify</>}
            </PrimaryButton>
          </div>
        </div>

        {productsError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <span>{productsError}</span>
          </div>
        )}

        {unmatched.length > 0 && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm">
            <p className="font-bold mb-1">
              <i className="fa-solid fa-circle-exclamation mr-1" /> {unmatched.length} {unmatched.length === 1 ? 'produit non classé' : 'produits non classés'}
            </p>
            <p className="text-[12px] leading-relaxed">
              Ces produits n'apparaissent dans aucune collection. Ajoutez-leur un tag dans Shopify (par ex. <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">huile-corporelle</code>, <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">chandelle</code>, <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">livre</code>, <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">serenite</code>, <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">solaire</code>, <code className="bg-white/60 dark:bg-white/10 px-1 rounded text-[11px]">rituel</code>) puis cliquez « Synchroniser ».
            </p>
          </div>
        )}

        {productsLoading && products.length === 0 ? (
          <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>
        ) : products.length === 0 && !productsError ? (
          <div className="py-12 text-center text-[#0B1A36]/50 dark:text-white/50 text-sm italic">
            Aucun produit Shopify détecté.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F0] dark:bg-white/5 text-[10px] uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60">
                <tr>
                  <th className="text-left px-4 py-3">Produit</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3">Collection</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Tags</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Prix</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Stock</th>
                  <th className="text-left px-4 py-3">Visible</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(({ product: p, collection }) => {
                  const hidden = (settings.hiddenProducts || []).includes(p.handle);
                  const toggleHidden = async () => {
                    // Optimistic local update so the toggle feels instant.
                    setSettings(prev => {
                      const set = new Set(prev.hiddenProducts || []);
                      if (hidden) set.delete(p.handle);
                      else set.add(p.handle);
                      return { ...prev, hiddenProducts: Array.from(set) };
                    });
                    try { await setProductHidden(p.handle, !hidden); }
                    catch { /* revert? — keep optimistic for now */ }
                  };
                  return (
                  <tr key={p.id} className={`border-t border-[#0B1A36]/5 dark:border-white/5 hover:bg-[#D4AF37]/5 ${hidden ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg bg-cover bg-center shrink-0 bg-[#F5F5F0] dark:bg-white/5 border border-[#0B1A36]/5 dark:border-white/10"
                          style={{ backgroundImage: p.featuredImage?.url ? `url(${p.featuredImage.url})` : undefined }}
                        />
                        <div className="min-w-0">
                          <p className="text-[#0B1A36] dark:text-white truncate">{p.title}</p>
                          <p className="text-[11px] text-[#0B1A36]/50 dark:text-white/50 truncate">{p.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#0B1A36]/70 dark:text-white/70 hidden md:table-cell">{p.productType || '—'}</td>
                    <td className="px-4 py-3">
                      {collection ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-full">
                          {collection.labelFR}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-2.5 py-1 rounded-full">
                          <i className="fa-solid fa-circle-exclamation text-[9px]" /> Non classé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {p.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.tags.slice(0, 4).map(t => (
                            <span key={t} className="text-[10px] uppercase tracking-widest text-[#0B1A36]/50 dark:text-white/50 bg-[#0B1A36]/5 dark:bg-white/5 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                          {p.tags.length > 4 && <span className="text-[10px] text-[#0B1A36]/40 dark:text-white/40">+{p.tags.length - 4}</span>}
                        </div>
                      ) : (
                        <span className="text-[#0B1A36]/30 dark:text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#0B1A36]/70 dark:text-white/70 hidden md:table-cell">
                      {formatMoney(p.priceRange.minVariantPrice, 'FR')}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {p.availableForSale ? (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-green-600 dark:text-green-400">Disponible</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest font-bold text-red-500">Épuisé</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Per-product visibility — flips the product in/out of
                          the public boutique. Stored in settings/boutique
                          and read by BoutiqueContext. */}
                      <ToggleSwitch
                        checked={!hidden}
                        onChange={toggleHidden}
                        label={hidden
                          ? 'Caché'
                          : 'Visible'}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[#0B1A36]/10 dark:border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-[#0B1A36]/50 dark:text-white/50">
            L'édition des produits (titre, prix, images, tags) se fait directement dans Shopify.
          </p>
          <GhostButton
            type="button"
            onClick={() => window.open('https://admin.shopify.com', '_blank', 'noopener,noreferrer')}
          >
            <i className="fa-brands fa-shopify" /> Ouvrir Shopify Admin
            <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
          </GhostButton>
        </div>
      </Card>
    </div>
  );
};

export default BoutiqueSection;
