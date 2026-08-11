import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { optionsBlob, stockageConfigure } from "@/lib/blob";
import { enregistrerParametre } from "@/lib/parametres";
import { clePhotoNiveau, NIVEAUX, type Niveau } from "@/lib/nail-art";
import { revalidatePath } from "next/cache";

// Photo d'exemple d'un niveau de nail art.
//
// Même trajet que la galerie et les modèles de press-on : compression dans le
// navigateur, dépôt sur Vercel Blob, seule l'adresse est conservée — ici dans
// les paramètres, trois lignes suffisant à décrire trois niveaux.

const TAILLE_MAX = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }
  if (!stockageConfigure()) {
    return NextResponse.json({ error: "Stockage des photos non configuré." }, { status: 500 });
  }

  const donnees = await request.formData();
  const niveau = Number(donnees.get("niveau"));
  if (!NIVEAUX.includes(niveau as Niveau)) {
    return NextResponse.json({ error: "Niveau inconnu." }, { status: 400 });
  }

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
    const blob = await put(`nail-art/niveau-${niveau}.jpg`, fichier, {
      access: "public",
      addRandomSuffix: true,
      contentType: fichier.type,
      ...optionsBlob(),
    });

    await enregistrerParametre(clePhotoNiveau(niveau as Niveau), blob.url);

    revalidatePath("/admin/prestations");
    revalidatePath("/prestations");
    revalidatePath("/reserver");
    return NextResponse.json({ url: blob.url });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Envoi refusé.";
    console.error("Photo de niveau de nail art échouée", erreur);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
