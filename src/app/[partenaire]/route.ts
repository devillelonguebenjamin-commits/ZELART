import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { suivreClic } from "@/lib/partenaires";

export const dynamic = "force-dynamic";

/**
 * Les liens courts de partenariat : zelart.fr/inaka.
 *
 * À la racine du site, pour que le lien se dise à l'oral. Next.js sert les
 * vraies pages en priorité, donc /prestations ou /questions ne passent jamais
 * par ici ; ne restent que les adresses inconnues, qui reçoivent la page 404
 * habituelle.
 *
 * `noindex, nofollow` sur la réponse : un lien rémunéré ne doit pas transmettre
 * de popularité au partenaire, et cette adresse n'a rien à faire dans les
 * résultats de recherche. C'est la règle de Google sur les liens sponsorisés,
 * et l'ignorer expose le site, pas le partenaire.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ partenaire: string }> }
): Promise<NextResponse> {
  const { partenaire } = await params;
  const destination = await suivreClic(partenaire.toLowerCase());
  if (!destination) notFound();

  return NextResponse.redirect(destination, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
