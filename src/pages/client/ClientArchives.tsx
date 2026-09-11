import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FileWarning } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../contexts/AppContext';
import { suivreAvisActifs, suivreMesAvisLus, marquerAvisLu, type Avis } from '../../firebase/avis';
import {
  getMemberInbox, markInboxRead, getNewsletter,
  type InboxPointer, type NewsletterDoc,
} from '../../firebase/firestore';
import { RenderBlocksWeb } from '../../lib/newsletterRenderer';
import { CadreOr, EtiquetteOr } from '../../components/client/CadreOr';

// Une lettre d'or déposée depuis la messagerie (ClientSupport) demande à
// s'ouvrir ici par cette clé.
export const CLE_LETTRE_A_OUVRIR = 'ksl-lettre-a-ouvrir';

/**
 * Les avis épinglés (Alex, 11 septembre 2026) : ceux qui restent à lire,
 * avec le bouton « Lu », puis ceux que la cliente a collectionnés. Un avis lu
 * reste lisible même quand Krystine l'a retiré du babillard.
 */
const AvisEpingles: React.FC<{ uid: string; lang: 'FR' | 'EN'; ouvrir?: string | null }> = ({ uid, lang, ouvrir }) => {
  const fr = lang === 'FR';
  const [actifs, setActifs] = useState<Avis[]>([]);
  const [lus, setLus] = useState<string[]>([]);
  const [retires, setRetires] = useState<Record<string, Avis>>({});
  useEffect(() => suivreAvisActifs(setActifs), []);
  useEffect(() => suivreMesAvisLus(uid, setLus), [uid]);
  // Un avis lu qui n'est plus actif se va chercher un par un.
  useEffect(() => {
    if (!db) return;
    const manquants = lus.filter((id) => !actifs.some((a) => a.id === id) && !retires[id]);
    if (!manquants.length) return;
    let vivant = true;
    Promise.all(manquants.map((id) => getDoc(doc(db!, 'avis', id)).then((s) => (s.exists() ? ({ id: s.id, ...(s.data() as Omit<Avis, 'id'>) }) : null)).catch(() => null)))
      .then((docs) => { if (!vivant) return; setRetires((prev) => { const n = { ...prev }; docs.forEach((d) => { if (d) n[d.id] = d; }); return n; }); });
    return () => { vivant = false; };
  }, [lus, actifs, retires]);

  const aLire = useMemo(() => actifs.filter((a) => !lus.includes(a.id)), [actifs, lus]);
  const epingles = useMemo(() => lus.map((id) => actifs.find((a) => a.id === id) || retires[id]).filter(Boolean) as Avis[], [lus, actifs, retires]);
  const date = (a: Avis) => a.creeLe?.toDate().toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || '';

  const Carte: React.FC<{ a: Avis; lu: boolean }> = ({ a, lu }) => (
    <article id={`avis-${a.id}`} className={`rounded-[18px] p-5 md:p-6 ${lu ? 'border border-[#293027]/5 dark:border-white/5 bg-white dark:bg-[#293027]/60' : 'border border-[#BA7B39]/40 bg-[#BA7B39]/5'} ${ouvrir === a.id ? 'ring-2 ring-[#BA7B39]/40' : ''}`}>
      <div className="flex items-start gap-4">
        <span className={`inline-grid h-11 w-11 shrink-0 place-items-center rounded-full ${lu ? 'bg-[#293027]/5 text-[#293027]/50 dark:bg-white/10 dark:text-white/60' : 'bg-[#BA7B39]/15 text-[#8B4A2F]'}`}>
          <FileWarning size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#8B4A2F] font-bold">{lu ? (fr ? 'Avis épinglé' : 'Pinned notice') : (fr ? 'Avis à lire' : 'Notice to read')} · {date(a)}</p>
          <h3 className={`mt-1.5 font-serif text-xl text-[#293027] dark:text-white ${lu ? '' : 'font-bold'}`}>{a.titre}</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-[#293027]/75 dark:text-white/75 whitespace-pre-line">{a.texte}</p>
          {a.lienHref && <a href={a.lienHref} className="mt-3 inline-block text-xs uppercase tracking-widest text-[#8B4A2F] hover:underline">{a.lienLibelle || (fr ? 'En savoir plus' : 'Learn more')}</a>}
          {!lu && (
            <button type="button" onClick={() => { void marquerAvisLu(uid, a.id); }} className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#BA7B39] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#293027] transition-colors hover:bg-[#d9a05b]">
              <i className="fa-solid fa-check" /> {fr ? 'Lu, épingler dans mes lettres' : 'Read, pin it to my letters'}
            </button>
          )}
        </div>
      </div>
    </article>
  );

  if (!aLire.length && !epingles.length) {
    return (
      <div className="text-center py-16">
        <FileWarning size={40} className="mx-auto mb-4 text-[#293027]/30 dark:text-white/30" />
        <p className="text-[#293027]/60 dark:text-white/60 font-serif italic">{fr ? 'Aucun avis épinglé pour l’instant.' : 'No pinned notice yet.'}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {aLire.map((a) => <Carte key={a.id} a={a} lu={false} />)}
      {epingles.map((a) => <Carte key={a.id} a={a} lu />)}
    </div>
  );
};

const ClientArchives: React.FC = () => {
  const { user, lang } = useApp();
  const location = useLocation();
  const avisVoulu = new URLSearchParams(location.search).get('avis');
  // Lettres se divise en deux : les infolettres reçues, et les avis épinglés (Alex, 11 septembre 2026).
  const [partie, setPartie] = useState<'infolettres' | 'avis'>(avisVoulu ? 'avis' : 'infolettres');
  useEffect(() => { if (avisVoulu) setPartie('avis'); }, [avisVoulu]);
  const [inbox, setInbox] = useState<InboxPointer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<NewsletterDoc | null>(null);
  const [loadingOpen, setLoadingOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMemberInbox(user.uid)
      .then(liste => {
        setInbox(liste);
        let voulu: string | null = null;
        try { voulu = sessionStorage.getItem(CLE_LETTRE_A_OUVRIR); sessionStorage.removeItem(CLE_LETTRE_A_OUVRIR); } catch { /* noop */ }
        const p = voulu ? liste.find(x => x.newsletterId === voulu) : null;
        if (p) void open(p);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const open = async (p: InboxPointer) => {
    if (!user || !p.newsletterId) return;
    setOpenId(p.newsletterId);
    setLoadingOpen(true);
    try {
      const doc = await getNewsletter(p.newsletterId);
      setOpenDoc(doc);
      // Flip read-state; non-fatal if it fails (rules / offline).
      if (!p.readAt) {
        try { await markInboxRead(user.uid, p.newsletterId); } catch { /* noop */ }
        setInbox(prev => prev.map(x => x.newsletterId === p.newsletterId ? { ...x, readAt: x.readAt || (new Date() as any) } : x));
      }
    } finally {
      setLoadingOpen(false);
    }
  };

  const Parties = (
    <div className="mb-6 flex flex-wrap gap-2">
      {([['infolettres', lang === 'FR' ? 'Infolettres' : 'Newsletters', 'fa-envelope-open-text'], ['avis', lang === 'FR' ? 'Avis épinglés' : 'Pinned notices', 'fa-thumbtack']] as const).map(([cle, libelle, icone]) => (
        <button
          key={cle} type="button" onClick={() => setPartie(cle)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${partie === cle ? 'bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]' : 'border border-[#293027]/15 text-[#293027]/70 hover:border-[#BA7B39] dark:border-white/15 dark:text-white/70'}`}
        >
          <i className={`fa-solid ${icone}`} /> {libelle}
        </button>
      ))}
    </div>
  );

  if (partie === 'avis' && user) {
    return <div>{Parties}<AvisEpingles uid={user.uid} lang={lang} ouvrir={avisVoulu} /></div>;
  }

  if (loading) {
    return <div>{Parties}<div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div></div>;
  }

  if (!inbox.length) {
    return (
      <div>{Parties}<div className="text-center py-16">
        <i className="fa-regular fa-envelope text-4xl text-[#293027]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#293027]/60 dark:text-white/60 font-serif italic">
          {lang === 'FR' ? 'Aucune lettre reçue pour l\u2019instant.' : 'No letters received yet.'}
        </p>
      </div></div>
    );
  }

  // Reading view
  if (openId && openDoc) {
    const or = !!openDoc.lettreDor;
    const Cadre: React.ElementType = or ? CadreOr : 'article';
    return (
      <div>
        <button onClick={() => { setOpenId(null); setOpenDoc(null); }} className="mb-6 text-xs uppercase tracking-widest text-[#8B4A2F] hover:underline">
          <i className="fa-solid fa-arrow-left mr-2" /> {lang === 'FR' ? 'Retour aux lettres' : 'Back to letters'}
        </button>
        <Cadre {...(or ? { large: true } : {})} className={`bg-white dark:bg-[#293027] rounded-[24px] p-6 md:p-10 ${or ? '' : 'border border-[#293027]/5 dark:border-white/5'}`}>
          {or && <EtiquetteOr lang={lang} className="mb-3" />}
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B4A2F] font-bold mb-3">
            {openDoc.sentAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || ''}
          </p>
          <h1 className="text-3xl md:text-4xl font-serif text-[#293027] dark:text-white mb-6">{openDoc.subject}</h1>
          {openDoc.preheader && <p className="text-[#293027]/60 dark:text-white/60 italic mb-8">{openDoc.preheader}</p>}
          <RenderBlocksWeb blocks={openDoc.blocks || []} />
        </Cadre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Parties}
      {loadingOpen && <div className="py-4 text-center text-[#8B4A2F]"><i className="fa-solid fa-circle-notch fa-spin" /></div>}
      {inbox.map(item => {
        const unread = !item.readAt;
        const or = !!item.lettreDor;
        const Boite: React.ElementType = or ? CadreOr : 'button';
        return (
          <Boite
            key={item.id}
            role={or ? 'button' : undefined}
            tabIndex={or ? 0 : undefined}
            onClick={() => open(item)}
            onKeyDown={or ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void open(item); } } : undefined}
            className={`w-full text-left rounded-[18px] p-5 transition-colors cursor-pointer ${
              or ? 'bg-white dark:bg-[#293027]'
              : unread
                ? 'border border-[#BA7B39]/40 bg-[#BA7B39]/5 hover:border-[#BA7B39]'
                : 'border border-[#293027]/5 dark:border-white/5 bg-white dark:bg-[#293027]/60 hover:border-[#BA7B39]'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* L'enveloppe : scellée de cire rouge (la goutte d'Inspirata) tant que la
                  lettre n'est pas ouverte, décachetée ensuite. Deux photographies de la
                  même enveloppe (/compte/lettre-scellee.webp, /compte/lettre-ouverte.webp). */}
              <img
                src={unread ? '/compte/lettre-scellee.webp' : '/compte/lettre-ouverte.webp'}
                alt={unread ? (lang === 'FR' ? 'Lettre scellée' : 'Sealed letter') : (lang === 'FR' ? 'Lettre ouverte' : 'Opened letter')}
                width={72} height={72}
                className={`h-14 w-[72px] shrink-0 object-contain transition-transform duration-500 sm:h-[72px] sm:w-24 ${unread ? 'drop-shadow-[0_6px_10px_rgba(120,20,20,0.25)]' : 'drop-shadow-[0_4px_8px_rgba(41,48,39,0.18)]'}`}
                draggable={false}
              />
              <div className="flex-1 min-w-0">
                {or && <EtiquetteOr lang={lang} className="mb-1.5" />}
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={`font-serif text-lg text-[#293027] dark:text-white truncate ${unread ? 'font-bold' : ''}`}>
                    {item.subject}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 shrink-0">
                    {item.receivedAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </span>
                </div>
                {item.title && <p className="text-xs text-[#293027]/60 dark:text-white/60 mt-1">{item.title}</p>}
              </div>
              <i className="fa-solid fa-chevron-right text-[#293027]/30 dark:text-white/30 mt-1" />
            </div>
          </Boite>
        );
      })}
    </div>
  );
};

export default ClientArchives;
