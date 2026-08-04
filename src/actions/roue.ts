"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { codeRecompense, POSES_PAR_TOUR, tirerLot, toursDisponibles } from "@/lib/roue";
import type { LotRoue } from "@/generated/prisma/client";

export type ResultatRoue =
  | { ok: true; lot: LotRoue; code: string }
  | { ok: false; message: string };

export async function lancerRoue(): Promise<ResultatRoue> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour lancer la roue." };
  }

  const lot = tirerLot();

  try {
    // Sérialisable : deux clics simultanés ne peuvent pas produire deux lots
    // pour une même jauge.
    const code = await prisma.$transaction(
      async (tx) => {
        const [posesRealisees, toursJoues] = await Promise.all([
          tx.rendezVous.count({ where: { clienteId, statut: "TERMINE" } }),
          tx.recompense.count({ where: { clienteId } }),
        ]);

        if (toursDisponibles(posesRealisees, toursJoues) < 1) {
          throw new Error("JAUGE_INCOMPLETE");
        }

        const recompense = await tx.recompense.create({
          data: { clienteId, lot: lot.id, code: codeRecompense() },
        });
        return recompense.code;
      },
      { isolationLevel: "Serializable" }
    );

    revalidatePath("/mon-espace");
    return { ok: true, lot: lot.id, code };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.message === "JAUGE_INCOMPLETE") {
      return {
        ok: false,
        message: `Votre jauge n'est pas encore pleine — il faut ${POSES_PAR_TOUR} poses réalisées.`,
      };
    }
    console.error("Échec du lancement de la roue", erreur);
    return { ok: false, message: "Une erreur est survenue, réessayez." };
  }
}
