import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { jetonBlob } from "@/lib/blob";

// Délivre au navigateur un jeton d'envoi à usage unique, après vérification
// que la session admin est bien ouverte. L'image transite ensuite directement
// du navigateur vers le stockage, sans passer par le serveur — ce qui évite
// la limite de 1 Mo des Server Actions.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const resultat = await handleUpload({
      body,
      request,
      token: jetonBlob(),
      onBeforeGenerateToken: async () => {
        if (!(await estAdmin())) throw new Error("Session gérante requise.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // L'enregistrement en base est fait par l'appel à `enregistrerPhoto`
        // depuis le navigateur : ce callback n'est pas joignable en local.
      },
    });
    return NextResponse.json(resultat);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Envoi refusé.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
