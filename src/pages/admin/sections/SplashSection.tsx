import React, { useEffect, useState } from 'react';
import { getSplashSettings, updateSplashSettings, DEFAULT_SPLASH, type SplashSettings } from '../../../firebase/firestore';
import { Card, Input, Label, PrimaryButton, GhostButton, ToggleSwitch } from '../primitives';

const SplashSection: React.FC = () => {
  const [s, setS] = useState<SplashSettings>(DEFAULT_SPLASH);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getSplashSettings().then(setS).finally(() => setLoading(false)); }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await updateSplashSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#D4AF37] text-2xl" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold">Affichage</h3>
          <ToggleSwitch checked={s.enabled} onChange={v => setS({ ...s, enabled: v })} label={s.enabled ? 'Activé' : 'Désactivé'} />
        </div>
        <p className="text-xs text-[#0B1A36]/50 dark:text-white/50">
          Quand activé, les nouveaux visiteurs voient l'écran d'accueil avant le site. Les visiteurs récurrents le revoient tous les 7 jours.
          <br />
          <a href="/?splash=1" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">Aperçu en direct ↗</a>
        </p>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold">Contenu (FR)</h3>
        <div>
          <Label>Étiquette en haut</Label>
          <Input value={s.tagline} onChange={e => setS({ ...s, tagline: e.target.value })} />
        </div>
        <div>
          <Label>Titre principal</Label>
          <Input value={s.headline} onChange={e => setS({ ...s, headline: e.target.value })} />
        </div>
        <div>
          <Label>Sous-titre</Label>
          <Input value={s.subtitle} onChange={e => setS({ ...s, subtitle: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Bouton principal — texte</Label>
            <Input value={s.primaryCtaLabel} onChange={e => setS({ ...s, primaryCtaLabel: e.target.value })} />
          </div>
          <div>
            <Label>Bouton principal — destination</Label>
            <Input value={s.primaryCtaHref} onChange={e => setS({ ...s, primaryCtaHref: e.target.value })} placeholder="/origine" />
          </div>
        </div>
        <div>
          <Label>Bouton secondaire — texte</Label>
          <Input value={s.skipCtaLabel} onChange={e => setS({ ...s, skipCtaLabel: e.target.value })} />
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold">Contenu (EN — facultatif)</h3>
        <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 -mt-2">Si vide, le texte FR est utilisé.</p>
        <div>
          <Label>Tagline</Label>
          <Input value={s.taglineEN || ''} onChange={e => setS({ ...s, taglineEN: e.target.value })} />
        </div>
        <div>
          <Label>Headline</Label>
          <Input value={s.headlineEN || ''} onChange={e => setS({ ...s, headlineEN: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input value={s.subtitleEN || ''} onChange={e => setS({ ...s, subtitleEN: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Primary CTA label</Label>
            <Input value={s.primaryCtaLabelEN || ''} onChange={e => setS({ ...s, primaryCtaLabelEN: e.target.value })} />
          </div>
          <div>
            <Label>Skip CTA label</Label>
            <Input value={s.skipCtaLabelEN || ''} onChange={e => setS({ ...s, skipCtaLabelEN: e.target.value })} />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement</> : 'Enregistrer'}
        </PrimaryButton>
        <GhostButton onClick={() => setS(DEFAULT_SPLASH)}>Réinitialiser</GhostButton>
        {saved && <span className="text-xs text-green-600 uppercase tracking-widest"><i className="fa-solid fa-check mr-1" />Enregistré</span>}
      </div>
    </div>
  );
};

export default SplashSection;
