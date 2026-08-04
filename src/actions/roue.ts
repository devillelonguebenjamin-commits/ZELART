"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { exigerAdmin } from "@/lib/auth";
import { reglagesRoue } from "@/lib/parametres";
import { codeRecompense, tirerLot, toursDisponibles } from "@/lib/roue";

export type ResultatRoue =
  | { ok: true; lotId: string; code: string }
  | { ok: false; message: string };

export async function lancerRoue(): Promise<ResultatRoue> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour lancer la roue." };
  }

  const { lots, posesParTour } = await reglagesRoue();
  const lot = tirerLot(lots);
  if (!lot) {
    return { ok: false, message: "La roue n'est pas disponible pour le moment." };
  }

  try {
    // Sérialisable : deux clics simultanés ne peuvent pas produire deux lots
    // pour une même jauge.
    const code = await prisma.$transaction(
      async (tx) => {
        const [posesRealisees, toursJoues] = await Promise.all([
          tx.rendezVous.count({ where: { clienteId, statut: "TERMINE" } }),
          tx.recompense.count({ where: { clienteId } }),
        ]);

        if (toursDisponibles(posesRealisees, toursJoues, posesParTour) < 1) {
          throw new Error("JAUGE_INCOMPLETE");
        }

        const recompense = await tx.recompense.create({
          data: { clienteId, lotId: lot.id, code: codeRecompense() },
        });
        return recompense.code;
      },
      { isolationLevel: "Serializable" }
    );

    revalidatePath("/mon-espace");
    return { ok: true, lotId: lot.id, code };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.message === "JAUGE_INCOMPLETE") {
      return {
        ok: false,
        message: `Votre jauge n'est pas encore pleine — il faut ${posesParTour} poses réalisées.`,
      };
    }
    console.error("Échec du lancement de la roue", erreur);
    return { ok: false, message: "Une erreur est survenue, réessayez." };
  }
}

// Tirage d'essai pour la gérante : aucun gain enregistré, aucune jauge consommée.
export async function testerRoue(): Promise<ResultatRoue> {
  await exigerAdmin();

  const { lots } = await reglagesRoue();
  const lot = tirerLot(lots);
  if (!lot) {
    return { ok: false, message: "Aucun lot actif : ajoutez-en au moins un." };
  }
  return { ok: true, lotId: lot.id, code: "ESSAI" };
}
