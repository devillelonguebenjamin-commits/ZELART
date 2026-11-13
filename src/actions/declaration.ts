"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { texteDeclaration, VERSION_DECLARATION } from "@/lib/declaration-sante-texte";

/**
 * Zélia a fait signer le formulaire papier au salon : on l'inscrit au registre.
 * Le papier signé reste la preuve ; cette ligne dit qu'il existe, quand et pour
 * quel rendez-vous, et rend la fiche du rendez-vous à jour.
 */
export async function enregistrerSignatureSalon(rendezVousId: string): Promise<void> {
  await exigerAdmin();
  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rdv) return;

  await prisma.$transaction([
    prisma.declarationSante.create({
      data: {
        rendezVousId: rdv.id,
        clienteId: rdv.clienteId,
        prenom: rdv.cliente.prenom,
        nom: rdv.cliente.nom,
        email: rdv.cliente.email,
        telephone: rdv.cliente.telephone,
        rendezVousLe: rdv.debut,
        prestations: rdv.lignes.map((l) => l.prestation.nom).join(" + "),
        noteCliente: rdv.noteCliente,
        version: VERSION_DECLARATION,
        texte: texteDeclaration(),
        majeure: true,
        source: "AU_SALON",
      },
    }),
    prisma.rendezVous.update({ where: { id: rdv.id }, data: { consentementSante: true } }),
  ]);
  revalidatePath(`/admin/declaration/${rdv.id}`);
  revalidatePath("/admin");
}
