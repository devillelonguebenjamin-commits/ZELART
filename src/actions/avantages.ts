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
}
