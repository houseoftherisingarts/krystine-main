import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getMesFormations, getLecons, urlDeLecon, type AchatFormation, type Lecon } from '../../firebase/formations';
import { estTelechargement } from '../../firebase/musique';

// « Téléchargements » : la musique d'Origine et les autres fichiers offerts
// ou achetés, servis par URL signée (les fichiers vivent en Storage privé).

const ClientTelechargements: React.FC = () => {
  const { user, lang } = useApp();
  const [items, setItems] = useState<{ achat: AchatFormation; lecons: Lecon[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMesFormations(user.uid)
      .then(async (achats) => {
        const dl = achats.filter(estTelechargement);
        const withLecons = await Promise.all(dl.map(async (achat) => ({ achat, lecons: await getLecons(achat.id).catch(() => []) })));
        setItems(withLecons);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const telecharger = async (fid: string, l: Lecon) => {
    setBusy(l.id);
    try {
      const url = await urlDeLecon(fid, l.id);
      window.location.href = url;
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-[#293027]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>;

  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
        {lang === 'FR' ? 'Vos téléchargements' : 'Your downloads'}
      </p>
      {items.length === 0 ? (
        <div className="mt-4 rounded-[15px] bg-[#BA7B39]/8 py-8 text-center dark:bg-white/5">
          <i className="fa-solid fa-music mb-3 block text-2xl text-[#BA7B39]/60" />
          <p className="font-serif text-lg text-[#293027] dark:text-white">
            {lang === 'FR' ? 'Aucun téléchargement pour le moment' : 'No downloads yet'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#293027]/50 dark:text-white/50">
            {lang === 'FR' ? "La musique d'Origine vous attend au bas de la page du Foyer." : 'The Origin music awaits at the bottom of the Hearth page.'}
          </p>
          <a href="/foyer#musique" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline">
            {lang === 'FR' ? 'Aller au Foyer' : 'Go to the Hearth'}
          </a>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map(({ achat, lecons }) => (
            <div key={achat.id} className="flex flex-col gap-4 rounded-[15px] border border-[#293027]/10 p-4 sm:flex-row sm:items-center dark:border-white/10">
              {achat.imageUrl && <img src={achat.imageUrl} alt={achat.titre} className="h-24 w-24 flex-none rounded-[10px] object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-[#293027] dark:text-white">{achat.titre}</p>
                <ul className="mt-2 space-y-2">
                  {lecons.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-[#293027]/70 dark:text-white/70">
                        <i className={`fa-solid ${l.type === 'audio' ? 'fa-music' : l.type === 'pdf' ? 'fa-file-pdf' : 'fa-file'} mr-2 text-[#BA7B39]`} />{l.titre}
                      </span>
                      <button
                        type="button"
                        onClick={() => telecharger(achat.id, l)}
                        disabled={busy === l.id}
                        className="rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
                      >
                        <i className="fa-solid fa-download mr-1" /> {busy === l.id ? (lang === 'FR' ? 'Un instant…' : 'One moment…') : (lang === 'FR' ? 'Télécharger' : 'Download')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ClientTelechargements;
