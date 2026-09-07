import React, { useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { enregistrerSondage, type Question, type Sondage, type ThemeSondage, type TypeQuestion } from '../../../../firebase/sondages';
import { Card, GhostButton, Input, Label, PrimaryButton, Textarea, ToggleSwitch } from '../../primitives';

// L'éditeur d'un sondage : les champs généraux, puis le constructeur de
// questions (type, texte, options une par ligne, obligatoire, réordonner,
// supprimer). Écrit dans sondages/{id} avec setDoc — l'admin a le droit par
// les règles Firestore.

const THEMES: { id: ThemeSondage; label: string }[] = [
  { id: 'technique', label: 'Technique' },
  { id: 'formation', label: 'Formations' },
  { id: 'accompagnement', label: 'Accompagnement' },
];
const TYPES: { id: TypeQuestion; label: string }[] = [
  { id: 'choix', label: 'Choix unique' },
  { id: 'multi', label: 'Choix multiple' },
  { id: 'echelle', label: 'Échelle 1 à 5' },
  { id: 'texte', label: 'Texte libre' },
];

const slugifier = (s: string) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'sondage';

const questionVide = (): Question => ({
  id: `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
  type: 'choix', texte: '', options: ['', ''], obligatoire: true,
});

interface Props {
  sondage: Sondage | null;
  prochainOrdre: number;
  onFait: () => void;
  onAnnuler: () => void;
}

const SondageEditeur: React.FC<Props> = ({ sondage, prochainOrdre, onFait, onAnnuler }) => {
  const [titre, setTitre] = useState(sondage?.titre || '');
  const [sousTitre, setSousTitre] = useState(sondage?.sousTitre || '');
  const [theme, setTheme] = useState<ThemeSondage>(sondage?.theme || 'technique');
  const [ordre, setOrdre] = useState(sondage?.ordre ?? prochainOrdre);
  const [actif, setActif] = useState(sondage?.actif ?? true);
  const [questions, setQuestions] = useState<Question[]>(sondage?.questions?.length ? sondage.questions : [questionVide()]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const majQuestion = (i: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const deplacer = (i: number, sens: -1 | 1) =>
    setQuestions((qs) => {
      const j = i + sens;
      if (j < 0 || j >= qs.length) return qs;
      const copie = [...qs];
      [copie[i], copie[j]] = [copie[j], copie[i]];
      return copie;
    });
  const supprimer = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const ajouter = () => setQuestions((qs) => [...qs, questionVide()]);

  const enregistrer = async () => {
    setErreur(null);
    if (!titre.trim()) { setErreur('Le titre est requis.'); return; }
    if (questions.length === 0) { setErreur('Ajoutez au moins une question.'); return; }
    for (const q of questions) {
      if (!q.texte.trim()) { setErreur('Chaque question a besoin d’un texte.'); return; }
      if ((q.type === 'choix' || q.type === 'multi') && (q.options || []).filter((o) => o.trim()).length < 2) {
        setErreur(`« ${q.texte} » a besoin d’au moins deux options.`);
        return;
      }
    }
    setBusy(true);
    try {
      const id = sondage?.id || `${slugifier(titre)}-${Date.now().toString(36).slice(-4)}`;
      const propres = questions.map((q) => ({
        ...q,
        texte: q.texte.trim(),
        options: (q.type === 'choix' || q.type === 'multi') ? (q.options || []).map((o) => o.trim()).filter(Boolean) : undefined,
        min: q.type === 'echelle' ? (q.min ?? 1) : undefined,
        max: q.type === 'echelle' ? (q.max ?? 5) : undefined,
      }));
      await enregistrerSondage(id, {
        titre: titre.trim(),
        sousTitre: sousTitre.trim(),
        theme,
        recompense: sondage?.recompense || 10,
        actif,
        ordre: Number(ordre) || 1,
        questions: propres,
        createdAt: sondage?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onFait();
    } catch (e: any) {
      setErreur(e?.message || 'L’enregistrement a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onAnnuler} className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">
        <i className="fa-solid fa-arrow-left mr-2" /> Tous les sondages
      </button>

      <Card className="p-5 space-y-4">
        <div>
          <Label>Titre</Label>
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Votre expérience du site" />
        </div>
        <div>
          <Label>Sous-titre</Label>
          <Input value={sousTitre} onChange={(e) => setSousTitre(e.target.value)} placeholder="Une phrase courte" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label>Thème</Label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeSondage)}
              className="w-full px-4 py-3 rounded-xl border border-[#38403a]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]"
            >
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Ordre</Label>
            <Input type="number" min={1} value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} />
          </div>
          <div className="flex items-end pb-3">
            <ToggleSwitch checked={actif} onChange={setActif} label="Actif" />
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Question {i + 1}</p>
              <div className="flex items-center gap-1.5">
                <GhostButton type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} className="!px-3 !py-1.5"><i className="fa-solid fa-arrow-up" /></GhostButton>
                <GhostButton type="button" onClick={() => deplacer(i, 1)} disabled={i === questions.length - 1} className="!px-3 !py-1.5"><i className="fa-solid fa-arrow-down" /></GhostButton>
                <GhostButton type="button" onClick={() => supprimer(i)} className="!px-3 !py-1.5 hover:!text-red-500"><i className="fa-solid fa-trash" /></GhostButton>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label>Texte de la question</Label>
                <Input value={q.texte} onChange={(e) => majQuestion(i, { texte: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  value={q.type}
                  onChange={(e) => majQuestion(i, { type: e.target.value as TypeQuestion })}
                  className="px-4 py-3 rounded-xl border border-[#38403a]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]"
                >
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {(q.type === 'choix' || q.type === 'multi') && (
              <div>
                <Label>Options (une par ligne)</Label>
                <Textarea
                  rows={4}
                  value={(q.options || []).join('\n')}
                  onChange={(e) => majQuestion(i, { options: e.target.value.split('\n') })}
                />
              </div>
            )}
            {q.type === 'echelle' && (
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Étiquette basse (1)" value={q.etiquettes?.[0] || ''} onChange={(e) => majQuestion(i, { etiquettes: [e.target.value, q.etiquettes?.[1] || ''] })} />
                <Input placeholder="Étiquette haute (5)" value={q.etiquettes?.[1] || ''} onChange={(e) => majQuestion(i, { etiquettes: [q.etiquettes?.[0] || '', e.target.value] })} />
              </div>
            )}
            <ToggleSwitch checked={q.obligatoire} onChange={(v) => majQuestion(i, { obligatoire: v })} label="Obligatoire" />
          </Card>
        ))}
        <GhostButton type="button" onClick={ajouter}><i className="fa-solid fa-plus" /> Ajouter une question</GhostButton>
      </div>

      {erreur && <p className="text-sm text-red-500">{erreur}</p>}

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={enregistrer} disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </PrimaryButton>
        <GhostButton onClick={onAnnuler}>Annuler</GhostButton>
      </div>
    </div>
  );
};

export default SondageEditeur;
