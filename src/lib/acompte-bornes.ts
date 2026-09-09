// Règles d'expiration de l'acompte, sans aucune dépendance.
//
// Isolées ici pour la même raison que les autres modules « bornes » du projet :
// creneaux.ts a besoin de ces filtres, acompte.ts a besoin de creneaux.ts pour
// mettre en forme ses dates, et le cycle qui en résulterait laisserait l'un des
// deux modules à moitié initialisé selon l'ordre de chargement.
//
// Le seul import est un import **de type** : il disparaît à la compilation et
// n'introduit donc aucune dépendance d'exécution.

import type { StatutRendezVous } from "@/generated/prisma/client";

/**
 * Combien de temps un créneau reste retenu sans que l'acompte soit réglé.
 *
 * L'acompte protège d'une inconnue qui ne vient pas ; il ne servait à rien tant
 * qu'une demande impayée gardait le créneau indéfiniment. Une inconnue pouvait
 * réserver le samedi le plus demandé, ne jamais payer, et personne d'autre ne
 * pouvait le prendre.
 *
 * Deux nuits : la relance part à vingt-quatre heures, et il reste une journée
 * pour y donner suite. C'est aussi ce que cette relance promet déjà — « sans
 * règlement, le créneau pourra être proposé à une autre cliente » —, une phrase
 * que rien n'appliquait.
 */
export const DELAI_EXPIRATION_ACOMPTE_MS = 48 * 60 * 60 * 1000;

/**
 * Filtre Prisma des rendez-vous qui **occupent encore** leur créneau.
 *
 * Écrit en OR plutôt qu'en NOT, et ce n'est pas un goût de style : un `NOT`
 * portant sur deux colonnes nullables se évalue à NULL — donc à faux — dès que
 * l'une d'elles est vide, et aurait discrètement libéré les créneaux de tous
 * les rendez-vous sans acompte demandé, c'est-à-dire de toutes les habituées.
 * Les trois branches ci-dessous se lisent, elles, sans piège :
 */
export function occupeLeCreneau(maintenant: Date = new Date()) {
  const limite = new Date(maintenant.getTime() - DELAI_EXPIRATION_ACOMPTE_MS);
  return {
    statut: { not: "ANNULE" as const },
    OR: [
      // Aucun acompte n'a été demandé : rien à attendre.
      { acompteDemandeLe: null },
      // Il a été réglé.
      { acompteRegleLe: { not: null } },
      // Il est demandé depuis peu : la cliente a encore le temps.
      { acompteDemandeLe: { gt: limite } },
    ],
  };
}

/** L'inverse : le délai est passé, le créneau doit être rendu. */
export function acompteExpire(maintenant: Date = new Date()) {
  return {
    statut: { notIn: ["ANNULE", "TERMINE", "NO_SHOW"] satisfies StatutRendezVous[] },
    acompteDemandeLe: { lt: new Date(maintenant.getTime() - DELAI_EXPIRATION_ACOMPTE_MS) },
    acompteRegleLe: null,
    // Un rendez-vous déjà passé ne se libère pas : son créneau n'intéresse
    // plus personne, et l'annuler après coup réécrirait l'histoire.
    debut: { gt: maintenant },
  };
}
