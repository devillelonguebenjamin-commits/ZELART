// Bornes partagées entre le serveur et le navigateur.
//
// Elles vivent à part de `creneaux.ts`, qui importe Prisma : un composant
// client important ce module y entraînerait Prisma tout entier. Ici, aucune
// dépendance — le formulaire et le contrôle serveur restent d'accord sans que
// le navigateur charge quoi que ce soit d'inutile.

/** Préavis minimum : laisse à Zélia le temps de confirmer et d'encaisser l'acompte. */
export const PREAVIS_MS = 24 * 60 * 60 * 1000;

/** Au-delà, une proposition de créneau n'a plus grand sens. */
export const HORIZON_PROPOSITION_JOURS = 90;
