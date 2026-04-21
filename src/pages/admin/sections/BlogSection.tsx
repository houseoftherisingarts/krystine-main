import React, { useEffect, useState } from 'react';
import { getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost, type BlogPost } from '../../../firebase/firestore';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState, ImageUpload } from '../primitives';

const COVER_STYLES = [
  'bg-gradient-to-br from-[#0B1A36] to-[#1A2642]',
  'bg-gradient-to-br from-[#2D4A3E] to-[#0B1A36]',
  'bg-gradient-to-br from-[#3D2B1F] to-[#5C3D2E]',
  'bg-gradient-to-br from-[#1A1A2E] to-[#0B1A36]',
];

const empty: Partial<BlogPost> = {
  title: '', subtitle: '', content: '', coverStyle: COVER_STYLES[0], coverImage: '', isPublished: true,
};

const BlogSection: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => getBlogPosts().then(setPosts).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const startCreate = () => setEditing({ ...empty, coverStyle: COVER_STYLES[posts.length % COVER_STYLES.length] });
  const startEdit = (p: BlogPost) => setEditing({ ...p });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing || !editing.title || !editing.content) return;
    setSaving(true);
    try {
      const patch: Partial<BlogPost> = {
        title: editing.title!,
        subtitle: editing.subtitle || '',
        content: editing.content!,
        coverStyle: editing.coverStyle || COVER_STYLES[0],
        coverImage: editing.coverImage || '',
        isPublished: editing.isPublished !== false,
        date: editing.date || new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
      };
      if (editing.id) {
        await updateBlogPost(editing.id, patch);
      } else {
        await addBlogPost(patch as Omit<BlogPost, 'id' | 'createdAt'>);
      }
      await refresh();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const del = async (p: BlogPost) => {
    if (!p.id) return;
    if (!confirm(`Supprimer « ${p.title} » ?`)) return;
    await deleteBlogPost(p.id);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60">{posts.length} article{posts.length > 1 ? 's' : ''}</p>
        <PrimaryButton onClick={startCreate}><i className="fa-solid fa-plus" /> Rédiger un article</PrimaryButton>
      </div>

      {editing && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div>
                <Label>Image de couverture</Label>
                <ImageUpload value={editing.coverImage || ''} onChange={url => setEditing({ ...editing, coverImage: url })} folder="blog" />
              </div>
              <div>
                <Label>Dégradé (si pas d'image)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {COVER_STYLES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, coverStyle: c })}
                      className={`h-14 rounded-xl ${c} border-2 ${editing.coverStyle === c ? 'border-[#D4AF37]' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Sous-titre</Label>
                <Input value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>Contenu *</Label>
                <Textarea rows={14} value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} placeholder="Écrivez votre article… (texte brut ou Markdown simple)" />
              </div>
              <div className="pt-2">
                <ToggleSwitch checked={editing.isPublished !== false} onChange={v => setEditing({ ...editing, isPublished: v })} label="Publié" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <GhostButton onClick={cancel}>Annuler</GhostButton>
                <PrimaryButton onClick={save} disabled={saving || !editing.title || !editing.content}>
                  {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement</> : <>{editing.id ? 'Mettre à jour' : 'Publier'}</>}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>
      ) : posts.length === 0 ? (
        <EmptyState icon="fa-pen-nib">Aucun article pour l'instant.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(p => (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              <div
                className={`h-32 ${p.coverImage ? 'bg-cover bg-center' : (p.coverStyle || COVER_STYLES[0])}`}
                style={p.coverImage ? { backgroundImage: `url(${p.coverImage})` } : undefined}
              />
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  {p.isPublished === false && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#0B1A36]/10 dark:bg-white/10 text-[#0B1A36]/60 dark:text-white/60">Brouillon</span>}
                  {p.date && <span className="text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">{p.date}</span>}
                </div>
                <h3 className="font-serif text-lg text-[#0B1A36] dark:text-white mb-1">{p.title}</h3>
                {p.subtitle && <p className="text-sm italic text-[#0B1A36]/60 dark:text-white/60 mb-2">{p.subtitle}</p>}
                <p className="text-sm text-[#0B1A36]/70 dark:text-white/70 line-clamp-3 flex-1">{p.content}</p>
                <div className="flex gap-2 pt-4 mt-4 border-t border-[#0B1A36]/5 dark:border-white/5">
                  <GhostButton onClick={() => startEdit(p)}><i className="fa-solid fa-pen" /> Éditer</GhostButton>
                  <DangerButton onClick={() => del(p)}><i className="fa-solid fa-trash" /></DangerButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogSection;
