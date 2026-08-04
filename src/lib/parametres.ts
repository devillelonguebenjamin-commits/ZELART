import { prisma } from "@/lib/prisma";
import { POSES_PAR_TOUR_DEFAUT, type LotPublic } from "@/lib/roue";
import type { TypePose } from "@/generated/prisma/client";

export const CLE_LIEN_ACOMPTE = "lienAcompte";
export const CLE_MONTANT_ACOMPTE = "montantAcompteCents";
export const CLE_POSES_PAR_TOUR = "posesParTour";
export const CLE_RAPPELS_ACTIFS = "rappelsActifs";

// Délai avant relance, par technique : un vernis semi-permanent tient moins
// longtemps qu'un gainage ou qu'une pose avec rallongement.
export const DELAIS_RELANCE_DEFAUT: Record<TypePose, number> = {
  VSP: 21,
  GAINAGE: 24,
  GEL_X: 24,
  POP_IT: 28,
};

export type ReglagesRappels = {
  actifs: boolean;
  delais: Record<TypePose, number>;
};

export async function reglagesRappels(): Promise<ReglagesRappels> {
  const techniques = Object.keys(DELAIS_RELANCE_DEFAUT) as TypePose[];
  const cles = [CLE_RAPPELS_ACTIFS, ...techniques.map(cleRelance)];
  const lignes = await prisma.parametre.findMany({ where: { cle: { in: cles } } });
  const valeur = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur;

  const delais = { ...DELAIS_RELANCE_DEFAUT };
  for (const technique of techniques) {
    const jours = Number(valeur(cleRelance(technique)));
    if (Number.isInteger(jours) && jours > 0) delais[technique] = jours;
  }

  return { actifs: valeur(CLE_RAPPELS_ACTIFS) === "1", delais };
}

export function cleRelance(technique: TypePose): string {
  return `relance_${technique}`;
}

const MONTANT_PAR_DEFAUT = 1500; // 15 € (CGV)

export type ReglagesAcompte = {
  lien: string | null;
  montantCents: number;
};

export async function reglagesAcompte(): Promise<ReglagesAcompte> {
  const lignes = await prisma.parametre.findMany({
    where: { cle: { in: [CLE_LIEN_ACOMPTE, CLE_MONTANT_ACOMPTE] } },
  });
  const valeur = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur;

  const montant = Number(valeur(CLE_MONTANT_ACOMPTE));
  return {
    lien: valeur(CLE_LIEN_ACOMPTE) || null,
    montantCents: Number.isFinite(montant) && montant > 0 ? montant : MONTANT_PAR_DEFAUT,
  };
}

// Lots actifs et cadence de la roue, tels que la gérante les a réglés.
export async function reglagesRoue(): Promise<{ lots: LotPublic[]; posesParTour: number }> {
  const [lots, parametre] = await Promise.all([
    prisma.lotFidelite.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
    prisma.parametre.findUnique({ where: { cle: CLE_POSES_PAR_TOUR } }),
  ]);

  const poses = Number(parametre?.valeur);
  return {
    lots: lots.map((lot) => ({
      id: lot.id,
      libelle: lot.libelle,
      texteSurRoue: lot.texteSurRoue,
      chance: lot.chance,
      couleur: lot.couleur,
      aRetirerAuSalon: lot.aRetirerAuSalon,
    })),
    posesParTour: Number.isInteger(poses) && poses > 0 ? poses : POSES_PAR_TOUR_DEFAUT,
  };
}

export async function enregistrerParametre(cle: string, valeur: string): Promise<void> {
  if (!valeur) {
    await prisma.parametre.deleteMany({ where: { cle } });
    return;
  }
  await prisma.parametre.upsert({
    where: { cle },
    update: { valeur },
    create: { cle, valeur },
  });
}

// Seuls les liens de paiement SumUp sont acceptés : le lien part dans un
// e-mail au nom de Zélia, il ne doit pas pouvoir pointer ailleurs.
export function lienSumUpValide(url: string): boolean {
  try {
    const analysee = new URL(url);
    return (
      analysee.protocol === "https:" &&
      (analysee.hostname === "sumup.com" ||
        analysee.hostname.endsWith(".sumup.com") ||
        analysee.hostname === "pay.sumup.com")
    );
  } catch {
    return false;
  }
}
