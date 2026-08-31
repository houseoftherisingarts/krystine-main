import React, { useEffect, useState } from 'react';
import { suivreLeMur, type FilMur, type PostMur } from '../../firebase/mur';
import BilletCarte from './BilletCarte';
import Composeur from './Composeur';

// ─── Le mur d'un seul fil ────────────────────────────────────────────
// Porté du FMM 2026 (src/components/mur/MurSocial.tsx). CommunauteEspace
// pose deux instances côte à côte : « krystine » (Krystine seule publie)
// et « communaute » (tout membre connecté publie).
const MurSocial: React.FC<{ fil: FilMur; titre: string }> = ({ fil, titre }) => {
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => suivreLeMur(fil, setPosts), [fil]);

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-xl text-[#2a2015] dark:text-white">{titre}</h2>

      <Composeur fil={fil} />

      {posts.length === 0 ? (
        <p className="text-sm text-[#3a3126]/50 dark:text-white/45">
          {fil === 'krystine' ? 'Rien de publié pour le moment.' : 'Le fil est encore vide. Soyez la première voix.'}
        </p>
      ) : posts.map((p, i) => <BilletCarte key={p.id} post={p} delaiIndex={i} />)}
    </div>
  );
};

export default MurSocial;
