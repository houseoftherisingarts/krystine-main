import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';
import { getBlogPosts, addBlogPost, deleteBlogPost, type BlogPost } from '../firebase/firestore';
import EditableText from '../components/edit/EditableText';

const COVER_STYLES = [
  'bg-gradient-to-br from-[#3A251E] to-[#4A3228]',
  'bg-gradient-to-br from-[#2D4A3E] to-[#3A251E]',
  'bg-gradient-to-br from-[#3D271F] to-[#5C372E]',
  'bg-gradient-to-br from-[#1A1A2E] to-[#3A251E]',
];

const BloguePage: React.FC = () => {
  const { lang, isAdmin } = useApp();
  const t = CONTENT[lang].media.details.blog;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBlogPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      await addBlogPost({
        title: newTitle,
        content: newContent,
        date: new Date().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
        coverStyle: COVER_STYLES[posts.length % COVER_STYLES.length],
      });
      const refreshed = await getBlogPosts();
      setPosts(refreshed);
      setNewTitle(''); setNewContent(''); setAdding(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(lang === 'FR' ? 'Supprimer cet article?' : 'Delete this post?')) return;
    await deleteBlogPost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  if (selected) {
    return (
      <div className="min-h-screen dark:bg-[#3A251E] pt-36 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F] mb-12">
            <i className="fa-solid fa-arrow-left" /> {lang === 'FR' ? 'Retour' : 'Back'}
          </button>
          <div className="text-center mb-10 border-b border-[#3A251E]/10 dark:border-white/10 pb-10">
            <span className="text-[#B8532F] uppercase tracking-widest text-xs font-bold mb-4 block">{selected.date}</span>
            <h1 className="text-4xl md:text-5xl font-serif text-[#3A251E] dark:text-white leading-tight mb-4">{selected.title}</h1>
            {selected.subtitle && <h2 className="text-xl font-serif text-[#3A251E]/60 dark:text-white/60 italic">{selected.subtitle}</h2>}
          </div>
          <div className="prose prose-lg max-w-none text-[#3A251E]/80 dark:text-white/80 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: selected.content }} />
          <div className="mt-16 pt-10 border-t border-[#3A251E]/10 dark:border-white/10 text-center">
            <button onClick={() => setSelected(null)} className="text-[#3A251E]/50 hover:text-[#B8532F] uppercase tracking-widest text-xs font-bold transition-colors">
              {lang === 'FR' ? 'Fermer le livre' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#3A251E] pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-12 border-b border-[#3A251E]/10 dark:border-white/10 pb-12">
          <h1 className="text-5xl md:text-7xl font-serif text-[#3A251E] dark:text-white italic mb-4">
            <EditableText fieldKey="blogue.hero.title" defaultValue={t.title} />
          </h1>
          <p className="text-[#3A251E]/60 dark:text-white/60 uppercase tracking-widest text-sm">
            <EditableText fieldKey="blogue.hero.subtitle" defaultValue={t.subtitle} />
          </p>
        </div>

        {/* Add form */}
        {isAdmin && adding && (
          <div className="mb-12 bg-[#F4E7DD] dark:bg-white/5 p-8 rounded-[24px] shadow-lg border border-[#3A251E]/5 dark:border-white/5">
            <h3 className="font-serif text-2xl text-[#3A251E] dark:text-white mb-6">
              {lang === 'FR' ? 'Ajouter un article' : 'Add article'}
            </h3>
            <div className="space-y-4">
              <input type="text" placeholder={lang === 'FR' ? 'Titre de l\'article' : 'Article title'} value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-4 rounded-xl border border-[#3A251E]/10 dark:border-white/10 focus:border-[#B8532F] outline-none bg-white dark:bg-white/10 text-[#3A251E] dark:text-white" />
              <textarea placeholder={lang === 'FR' ? 'Contenu (HTML supporté)' : 'Content (HTML supported)'} value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full p-4 h-64 rounded-xl border border-[#3A251E]/10 dark:border-white/10 focus:border-[#B8532F] outline-none resize-none bg-white dark:bg-white/10 text-[#3A251E] dark:text-white" />
              <div className="flex justify-end gap-4">
                <button onClick={() => setAdding(false)} className="px-6 py-2 text-[#3A251E]/60 dark:text-white/60 hover:text-[#3A251E] dark:hover:text-white">
                  {lang === 'FR' ? 'Annuler' : 'Cancel'}
                </button>
                <button onClick={handleAdd} disabled={saving} className="px-8 py-2 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] rounded-full hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors shadow-md flex items-center gap-2">
                  {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : null}
                  {lang === 'FR' ? 'Publier' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-t-transparent border-[#B8532F] rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            {/* New post button */}
            {isAdmin && !adding && (
              <div onClick={() => setAdding(true)} className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-[#3A251E]/20 dark:border-white/20 rounded-[24px] h-[340px] hover:border-[#B8532F] transition-colors bg-white/30 dark:bg-white/5">
                <div className="w-12 h-12 rounded-full bg-[#3A251E]/5 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:bg-[#B8532F] group-hover:text-white transition-colors text-[#3A251E] dark:text-white">
                  <i className="fa-solid fa-plus text-xl" />
                </div>
                <span className="text-[#3A251E]/60 dark:text-white/60 font-medium uppercase tracking-wider text-sm">
                  {lang === 'FR' ? 'Ajouter un article' : 'Add article'}
                </span>
              </div>
            )}

            {posts.map(post => (
              <div key={post.id} onClick={() => setSelected(post)} className="group cursor-pointer relative">
                <div className="relative w-full aspect-[2/3] rounded-r-[16px] rounded-l-[3px] shadow-2xl transition-all duration-500 group-hover:-translate-y-4 group-hover:rotate-1">
                  <div className={`absolute inset-0 ${post.coverStyle || COVER_STYLES[0]} rounded-r-[16px] rounded-l-[3px] flex flex-col p-6 items-center justify-center text-center text-white border-l-4 border-white/10`}>
                    <div className="border border-white/30 p-4 w-full h-full flex flex-col items-center justify-center">
                      <i className="fa-solid fa-feather-pointed text-3xl mb-4 opacity-80" />
                      <h3 className="font-serif text-xl md:text-2xl leading-tight mb-2 drop-shadow-md">{post.title}</h3>
                      {post.subtitle && <p className="text-xs uppercase tracking-widest opacity-70 mt-2 border-t border-white/30 pt-2">{post.subtitle}</p>}
                    </div>
                  </div>
                  <div className="absolute right-0 top-1 bottom-1 w-2 bg-white rounded-r-sm shadow-inner transform translate-x-[1px] -z-10" />
                  {isAdmin && (
                    <div className="absolute -top-3 -right-3 flex gap-2 z-50">
                      <button onClick={e => handleDelete(post.id!, e)} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-center mt-4">
                  <span className="text-xs text-[#3A251E]/40 dark:text-white/40 uppercase tracking-widest font-bold">{post.date}</span>
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="col-span-full text-center py-20">
                <p className="font-serif text-xl md:text-2xl italic text-[#3A251E]/55 dark:text-white/55 leading-relaxed">
                  {lang === 'FR'
                    ? 'Nouveau site. Synchronisation du blog sous peu.'
                    : 'New site. Blog syncing shortly.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BloguePage;
