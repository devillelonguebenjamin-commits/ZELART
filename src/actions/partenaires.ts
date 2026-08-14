"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { normaliserSlug, SLUGS_RESERVES } from "@/lib/partenaires";

const partenaireSchema = z.object({
  nom: z.string().trim().min(2, "Indiquez le nom de la marque.").max(80, "Ce nom est trop long."),
  categorie: z.string().trim().max(60, "Cette catégorie est trop longue.").default(""),
  description: z.string().trim().max(1200, "Ce texte est trop long.").optional(),
  lienAffilie: z
    .string()
    .trim()
    .url("Le lien doit être une adresse complète, commençant par https://."),
  codePromo: z.string().trim().max(40, "Ce code est trop long.").optional(),
  logoUrl: z.string().trim().url("Le logo doit être une adresse complète.").optional().or(z.literal("")),
});

export type EtatPartenaire = { ok?: boolean; message?: string };

function lire(formData: FormData) {
  return {
    nom: formData.get("nom"),
    categorie: formData.get("categorie") ?? "",
    description: formData.get("description") || undefined,
    lienAffilie: formData.get("lienAffilie"),
    codePromo: formData.get("codePromo") || undefined,
    logoUrl: formData.get("logoUrl") || "",
  };
}

/**
 * Le slug proposé, ou un message expliquant pourquoi il ne convient pas.
 *
 * Deux refus possibles, et ils ne se disent pas de la même façon : une adresse
 * déjà prise par une page du site, et une adresse déjà prise par un autre
 * partenaire.
 */
async function verifierSlug(brut: string, idExclu?: string): Promise<string | { erreur: string }> {
  const slug = normaliserSlug(brut);
  if (slug.length < 2) {
    return { erreur: "L'adresse courte doit comporter au moins deux caractères." };
  }
  if (SLUGS_RESERVES.has(slug)) {
    return { erreur: `L'adresse zelart.fr/${slug} est déjà une page du site. Choisissez-en une autre.` };
  }
  const existant = await prisma.partenaire.findUnique({ where: { slug }, select: { id: true } });
  if (existant && existant.id !== idExclu) {
    return { erreur: `L'adresse zelart.fr/${slug} est déjà utilisée par un autre partenaire.` };
  }
  return slug;
}

export async function creerPartenaire(
  _etatPrecedent: EtatPartenaire,
  formData: FormData
): Promise<EtatPartenaire> {
  await exigerAdmin();

  const analyse = partenaireSchema.safeParse(lire(formData));
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Sans adresse courte saisie, celle-ci se déduit du nom : « INAKA » donne
  // zelart.fr/inaka, ce qui est presque toujours ce qu'on voulait.
  const demande = String(formData.get("slug") ?? "").trim() || analyse.data.nom;
  const slug = await verifierSlug(demande);
  if (typeof slug !== "string") return { ok: false, message: slug.erreur };

  const dernier = await prisma.partenaire.findFirst({ orderBy: { ordre: "desc" } });
  await prisma.partenaire.create({
    data: {
      ...analyse.data,
      description: analyse.data.description ?? null,
      codePromo: analyse.data.codePromo ?? null,
      logoUrl: analyse.data.logoUrl || null,
      slug,
      ordre: (dernier?.ordre ?? -1) + 1,
    },
  });

  revalidatePath("/admin/partenaires");
  revalidatePath("/pro");
  return { ok: true, message: `${analyse.data.nom} ajouté. Le lien court est zelart.fr/${slug}.` };
}

export async function modifierPartenaire(formData: FormData): Promise<void> {
  await exigerAdmin();

  const id = String(formData.get("id") ?? "");
  const analyse = partenaireSchema.safeParse(lire(formData));
  if (!id || !analyse.success) return;

  const slug = await verifierSlug(String(formData.get("slug") ?? ""), id);
  if (typeof slug !== "string") return;

  await prisma.partenaire.update({
    where: { id },
    data: {
      ...analyse.data,
      description: analyse.data.description ?? null,
      codePromo: analyse.data.codePromo ?? null,
      logoUrl: analyse.data.logoUrl || null,
      slug,
      actif: formData.get("actif") === "on",
    },
  });

  revalidatePath("/admin/partenaires");
  revalidatePath("/pro");
}

export async function supprimerPartenaire(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.partenaire.delete({ where: { id } });
  revalidatePath("/admin/partenaires");
  revalidatePath("/pro");
}
