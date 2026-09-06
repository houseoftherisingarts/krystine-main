import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import type { NewsletterAudience, NewsletterBlock } from '../../../../firebase/firestore';
import { fetchAudience } from './AudiencePicker';

// La « version terminale » : Krystine parle à Iris comme à une collègue.
// La demande se dépose dans Firestore (irisDemandes); le démon krystine-iris,
// sur l'ordinateur d'Alex, la fait répondre par Claude Code sur l'abonnement
// Claude Max (aucune clé d'API), puis la réponse remonte ici en direct.
// Quand Iris propose une infolettre, le parent l'applique. Krystine garde le
// dernier geste (enregistrer, programmer, envoyer).

export interface Proposal {
  title: string; subject: string; preheader: string;
  blocks: NewsletterBlock[]; audience: NewsletterAudience;
  scheduledFor: string | null; note: string;
}
interface Msg { role: 'user' | 'assistant'; content: string; proposal?: Proposal }

interface Props {
  draft: { title: string; subject: string; preheader: string; blocks: NewsletterBlock[]; audience: NewsletterAudience; scheduledFor: string | null };
  onProposal: (p: Proposal) => void;
  onClose?: () => void;
}

const STARTERS = [
  'Écris l\'infolettre de la semaine prochaine sur le retour de l\'automne et le dosha Vata.',
  'Annonce le prochain direct du podcast à la liste podcast, envoi jeudi à 10 h.',
  'Retouche le deuxième paragraphe, plus court et plus chaleureux.',
];

const HORS_LIGNE_APRES_MS = 90_000;   // trois battements manqués
const ATTENTE_MAX_MS = 6 * 60_000;    // au-delà, la demande reste en file mais l'écran se libère

