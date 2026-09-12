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
 * Deux nuits : la relance part à vingt-quatre heures, et il reste une journée
 * pour y donner suite.
 */
export const DELAI_EXPIRATION_ACOMPTE_MS = 48 * 60 * 60 * 1000;

/**
 * Filtre Prisma des rendez-vous qui occupent leur créneau : tout ce qui n'est
 * pas annulé.
 *
 * Une première version en excluait les acomptes échus, pour rendre le créneau
 * dès la quarante-huitième heure sans attendre le passage de la tâche. Elle a
 * été retirée après avoir annulé des rendez-vous réglés : un créneau ne se
 * libère plus **que** par une annulation effective, décidée après avoir
 * demandé à SumUp où en est le paiement. Entre-temps, il reste retenu — un
 * samedi tenu un jour de trop coûte moins cher qu'une cliente qui a payé et
 * qu'on renvoie.
 */
export function occupeLeCreneau() {
  return { statut: { not: "ANNULE" as const } };
}

/**
 * Les rendez-vous **candidats** à la libération : le délai est passé et rien
 * n'a été constaté. Candidats seulement — la décision se prend après une
 * vérification en direct auprès de SumUp, jamais sur ce filtre seul.
 *
 * Trois gardes, chacune née d'une annulation injustifiée :
 *
 *   - `acompteReference` non nul : seul un paiement créé par l'API porte une
 *     référence et peut être interrogé. Un acompte parti avec le lien
 *     réutilisable n'a rien qui permette de savoir s'il a été réglé — il se
 *     coche à la main, et ne s'annule jamais automatiquement ;
 *   - statut CONFIRMÉ uniquement : une demande que Zélia n'a pas encore
 *     tranchée lui appartient, acompte demandé ou non ;
 *   - début à venir : un rendez-vous passé n'intéresse plus personne, et
 *     l'annuler après coup réécrirait l'histoire.
 */
export function acompteExpire(maintenant: Date = new Date()) {
  return {
    statut: "CONFIRME" as const,
    acompteReference: { not: null },
    acompteDemandeLe: { lt: new Date(maintenant.getTime() - DELAI_EXPIRATION_ACOMPTE_MS) },
    acompteRegleLe: null,
    debut: { gt: maintenant },
  };
}

/**
 * Acomptes en souffrance que le site **ne peut pas** trancher seul : demandés
 * depuis plus de deux jours, non constatés, et sans référence pour interroger
 * SumUp. C'est à Zélia de les cocher « reçu » ou d'annuler ; l'écran les lui
 * montre, rien d'autre.
 */
export function acompteASuivreALaMain(maintenant: Date = new Date()) {
  return {
    statut: { in: ["CONFIRME", "EN_ATTENTE"] satisfies StatutRendezVous[] },
    acompteReference: null,
    acompteDemandeLe: { lt: new Date(maintenant.getTime() - DELAI_EXPIRATION_ACOMPTE_MS) },
    acompteRegleLe: null,
    debut: { gt: maintenant },
  };
}
