import { prisma } from "@/lib/prisma";

export const CLE_LIEN_ACOMPTE = "lienAcompte";
export const CLE_MONTANT_ACOMPTE = "montantAcompteCents";

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
