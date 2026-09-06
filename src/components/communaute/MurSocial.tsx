import React, { useEffect, useState } from 'react';
import { suivreLeMur, suivreMesSauvegardes, type FilMur, type PostMur } from '../../firebase/mur';
import { useAuth } from '../../contexts/AppContext';
import BilletCarte from './BilletCarte';
import Composeur from './Composeur';
import PubCarte from './PubCarte';

// ─── Le mur d'un seul fil ────────────────────────────────────────────
// Porté du FMM 2026 (src/components/mur/MurSocial.tsx). CommunauteEspace
// pose deux instances côte à côte : « krystine » (Krystine seule publie)
// et « communaute » (tout membre connecté publie).
const MurSocial: React.FC<{ fil: FilMur; titre: string }> = ({ fil, titre }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostMur[]>([]);
  const [sauvegardes, setSauvegardes] = useState<Set<string>>(new Set());
  useEffect(() => suivreLeMur(fil, setPosts), [fil]);
  useEffect(() => (user ? suivreMesSauvegardes(user.uid, setSauvegardes) : undefined), [user]);

  return (
    <div className="space-y-5">
      {titre && <h2 className="font-serif text-xl text-[#293027] dark:text-white">{titre}</h2>}

      <Composeur fil={fil} contexte="feed" />

      {posts.length === 0 ? (
        <p className="text-sm text-[#38403a]/50 dark:text-white/45">
          {fil === 'krystine' || fil === 'communaute' ? 'Rien de publié pour le moment.' : fil.startsWith('formation:') ? 'Le feed de cette formation est encore vide. Partagez votre parcours.' : 'Le fil est encore vide. Soyez la première voix.'}
        </p>
      ) : posts.map((p, i) => (
        <React.Fragment key={p.id}>
          <BilletCarte post={p} delaiIndex={i} estSauvegarde={sauvegardes.has(p.id)} />
          {/* Une suggestion maison tous les 4 billets, dans le fil public seulement. */}
          {fil === 'communaute' && (i + 1) % 4 === 0 && <PubCarte index={Math.floor(i / 4)} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MurSocial;
