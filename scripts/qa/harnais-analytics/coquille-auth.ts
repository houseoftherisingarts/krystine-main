// La déconnexion de l'habillage ne fait rien dans le harnais. Le reste du
// module passe tel quel.
export * from '../../../src/firebase/auth';
export async function logout(): Promise<void> {}