const AssistantPanel: React.FC<Props> = ({ draft, onProposal, onClose }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [battement, setBattement] = useState<Date | null>(null);
  const [hote, setHote] = useState<string>('');
  const [installation, setInstallation] = useState<{ courriel: string; motDePasse: string } | null>(null);
  const [voirInstallation, setVoirInstallation] = useState(false);
  const [tick, setTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchAudience({}).then(r => setTags(r.tags.map(t => ({ tag: t.tag, count: t.n })))).catch(() => null);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  // Le cœur d'Iris : etat/iris.battement, posé par le démon toutes les 30 s.
  useEffect(() => {
    if (!db) return;
    const off = onSnapshot(doc(db, 'etat', 'iris'), s => {
      const b = s.data()?.battement;
      setBattement(b?.toDate ? b.toDate() : null);
      setHote(String(s.data()?.hote || ''));
    }, () => setBattement(null));
    const offInstall = onSnapshot(doc(db, 'etat', 'irisInstallation'), s => {
      const d = s.data();
      setInstallation(d?.motDePasse ? { courriel: String(d.courriel), motDePasse: String(d.motDePasse) } : null);
    }, () => setInstallation(null));
    const t = window.setInterval(() => setTick(x => x + 1), 15_000);
    return () => { off(); offInstall(); window.clearInterval(t); stopRef.current?.(); };
  }, []);

  void tick;
  const enLigne = !!battement && Date.now() - battement.getTime() < HORS_LIGNE_APRES_MS;

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setErr(null);
    const next: Msg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      if (!db) throw new Error('Firebase non configuré');
      const ref = await addDoc(collection(db, 'irisDemandes'), {
        statut: 'nouvelle',
        messages: next.map(m => ({ role: m.role, content: m.content })),
        draft,
        tags,
        now: new Date().toLocaleString('sv-SE', { timeZone: 'America/Toronto' }).replace(' ', 'T'),
        cree: serverTimestamp(),
      });
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          off();
          setErr(enLigne
            ? 'Iris met plus de temps que prévu. Votre demande reste en file : la réponse apparaîtra dans « Infolettres » si elle arrive plus tard.'
            : 'Iris est hors ligne : aucun ordinateur ne la fait tourner en ce moment. Votre demande reste en file et sera traitée dès qu\'un relais se rallume.');
          resolve();
        }, ATTENTE_MAX_MS);
        const off = onSnapshot(doc(db!, 'irisDemandes', ref.id), s => {
          const d = s.data();
          if (!d) return;
          if (d.statut === 'repondue') {
            let proposal: Proposal | undefined;
            try { proposal = d.proposalJson ? JSON.parse(d.proposalJson) : undefined; } catch { proposal = undefined; }
            const content = (d.reply || '') + (d.demandeVexel ? `\n\nDemande transmise à Vexel Webstudio : « ${d.demandeVexel} »` : '');
            setMsgs(prev => [...prev, { role: 'assistant', content, proposal }]);
            if (proposal) onProposal(proposal);
            window.clearTimeout(timer); off(); resolve();
          } else if (d.statut === 'echec') {
            setErr(`Iris n'a pas pu répondre : ${d.erreur || 'erreur inconnue'}.`);
            window.clearTimeout(timer); off(); resolve();
          }
        }, e => { setErr(e.message); window.clearTimeout(timer); off(); resolve(); });
        stopRef.current = () => { window.clearTimeout(timer); off(); };
      });
    } catch (e: any) {
      setErr(e?.message || 'Iris ne répond pas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[520px] rounded-[15px] overflow-hidden bg-[#141311] text-[#EEE7DB] border border-white/10 shadow-xl">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#e0b060] font-bold">Iris</p>
          <p className="text-xs text-white/50">Dites-lui ce que vous voulez dire, à qui, et quand.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-[11px] text-white/60" title={battement ? `Dernier signe de vie : ${battement.toLocaleTimeString('fr-CA')}` : 'Aucun signe de vie'}>
            <span className={`inline-block w-2 h-2 rounded-full ${enLigne ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
            {enLigne ? `En ligne sur ${hote || 'un ordinateur'}` : 'Hors ligne : aucun ordinateur ne fait tourner Iris'}
          </span>
          {installation && (
            <button type="button" onClick={() => setVoirInstallation(v => !v)} className="text-[11px] text-[#e0b060]/80 hover:text-[#e0b060] underline" title="Faire tourner Iris sur cet ordinateur">
              Installer sur cet ordinateur
            </button>
          )}
          {onClose && <button onClick={onClose} className="text-white/50 hover:text-white text-sm" title="Fermer"><i className="fa-solid fa-xmark" /></button>}
        </div>
      </div>

      {voirInstallation && installation && (
        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] text-xs text-white/70 space-y-2">
          <p>Iris tourne sur l'ordinateur qui l'héberge. Pour qu'elle réponde depuis le vôtre, avec votre abonnement Claude, ouvrez l'application Terminal de votre Mac, collez cette ligne et appuyez sur Entrée. Le reste s'installe seul : votre navigateur vous demandera une seule fois de vous connecter à votre compte Claude.</p>
          <code className="block select-all break-all rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-[#e0b060]">{`curl -fsSL https://krystinestlaurent.ca/iris/install.sh | bash -s -- ${installation.motDePasse}`}</code>
          <p className="text-white/50">Une fois installée, Iris reste en ligne tant que votre ordinateur est allumé, se met à jour seule, et la commande « iris » dans votre Terminal ouvre une conversation avec elle sur tout votre site.</p>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4 font-mono text-[13px] leading-relaxed">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-white/60">Bonjour Krystine. Je rédige dans votre voix, je connais chaque page de votre site et je transmets à Vexel ce que vous voulez y changer. Pour commencer :</p>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} className="block w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10">› {s}</button>
            ))}
            {!enLigne && <p className="text-amber-200/80 text-xs">Iris répond depuis un ordinateur allumé, le vôtre ou celui d'Alex. Tant qu'aucun ne tourne, votre demande attend.</p>}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-[#e0b060]' : 'text-white/90'}>
            <span className="select-none opacity-50 mr-2">{m.role === 'user' ? '›' : '◆'}</span>
            <span className="whitespace-pre-wrap">{m.content}</span>
            {m.proposal && (
              <div className="mt-2 ml-5 px-3 py-2 rounded-xl bg-[#e0b060]/10 border border-[#e0b060]/30 text-xs text-white/80">
                <i className="fa-solid fa-wand-magic-sparkles mr-2 text-[#e0b060]" />Brouillon mis à jour : « {m.proposal.subject} » · {m.proposal.blocks.length} blocs
                {m.proposal.scheduledFor ? ` · programmé ${new Date(m.proposal.scheduledFor).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                <button onClick={() => onProposal(m.proposal!)} className="ml-3 underline text-[#e0b060]">réappliquer</button>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-white/40"><i className="fa-solid fa-circle-notch fa-spin mr-2" />{enLigne ? `Iris écrit sur ${hote || 'son ordinateur'}… (une à deux minutes)` : 'Demande déposée. Iris répondra dès qu\'un ordinateur la fera tourner.'}</p>}
        {err && <p className="text-red-300">{err}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t border-white/10 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={2}
          placeholder="Écrivez à Iris… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e0b060]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="px-4 rounded-xl bg-[#e0b060] text-[#141311] font-bold uppercase tracking-widest text-[11px] disabled:opacity-40">
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
};

export default AssistantPanel;
