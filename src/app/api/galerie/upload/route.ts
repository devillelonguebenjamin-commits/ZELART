import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { optionsBlob, stockageConfigure } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Limite confortable : les images sont compressées côté navigateur avant envoi
// (environ 0,5 Mo), bien en deçà du plafond des fonctions Vercel.
const TAILLE_MAX = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }
  if (!stockageConfigure()) {
    return NextResponse.json({ error: "Stockage des photos non configuré." }, { status: 500 });
  }

  const donnees = await request.formData();
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
    const base = fichier.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "photo";
    const blob = await put(`galerie/${base}.jpg`, fichier, {
      access: "public",
      addRandomSuffix: true,
      contentType: fichier.type,
      ...optionsBlob(),
    });

    await prisma.photo.create({
      data: {
        url: blob.url,
        legende: String(donnees.get("legende") ?? "").slice(0, 200) || null,
      },
    });

    revalidatePath("/admin/galerie");
    revalidatePath("/");
    return NextResponse.json({ url: blob.url });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Envoi refusé.";
    console.error("Ajout de photo échoué", erreur);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
