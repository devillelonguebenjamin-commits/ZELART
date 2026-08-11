import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { optionsBlob, stockageConfigure } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Photo d'un modèle de press-on.
//
// Une collection se choisit à l'œil : un nom de set ne dit rien de ce qu'on
// reçoit, et une cliente qui commande à l'aveugle est une cliente déçue. Le
// catalogue portait déjà un champ `photoUrl`, mais rien ne permettait de le
// remplir — il restait vide en pratique.
//
// Même trajet que la galerie : compression dans le navigateur, dépôt sur Vercel
// Blob, l'adresse seule est conservée en base.

const TAILLE_MAX = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }
  if (!stockageConfigure()) {
    return NextResponse.json({ error: "Stockage des photos non configuré." }, { status: 500 });
  }

  const donnees = await request.formData();
  const modeleId = String(donnees.get("modeleId") ?? "");
  const modele = await prisma.modelePressOn.findUnique({
    where: { id: modeleId },
    select: { id: true, nom: true },
  });
  if (!modele) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });

  const fichier = donnees.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ error: "Aucune image reçue." }, { status: 400 });
  }
  if (!fichier.type.startsWith("image/")) {
    return NextResponse.json({ error: "Ce fichier n'est pas une image." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json({ error: "Image trop lourde après compression." }, { status: 400 });
  }

  try {
    const base = modele.nom.replace(/[^a-zA-Z0-9._-]/g, "_") || "modele";
    const blob = await put(`press-on/${base}.jpg`, fichier, {
      access: "public",
      addRandomSuffix: true,
      contentType: fichier.type,
      ...optionsBlob(),
    });

    await prisma.modelePressOn.update({
      where: { id: modele.id },
      data: { photoUrl: blob.url },
    });

    revalidatePath("/admin/press-on");
    revalidatePath("/press-on");
    return NextResponse.json({ url: blob.url });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Envoi refusé.";
    console.error("Photo de modèle press-on échouée", erreur);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
