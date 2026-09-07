import React, { useEffect, useRef, useState } from 'react';
import { libelleTag } from '../../../../lib/paliers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import { Timestamp } from 'firebase/firestore';
import {
  createNewsletter, updateNewsletter, getNewsletter, saveNewsletterVersion, getNewsletterVersions,
  ENTETE_INFOLETTRE_PAR_DEFAUT, type NewsletterVersion,
  type NewsletterBlock, type BlockType, type NewsletterStatus, type NewsletterAudience, type BandeauInfolettre, type NewsletterDoc,
} from '../../../../firebase/firestore';
import AudiencePicker from './AudiencePicker';
import PreviewFrame from './PreviewFrame';
import AssistantPanel, { type Proposal } from './AssistantPanel';
import MediathequePicker from '../../../../components/edit/MediathequePicker';
import { RenderBlockWeb, POLICES, TAILLES, SEPARATEURS, FONDS_INFOLETTRE, estSombre } from '../../../../lib/newsletterRenderer';
import { Input, Label, PrimaryButton, GhostButton } from '../../primitives';
import Portail from '../../../../components/Portail';

interface Props {
  newsletterId: string | null;  // null → fresh draft
  onBack: () => void;
  onOpen?: (id: string) => void;   // ouvrir un autre brouillon (la traduction qui vient de naître)
}

// Le bandeau tel qu'il part quand rien n'est réglé : noir chaud, sujet crème.
const BANDEAU_DEFAUT = { fond: '#141311', texte: '#EEE7DB' };
const ETIQUETTE_DEFAUT = { fr: 'Infolettre', en: 'Newsletter' } as const;

const BLOCK_PALETTE: Array<{ type: BlockType; icon: string; label: string; template: () => NewsletterBlock }> = [
  { type: 'heading',  icon: 'fa-heading',     label: 'Titre',      template: () => ({ type: 'heading',   content: { level: 2, text: '', align: 'center' } }) },
  { type: 'paragraph',icon: 'fa-paragraph',   label: 'Paragraphe', template: () => ({ type: 'paragraph', content: { text: '' } }) },
  { type: 'image',    icon: 'fa-image',       label: 'Image',      template: () => ({ type: 'image',     content: { url: '', caption: '' } }) },
  { type: 'button',   icon: 'fa-hand-pointer',label: 'Bouton',     template: () => ({ type: 'button',    content: { label: 'Découvrir', href: 'https://www.krystinestlaurent.ca', variant: 'primary' } }) },
  { type: 'list',     icon: 'fa-list-ul',     label: 'Puces',      template: () => ({ type: 'list',      content: { text: '', style: 'puce' } }) },
  { type: 'quote',    icon: 'fa-quote-left',  label: 'Citation',   template: () => ({ type: 'quote',     content: { text: '', attribution: '' } }) },
  { type: 'cta',      icon: 'fa-star',        label: 'Appel fort', template: () => ({ type: 'cta',       content: { eyebrow: 'Nouveauté', title: '', body: '', href: 'https://www.krystinestlaurent.ca', buttonLabel: 'En savoir plus' } }) },
  { type: 'divider',  icon: 'fa-minus',       label: 'Séparateur', template: () => ({ type: 'divider',   content: { style: 'ligne' } }) },
  { type: 'spacer',   icon: 'fa-arrows-up-down', label: 'Espace', template: () => ({ type: 'spacer',    content: { size: 'md' } }) },
];

