// Ce que le fil de discussion expose au navigateur.
//
// Séparé de `messages.ts`, qui parle à la base : un composant client qui
// importerait ce module-là entraînerait Prisma et le pilote Postgres dans le
// paquet envoyé au navigateur. Même motif que `creneaux-bornes` et
// `attente-bornes`, et même règle : aucune dépendance ici.

/** Au-delà, ce n'est plus un message mais un courrier : le SMS ou l'e-mail reprennent la main. */
export const LONGUEUR_MAX = 2000;

export type MessagePublic = {
  id: string;
  deZelia: boolean;
  texte: string;
  luLe: Date | null;
  creeLe: Date;
};
