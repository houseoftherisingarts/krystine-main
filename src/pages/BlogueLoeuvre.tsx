import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Feather, BookOpen } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getBlogPosts, type BlogPost } from '../firebase/firestore';
import NewsletterSignup from '../components/NewsletterSignup';

/**
 * Le Blogue · Journal — page React au style L'Œuvre (espresso/cream/brass).
 * Back-end préservé : les articles sont chargés depuis Firestore via
 * getBlogPosts() (tri createdAt desc), le lecteur rend le HTML de chaque
 * article, et l'infolettre garde NewsletterSignup source="blogue".
 * Skills : premium-web (orchestrateur) + ui-ux-pro-max (tokens/contraste) + impeccable (craft).
 */

const ease = [0.16, 0.8, 0.24, 1] as const;

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 1.0, ease, delay }}
  >
    {children}
  </motion.div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>
    {children}
  </p>
);

const SectionTitle: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light'; className?: string }> = ({ children, on = 'light', className = '' }) => (
  <h2 className={`font-serif font-medium leading-[1.04] text-[clamp(2rem,4.4vw,3.4rem)] ${on === 'dark' ? 'text-ctext' : 'text-ink'} ${className}`}>
    {children}
  </h2>
);

const BlogueLoeuvre: React.FC = () => {
  const { lang } = useApp();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BlogPost | null>(null);

  useEffect(() => {
    getBlogPosts().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  /* ─────────── Vue lecteur d'article ─────────── */
  if (selected) {
    return (
      <article className="bg-cream text-ink font-sans antialiased min-h-screen">
        <div className="mx-auto w-full max-w-[760px] px-6 md:px-12 pt-36 md:pt-44 pb-24 md:pb-32">
          <Reveal>
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.24em] text-brassInk hover:text-forestDeep transition-colors min-h-[44px]"
            >
              <ArrowLeft size={15} /> {lang === 'FR' ? 'Retour au journal' : 'Back to the journal'}
            </button>
          </Reveal>

          <Reveal delay={0.05} className="mt-10 border-b border-brass/20 pb-10">
            {selected.date && <Eyebrow>{selected.date}</Eyebrow>}
            <h1 className="mt-4 font-serif font-medium text-ink leading-[1.06] text-[clamp(2.2rem,5vw,3.6rem)]">
              {selected.title}
            </h1>
            {selected.subtitle && (
              <p className="mt-5 font-serif italic text-brassInk text-[clamp(1.15rem,2.2vw,1.6rem)] leading-snug max-w-[44ch]">
                {selected.subtitle}
              </p>
            )}
          </Reveal>

          {selected.coverImage && (
            <Reveal delay={0.1} className="mt-12">
              <div className="rounded-[1.8rem] overflow-hidden border border-cream3 shadow-xl aspect-[16/10]">
                <img src={selected.coverImage} alt={selected.title} loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </Reveal>
          )}

          <Reveal delay={0.12}>
            <div
              className="mt-12 font-sans text-[1.02rem] leading-[1.9] text-inkSoft [&_h2]:font-serif [&_h2]:text-ink [&_h2]:text-[clamp(1.5rem,2.6vw,2rem)] [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:font-serif [&_h3]:text-ink [&_h3]:text-xl [&_h3]:mt-9 [&_h3]:mb-3 [&_p]:mb-6 [&_a]:text-brassInk [&_a]:underline [&_a]:decoration-brass/40 [&_a:hover]:text-forestDeep [&_strong]:text-ink [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:border-brass [&_blockquote]:pl-6 [&_blockquote]:font-serif [&_blockquote]:italic [&_blockquote]:text-brassInk [&_blockquote]:my-8 [&_ul]:my-6 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-2 [&_img]:rounded-2xl [&_img]:my-8"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </Reveal>

          <Reveal className="mt-16 pt-10 border-t border-brass/20">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.24em] text-brassInk hover:text-forestDeep transition-colors min-h-[44px]"
            >
              <ArrowLeft size={15} /> {lang === 'FR' ? 'Retour au journal' : 'Back to the journal'}
            </button>
          </Reveal>
        </div>
      </article>
    );
  }

  /* ─────────── Vue liste ─────────── */
  return (
    <div className="bg-cream text-ink font-sans antialiased">

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[68vh] flex items-center overflow-hidden bg-espressoDeep">
        <div className="pointer-events-none absolute -top-1/4 -left-1/4 h-[70%] w-[70%] rounded-full bg-forest/20 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-1/4 -right-1/5 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-12 py-28 md:py-36">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
            <p className="inline-flex items-center gap-2 font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-8">
              <Feather size={14} /> {lang === 'FR' ? 'Le Journal' : 'The Journal'}
            </p>
            <h1 className="font-serif font-medium text-ctext leading-[0.98] text-[clamp(2.6rem,6vw,5rem)] max-w-[16ch]">
              {lang === 'FR' ? 'Le Blogue' : 'The Blog'}
            </h1>
            <p className="mt-7 font-serif italic text-[clamp(1.3rem,2.8vw,2.1rem)] leading-snug text-ctextSoft max-w-[34ch]">
              {lang === 'FR'
                ? 'Des notes sur le corps, les saisons et la sagesse qui se dépose au fil du temps.'
                : 'Notes on the body, the seasons, and the wisdom that settles over time.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─────────── ARTICLES ─────────── */}
      <section className="bg-cream py-24 md:py-32">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
          <Reveal className="mb-16">
            <Eyebrow>{lang === 'FR' ? 'Les écrits' : 'The writings'}</Eyebrow>
            <SectionTitle className="mt-4">{lang === 'FR' ? 'Au fil de la plume' : 'Along the pen'}</SectionTitle>
            <div className="mt-5 h-px w-16 bg-brass" />
          </Reveal>

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-10 h-10 border-2 border-t-transparent border-brass rounded-full animate-spin" aria-label="Chargement" />
            </div>
          ) : posts.length === 0 ? (
            /* État vide soigné */
            <Reveal>
              <div className="mx-auto max-w-[640px] rounded-[2rem] border border-cream3 bg-card p-12 md:p-16 text-center shadow-sm">
                <span className="grid place-items-center w-14 h-14 rounded-2xl bg-brass/12 text-brassInk mx-auto mb-6">
                  <BookOpen size={22} />
                </span>
                <h3 className="font-serif font-medium text-ink text-[clamp(1.6rem,3vw,2.2rem)] leading-snug">
                  {lang === 'FR' ? 'Les premières pages s’écrivent.' : 'The first pages are being written.'}
                </h3>
                <p className="mt-5 font-sans text-[0.98rem] leading-[1.8] text-inkSoft max-w-[44ch] mx-auto">
                  {lang === 'FR'
                    ? 'Le journal arrive bientôt. Laissez votre adresse plus bas pour être prévenue dès la première publication.'
                    : 'The journal is on its way. Leave your address below to be notified of the very first entry.'}
                </p>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.id} delay={(i % 3) * 0.06}>
                  <article
                    onClick={() => setSelected(post)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(post); } }}
                    role="button"
                    tabIndex={0}
                    aria-label={post.title}
                    className="group h-full flex flex-col cursor-pointer rounded-[1.6rem] border border-cream3 bg-card overflow-hidden transition-shadow duration-500 hover:shadow-[0_24px_60px_rgba(22,16,10,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-espressoSoft">
                      {post.coverImage ? (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-espresso to-espressoDeep">
                          <Feather size={30} className="text-brass/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(150deg, rgba(22,16,10,0.32) 0%, transparent 55%)' }} />
                    </div>

                    <div className="flex flex-1 flex-col p-7 md:p-8">
                      {post.date && <Eyebrow>{post.date}</Eyebrow>}
                      <h3 className="mt-3 font-serif font-medium text-ink leading-[1.12] text-[clamp(1.35rem,2.2vw,1.7rem)] transition-colors group-hover:text-brassInk">
                        {post.title}
                      </h3>
                      {post.subtitle && (
                        <p className="mt-3 font-sans text-[0.92rem] leading-relaxed text-inkSoft line-clamp-3">
                          {post.subtitle}
                        </p>
                      )}
                      <span className="mt-6 inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-brassInk">
                        {lang === 'FR' ? 'Lire l’article' : 'Read the article'}
                        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── INFOLETTRE ─────────── */}
      <section className="bg-espressoDeep py-24 md:py-32 overflow-hidden relative">
        <div className="pointer-events-none absolute -top-1/4 -right-1/4 h-[60%] w-[60%] rounded-full bg-brass/10 blur-[150px]" />
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 md:px-12 text-center">
          <Reveal>
            <Eyebrow on="dark">{lang === 'FR' ? 'Rester au fil' : 'Stay in the thread'}</Eyebrow>
            <SectionTitle on="dark" className="mt-4">
              {lang === 'FR' ? 'Recevez chaque nouvelle page' : 'Receive every new page'}
            </SectionTitle>
            <p className="mt-6 font-serif italic text-[clamp(1.1rem,2vw,1.5rem)] text-ctextSoft max-w-[40ch] mx-auto leading-snug">
              {lang === 'FR'
                ? 'Les écrits, les saisons et les rituels, déposés directement dans votre boîte.'
                : 'The writings, the seasons and the rituals, delivered straight to your inbox.'}
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <NewsletterSignup source="blogue" variant="dark" className="max-w-[520px] mx-auto" />
          </Reveal>
        </div>
      </section>

    </div>
  );
};

export default BlogueLoeuvre;
