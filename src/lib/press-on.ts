import type { ModeRemise, StatutCommandePressOn } from "@/generated/prisma/client";

// Le parcours d'une commande, dans l'ordre où Zélia le vit. Les CGV imposent le
// paiement intégral avant fabrication : PAYEE précède donc EN_FABRICATION.
export const ETAPES: StatutCommandePressOn[] = [
  "DEMANDE",
  "A_PAYER",
  "PAYEE",
  "EN_FABRICATION",
  "PRETE",
  "REMISE",
];

export const LIBELLE_STATUT: Record<StatutCommandePressOn, string> = {
  DEMANDE: "Demande reçue",
  A_PAYER: "En attente de règlement",
  PAYEE: "Réglée",
  EN_FABRICATION: "En fabrication",
  PRETE: "Prête",
  REMISE: "Remise",
  ANNULEE: "Annulée",
};

// Ce que la cliente lit dans son espace : elle n'a pas à connaître nos étapes
// internes, seulement où en est son set.
export const MESSAGE_CLIENTE: Record<StatutCommandePressOn, string> = {
  DEMANDE: "Zélia revient vers vous avec le montant à régler.",
  A_PAYER: "Le règlement est attendu pour lancer la fabrication.",
  PAYEE: "Règlement reçu, la fabrication va commencer 🤍",
  EN_FABRICATION: "Votre set est en cours de création.",
  PRETE: "Votre set est prêt !",
  REMISE: "Set remis — merci et à bientôt ✨",
  ANNULEE: "Cette commande a été annulée.",
};

export const COULEUR_STATUT: Record<StatutCommandePressOn, string> = {
  DEMANDE: "bg-amber-50 text-amber-800",
  A_PAYER: "bg-orange-50 text-orange-800",
  PAYEE: "bg-sky-50 text-sky-800",
  EN_FABRICATION: "bg-violet-50 text-violet-800",
  PRETE: "bg-emerald-50 text-emerald-800",
  REMISE: "bg-pink-50 text-pink-700",
  ANNULEE: "bg-neutral-100 text-neutral-600",
};

export const LIBELLE_REMISE: Record<ModeRemise, string> = {
  MAIN_PROPRE: "Remise en main propre",
  POSTAL: "Envoi postal",
};

// Une commande est « à traiter » tant qu'elle n'est ni remise ni annulée.
export function enCours(statut: StatutCommandePressOn): boolean {
  return statut !== "REMISE" && statut !== "ANNULEE";
}

// Ordre d'affichage des collections : le sur-mesure d'abord, c'est le cœur de
// l'offre ; les autres suivent l'ordre du catalogue.
export function grouperParCollection<T extends { collection: string }>(
  modeles: T[]
): { nom: string; modeles: T[] }[] {
  const groupes = new Map<string, T[]>();
  for (const modele of modeles) {
    const groupe = groupes.get(modele.collection);
    if (groupe) groupe.push(modele);
    else groupes.set(modele.collection, [modele]);
  }
  return [...groupes.entries()].map(([nom, items]) => ({ nom, modeles: items }));
}

// Montant total annoncé à la cliente : le set, plus le port quand Zélia l'a
// chiffré. Le « à partir de » se propage, comme pour les prestations.
export function totalCommande(commande: {
  prixCents: number;
  aPartirDe: boolean;
  fraisPortCents: number | null;
}): { prixCents: number; aPartirDe: boolean } {
  return {
    prixCents: commande.prixCents + (commande.fraisPortCents ?? 0),
    aPartirDe: commande.aPartirDe,
  };
}

/**
 * Ce qu'on demande à régler en ligne, selon le mode de remise.
 *
 * Envoi postal : la totalité, port compris — le set part de chez Zélia, elle ne
 * reverra pas la cliente. Retrait au salon : l'acompte seulement, le solde se
 * règle sur place en espèces ou par carte, comme pour une prestation. Dans les
 * deux cas quelque chose est réglé avant fabrication : un set sur-mesure jamais
 * récupéré est de la matière et des heures perdues.
 *
 * Vit ici et non dans les actions : un module « use server » ne peut exporter
 * que des fonctions asynchrones, et la page a besoin du calcul pour annoncer le
 * montant avant tout envoi.
 */
export function montantARegler(
  commande: {
    modeRemise: ModeRemise;
    prixCents: number;
    aPartirDe: boolean;
    fraisPortCents: number | null;
  },
  acompteCents: number
): { cents: number; total: number; solde: number; acompteSeul: boolean } {
  const total = totalCommande(commande).prixCents;
  if (commande.modeRemise === "POSTAL") {
    return { cents: total, total, solde: 0, acompteSeul: false };
  }
  // Un acompte supérieur au total n'aurait pas de sens : on encaisse alors tout.
  const cents = Math.min(acompteCents, total);
  return { cents, total, solde: total - cents, acompteSeul: cents < total };
}
