"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { listeAttenteSchema } from "@/lib/validations";

export type EtatListeAttente = { ok?: boolean; message?: string };

export async function rejoindreListeAttente(
  _etatPrecedent: EtatListeAttente,
  formData: FormData
): Promise<EtatListeAttente> {
  const analyse = listeAttenteSchema.safeParse({
    prenom: formData.get("prenom"),
    email: formData.get("email"),
    telephone: formData.get("telephone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.listeAttente.create({ data: analyse.data });
  revalidatePath("/admin");

  return { ok: true, message: "C'est noté — je vous préviens dès qu'une place se libère 🤍" };
}

export async function supprimerListeAttente(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.listeAttente.delete({ where: { id } });
  revalidatePath("/admin");
}
