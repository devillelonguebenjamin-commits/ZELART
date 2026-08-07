"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { nouveauCodeUnique } from "@/lib/cliente-auth";

const clienteSchema = z.object({
  prenom: z.string().trim().min(1, "Indiquez le prénom.").max(60, "Prénom trop long."),
  nom: z.string().trim().min(1, "Indiquez le nom.").max(60, "Nom trop long."),
  email: z.string().trim().toLowerCase().max(120).email("Adresse e-mail invalide."),
  telephone: z
    .string()
    .trim()
    .regex(/^(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/, "Numéro de téléphone invalide."),
  notes: z.string().trim().max(2000).optional(),
});

export type EtatCliente = { ok?: boolean; message?: string };

export async function creerCliente(
  _etatPrecedent: EtatCliente,
  formData: FormData
): Promise<EtatCliente> {
  await exigerAdmin();

  const analyse = clienteSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
    notes: formData.get("notes") ?? undefined,
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existante = await prisma.cliente.findUnique({
    where: { email: analyse.data.email },
    select: { prenom: true, nom: true },
  });
  if (existante) {
    return {
      ok: false,
      message: `Cette adresse est déjà celle de ${existante.prenom} ${existante.nom}.`,
    };
  }

  const accord = formData.get("consentementMarketing") === "on";
  await prisma.cliente.create({
    data: {
      ...analyse.data,
      notes: analyse.data.notes || null,
      codeParrainage: await nouveauCodeUnique(prisma),
      consentementMarketing: accord,
      consentementLe: accord ? new Date() : null,
    },
  });

  revalidatePath("/admin/clientes");
  return { ok: true, message: `${analyse.data.prenom} ${analyse.data.nom} a été ajoutée.` };
}

// Permet d'enregistrer un accord donné de vive voix, ou de le retirer à la
// demande de la cliente.
export async function basculerConsentement(clienteId: string, accorder: boolean): Promise<void> {
  await exigerAdmin();
  await prisma.cliente.update({
    where: { id: clienteId },
    data: accorder
      ? { consentementMarketing: true, consentementLe: new Date(), desabonneLe: null }
      : { consentementMarketing: false, desabonneLe: new Date() },
  });
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/clientes");
}

// Commentaire libre, modifiable depuis la liste comme depuis la fiche.
export async function enregistrerCommentaire(
  clienteId: string,
  texte: string
): Promise<void> {
  await exigerAdmin();
  await prisma.cliente.update({
    where: { id: clienteId },
    data: { notes: texte.trim().slice(0, 2000) || null },
  });
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);
}

export async function marquerRecompenseUtilisee(
  recompenseId: string,
  utilisee: boolean
): Promise<void> {
  await exigerAdmin();
  const recompense = await prisma.recompense.update({
    where: { id: recompenseId },
    data: { utiliseLe: utilisee ? new Date() : null },
  });
  revalidatePath(`/admin/clientes/${recompense.clienteId}`);
}

// Droit à l'effacement : supprime la cliente et tout son historique.
export async function supprimerCliente(clienteId: string): Promise<void> {
  await exigerAdmin();
  await prisma.cliente.delete({ where: { id: clienteId } });
  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}