// Le composeur prend tout l'écran (par-dessus le menu de l'admin) : la page
// s'écrit comme elle sera lue, chaque texte se modifie au clic, chaque image
// se remplace au clic. Les réglages d'envoi vivent dans le rail de droite.
const Composer: React.FC<Props> = ({ newsletterId, onBack, onOpen }) => {
  const [loading, setLoading] = useState(newsletterId !== null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [id, setId] = useState<string | null>(newsletterId);
  const [status, setStatus] = useState<NewsletterStatus>('draft');

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [fromName, setFromName] = useState('Krystine St-Laurent');
  const [blocks, setBlocks] = useState<NewsletterBlock[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [audience, setAudience] = useState<NewsletterAudience>({ mode: 'all' });
  const [when, setWhen] = useState('');          // datetime-local, heure du Québec
  const [side, setSide] = useState<'reglages' | 'preview' | 'iris' | 'versions'>('reglages');
  const [pickFor, setPickFor] = useState<number | 'entete' | 'bandeau' | null>(null);   // bloc image, l'en-tête ou le bandeau en attente d'une image
  // En-tête du courriel : « La lettre de Krystine » par défaut (ENTETE_INFOLETTRE_PAR_DEFAUT).
  // La couverture du podcast, une autre image de la médiathèque ou rien restent au choix.
  const [couverture, setCouverture] = useState<'podcast' | 'image' | 'aucune'>(ENTETE_INFOLETTRE_PAR_DEFAUT.couverture);
  const [couvertureUrl, setCouvertureUrl] = useState<string>(ENTETE_INFOLETTRE_PAR_DEFAUT.couvertureUrl);
  const [signature, setSignature] = useState(true);
  // Langue de la lettre et bandeau : le gabarit du courriel les suit.
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [bandeau, setBandeau] = useState<BandeauInfolettre>({});
  const [fond, setFond] = useState<string>('#FFFFFF');
  const sombre = estSombre(fond);
  const [traductionDe, setTraductionDe] = useState<string | null>(null);
  const [translating, setTranslating] = useState<'copie' | 'surplace' | null>(null);
  // Historique : la date de la dernière version gardée (une par heure), et la liste quand le rail l'affiche.
  const [versionAt, setVersionAt] = useState<number>(0);
  const [versions, setVersions] = useState<NewsletterVersion[] | null>(null);
  // La lettre d'or : à l'interne, aux membres, gratuite. Deux canaux au choix.
  const [lettreDor, setLettreDor] = useState(false);
  const [dorMessagerie, setDorMessagerie] = useState(true);
  const [dorSection, setDorSection] = useState(true);

  // datetime-local <-> Date
  const toLocal = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  useEffect(() => {
    if (!newsletterId) { setLoading(false); return; }
    setLoading(true);
    getNewsletter(newsletterId)
      .then(n => {
        if (!n) { onBack(); return; }
        chargerRef.current(n);
      })
      .finally(() => setLoading(false));
  }, [newsletterId, onBack]);

  // Pose l'état du composeur depuis un document (ouverture, et après une
  // traduction sur place). Dans une ref pour que l'effet d'ouverture n'ait pas
  // à dépendre de chaque setter.
  const chargerRef = useRef<(n: NewsletterDoc) => void>(() => {});
  chargerRef.current = (n: NewsletterDoc) => {
        setTitle(n.title || '');
        setSubject(n.subject || '');
        setPreheader(n.preheader || '');
        setFromName(n.fromName || 'Krystine St-Laurent');
        setBlocks(n.blocks || []);
        setStatus(n.status || 'draft');
        setAudience(n.audience || (n.segmentTag ? { mode: 'tags', tags: [n.segmentTag] } : { mode: 'all' }));
        setWhen(n.scheduledFor ? toLocal(n.scheduledFor.toDate()) : '');
        setCouverture(n.couverture || 'aucune');
        setCouvertureUrl(n.couvertureUrl || '');
        setSignature(n.signature !== false);
        setLang(n.lang === 'en' ? 'en' : 'fr');
        setBandeau(n.bandeau || {});
        setFond(n.fond || '#FFFFFF');
        setTraductionDe(n.traductionDe || null);
        setVersionAt(n.versionAt ? n.versionAt.toMillis() : 0);
        setLettreDor(!!n.lettreDor);
        setDorMessagerie(n.lettreDor ? !!n.lettreDor.messagerie : true);
        setDorSection(n.lettreDor ? n.lettreDor.section !== false : true);
  };

  const isReadOnly = status === 'sent' || status === 'sending';

  // `at` : la position où le bloc s'insère (le « + » entre deux blocs);
  // sans `at`, il se pose à la fin.
  const addBlock = (t: BlockType, at: number = blocks.length) => {
    if (isReadOnly) return;
    const template = BLOCK_PALETTE.find(b => b.type === t)?.template();
    if (!template) return;
    setBlocks(prev => [...prev.slice(0, at), template, ...prev.slice(at)]);
    setSelectedIdx(at);
    if (t === 'image') setPickFor(at);
  };

  const duplicateBlock = (idx: number) => {
    setBlocks(prev => [...prev.slice(0, idx + 1), JSON.parse(JSON.stringify(prev[idx])), ...prev.slice(idx + 1)]);
    setSelectedIdx(idx + 1);
  };

  const updateBlock = (idx: number, patch: Partial<NewsletterBlock['content']>) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: { ...(b.content || {}), ...patch } } : b));
  };

  // Glisser-déposer : `from` est le bloc saisi, `over` le bloc survolé et
  // `before` dit si la ligne d'accueil est au-dessus ou au-dessous de lui.
  const [drag, setDrag] = useState<{ from: number; over: number | null; before: boolean } | null>(null);
  // Le bloc survolé : sa barre d'outils prend le dessus, et celle du bloc
  // sélectionné s'efface le temps du survol pour ne pas couvrir le voisin.
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  // Déplace le bloc `from` devant la position `to` (index d'insertion dans la
  // liste d'origine). Rien ne bouge si la cible est sa propre place.
  const moveBlockTo = (from: number, to: number) => {
    if (from === to || from + 1 === to) return;
    setBlocks(prev => {
      const next = prev.slice();
      const [b] = next.splice(from, 1);
      next.splice(from < to ? to - 1 : to, 0, b);
      return next;
    });
    setSelectedIdx(from < to ? to - 1 : to);
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const next = prev.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    setSelectedIdx(v => (v === idx ? idx + dir : v));
  };

  const removeBlock = (idx: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  // Ce que la lettre contient, en une chaîne : la sauvegarde automatique
  // compare à la dernière version enregistrée et ne part que si ça a changé.
  const etat = JSON.stringify({ title, subject, preheader, fromName, blocks, audience, when, couverture, couvertureUrl, signature, lang, bandeau, fond, lettreDor, dorMessagerie, dorSection });
  const etatSauve = useRef<string | null>(null);
  useEffect(() => { if (!loading && etatSauve.current === null) etatSauve.current = etat; }, [loading, etat]);

  // La version gardée dans l'historique : le contenu de la lettre, sans
  // l'audience ni la date (qui ne se restaurent pas).
  const contenuVersion = () => ({ title, subject, preheader, blocks, lang, bandeau, fond, couverture, couvertureUrl: couverture === 'image' ? couvertureUrl : null, signature });

  const save = async (): Promise<string | null> => {
    if (isReadOnly) return id;
    setSaving(true);
    const etatAuDepart = etat;
    try {
      const scheduledFor = when ? Timestamp.fromDate(new Date(when)) : null;
      const enTete = { couverture, couvertureUrl: couverture === 'image' ? couvertureUrl : null, signature, lang, bandeau, fond, traductionDe, lettreDor: lettreDor ? { messagerie: dorMessagerie, section: dorSection } : null };
      let savedId = id;
      if (id) {
        await updateNewsletter(id, { title, subject, preheader, fromName, blocks, audience, scheduledFor, ...enTete });
      } else {
        const ref = await createNewsletter({ title, subject, preheader, fromName, blocks, status: 'draft', audience, scheduledFor, ...enTete });
        if (ref) setId(ref.id);
        savedId = ref?.id || null;
      }
      etatSauve.current = etatAuDepart;
      setSavedAt(new Date());
      // Une version par heure d'écriture, au plus.
      if (savedId && Date.now() - versionAt > 3600e3) {
        try { await saveNewsletterVersion(savedId, { ...contenuVersion(), raison: 'heure' }); setVersionAt(Date.now()); } catch { /* l'historique n'empêche jamais la sauvegarde */ }
      }
      return savedId;
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde automatique : cinq secondes après le dernier changement, tant
  // que la lettre est un brouillon et qu'elle a au moins un sujet ou un bloc.
  useEffect(() => {
    if (loading || saving || isReadOnly || status === 'scheduled') return;
    if (etatSauve.current === null || etat === etatSauve.current) return;
    if (!subject && !blocks.length) return;
    const t = window.setTimeout(() => { save().catch(() => {}); }, 5000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, loading, saving, isReadOnly, status]);

  const ouvrirVersions = async () => {
    setSide('versions');
    setVersions(null);
    if (!id) { setVersions([]); return; }
    try { setVersions(await getNewsletterVersions(id)); } catch { setVersions([]); }
  };
  // Restaurer : l'état actuel se garde d'abord (rien ne se perd), puis la
  // version choisie prend la place. La sauvegarde automatique fait le reste.
  const restaurer = async (v: NewsletterVersion) => {
    if (!id || isReadOnly) return;
    if (!confirm(`Revenir à la version du ${v.savedAt?.toDate().toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }) || '?'} ? La version actuelle est gardée dans l'historique.`)) return;
    try { await saveNewsletterVersion(id, { ...contenuVersion(), raison: 'restauration' }); setVersionAt(Date.now()); } catch { /* noop */ }
    setTitle(v.title || ''); setSubject(v.subject || ''); setPreheader(v.preheader || '');
    setBlocks(v.blocks || []); setLang(v.lang === 'en' ? 'en' : 'fr'); setBandeau(v.bandeau || {}); setFond(v.fond || '#FFFFFF');
    setCouverture(v.couverture || 'aucune'); setCouvertureUrl(v.couvertureUrl || ''); setSignature(v.signature !== false);
    setSelectedIdx(null);
    setSendInfo('Version restaurée. Elle s’enregistre toute seule dans quelques secondes.');
    setVersions(await getNewsletterVersions(id).catch(() => []));
  };

  const [sendBusy, setSendBusy] = useState<'idle' | 'test' | 'live'>('idle');
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [sendInfo, setSendInfo] = useState<string | null>(null);

  // Calls the Cloud Function. `testEmail` routes through the test-send path;
  // omitting it sends to every active subscriber (gated by admin rules).
  const triggerSend = async (testEmail?: string) => {
    setSendErr(null); setSendInfo(null);
    if (!subject) { setSendErr('Le sujet est requis avant d’envoyer.'); return; }
    if (!blocks.length) { setSendErr('Ajoutez au moins un bloc avant d’envoyer.'); return; }
    setSendBusy(testEmail ? 'test' : 'live');
    try {
      const savedId = await save();
      if (!savedId) throw new Error('Impossible d’enregistrer le brouillon.');
      if (!app) throw new Error('Firebase n’est pas configuré.');
      const fns = getFunctions(app, 'us-central1');
      const call = httpsCallable(fns, 'sendNewsletter');
      const res: any = await call({ newsletterId: savedId, testEmail });
      const data = res.data || {};
      if (testEmail) {
        setSendInfo(`Test envoyé à ${testEmail}.`);
      } else if (lettreDor) {
        setSendInfo(`Lettre d'or déposée chez ${data.recipients ?? '?'} membre(s). Aucun courriel envoyé.`);
        setStatus('sent');
      } else {
        if (data.done === false) {
          // Grande liste : le premier passage a rendu la main, le calendrier
          // du site reprend la suite tout seul toutes les 5 minutes.
          setSendInfo(`Envoi en cours : ${data.delivered ?? 0} sur ${data.recipients ?? '?'} parties (${data.bounces ?? 0} échecs). La suite part toute seule, le statut passera à « envoyée » quand tout sera parti.`);
          setStatus('sending');
        } else {
          setSendInfo(`Envoyée à ${data.recipients ?? '?'} personne(s) (${data.delivered ?? '?'} livrées, ${data.bounces ?? 0} échecs).`);
          setStatus('sent');
        }
      }
    } catch (e: any) {
      setSendErr(e?.message || 'Envoi échoué.');
    } finally {
      setSendBusy('idle');
    }
  };

  // Traduire vers l'autre langue. « copie » : la lettre s'enregistre, la
  // fonction en fait un brouillon traduit, le composeur l'ouvre. « surplace » :
  // les mots de ce brouillon changent (la version d'avant va dans l'historique).
  const autreLangue = lang === 'en' ? 'français' : 'anglais';
  const traduire = async (mode: 'copie' | 'surplace') => {
    setSendErr(null); setSendInfo(null);
    if (!subject || !blocks.length) { setSendErr('Le sujet et au moins un bloc sont requis avant de traduire.'); return; }
    if (mode === 'surplace' && !confirm(`Traduire cette lettre en ${autreLangue}, sur place ? La version actuelle est gardée dans l'historique.`)) return;
    setTranslating(mode);
    try {
      const savedId = isReadOnly ? id : await save();
      if (!savedId) throw new Error('Impossible d’enregistrer le brouillon.');
      if (!app) throw new Error('Firebase n’est pas configuré.');
      const call = httpsCallable(getFunctions(app, 'us-central1'), 'traduireInfolettre');
      const res: any = await call({ newsletterId: savedId, mode });
      const newId = res.data?.id as string | undefined;
      if (!newId) throw new Error('La traduction n’a pas rendu de brouillon.');
      if (mode === 'surplace') {
        const n = await getNewsletter(newId);
        if (n) { chargerRef.current(n); etatSauve.current = null; }
        setSelectedIdx(null);
        setSendInfo(`Lettre traduite en ${autreLangue}. Relisez chaque phrase avant l'envoi; la version d'avant est dans l'historique.`);
      } else if (onOpen) onOpen(newId);
      else setSendInfo(`Le brouillon en ${autreLangue} est créé : retrouvez-le dans la liste des infolettres.`);
    } catch (e: any) {
      setSendErr(e?.message || 'La traduction a échoué.');
    } finally {
      setTranslating(null);
    }
  };

  const sendTest = async () => {
    const email = window.prompt('Adresse courriel pour le test :');
    if (!email) return;
    await triggerSend(email);
  };

  // Une audience « Des listes » sans liste cochée (ou « Des personnes » sans
  // personne) n'enverrait à personne : le geste est refusé avec un mot clair.
  const dorSansCanal = lettreDor && !dorMessagerie && !dorSection;
  const audienceVide = !lettreDor && (audience.mode === 'tags' && !(audience.tags || []).length) || (audience.mode === 'emails' && !(audience.emails || []).length);
  const audienceLibelle = audience.mode === 'all' ? 'tout le monde' : audience.mode === 'tags' ? `${(audience.tags || []).length} liste${(audience.tags || []).length > 1 ? 's' : ''}` : `${(audience.emails || []).length} personne${(audience.emails || []).length > 1 ? 's' : ''}`;

  const sendLive = async () => {
    if (lettreDor) {
      if (dorSansCanal) { setSendErr('Cochez au moins un canal : la messagerie, la section Lettres, ou les deux.'); return; }
      const ou = dorMessagerie && dorSection ? 'dans leur messagerie et dans leur section Lettres' : dorMessagerie ? 'dans leur messagerie' : 'dans leur section Lettres';
      if (!confirm(`Déposer cette lettre d'or chez tous les membres, ${ou} ? Aucun courriel ne part. Cette action est irréversible.`)) return;
      await triggerSend();
      return;
    }
    if (audienceVide) { setSendErr(audience.mode === 'tags' ? 'Cochez au moins une liste dans « À qui l’envoyer », ou choisissez « Tout le monde ».' : 'Choisissez au moins une personne, ou une autre audience.'); return; }
    const who = audience.mode === 'all' ? 'tous les abonnés actifs' : audience.mode === 'tags' ? `les listes ${(audience.tags || []).map(libelleTag).join(', ')}` : `${(audience.emails || []).length} personne(s) choisie(s)`;
    if (!confirm(`Envoyer cette infolettre maintenant à ${who} ? Cette action est irréversible.`)) return;
    await triggerSend();
  };

  // Programmer : le brouillon passe « scheduled »; la fonction planifiée
  // l'enverra à l'heure dite. Déprogrammer le ramène en brouillon.
  const schedule = async () => {
    setSendErr(null); setSendInfo(null);
    if (!when) { setSendErr('Choisissez une date et une heure d’envoi.'); return; }
    if (new Date(when).getTime() < Date.now() + 5 * 60e3) { setSendErr('La date d’envoi doit être dans au moins cinq minutes.'); return; }
    if (!subject || !blocks.length) { setSendErr('Le sujet et au moins un bloc sont requis.'); return; }
    if (audienceVide) { setSendErr('Cochez au moins une liste dans « À qui l’envoyer », ou choisissez « Tout le monde ».'); return; }
    if (dorSansCanal) { setSendErr('Cochez au moins un canal pour la lettre d’or.'); return; }
    const savedId = await save();
    if (!savedId) return;
    await updateNewsletter(savedId, { status: 'scheduled' });
    setStatus('scheduled');
    setSendInfo(`Programmée pour le ${new Date(when).toLocaleString('fr-CA', { dateStyle: 'full', timeStyle: 'short' })}.`);
  };
  const unschedule = async () => {
    if (!id) return;
    await updateNewsletter(id, { status: 'draft' });
    setStatus('draft');
    setSendInfo('Déprogrammée : elle redevient un brouillon.');
  };

  // Iris propose; le composeur applique. Krystine garde le dernier geste.
  const applyProposal = (p: Proposal) => {
    setTitle(p.title || title);
    setSubject(p.subject || subject);
    setPreheader(p.preheader || '');
    setBlocks(p.blocks || []);
    setAudience(p.audience || { mode: 'all' });
    if (p.scheduledFor) setWhen(toLocal(new Date(p.scheduledFor)));
    setSelectedIdx(null);
    setSide('preview');
  };

  const railWide = side === 'preview';

  return (
    <Portail>
    <div className="fixed inset-0 z-[120] flex flex-col overflow-y-auto overscroll-contain bg-[#EEE7DB] dark:bg-[#151d19] text-[#293027] dark:text-white">
      <style>{`
        .nl-inline{outline:none;cursor:text;min-width:2ch;border-radius:6px;transition:box-shadow .15s}
        .nl-inline:hover{box-shadow:0 0 0 2px rgba(186,123,57,.35)}
        .nl-inline:focus{box-shadow:0 0 0 2px #BA7B39;background:rgba(186,123,57,.06)}
        .nl-inline:empty:before{content:attr(data-placeholder);opacity:.4;pointer-events:none}
      `}</style>

      {/* Barre du haut */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 bg-white/70 dark:bg-[#293027]/70 backdrop-blur-xl border-b border-[#293027]/10 dark:border-white/10 shrink-0">
        <GhostButton onClick={onBack}><i className="fa-solid fa-arrow-left" /> Retour</GhostButton>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
          status === 'sent'     ? 'bg-green-50 text-green-600' :
          status === 'sending'  ? 'bg-yellow-50 text-yellow-600' :
          status === 'scheduled'? 'bg-blue-50 text-blue-600' :
          status === 'failed'   ? 'bg-red-50 text-red-500' :
          'bg-[#BA7B39]/15 text-[#8B4A2F]'
        }`}>{status}</span>
        <span className="hidden md:inline text-xs text-[#293027]/50 dark:text-white/50 truncate max-w-[24ch]">{title || 'Nouvelle infolettre'}</span>
        <div className="ml-auto flex items-center gap-2 md:gap-3 flex-wrap">
          {savedAt && <span className="text-xs text-[#293027]/50 dark:text-white/50">{saving ? 'Enregistrement…' : `Enregistré à ${savedAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}`}</span>}
          <GhostButton onClick={() => (side === 'versions' ? setSide('reglages') : ouvrirVersions())} title="Les versions gardées pendant l’écriture, une par heure">
            <i className="fa-solid fa-clock-rotate-left" /> {side === 'versions' ? 'Fermer l’historique' : 'Historique'}
          </GhostButton>
          <GhostButton onClick={() => setSide(side === 'iris' ? 'reglages' : 'iris')} disabled={isReadOnly}>
            <i className="fa-solid fa-terminal" /> {side === 'iris' ? 'Fermer Iris' : 'Rédiger avec Iris'}
          </GhostButton>
          <GhostButton onClick={() => traduire('surplace')} disabled={!!translating || isReadOnly || !subject || !blocks.length} title={`Traduit cette lettre en ${autreLangue}, dans ce brouillon (la version d’avant reste dans l’historique)`}>
            <i className={`fa-solid ${translating === 'surplace' ? 'fa-circle-notch fa-spin' : 'fa-language'}`} /> {translating === 'surplace' ? 'Traduction…' : `Traduire en ${autreLangue}`}
          </GhostButton>
          <GhostButton onClick={() => traduire('copie')} disabled={!!translating || !subject || !blocks.length} title={`Copie toute la lettre en un brouillon en ${autreLangue}, à relire avant l’envoi`}>
            <i className={`fa-solid ${translating === 'copie' ? 'fa-circle-notch fa-spin' : 'fa-clone'}`} /> {translating === 'copie' ? 'Copie…' : 'Dupliquer et traduire'}
          </GhostButton>
          <GhostButton onClick={() => setSide(side === 'preview' ? 'reglages' : 'preview')}>
            <i className={`fa-solid ${side === 'preview' ? 'fa-sliders' : 'fa-eye'}`} /> {side === 'preview' ? 'Réglages' : 'Aperçu du courriel'}
          </GhostButton>
          <PrimaryButton onClick={save} disabled={saving || isReadOnly || !subject}>
            {saving ? 'Enregistrement…' : (id ? 'Enregistrer' : 'Créer le brouillon')}
          </PrimaryButton>
          {status === 'scheduled' ? (
            <GhostButton onClick={unschedule}><i className="fa-solid fa-calendar-xmark" /> Déprogrammer</GhostButton>
          ) : (
            <GhostButton onClick={schedule} disabled={isReadOnly || !subject || !blocks.length}><i className="fa-solid fa-calendar-check" /> Programmer</GhostButton>
          )}
          <GhostButton onClick={sendTest} disabled={sendBusy !== 'idle' || isReadOnly || !subject}>
            <i className="fa-solid fa-paper-plane" /> {sendBusy === 'test' ? 'Envoi…' : 'Envoyer un test'}
          </GhostButton>
          <button onClick={() => setSide('reglages')} className="hidden xl:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#8B4A2F] hover:underline" title="Changer l’audience">
            <i className={`fa-solid ${lettreDor ? 'fa-crown' : 'fa-users'}`} /> {lettreDor ? 'tous les membres, à l’interne' : audienceLibelle}
          </button>
          <button
            onClick={sendLive}
            disabled={sendBusy !== 'idle' || isReadOnly || !subject || !blocks.length || audienceVide || dorSansCanal}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${lettreDor ? 'text-[#293027]' : 'bg-[#BA7B39] text-[#293027] hover:bg-[#293027] hover:text-[#8B4A2F]'}`}
            style={lettreDor ? { background: 'linear-gradient(115deg, #b8862b, #f6dd8a 45%, #c9a24a)' } : undefined}
          >
            <i className={`fa-solid ${lettreDor ? 'fa-crown' : 'fa-rocket'}`} /> {sendBusy === 'live' ? 'Envoi…' : lettreDor ? 'Déposer la lettre d’or' : 'Envoyer maintenant'}
          </button>
        </div>
      </div>
      {(sendErr || sendInfo) && (
        <div className={`px-6 py-3 text-sm shrink-0 ${sendErr ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {sendErr || sendInfo}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>
      ) : (
        <div className="flex-1 lg:min-h-0 flex flex-col lg:flex-row">
          {/* La page, pleine largeur : on écrit dedans directement */}
          <main className="flex-1 min-w-0 lg:overflow-y-auto" onClick={() => setSelectedIdx(null)}>
            <div className="px-4 md:px-8 lg:px-10 py-6 md:py-8">
              <div className={`nl-riche w-full rounded-[24px] shadow-[0_20px_60px_-30px_rgba(41,48,39,0.35)] border border-[#293027]/5 dark:border-white/5 ${sombre ? 'dark' : ''}`} style={{ background: fond }}>
                {/* Le début de la lettre : sa langue, puis le bandeau tel qu'il partira */}
                <div className="flex flex-wrap items-center gap-3 px-6 md:px-[8%] pt-5 pb-4" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50">Langue de la lettre</span>
                  <div className="inline-flex rounded-full border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 p-0.5">
                    {(['fr', 'en'] as const).map(l => (
                      <button key={l} type="button" disabled={isReadOnly} onClick={() => setLang(l)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors ${lang === l ? 'bg-[#293027] text-white dark:bg-[#BA7B39] dark:text-[#293027]' : 'text-[#293027]/60 dark:text-white/60 hover:text-[#8B4A2F]'}`}>
                        {l === 'fr' ? 'Français' : 'English'}
                      </button>
                    ))}
                  </div>
                  {traductionDe && <span className="text-xs text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-language mr-1" /> Traduite d’une autre lettre : relisez chaque phrase avant l’envoi.</span>}
                </div>
                {!bandeau.masque && (
                <div className="px-6 md:px-[8%] pt-8 pb-7 rounded-t-[24px]" style={{ backgroundColor: bandeau.fond || BANDEAU_DEFAUT.fond, backgroundImage: bandeau.image ? `linear-gradient(rgba(20,19,17,0.55), rgba(20,19,17,0.55)), url(${bandeau.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} onClick={e => e.stopPropagation()}>
                  <input
                    value={bandeau.etiquette ?? ''} onChange={e => setBandeau(b => ({ ...b, etiquette: e.target.value }))} disabled={isReadOnly}
                    placeholder={ETIQUETTE_DEFAUT[lang]} title="Le petit mot au-dessus du sujet"
                    className="w-full bg-transparent outline-none text-[11px] uppercase tracking-[0.3em] font-semibold text-[#e0b060] placeholder:text-[#e0b060]/70 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1 mb-4"
                  />
                  <input
                    value={subject} onChange={e => setSubject(e.target.value)} disabled={isReadOnly}
                    placeholder={lang === 'en' ? 'Click here to write the subject…' : 'Cliquez ici pour écrire le sujet…'}
                    style={{ color: bandeau.texte || BANDEAU_DEFAUT.texte }}
                    className="w-full bg-transparent outline-none font-serif text-2xl md:text-3xl placeholder:opacity-40 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1"
                  />
                  <div className="mt-5 h-px w-16 bg-[#e0b060]" />
                </div>
                )}
                <div className={`px-6 md:px-[8%] pt-6 pb-5 border-b border-[#293027]/5 dark:border-white/5 ${bandeau.masque ? '' : ''}`} onClick={e => e.stopPropagation()}>
                  {bandeau.masque && (
                    <>
                      <Label>Sujet du courriel *</Label>
                      <input
                        value={subject} onChange={e => setSubject(e.target.value)} disabled={isReadOnly}
                        placeholder="Cliquez ici pour écrire le sujet…"
                        className="w-full bg-transparent outline-none font-serif text-2xl md:text-3xl text-[#3A251E] dark:text-white placeholder:text-[#3A251E]/30 dark:placeholder:text-white/30 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1"
                      />
                    </>
                  )}
                  <input
                    value={preheader} onChange={e => setPreheader(e.target.value)} disabled={isReadOnly}
                    placeholder="Pré-en-tête : quelques mots d’intrigue vus dans la boîte de réception…"
                    className={`${bandeau.masque ? 'mt-2' : ''} w-full bg-transparent outline-none text-sm text-[#3A251E]/60 dark:text-white/60 placeholder:text-[#3A251E]/30 dark:placeholder:text-white/30 rounded-md focus:ring-2 focus:ring-[#BA7B39] px-1 -mx-1`}
                  />
                </div>

                <div className="px-6 md:px-[8%] py-8 min-h-[50vh]">
                  {blocks.length === 0 && (
                    <div className="py-16 text-center text-[#293027]/40 dark:text-white/40">
                      <i className="fa-solid fa-envelope-open-text text-4xl mb-4 block" />
                      <p className="text-sm">Ajoutez un premier bloc ci-dessous, puis cliquez sur un texte pour l’écrire.</p>
                    </div>
                  )}
                  {blocks.map((block, idx) => (
                    <React.Fragment key={idx}>
                      {!isReadOnly && (
                        <InsertPoint
                          onAdd={t => addBlock(t, idx)}
                          onDragOver={() => setDrag(d => (d ? { ...d, over: idx, before: true } : d))}
                          onDrop={() => { if (drag) moveBlockTo(drag.from, idx); setDrag(null); }}
                        />
                      )}
                      <BlockFrame
                        block={block}
                        selected={selectedIdx === idx}
                        readOnly={isReadOnly}
                        first={idx === 0}
                        last={idx === blocks.length - 1}
                        onSelect={() => setSelectedIdx(idx)}
                        onPatch={patch => updateBlock(idx, patch)}
                        onMove={dir => moveBlock(idx, dir)}
                        onRemove={() => removeBlock(idx)}
                        onDuplicate={() => duplicateBlock(idx)}
                        onPickImage={() => setPickFor(idx)}
                        otherHovered={hoverIdx !== null && hoverIdx !== idx}
                        onHoverChange={h => setHoverIdx(v => (h ? idx : v === idx ? null : v))}
                        dragging={drag?.from === idx}
                        dropLine={drag && drag.over === idx && drag.from !== idx ? (drag.before ? 'top' : 'bottom') : null}
                        onDragStart={() => setDrag({ from: idx, over: null, before: true })}
                        onDragOver={before => setDrag(d => (d ? { ...d, over: idx, before } : d))}
                        onDrop={before => { if (drag) moveBlockTo(drag.from, before ? idx : idx + 1); setDrag(null); }}
                        onDragEnd={() => setDrag(null)}
                      />
                    </React.Fragment>
                  ))}

                  {!isReadOnly && (
                    <div className="mt-8 pt-6 border-t border-dashed border-[#293027]/15 dark:border-white/15" onClick={e => e.stopPropagation()}>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50 mb-3"><i className="fa-solid fa-plus mr-1" /> Ajouter un bloc</p>
                      <div className="flex flex-wrap gap-2">
                        {BLOCK_PALETTE.map(b => (
                          <button key={b.type} onClick={() => addBlock(b.type)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEE7DB] dark:bg-white/5 hover:bg-[#BA7B39]/15 border border-[#293027]/5 dark:border-white/5 hover:border-[#BA7B39] text-xs uppercase tracking-wider text-[#293027]/80 dark:text-white/80 transition-colors">
                            <i className={`fa-solid ${b.icon} text-[#8B4A2F]`} /> {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Rail de droite : réglages d'envoi, aperçu exact, ou Iris */}
          <aside className={`shrink-0 max-h-[45vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-[#293027]/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] overflow-y-auto ${railWide ? 'lg:w-[640px]' : 'lg:w-[380px]'}`}>
            {side === 'iris' ? (
              <div className="p-4">
                <AssistantPanel
                  draft={{ title, subject, preheader, blocks, audience, scheduledFor: when ? new Date(when).toISOString() : null }}
                  onProposal={applyProposal}
                  onClose={() => setSide('reglages')}
                />
              </div>
            ) : side === 'versions' ? (
              <div className="p-5 space-y-3">
                <h3 className="font-serif text-xl text-[#293027] dark:text-white">Historique des versions</h3>
                <p className="text-xs text-[#293027]/60 dark:text-white/60">La lettre s’enregistre toute seule cinq secondes après chaque changement. Une version se garde ici à chaque heure d’écriture, et juste avant une restauration.</p>
                {versions === null && <p className="text-xs text-[#8B4A2F]"><i className="fa-solid fa-circle-notch fa-spin mr-1" />Les versions arrivent…</p>}
                {versions && versions.length === 0 && <p className="text-xs text-[#293027]/50 dark:text-white/50">{id ? 'Aucune version encore : la première se garde à la prochaine sauvegarde.' : 'Le brouillon n’est pas encore créé.'}</p>}
                <ul className="space-y-2">
                  {(versions || []).map(v => (
                    <li key={v.id} className="rounded-2xl border border-[#293027]/10 dark:border-white/10 bg-white dark:bg-[#293027] px-4 py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#293027] dark:text-white truncate">{v.subject || '(sans sujet)'}</p>
                        <p className="text-[11px] text-[#293027]/55 dark:text-white/55">
                          {v.savedAt?.toDate().toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) || '…'} · {(v.blocks || []).length} bloc{(v.blocks || []).length > 1 ? 's' : ''}{v.lang === 'en' ? ' · anglais' : ''}{v.raison === 'restauration' ? ' · avant une restauration' : v.raison === 'traduction' ? ' · avant une traduction' : ''}
                        </p>
                      </div>
                      <GhostButton onClick={() => restaurer(v)} disabled={isReadOnly}><i className="fa-solid fa-rotate-left" /> Restaurer</GhostButton>
                    </li>
                  ))}
                </ul>
              </div>
            ) : side === 'preview' ? (
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#293027]/50 dark:text-white/50 mb-3">Le courriel tel qu’il partira</p>
                <PreviewFrame blocks={blocks} subject={subject} preheader={preheader} couverture={couverture} couvertureUrl={couvertureUrl} signature={signature} lang={lang} bandeau={bandeau} fond={fond} height={Math.max(700, window.innerHeight - 160)} />
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="rounded-2xl p-[2px]" style={{ background: 'linear-gradient(115deg, #6f4e15, #c9a24a 18%, #fff2b8 34%, #b8862b 50%, #f6dd8a 66%, #8a6420 82%, #d9b45c)' }} onClick={e => e.stopPropagation()}>
                  <div className="rounded-[14px] bg-white dark:bg-[#293027] px-4 py-3.5">
                    <label className={`flex items-start gap-3 ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={lettreDor} disabled={isReadOnly || status === 'scheduled'} onChange={e => setLettreDor(e.target.checked)} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0">
                        <span className="block font-serif text-lg text-[#293027] dark:text-white"><i className="fa-solid fa-crown mr-2" style={{ color: '#c9a24a' }} />Lettre d’or</span>
                        <span className="block text-xs text-[#293027]/60 dark:text-white/60">Déposée à l’interne chez tous les membres du site, sans courriel et sans frais. Elle porte le cadre doré et reste exclusive aux membres.</span>
                      </span>
                    </label>
                    {lettreDor && (
                      <div className="mt-3 space-y-2 pl-7">
                        <label className={`flex items-center gap-3 text-sm text-[#293027] dark:text-white ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                          <input type="checkbox" checked={dorMessagerie} disabled={isReadOnly} onChange={e => setDorMessagerie(e.target.checked)} className="accent-[#BA7B39]" />
                          Dans leur messagerie (le fil avec le soutien)
                        </label>
                        <label className={`flex items-center gap-3 text-sm text-[#293027] dark:text-white ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                          <input type="checkbox" checked={dorSection} disabled={isReadOnly} onChange={e => setDorSection(e.target.checked)} className="accent-[#BA7B39]" />
                          Dans leur section Lettres
                        </label>
                        {dorSansCanal && <p className="text-xs text-[#8B4A2F]">Cochez au moins un canal.</p>}
                      </div>
                    )}
                  </div>
                </div>
                {!lettreDor && <>
                <div>
                  <h3 className="font-serif text-xl text-[#293027] dark:text-white">À qui l’envoyer</h3>
                  <p className="text-xs text-[#293027]/60 dark:text-white/60 mt-1">Tout le monde, ou seulement les listes que vous cochez.</p>
                </div>
                <AudiencePicker value={audience} onChange={setAudience} disabled={isReadOnly || status === 'scheduled'} lang={lang} />
                {audienceVide && <p className="text-xs text-[#8B4A2F] bg-[#BA7B39]/10 rounded-xl px-3 py-2"><i className="fa-solid fa-circle-info mr-1" /> Cochez au moins une liste pour pouvoir envoyer.</p>}
                </>}
                <h3 className="pt-4 border-t border-[#293027]/10 dark:border-white/10 text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60">En-tête du courriel</h3>
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  {([
                    { v: 'aucune',  icon: 'fa-minus',      label: 'Aucune image',            aide: 'Le sujet sur le bandeau, puis vos blocs.' },
                    { v: 'podcast', icon: 'fa-podcast',    label: 'Couverture du podcast',   aide: 'Au-delà des tendances, saison 2.' },
                    { v: 'image',   icon: 'fa-images',     label: 'Une image à moi',         aide: 'Choisie dans la médiathèque, en pleine largeur.' },
                  ] as const).map(o => (
                    <label key={o.v} className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 cursor-pointer transition-colors ${couverture === o.v ? 'border-[#BA7B39] bg-[#BA7B39]/10' : 'border-[#293027]/10 dark:border-white/10 hover:border-[#BA7B39]/50'} ${isReadOnly ? 'opacity-60 cursor-default' : ''}`}>
                      <input type="radio" name="couverture" value={o.v} checked={couverture === o.v} disabled={isReadOnly} onChange={() => { setCouverture(o.v); if (o.v === 'image' && !couvertureUrl) setPickFor('entete'); }} className="mt-1 accent-[#BA7B39]" />
                      <span className="min-w-0">
                        <span className="block text-sm text-[#293027] dark:text-white"><i className={`fa-solid ${o.icon} mr-2 text-[#8B4A2F]`} />{o.label}</span>
                        <span className="block text-xs text-[#293027]/55 dark:text-white/55">{o.aide}</span>
                      </span>
                    </label>
                  ))}
                  {couverture === 'image' && (
                    <div className="flex items-center gap-3 pl-1">
                      {couvertureUrl
                        ? <img src={couvertureUrl} alt="" className="h-14 w-24 rounded-xl object-cover border border-[#293027]/10 dark:border-white/10" />
                        : <span className="text-xs text-[#8B4A2F]">Aucune image choisie : le courriel partira sans en-tête.</span>}
                      <GhostButton onClick={() => setPickFor('entete')} disabled={isReadOnly}><i className="fa-solid fa-images" /> {couvertureUrl ? 'Changer' : 'Choisir'}</GhostButton>
                    </div>
                  )}
                  <label className={`flex items-center gap-3 pl-1 pt-1 text-sm text-[#293027] dark:text-white ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={signature} disabled={isReadOnly} onChange={e => setSignature(e.target.checked)} className="accent-[#BA7B39]" />
                    Signature de Krystine au bas du courriel
                  </label>
                </div>
                <h3 className="pt-4 border-t border-[#293027]/10 dark:border-white/10 text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60">Le bandeau</h3>
                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                  <p className="text-xs text-[#293027]/55 dark:text-white/55">La bande sous la couverture qui porte le sujet. Son petit mot se change directement sur la page.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { k: 'fond',  label: 'Couleur du fond',  defaut: BANDEAU_DEFAUT.fond },
                      { k: 'texte', label: 'Couleur du sujet', defaut: BANDEAU_DEFAUT.texte },
                    ] as const).map(o => (
                      <label key={o.k} className={`flex items-center gap-2 rounded-2xl border border-[#293027]/10 dark:border-white/10 px-3 py-2 ${isReadOnly || bandeau.masque ? 'opacity-60' : 'cursor-pointer'}`}>
                        <input type="color" value={bandeau[o.k] || o.defaut} disabled={isReadOnly || !!bandeau.masque}
                          onChange={e => setBandeau(b => ({ ...b, [o.k]: e.target.value }))}
                          className="w-8 h-8 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                        <span className="text-xs text-[#293027] dark:text-white">{o.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 pl-1">
                    <GhostButton onClick={() => setBandeau(b => ({ ...b, fond: BANDEAU_DEFAUT.fond, texte: BANDEAU_DEFAUT.texte, image: null }))} disabled={isReadOnly || !!bandeau.masque}>Noir chaud d’origine</GhostButton>
                  </div>
                  <div className="flex items-center gap-3 pl-1">
                    {bandeau.image
                      ? <img src={bandeau.image} alt="" className="h-14 w-24 rounded-xl object-cover border border-[#293027]/10 dark:border-white/10" />
                      : <span className="text-xs text-[#293027]/55 dark:text-white/55">Une image de fond, par-dessus la couleur.</span>}
                    <GhostButton onClick={() => setPickFor('bandeau')} disabled={isReadOnly || !!bandeau.masque}><i className="fa-solid fa-images" /> {bandeau.image ? 'Changer' : 'Image'}</GhostButton>
                    {bandeau.image && <GhostButton onClick={() => setBandeau(b => ({ ...b, image: null }))} disabled={isReadOnly}>Retirer</GhostButton>}
                  </div>
                  <label className={`flex items-center gap-3 pl-1 text-sm text-[#293027] dark:text-white ${isReadOnly ? 'opacity-60' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={!!bandeau.masque} disabled={isReadOnly} onChange={e => setBandeau(b => ({ ...b, masque: e.target.checked }))} className="accent-[#BA7B39]" />
                    Sans bandeau : le corps suit tout de suite la couverture
                  </label>
                </div>
                <h3 className="pt-4 border-t border-[#293027]/10 dark:border-white/10 text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60">Fond de la lettre</h3>
                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                  <p className="text-xs text-[#293027]/55 dark:text-white/55">La couleur du corps, prise dans la palette du site. Sur un fond sombre, le texte passe à l’ivoire tout seul.</p>
                  <div className="flex flex-wrap gap-2">
                    {FONDS_INFOLETTRE.map(f => (
                      <button key={f.hex} type="button" disabled={isReadOnly} title={f.label} onClick={() => setFond(f.hex)}
                        className={`w-9 h-9 rounded-full border-2 transition-transform ${fond.toUpperCase() === f.hex ? 'border-[#BA7B39] scale-110' : 'border-[#293027]/15 dark:border-white/20 hover:scale-105'}`}
                        style={{ background: f.hex }} aria-label={f.label} aria-pressed={fond.toUpperCase() === f.hex} />
                    ))}
                  </div>
                  <p className="text-xs text-[#8B4A2F]">{FONDS_INFOLETTRE.find(f => f.hex === fond.toUpperCase())?.label || fond}{sombre ? ' · texte ivoire' : ' · texte encre'}</p>
                </div>
                <h3 className="pt-4 border-t border-[#293027]/10 dark:border-white/10 text-[10px] uppercase tracking-widest font-bold text-[#293027]/60 dark:text-white/60">Envoi</h3>
                <div>
                  <Label>Titre interne (non envoyé)</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="ex. Infolettre d’octobre" disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Nom de l’expéditeur</Label>
                  <Input value={fromName} onChange={e => setFromName(e.target.value)} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Date et heure d’envoi (heure du Québec)</Label>
                  <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={isReadOnly || status === 'scheduled'} />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <MediathequePicker
        open={pickFor !== null}
        onClose={() => setPickFor(null)}
        onSelect={url => { if (pickFor === 'entete') setCouvertureUrl(url); else if (pickFor === 'bandeau') setBandeau(b => ({ ...b, image: url })); else if (pickFor !== null) updateBlock(pickFor, { url }); }}
      />
    </div>
    </Portail>
  );
};

// ─── Un bloc sur la page : rendu éditable + petite barre d'outils ───────────
const selectClass = 'px-2 py-1 rounded-md bg-white dark:bg-[#293027] border border-[#293027]/10 dark:border-white/10 text-xs text-[#293027] dark:text-white outline-none';
const iconBtn = 'w-8 h-8 rounded-full bg-white dark:bg-[#293027] border border-[#293027]/10 dark:border-white/10 text-[#293027]/70 dark:text-white/70 hover:text-[#8B4A2F] hover:border-[#BA7B39] shadow-sm flex items-center justify-center transition-colors disabled:opacity-30';

const BlockFrame: React.FC<{
  block: NewsletterBlock;
  selected: boolean;
  readOnly: boolean;
  first: boolean;
  last: boolean;
  onSelect: () => void;
  onPatch: (patch: Record<string, any>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPickImage: () => void;
  otherHovered?: boolean;
  onHoverChange?: (h: boolean) => void;
  dragging?: boolean;
  dropLine?: 'top' | 'bottom' | null;
  onDragStart?: () => void;
  onDragOver?: (before: boolean) => void;
  onDrop?: (before: boolean) => void;
  onDragEnd?: () => void;
}> = ({ block, selected, readOnly, first, last, onSelect, onPatch, onMove, onRemove, onDuplicate, onPickImage, otherHovered, onHoverChange, dragging, dropLine, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  const c = (block.content || {}) as any;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const frameRef = useRef<HTMLDivElement | null>(null);
  // La barre d'outils vit au-dessus du bloc, hors de sa boîte : le survol se
  // tient en JavaScript avec un délai de sortie, pour qu'on ait le temps
  // d'aller cliquer une flèche sans que la barre s'efface en chemin.
  const [hover, setHover] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const enter = () => { if (hoverTimer.current) window.clearTimeout(hoverTimer.current); setHover(true); onHoverChange?.(true); };
  const leave = () => { if (hoverTimer.current) window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => { setHover(false); onHoverChange?.(false); }, 900); };
  useEffect(() => () => { if (hoverTimer.current) window.clearTimeout(hoverTimer.current); }, []);
  // Visible au survol, ou quand le bloc est sélectionné et qu'aucun autre bloc
  // n'est survolé (sinon la barre couvrirait le texte du voisin du dessus).
  const visible = hover || (selected && !otherHovered);
  // Au-dessus ou au-dessous du bloc survolé, selon la moitié où est la souris.
  const moitie = (e: React.DragEvent) => { const r = e.currentTarget.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; };
  // Gras, italique, souligné, lien : le geste s'applique à la sélection dans le
  // paragraphe. Le mousedown est retenu pour que le champ garde le focus (et
  // la sélection) le temps du clic.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  const exec = (cmd: string, arg?: string) => document.execCommand(cmd, false, arg);
  const lier = () => {
    const url = window.prompt('Adresse du lien (https://…)', 'https://');
    if (!url || !/^https?:\/\//.test(url)) return;
    exec('createLink', url);
  };
  const policeSelect = (defaut: 'serif' | 'sans') => (
    <select value={c.police || defaut} onChange={e => onPatch({ police: e.target.value })} className={selectClass} title="Police">
      {Object.entries(POLICES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );

  return (
    <div
      ref={frameRef}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onDragOver={readOnly || !onDragOver ? undefined : e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(moitie(e)); }}
      onDrop={readOnly || !onDrop ? undefined : e => { e.preventDefault(); onDrop(moitie(e)); }}
      className={`group/bloc relative rounded-xl border-2 px-3 -mx-3 transition-colors ${selected ? 'border-[#BA7B39]/70' : hover ? 'border-[#BA7B39]/30' : 'border-transparent'} ${dragging ? 'opacity-40' : ''}`}
    >
      {/* La ligne d'accueil du glisser-déposer */}
      {dropLine && <div className={`absolute left-0 right-0 h-[3px] rounded-full bg-[#BA7B39] shadow-[0_0_0_2px_rgba(186,123,57,0.25)] z-30 pointer-events-none ${dropLine === 'top' ? '-top-[3px]' : '-bottom-[3px]'}`} />}
      {readOnly ? <RenderBlockWeb block={block} /> : <RenderBlockWeb block={block} edit={{ set: onPatch, pickImage: onPickImage }} />}

      {/* La poignée : on la saisit pour glisser le bloc ailleurs. Les flèches
          restent pour le clavier et les écrans tactiles (le glisser natif ne
          marche pas au doigt). ponytail: HTML5 DnD seulement, dnd-kit si le tactile devient une demande. */}
      {!readOnly && (
        <button
          type="button"
          draggable
          title="Glisser pour déplacer ce bloc"
          aria-label="Glisser pour déplacer ce bloc"
          onClick={stop}
          onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'bloc'); if (frameRef.current) e.dataTransfer.setDragImage(frameRef.current, 24, 24); onDragStart?.(); }}
          onDragEnd={() => onDragEnd?.()}
          className={`hidden lg:flex absolute -left-9 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white dark:bg-[#293027] border border-[#293027]/10 dark:border-white/10 text-[#293027]/50 dark:text-white/50 hover:text-[#8B4A2F] hover:border-[#BA7B39] shadow-sm items-center justify-center cursor-grab active:cursor-grabbing transition-opacity ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <i className="fa-solid fa-grip-vertical text-xs" />
        </button>
      )}

      {!readOnly && (
        <div
          onClick={stop}
          onMouseEnter={enter}
          onMouseLeave={leave}
          className={`${visible ? 'flex' : 'hidden lg:flex'} relative w-fit ml-auto mb-2 lg:mb-0 lg:absolute lg:bottom-full lg:left-auto lg:right-2 z-20 flex-wrap justify-end items-center gap-1.5 bg-[#EEE7DB] dark:bg-[#151d19] rounded-full px-2 py-1 shadow-md border border-[#293027]/10 dark:border-white/10 lg:transition-opacity ${visible ? 'lg:opacity-100' : 'lg:opacity-0 lg:pointer-events-none'}`}
        >
          {block.type === 'heading' && (
            <>
              <select value={c.level || 2} onChange={e => onPatch({ level: Number(e.target.value) })} className={selectClass} title="Niveau du titre">
                <option value={1}>Grand titre</option>
                <option value={2}>Titre</option>
                <option value={3}>Sous-titre</option>
              </select>
              {policeSelect('serif')}
              <button className={iconBtn} title={c.align === 'center' ? 'Aligner à gauche' : 'Centrer'} onClick={() => onPatch({ align: c.align === 'center' ? 'left' : 'center' })}>
                <i className={`fa-solid ${c.align === 'center' ? 'fa-align-left' : 'fa-align-center'} text-xs`} />
              </button>
            </>
          )}
          {block.type === 'paragraph' && (
            <>
              {policeSelect('sans')}
              <select value={c.taille || 'md'} onChange={e => onPatch({ taille: e.target.value })} className={selectClass} title="Taille du texte">
                {Object.entries(TAILLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={() => exec('bold')} title="Gras (sélectionnez du texte d’abord)"><i className="fa-solid fa-bold text-xs" /></button>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={() => exec('italic')} title="Italique"><i className="fa-solid fa-italic text-xs" /></button>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={() => exec('underline')} title="Souligné"><i className="fa-solid fa-underline text-xs" /></button>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={lier} title="Lien sur la sélection"><i className="fa-solid fa-link text-xs" /></button>
              <button className={iconBtn} title={c.align === 'center' ? 'Aligner à gauche' : 'Centrer'} onClick={() => onPatch({ align: c.align === 'center' ? 'left' : 'center' })}>
                <i className={`fa-solid ${c.align === 'center' ? 'fa-align-left' : 'fa-align-center'} text-xs`} />
              </button>
            </>
          )}
          {block.type === 'image' && (
            <>
              <button className={`${iconBtn} w-auto px-3 gap-2 text-[10px] uppercase tracking-widest font-bold`} onClick={onPickImage} title="Choisir dans la médiathèque ou téléverser">
                <i className="fa-solid fa-images text-xs" /> Image
              </button>
              <input value={c.alt || ''} onChange={e => onPatch({ alt: e.target.value })} placeholder="Description (accessibilité)" className={`${selectClass} w-44`} />
            </>
          )}
          {(block.type === 'button' || block.type === 'cta') && (
            <input value={c.href || ''} onChange={e => onPatch({ href: e.target.value })} placeholder="https://… (lien du bouton)" className={`${selectClass} w-56`} />
          )}
          {block.type === 'button' && (
            <select value={c.variant || 'primary'} onChange={e => onPatch({ variant: e.target.value })} className={selectClass} title="Style du bouton">
              <option value="primary">Plein</option>
              <option value="secondary">Contour</option>
            </select>
          )}
          {block.type === 'list' && (
            <>
              <select value={c.style || 'puce'} onChange={e => onPatch({ style: e.target.value })} className={selectClass} title="Puces ou numéros">
                <option value="puce">Puces</option>
                <option value="numero">Numéros</option>
              </select>
              {policeSelect('sans')}
              <select value={c.taille || 'md'} onChange={e => onPatch({ taille: e.target.value })} className={selectClass} title="Taille du texte">
                {Object.entries(TAILLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={() => exec('bold')} title="Gras"><i className="fa-solid fa-bold text-xs" /></button>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={() => exec('italic')} title="Italique"><i className="fa-solid fa-italic text-xs" /></button>
              <button className={iconBtn} onMouseDown={keepFocus} onClick={lier} title="Lien sur la sélection"><i className="fa-solid fa-link text-xs" /></button>
            </>
          )}
          {block.type === 'divider' && (
            <select value={c.style || 'ligne'} onChange={e => onPatch({ style: e.target.value })} className={selectClass} title="Style du séparateur">
              {Object.entries(SEPARATEURS).map(([k, v]) => <option key={k} value={k}>{v.glyphe ? `${v.glyphe.replace(/\s+/g, ' ')}  ${v.label}` : v.label}</option>)}
            </select>
          )}
          {block.type === 'spacer' && (
            <select value={c.size || 'md'} onChange={e => onPatch({ size: e.target.value })} className={selectClass} title="Hauteur de l'espace">
              <option value="sm">Petit</option>
              <option value="md">Moyen</option>
              <option value="lg">Grand</option>
            </select>
          )}
          <span className="w-px h-5 bg-[#293027]/10 dark:bg-white/10 mx-0.5" />
          <button className={iconBtn} onClick={() => onMove(-1)} disabled={first} title="Monter"><i className="fa-solid fa-arrow-up text-xs" /></button>
          <button className={iconBtn} onClick={() => onMove(1)} disabled={last} title="Descendre"><i className="fa-solid fa-arrow-down text-xs" /></button>
          <button className={iconBtn} onClick={onDuplicate} title="Dupliquer ce bloc"><i className="fa-solid fa-clone text-xs" /></button>
          <button className={`${iconBtn} text-red-400 hover:text-red-600 hover:border-red-300`} onClick={onRemove} title="Supprimer ce bloc"><i className="fa-solid fa-trash text-xs" /></button>
        </div>
      )}
    </div>
  );
};

// ─── Le « + » entre deux blocs : un titre (ou n'importe quel bloc) s'insère
// là où l'on est, sans avoir à remonter un bloc depuis le bas de la page.
// Le « + » chevauche le haut du bloc qui suit : il accueille aussi un bloc
// glissé, sinon un dépôt près du bord haut tomberait dans le vide.
const InsertPoint: React.FC<{ onAdd: (t: BlockType) => void; onDragOver?: () => void; onDrop?: () => void }> = ({ onAdd, onDragOver, onDrop }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="group/plus relative z-10 h-6 -my-3 flex items-center justify-center"
      onClick={e => e.stopPropagation()}
      onDragOver={onDragOver ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(); } : undefined}
      onDrop={onDrop ? e => { e.preventDefault(); onDrop(); } : undefined}
    >
      <div className={`absolute inset-x-0 h-px transition-colors ${open ? 'bg-[#BA7B39]' : 'bg-transparent group-hover/plus:bg-[#BA7B39]/40'}`} />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Insérer un bloc ici"
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] shadow-sm border transition-all ${open ? 'bg-[#BA7B39] text-[#293027] border-[#BA7B39] rotate-45' : 'bg-white dark:bg-[#293027] text-[#8B4A2F] border-[#293027]/10 dark:border-white/10 opacity-0 group-hover/plus:opacity-100 focus:opacity-100'}`}
      >
        <i className="fa-solid fa-plus" />
      </button>
      {open && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex flex-wrap justify-center gap-1.5 max-w-[560px] bg-[#EEE7DB] dark:bg-[#151d19] rounded-2xl p-2 shadow-lg border border-[#293027]/10 dark:border-white/10">
          {BLOCK_PALETTE.map(b => (
            <button key={b.type} type="button" onClick={() => { onAdd(b.type); setOpen(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 hover:bg-[#BA7B39]/15 border border-[#293027]/5 dark:border-white/5 hover:border-[#BA7B39] text-[10px] uppercase tracking-wider text-[#293027]/80 dark:text-white/80 transition-colors">
              <i className={`fa-solid ${b.icon} text-[#8B4A2F]`} /> {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Composer;
