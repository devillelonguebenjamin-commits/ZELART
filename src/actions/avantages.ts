"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";

// Zélia coche l'avantage au moment où elle l'applique. Sans cette étape, une
// cliente pourrait présenter le même code à chaque venue.
export async function marquerAvantageUtilise(id: string, utilise: boolean): Promise<void> {
  await exigerAdmin();
  await prisma.avantageParrainage.update({
    where: { id },
    data: { utiliseLe: utilise ? new Date() : null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/parrainage");
}

/**
 * Retire un avantage accordé à tort.
 *
 * Le cas qui l'a rendu nécessaire : une venue validée par erreur sur un
 * rendez-vous à venir fait franchir un palier à la marraine, et lui accorde une
 * prestation offerte. Annuler la validation fait redescendre le palier, qui se
 * recalcule à partir des venues réelles, mais pas l'avantage : celui-ci est
 * conservé exprès, parce qu'un avantage se consomme et qu'on ne reprend pas ce
 * qui a été honoré.
 *
 * D'où la restriction : **seul un avantage non utilisé se retire**. Une fois la
 * pose offerte réalisée, il n'y a plus rien à annuler, il y a une histoire à
 * garder.
 */
export async function retirerAvantage(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.avantageParrainage.deleteMany({ where: { id, utiliseLe: null } });
  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/parrainage");
}
