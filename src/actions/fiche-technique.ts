"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { optionsBlob } from "@/lib/blob";

export async function enregistrerFicheTechnique(
  rendezVousId: string,
  formData: FormData
): Promise<void> {
  await exigerAdmin();

  const texte = (cle: string, max: number) =>
    String(formData.get(cle) ?? "").trim().slice(0, max) || null;

  const rdv = await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: {
      forme: texte("forme", 60),
      longueur: texte("longueur", 60),
      produits: texte("produits", 500),
      noteTechnique: texte("noteTechnique", 1000),
    },
    select: { clienteId: true },
  });

  revalidatePath(`/admin/clientes/${rdv.clienteId}`);
  revalidatePath("/admin");
}

// Une réalisation publiée rejoint la galerie publique du site.
export async function basculerPublicationRealisation(
  realisationId: string,
  publier: boolean
): Promise<void> {
  await exigerAdmin();

  const realisation = await prisma.realisation.update({
    where: { id: realisationId },
    data: { publiee: publier },
    select: { rendezVous: { select: { clienteId: true } } },
  });

  revalidatePath(`/admin/clientes/${realisation.rendezVous.clienteId}`);
  revalidatePath("/");
}

export async function supprimerRealisation(realisationId: string): Promise<void> {
  await exigerAdmin();

  const realisation = await prisma.realisation.delete({
    where: { id: realisationId },
    select: { url: true, rendezVous: { select: { clienteId: true } } },
  });

  try {
    await del(realisation.url, optionsBlob());
  } catch (erreur) {
    console.error("Suppression du fichier de réalisation échouée", erreur);
  }

  revalidatePath(`/admin/clientes/${realisation.rendezVous.clienteId}`);
  revalidatePath("/");
}
