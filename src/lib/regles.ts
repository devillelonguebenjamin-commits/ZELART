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
    libelle: "J'ai une pose faite ici",
    description: "Votre dernière pose a été réalisée chez Zelart.",
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

export function aUnePose(etat: EtatOngles | null): boolean {
  return etat === "POSE_ZELART" || etat === "POSE_EXTERIEURE";
}

/**
 * Cette prestation comporte-t-elle du nail art.
 *
 * Le nom fait foi, comme partout ailleurs où le niveau se lit : c'est la seule
 * marque dont dispose le catalogue, et Zélia la maîtrise depuis l'écran
 * Prestations.
 *
 * Sert à imposer une description. Depuis que la cliente ne choisit plus son
 * niveau, c'est Zélia qui le détermine, et elle ne peut le faire que si quelque
 * chose lui est décrit ou montré. Un « avec nail art » envoyé sans un mot ne
 * serait pas une demande, seulement un tarif de départ réservé.
 */
export function comporteNailArt(prestation: { nom: string }): boolean {
  return /nail art/i.test(prestation.nom);
}

/** Le niveau porté par le nom, s'il y en a un. */
export function niveauNailArt(prestation: { nom: string }): number | null {
  const trouve = prestation.nom.match(/nail art niveau (\d)/i);
  return trouve ? Number(trouve[1]) : null;
}

/**
 * Cette prestation a-t-elle sa place dans une grille de tarifs publique.
 *
 * Depuis que la cliente ne choisit plus son niveau, le catalogue porte deux
 * écritures du même nail art : les trois lignes chiffrées par niveau, et une
 * ligne sans niveau, « à partir de », qui est celle qu'elle réserve. Chacune a
 * sa raison d'être, mais côte à côte dans une même colonne de prix elles se
 * répètent — « VSP + nail art à partir de 40 € » juste au-dessus de « VSP +
 * nail art niveau 1, 40 € » n'apprend rien et laisse croire à deux offres.
 *
 * La grille garde donc les niveaux, qui seuls disent ce que coûte quoi ; la
 * ligne sans niveau reste réservable, là où elle sert vraiment.
 */
export function figureAuTarif(prestation: { nom: string }): boolean {
  return !comporteNailArt(prestation) || niveauNailArt(prestation) !== null;
}

// Une pose existante ne se recouvre pas : elle est soit remplie, soit retirée.
// Dès lors que la sélection ne comporte ni remplissage ni dépose, la dépose
// correspondante est ajoutée d'office.
export function deposeNecessaire(
  etat: EtatOngles | null,
  typeActuel: TypePose | null,
  typesActesChoisis: TypeActe[]
): boolean {
  if (!aUnePose(etat) || !typeActuel || typesActesChoisis.length === 0) return false;
  return !typesActesChoisis.some((t) => t === "DEPOSE" || t === "REMPLISSAGE");
}

// Explication donnée à la cliente, adaptée à sa situation.
export function motifDepose(
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): string {
  if (etat === "POSE_EXTERIEURE") {
    return "je ne reprends pas une pose réalisée par une autre prothésiste : elle sera retirée avant la nouvelle.";
  }
  if (typeActuel === "GEL_X") {
    return "les capsules Gel X se retirent, elles ne se remplissent pas.";
  }
  if (typeActuel === "VSP") {
    return "votre vernis semi-permanent est retiré avant la nouvelle pose.";
  }
  return "votre pose actuelle est retirée avant d'en poser une nouvelle.";
}

// Ongles nus : ni dépose ni remplissage n'ont de sens.
export function prestationProposee(
  prestation: PrestationRegle,
  etat: EtatOngles | null,
  typeActuel: TypePose | null
): boolean {
  if (!etat) return true;

  if (prestation.typeActe === "DEPOSE") {
    // Une dépose seule reste réservable, mais seulement celle qui correspond à
    // la technique portée : les tarifs diffèrent d'une dépose à l'autre.
    return aUnePose(etat) && prestation.typePose === typeActuel;
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
