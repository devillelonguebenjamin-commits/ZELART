// Les libellés de la liste d'attente, sans aucune dépendance.
//
// Ce fichier existe pour une raison précise : le formulaire d'inscription est un
// composant client. S'il importait le module de correspondance, qui a besoin du
// fuseau parisien et donc du reste de `creneaux.ts`, il entraînerait Prisma et
// le pilote Postgres dans le paquet du navigateur — et la page ne se
// chargerait plus du tout. Même découpage que `creneaux-bornes.ts`.

export const JOURS_ATTENTE = [
  { numero: 1, libelle: "Lundi" },
  { numero: 2, libelle: "Mardi" },
  { numero: 3, libelle: "Mercredi" },
  { numero: 4, libelle: "Jeudi" },
  { numero: 5, libelle: "Vendredi" },
  { numero: 6, libelle: "Samedi" },
] as const;

export const MOMENTS = [
  { id: "matin", libelle: "Plutôt le matin" },
  { id: "apresmidi", libelle: "Plutôt l'après-midi" },
] as const;

export type Moment = (typeof MOMENTS)[number]["id"];
