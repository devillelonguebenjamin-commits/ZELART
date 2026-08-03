"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { corpsHtml } from "@/lib/campagne";
import { segmentValide } from "@/lib/segments";

const campagneSchema = z.object({
  objet: z.string().trim().min(3, "L'objet est trop court.").max(150, "L'objet est trop long."),
  contenu: z.string().trim().min(10, "Le message est trop court.").max(5000, "Le message est trop long."),
  segment: z.string().refine(segmentValide, "Choisissez un groupe de destinataires."),
});

export type EtatCampagne = { erreur?: string };

export async function creerCampagne(
  _etatPrecedent: EtatCampagne,
  formData: FormData
): Promise<EtatCampagne> {
  await exigerAdmin();

  const analyse = campagneSchema.safeParse({
    objet: formData.get("objet"),
    contenu: formData.get("contenu"),
    segment: formData.get("segment"),
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const campagne = await prisma.campagne.create({ data: analyse.data });
  revalidatePath("/admin/campagnes");
  redirect(`/admin/campagnes/${campagne.id}`);
}

export async function supprimerCampagne(id: string): Promise<void> {
  await exigerAdmin();
  const campagne = await prisma.campagne.findUnique({ where: { id }, select: { statut: true } });
  // Une campagne déjà partie garde sa trace : on ne supprime que les brouillons.
  if (campagne?.statut !== "BROUILLON") return;
  await prisma.campagne.delete({ where: { id } });
  revalidatePath("/admin/campagnes");
  redirect("/admin/campagnes");
}

export type EtatTest = { ok?: boolean; message?: string };

export async function envoyerCampagneTest(
  id: string,
  _etatPrecedent: EtatTest,
  formData: FormData
): Promise<EtatTest> {
  await exigerAdmin();

  const destinataire = z.string().trim().email().safeParse(formData.get("destinataire"));
  if (!destinataire.success) return { ok: false, message: "Adresse e-mail invalide." };

  const campagne = await prisma.campagne.findUnique({ where: { id } });
  if (!campagne) return { ok: false, message: "Campagne introuvable." };

  const resultat = await envoyerEmail(
    destinataire.data,
    `[Test] ${campagne.objet}`,
    corpsHtml(campagne.contenu, null)
  );

  return resultat.ok
    ? { ok: true, message: `Test envoyé à ${destinataire.data}.` }
    : { ok: false, message: resultat.erreur };
}

// Désinscription depuis le lien présent dans chaque e-mail : aucune session
// requise, le jeton fait foi.
export async function desabonner(jeton: string): Promise<void> {
  await prisma.cliente.updateMany({
    where: { jetonDesabonnement: jeton, desabonneLe: null },
    data: { desabonneLe: new Date(), consentementMarketing: false },
  });
  revalidatePath(`/desabonnement/${jeton}`);
}
