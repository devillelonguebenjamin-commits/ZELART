import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { optionsBlob, stockageConfigure } from "@/lib/blob";

// Route publique : appelée depuis le formulaire de réservation, avant même que
// la cliente existe. Les garde-fous portent donc sur le contenu lui-même —
// type, poids et nombre d'images par envoi.
export const TAILLE_MAX = 2 * 1024 * 1024;
export const MAX_IMAGES = 3;

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// Les bornes de type, de poids et de nombre valent **par requête** : rien
// n'empêchait d'en enchaîner autant qu'on veut, sur une route sans
// authentification, et de remplir le stockage aux frais de Zélia.
//
// Ce compteur vit en mémoire, donc par instance : sur un hébergement qui en
// démarre plusieurs, la limite réelle est un multiple de celle-ci. C'est un
// garde-fou contre l'abus ordinaire, pas contre un adversaire déterminé — le
// vrai verrou demanderait un compteur partagé.
const FENETRE_MS = 10 * 60 * 1000;
const ENVOIS_MAX = 20;
const compteurs = new Map<string, { debut: number; envois: number }>();

function tropDEnvois(cle: string): boolean {
  const maintenant = Date.now();

  // Purge à la volée : sans elle, la table grandirait indéfiniment.
  for (const [ip, compte] of compteurs) {
    if (maintenant - compte.debut > FENETRE_MS) compteurs.delete(ip);
  }

  const compte = compteurs.get(cle);
  if (!compte || maintenant - compte.debut > FENETRE_MS) {
    compteurs.set(cle, { debut: maintenant, envois: 1 });
    return false;
  }
  compte.envois++;
  return compte.envois > ENVOIS_MAX;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Avant toute autre chose : un flot abusif ne doit rien coûter, pas même la
  // lecture du corps de la requête.
  const origine =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnue";
  if (tropDEnvois(origine)) {
    return NextResponse.json(
      { error: "Trop d'envois d'images. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

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
