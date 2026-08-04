"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { CLE_POSES_PAR_TOUR, enregistrerParametre } from "@/lib/parametres";

const lotSchema = z.object({
  libelle: z.string().trim().min(3, "Le libellé est trop court.").max(120, "Le libellé est trop long."),
  texteSurRoue: z
    .string()
    .trim()
    .min(1, "Indiquez le texte affiché sur la roue.")
    .max(16, "Le texte sur la roue doit rester très court (16 caractères)."),
  chance: z.coerce.number().int().min(0, "La chance ne peut pas être négative.").max(1000),
  couleur: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "La couleur doit être au format #rrggbb."),
});

export type EtatLot = { ok?: boolean; message?: string };

export async function creerLot(_etatPrecedent: EtatLot, formData: FormData): Promise<EtatLot> {
  await exigerAdmin();

  const analyse = lotSchema.safeParse({
    libelle: formData.get("libelle"),
    texteSurRoue: formData.get("texteSurRoue"),
    chance: formData.get("chance"),
    couleur: formData.get("couleur"),
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const dernier = await prisma.lotFidelite.findFirst({ orderBy: { ordre: "desc" } });
  await prisma.lotFidelite.create({
    data: {
      ...analyse.data,
      aRetirerAuSalon: formData.get("aRetirerAuSalon") === "on",
      ordre: (dernier?.ordre ?? -1) + 1,
    },
  });

  revalidatePath("/admin/roue");
  revalidatePath("/mon-espace");
  return { ok: true, message: `Lot « ${analyse.data.libelle} » ajouté.` };
}

export async function modifierLot(formData: FormData): Promise<void> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const analyse = lotSchema.safeParse({
    libelle: formData.get("libelle"),
    texteSurRoue: formData.get("texteSurRoue"),
    chance: formData.get("chance"),
    couleur: formData.get("couleur"),
  });
  if (!id || !analyse.success) return;

  await prisma.lotFidelite.update({
    where: { id },
    data: {
      ...analyse.data,
      aRetirerAuSalon: formData.get("aRetirerAuSalon") === "on",
      actif: formData.get("actif") === "on",
    },
  });

  revalidatePath("/admin/roue");
  revalidatePath("/mon-espace");
}

export async function supprimerLot(id: string): Promise<void> {
  await exigerAdmin();

  // Un lot déjà gagné garde sa trace : on le désactive plutôt que de rompre
  // l'historique des récompenses.
  const gains = await prisma.recompense.count({ where: { lotId: id } });
  if (gains > 0) {
    await prisma.lotFidelite.update({ where: { id }, data: { actif: false } });
  } else {
    await prisma.lotFidelite.delete({ where: { id } });
  }

  revalidatePath("/admin/roue");
  revalidatePath("/mon-espace");
}

export async function enregistrerPosesParTour(formData: FormData): Promise<void> {
  await exigerAdmin();
  const poses = Number(formData.get("posesParTour"));
  if (!Number.isInteger(poses) || poses < 1 || poses > 20) return;

  await enregistrerParametre(CLE_POSES_PAR_TOUR, String(poses));
  revalidatePath("/admin/roue");
  revalidatePath("/mon-espace");
}
