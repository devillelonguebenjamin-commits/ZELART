import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { optionsBlob, stockageConfigure } from "@/lib/blob";

// Route publique : appelée depuis le formulaire de réservation, avant même que
// la cliente existe. Les garde-fous portent donc sur le contenu lui-même —
// type, poids et nombre d'images par envoi.
export const TAILLE_MAX = 2 * 1024 * 1024;
export const MAX_IMAGES = 3;

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: Request): Promise<NextResponse> {
  if (!stockageConfigure()) {
    return NextResponse.json({ error: "Envoi d'images indisponible." }, { status: 503 });
  }

  const donnees = await request.formData();
  const fichiers = donnees.getAll("fichiers").filter((f): f is File => f instanceof File);

  if (fichiers.length === 0) {
    return NextResponse.json({ error: "Aucune image reçue." }, { status: 400 });
  }
  if (fichiers.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `${MAX_IMAGES} images au maximum.` },
      { status: 400 }
    );
  }
  for (const fichier of fichiers) {
    if (!TYPES_ACCEPTES.includes(fichier.type)) {
      return NextResponse.json({ error: "Format d'image non accepté." }, { status: 400 });
    }
    if (fichier.size > TAILLE_MAX) {
      return NextResponse.json({ error: "Image trop lourde (2 Mo maximum)." }, { status: 400 });
    }
  }

  try {
    const urls = await Promise.all(
      fichiers.map(async (fichier) => {
        const blob = await put(`inspirations/${Date.now()}.jpg`, fichier, {
          access: "public",
          addRandomSuffix: true,
          contentType: fichier.type,
          ...optionsBlob(),
        });
        return blob.url;
      })
    );
    return NextResponse.json({ urls });
  } catch (erreur) {
    console.error("Envoi d'inspiration échoué", erreur);
    return NextResponse.json({ error: "Envoi impossible, réessayez." }, { status: 500 });
  }
}
