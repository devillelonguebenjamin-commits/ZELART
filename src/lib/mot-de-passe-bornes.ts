// Bornes du mot de passe, partagées entre le serveur et le navigateur.
//
// Elles vivent à part de `mot-de-passe.ts`, qui importe `crypto` et
// `util.promisify` : un composant client important ce module les entraînerait
// dans le paquet du navigateur, où `scrypt` n'existe pas — `promisify` échoue
// alors au chargement et toute la page cesse de s'afficher. Ici, aucune
// dépendance.

/** Longueur minimale acceptée. Court mais réel : au-delà, on décourage. */
export const LONGUEUR_MIN = 8;

export function motDePasseAcceptable(motDePasse: string): string | null {
  const nettoye = motDePasse.normalize("NFKC");
  if (nettoye.length < LONGUEUR_MIN) {
    return `Choisissez un mot de passe d'au moins ${LONGUEUR_MIN} caractères.`;
  }
  if (nettoye.length > 200) return "Ce mot de passe est trop long.";
  return null;
}
