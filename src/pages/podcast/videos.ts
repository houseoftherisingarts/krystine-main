/**
 * La vidéo YouTube de chaque épisode du podcast, affichée en tête de /podcast.
 *
 * À CHAQUE NOUVEL ÉPISODE : ajouter une ligne ici, clé « S{saison}-{numéro} »,
 * valeur = l'identifiant YouTube (les 11 caractères après « watch?v= »).
 * Exemple : https://www.youtube.com/watch?v=ZwI_D0A2mlw  →  'ZwI_D0A2mlw'.
 *
 * Sans ligne pour le dernier épisode, la page montre l'image de l'épisode et
 * le lecteur audio à la place de la vidéo.
 */
export const VIDEOS_EPISODES: Record<string, string> = {
  'S2-5': '5b_Kh_VKY5Y',
};
