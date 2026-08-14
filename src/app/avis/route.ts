import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { lienDemandeAvis } from "@/lib/avis";

export const dynamic = "force-dynamic";

/**
 * zelart.fr/avis, qui mène au formulaire d'avis Google.
 *
 * L'adresse de Google fait plus de cent caractères et contient l'identifiant de
 * l'établissement. Dans un SMS, elle mange deux segments à elle seule et se
 * lit comme une adresse suspecte ; sur une carte glissée dans un sac, elle ne
 * se recopie pas. Celle-ci se dit et se retient.
 *
 * `notFound()` tant qu'aucun établissement Google n'est relié : mieux vaut une
 * page 404 franche qu'une redirection vers nulle part.
 */
export async function GET(): Promise<NextResponse> {
  const lien = await lienDemandeAvis();
  if (!lien) notFound();

  return NextResponse.redirect(lien, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
