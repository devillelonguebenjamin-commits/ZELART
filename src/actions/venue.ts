"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { recompenserMarraine } from "@/lib/parrainage-email";

export type EtatVenue = { ok?: boolean; message?: string };

/**
 * Confirme qu'une cliente est bien venue, avec un mot sur la visite.
 *
 * C'est le même geste que le bouton « Terminé » de l'agenda, enrichi de deux
 * choses : le commentaire, et surtout le retour de ce que la validation a
 * déclenché chez la marraine — sinon Zélia offre une manucure sans le savoir.
 */
export async function validerVenue(
  rendezVousId: string,
  _etatPrecedent: EtatVenue,
  formData: FormData
): Promise<EtatVenue> {
  await exigerAdmin();

  const commentaire = String(formData.get("commentaire") ?? "").trim().slice(0, 1000);

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: { statut: true, clienteId: true, cliente: { select: { prenom: true } } },
  });
  if (!rendezVous) return { ok: false, message: "Ce rendez-vous est introuvable." };

  // Déjà validé : on met à jour le commentaire sans repasser par le
  // parrainage, qui a déjà été honoré.
  const dejaValide = rendezVous.statut === "TERMINE";

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { statut: "TERMINE", commentaireVisite: commentaire || null },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${rendezVous.clienteId}`);

  if (dejaValide) {
    return { ok: true, message: "Commentaire enregistré." };
  }

  const deblocage = await recompenserMarraine(rendezVous.clienteId);
  const base = `Venue de ${rendezVous.cliente.prenom} confirmée.`;

  if (!deblocage) return { ok: true, message: base };

  return {
    ok: true,
    message:
      `${base} 🎉 ${deblocage.marraine} passe ${deblocage.palier} et débloque : ` +
      `${deblocage.avantages.join(", ")}. Elle vient d'en être prévenue par e-mail.`,
  };
}
