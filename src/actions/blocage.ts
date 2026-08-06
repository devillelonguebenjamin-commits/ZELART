"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";

export type EtatBlocage = { ok?: boolean; message?: string };

export async function bloquerCliente(
  _etatPrecedent: EtatBlocage,
  formData: FormData
): Promise<EtatBlocage> {
  await exigerAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 300);
  if (!email) return { ok: false, message: "Indiquez l'adresse e-mail de la cliente à bloquer." };

  const cliente = await prisma.cliente.findUnique({ where: { email } });
  if (!cliente) {
    return {
      ok: false,
      message: "Aucune cliente à cette adresse. Vérifiez l'orthographe dans l'onglet Clientes.",
    };
  }
  if (cliente.bloqueeLe) {
    return { ok: false, message: `${cliente.prenom} ${cliente.nom} est déjà bloquée.` };
  }

  await prisma.cliente.update({
    where: { id: cliente.id },
    data: { bloqueeLe: new Date(), motifBlocage: motif || null },
  });

  revalidatePath("/admin/bouffonnes");
  revalidatePath("/admin/clientes");

  // Les rendez-vous déjà pris ne sont pas annulés d'office : ce serait
  // irréversible, et Zélia peut vouloir honorer celui de la semaine avant de
  // fermer la porte. Ils sont donc signalés, à elle de trancher.
  const aVenir = await prisma.rendezVous.count({
    where: { clienteId: cliente.id, statut: { not: "ANNULE" }, debut: { gt: new Date() } },
  });

  return {
    ok: true,
    message:
      `${cliente.prenom} ${cliente.nom} ne peut plus réserver ni commander de press-on.` +
      (aVenir > 0
        ? ` Attention : ${aVenir} rendez-vous à venir n'${aVenir > 1 ? "ont" : "a"} pas été annulé${aVenir > 1 ? "s" : ""} — faites-le depuis l'agenda si besoin.`
        : ""),
  };
}

export async function debloquerCliente(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.cliente.update({
    where: { id },
    data: { bloqueeLe: null, motifBlocage: null },
  });
  revalidatePath("/admin/bouffonnes");
  revalidatePath("/admin/clientes");
}
