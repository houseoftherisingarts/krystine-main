import React, { useEffect, useState } from 'react';
import { suivreLeMur, suivreMesSauvegardes, type FilMur, type PostMur } from '../../firebase/mur';
import { useApp, useAuth } from '../../contexts/AppContext';
import BilletCarte from './BilletCarte';
import CarteSociale from './CarteSociale';
import Composeur from './Composeur';
import PubCarte from './PubCarte';

// ─── Le mur d'un seul fil ────────────────────────────────────────────
// Porté du FMM 2026 (src/components/mur/MurSocial.tsx). Le Foyer d'Origine
// est le seul groupe social du site : « formation:foyer » est LE mur, où les
// membres publient, et « krystine » porte ses annonces à elle. Le fil public
// « communaute » ne se montre plus qu'à l'admin.
const MurSocial: React.FC<{ fil: FilMur; titre?: string }> = ({ fil, titre }) => {
  const { user } = useAuth();
  const { lang } = useApp();
  const fr = lang === 'FR';
  const [posts, setPosts] = useState<PostMur[]>([]);
  const [sauvegardes, setSauvegardes] = useState<Set<string>>(new Set());
  useEffect(() => suivreLeMur(fil, setPosts), [fil]);
  useEffect(() => (user ? suivreMesSauvegardes(user.uid, setSauvegardes) : undefined), [user]);

  const vide = fil === 'krystine' || fil === 'communaute'
    ? (fr ? 'Rien de publié pour le moment.' : 'Nothing published yet.')
    : (fr ? 'Le mur est encore vide. Soyez la première voix.' : 'The wall is still empty. Be the first voice.');

  return (
    <div className="space-y-4">
      {titre && <h2 className="font-serif text-xl text-[#293027] dark:text-white">{titre}</h2>}

      <Composeur fil={fil} contexte="feed" />

      {posts.length === 0 ? (
        <CarteSociale>
          <p className="text-sm text-[#38403a]/50 dark:text-white/50">{vide}</p>
        </CarteSociale>
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
