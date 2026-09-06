import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getMesFormations, getLecons, urlDeLecon, type AchatFormation, type Lecon } from '../../firebase/formations';
import { estTelechargement, MUSIQUE_ORIGINE_ID } from '../../firebase/musique';
import BoutiqueNiskas from '../../components/client/BoutiqueNiskas';
import { SANTE_LA_VIE_ID, CATALOGUE_VIDEOS, dureeLisible, vignetteYoutube, type CatalogueVideos } from '../../lib/pointsConfig';
import { suivreBoutique, points } from '../../firebase/points';
import LecteurYouTube from '../../components/client/LecteurYouTube';

// « Téléchargements » : la musique d'Origine et les autres fichiers offerts
// ou achetés, servis par URL signée (les fichiers vivent en Storage privé).

const ClientTelechargements: React.FC = () => {
  const { user, lang } = useApp();
  const [items, setItems] = useState<{ achat: AchatFormation; lecons: Lecon[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tour, setTour] = useState(0);
  // Mes vidéos : toutes les vidéos de Krystine dès que la section est ouverte
  // (dix niskas, une fois), plus celles achetées à l'unité avant ce changement.
  const [possede, setPossede] = useState<Record<string, unknown>>({});
  const [catalogue, setCatalogue] = useState<CatalogueVideos | null>(null);
  const [enLecture, setEnLecture] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    fetch(CATALOGUE_VIDEOS).then((r) => r.json()).then(setCatalogue).catch(() => setCatalogue(null));
    return suivreBoutique(user.uid, (p) => setPossede(p.possede));
  }, [user]);
  // Le bouton « Regarder » de la petite boutique ouvre le lecteur ici.
  useEffect(() => {
    const regarder = (e: Event) => {
      setEnLecture((e as CustomEvent<string>).detail);
      setChaineOuverte(true);
      window.setTimeout(() => document.getElementById('mes-videos')?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    window.addEventListener('krystine:regarder-video', regarder);
    return () => window.removeEventListener('krystine:regarder-video', regarder);
  }, []);
  const accesVideos = !!possede['acces-videos'];
  // « Mes vidéos » = celles prises à l'unité. La chaîne entière, une fois la
  // section ouverte, vit dans un bloc repliable à part : 549 vignettes d'un
  // coup, on s'y perd.
  const mesVideos = (catalogue?.videos || []).filter((v) => !!possede[`video:${v.id}`]);
  const [chaineOuverte, setChaineOuverte] = useState(false);
  const [rechercheChaine, setRechercheChaine] = useState('');
  const [nbChaine, setNbChaine] = useState(24);
  const videosChaine = (catalogue?.videos || []).filter((v) => !rechercheChaine.trim() || v.titre.toLowerCase().includes(rechercheChaine.trim().toLowerCase()));

  // Les téléchargements : la musique d'Origine et les émissions de Santé la
  // vie achetées à l'unité en niskas (le document d'achat porte `episodes`,
  // seules ces leçons-là se montrent).
  useEffect(() => {
    if (!user) return;
    getMesFormations(user.uid)
      .then(async (achats) => {
        const dl = achats.filter((a) => estTelechargement(a) || a.id === SANTE_LA_VIE_ID);
        const withLecons = await Promise.all(dl.map(async (achat) => {
          const lecons = await getLecons(achat.id).catch(() => [] as Lecon[]);
          const episodes = (achat as AchatFormation & { episodes?: Record<string, unknown> }).episodes;
          return { achat, lecons: episodes ? lecons.filter((l) => !!episodes[l.id]) : lecons };
        }));
        setItems(withLecons);
      })
      .finally(() => setLoading(false));
  }, [user, tour]);

  const possedeMusique = items.some(({ achat }) => achat.id === MUSIQUE_ORIGINE_ID);
  const episodesPossedes = new Set(items.filter(({ achat }) => achat.id === SANTE_LA_VIE_ID).flatMap(({ lecons }) => lecons.map((l) => l.id)));

  const telecharger = async (fid: string, l: Lecon) => {
    setBusy(l.id);
    try {
      const url = await urlDeLecon(fid, l.id);
      window.location.href = url;
    } finally {
      setBusy(null);
    }
  };

  const carteVideo = (v: { id: string; titre: string; duree?: number; publieLe?: string }) => (
    <button key={v.id} type="button" onClick={() => { setEnLecture(v.id); document.getElementById('mes-videos')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex gap-3 rounded-[14px] border border-[#293027]/10 bg-white/50 p-2 text-left transition-colors hover:border-[#BA7B39] dark:border-white/10 dark:bg-white/5">
      <span className="relative w-28 flex-none overflow-hidden rounded-[10px]">
        <img src={vignetteYoutube(v.id)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
        <i className="fa-solid fa-play absolute inset-0 flex items-center justify-center text-white drop-shadow" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm text-[#293027] dark:text-white">{v.titre}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40">{v.duree ? dureeLisible(v.duree) : ''}{v.publieLe ? ` · ${v.publieLe}` : ''}</span>
      </span>
    </button>
  );

  if (loading) return <p className="text-sm text-[#293027]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>;

  return (
    <section id="telechargements">
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
            {lang === 'FR' ? "La musique d'Origine et les émissions de Santé la vie s'ajoutent ici depuis la petite boutique, juste dessous." : 'The Origin music and the Santé la vie shows land here from the little shop, right below.'}
          </p>
          <a href="#boutique" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#8B4A2F] underline-offset-4 hover:underline">
            {lang === 'FR' ? 'Voir la boutique' : 'See the shop'}
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
                        <i className={`fa-solid ${l.type === 'audio' ? 'fa-music' : l.type === 'pdf' ? 'fa-file-pdf' : l.type === 'video' ? 'fa-tv' : 'fa-file'} mr-2 text-[#BA7B39]`} />{l.titre}
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
      {(mesVideos.length > 0 || accesVideos) && (
        <div className="mt-8" id="mes-videos">
          {enLecture && (
            <div className="mb-4 overflow-hidden rounded-[16px] bg-black">
              <div className="aspect-video">
                <LecteurYouTube
                  videoId={enLecture}
                  titre={lang === 'FR' ? 'Lecteur vidéo' : 'Video player'}
                  onEcoutee={(id) => { if (user?.uid) points.videoWatched(user.uid, id).catch(() => {}); }}
                />
              </div>
            </div>
          )}
          {mesVideos.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Mes vidéos' : 'My videos'} ({mesVideos.length})</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mesVideos.map(carteVideo)}</div>
            </>
          )}
          {accesVideos && (
            <div className={`${mesVideos.length > 0 ? 'mt-6' : ''} rounded-[18px] border border-[#BA7B39]/30 bg-white/40 dark:bg-white/5`}>
              <button
                type="button"
                onClick={() => setChaineOuverte((o) => !o)}
                aria-expanded={chaineOuverte}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Les vidéos de Krystine' : 'Krystine’s videos'}</span>
                  <span className="block text-sm text-[#293027]/60 dark:text-white/60">{catalogue ? catalogue.videos.length : ''} {lang === 'FR' ? 'vidéos, directs et capsules, à regarder ici' : 'videos, lives and capsules, to watch here'}</span>
                </span>
                <i className={`fa-solid fa-chevron-down text-[#8B4A2F] transition-transform ${chaineOuverte ? '' : '-rotate-90'}`} aria-hidden="true" />
              </button>
              {chaineOuverte && (
                <div className="border-t border-[#293027]/10 p-4 dark:border-white/10">
                  <input
                    type="search"
                    value={rechercheChaine}
                    onChange={(e) => { setRechercheChaine(e.target.value); setNbChaine(24); }}
                    placeholder={lang === 'FR' ? 'Chercher un titre' : 'Search a title'}
                    className="w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] sm:w-72 dark:border-white/15 dark:bg-white/10 dark:text-white"
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{videosChaine.slice(0, nbChaine).map(carteVideo)}</div>
                  {videosChaine.length > nbChaine && (
                    <div className="mt-4 text-center">
                      <button type="button" onClick={() => setNbChaine((n) => n + 48)} className="rounded-full border border-[#38403a]/15 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70">
                        {lang === 'FR' ? `Voir plus (${videosChaine.length - nbChaine} autres)` : `See more (${videosChaine.length - nbChaine} more)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <BoutiqueNiskas possedeMusiqueDeja={possedeMusique} episodesPossedes={episodesPossedes} onAchat={() => setTour((t) => t + 1)} />
    </section>
  );
};

export default ClientTelechargements;
