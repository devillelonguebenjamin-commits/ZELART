import { prisma } from "@/lib/prisma";

// Les liens courts de partenariat, du type zelart.fr/inaka.
//
// Pourquoi ne pas donner directement le lien d'affiliation : il est long, il
// porte des paramètres de suivi, il ne se dicte pas dans une story et il ne
// s'imprime pas sur une carte. Surtout, il ne se compte pas. Un lien qui passe
// par le site donne à Zélia son propre chiffre, le seul que le partenaire ne
// fournit pas et ne peut pas contredire, et il survit au jour où la marque
// change d'adresse : une ligne à corriger, et tout ce qui a été imprimé
// continue de fonctionner.

/**
 * Ce qu'un slug ne peut pas être.
 *
 * La redirection vit à la racine du site pour rester courte, donc elle voisine
 * avec les vraies pages. Next.js sert toujours la page réelle en priorité, mais
 * un slug « reserver » créerait un lien mort que personne ne comprendrait :
 * autant le refuser à la saisie.
 */
export const SLUGS_RESERVES = new Set([
  "admin",
  "api",
  "avis",
  "confidentialite",
  "confirmation",
  "desabonnement",
  "favicon.ico",
  "mentions-legales",
  "mon-espace",
  "opengraph-image",
  "partenariats",
  "press-on",
  "prestations",
  "pro",
  "questions",
  "reserver",
  "robots.txt",
  "sitemap.xml",
]);

/** "INAKA Pro !" → "inaka-pro" */
export function normaliserSlug(brut: string): string {
  return brut
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export type PartenairePublic = {
  id: string;
  slug: string;
  nom: string;
  categorie: string;
  description: string | null;
  codePromo: string | null;
  logoUrl: string | null;
};

export async function partenairesPublics(): Promise<PartenairePublic[]> {
  return prisma.partenaire.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    select: {
      id: true,
      slug: true,
      nom: true,
      categorie: true,
      description: true,
      codePromo: true,
      logoUrl: true,
    },
  });
}

/**
 * Compte le clic et rend l'adresse vers laquelle rediriger, ou `null` si le
 * slug ne correspond à aucun partenaire actif.
 *
 * Le lien du partenaire est renvoyé **tel quel**, sans paramètre ajouté. La
 * tentation serait d'y coller des UTM, mais un lien d'affiliation est souvent
 * lui-même un redirecteur : un paramètre de trop peut casser l'attribution,
 * c'est-à-dire faire perdre la commission. Le comptage se fait de ce côté-ci,
 * là où rien ne risque d'être abîmé.
 */
export async function suivreClic(slug: string): Promise<string | null> {
  const partenaire = await prisma.partenaire.findFirst({
    where: { slug, actif: true },
    select: { id: true, lienAffilie: true },
  });
  if (!partenaire) return null;

  // Incrément atomique : deux clics simultanés en valent deux.
  await prisma.partenaire.update({
    where: { id: partenaire.id },
    data: { clics: { increment: 1 }, dernierClic: new Date() },
  });

  return partenaire.lienAffilie;
}
