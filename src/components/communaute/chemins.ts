// ─── Les chemins du Foyer social ─────────────────────────────────────────────
// Tout le volet social vit sous /foyer (Alex, 7 septembre 2026) : la page de
// vente garde /foyer, l'espace exclusif s'ouvre dessous. Les anciens chemins
// (/fil, /membres, /membre/:uid, /groupes, /messages) redirigent ici, dans
// App.tsx. Un seul endroit écrit ces adresses : personne ne recolle un
// « /membres » à la main.
//
// Il n'y a plus de groupes : le Foyer d'Origine EST le seul groupe social du
// site, et son fil est le mur (Alex, 7 septembre 2026).

export const CHEMINS_FOYER = {
  /** La page de vente du Foyer d'Origine, la seule porte publique. */
  vente: '/foyer',
  /** L'espace du programme (les leçons), déjà derrière l'achat. */
  programme: '/cours/foyer',
  fil: '/foyer/fil',
  membres: '/foyer/membres',
  amies: '/foyer/membres?vue=amies',
  demandes: '/foyer/membres?vue=demandes',
  messages: '/foyer/messages',
  conversation: (uid: string) => `/foyer/messages/${uid}`,
  /** La seule porte vers l'équipe (Krystine, Alex) : jamais un uid d'admin
   *  en boîte à boîte, toujours conversations/{uid} (Alex, 7 septembre 2026). */
  equipe: '/foyer/messages?volet=support',
  profil: (uid: string) => `/foyer/membre/${uid}`,
} as const;
