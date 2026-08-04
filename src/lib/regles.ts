import type { EtatOngles, TypeActe, TypePose } from "@/generated/prisma/client";

export type PrestationRegle = {
  id: string;
  typeActe: TypeActe;
  typePose: TypePose;
};

export const ETATS_ONGLES: { id: EtatOngles; libelle: string; description: string }[] = [
  {
    id: "NATUREL",
    libelle: "Mes ongles sont nus",
    description: "Aucune pose ni vernis semi-permanent en ce moment.",
  },
  {
    id: "POSE_ZELART",
    libelle: "J'ai une pose faite par Zélia",
    description: "Votre dernière pose a été réalisée ici, chez Zelart.",
  },
  {
    id: "POSE_EXTERIEURE",
    libelle: "J'ai une pose faite ailleurs",
    description: "Une pose réalisée par une autre prothésiste.",
  },
];

export const TYPES_POSE: { id: TypePose; libelle: string }[] = [
  { id: "VSP", libelle: "Vernis semi-permanent" },
  { id: "GAINAGE", libelle: "Gainage" },
  { id: "GEL_X", libelle: "Pose Gel X (capsules)" },
  { id: "POP_IT", libelle: "Pose Pop-it" },
];

// Un remplissage suppose une pose que Zélia a elle-même réalisée, et que la
// technique se prête au remplissage : les capsules Gel X, elles, se déposent.
export function remplissageAutorise(
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): boolean {
  if (etat !== "POSE_ZELART" || !typeActuel) return false;
  return typeActuel === "GAINAGE" || typeActuel === "POP_IT";
}

// Une dépose s'impose d'office quand la pose vient d'ailleurs — Zélia ne
// reprend pas le travail d'une autre — ainsi que pour les capsules Gel X et le
// vernis semi-permanent, qui se retirent avant toute nouvelle pose.
export function deposeImposee(
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): boolean {
  if (!typeActuel) return false;
  if (etat === "POSE_EXTERIEURE") return true;
  return etat === "POSE_ZELART" && (typeActuel === "GEL_X" || typeActuel === "VSP");
}

// Explication donnée à la cliente, adaptée à sa situation.
export function motifDepose(
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): string | null {
  if (!deposeImposee(etat, typeActuel)) return null;
  if (etat === "POSE_EXTERIEURE") {
    return "Zélia ne remplit pas une pose réalisée par une autre prothésiste : elle sera retirée avant la nouvelle.";
  }
  if (typeActuel === "GEL_X") {
    return "les capsules Gel X se retirent, elles ne se remplissent pas.";
  }
  return "votre vernis semi-permanent est retiré avant la nouvelle pose.";
}

// Ongles nus : ni dépose ni remplissage n'ont de sens.
export function prestationProposee(
  prestation: PrestationRegle,
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): boolean {
  if (!etat) return true;

  if (prestation.typeActe === "DEPOSE") {
    // Une dépose seule reste réservable si la cliente a bien quelque chose à retirer.
    return etat !== "NATUREL";
  }

  if (prestation.typeActe === "REMPLISSAGE") {
    return remplissageAutorise(etat, typeActuel) && prestation.typePose === typeActuel;
  }

  return true;
}

// Dépose correspondant à ce que la cliente porte actuellement.
export function trouverDepose<T extends PrestationRegle>(
  prestations: T[],
  typeActuel: TypePose | null
): T | null {
  if (!typeActuel) return null;
  return prestations.find((p) => p.typeActe === "DEPOSE" && p.typePose === typeActuel) ?? null;
}
