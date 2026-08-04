import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ouvrirSessionCliente } from "@/lib/cliente-auth";
import { urlSite } from "@/lib/site";

// Une route (et non une page) : seul ce contexte autorise la pose du cookie
// de session.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jeton: string }> }
): Promise<NextResponse> {
  const { jeton } = await params;

  // Consommation atomique : un lien intercepté ou rejoué ne rouvre pas de session.
  const consomme = await prisma.jetonConnexion.updateMany({
    where: { jeton, utiliseLe: null, expireLe: { gt: new Date() } },
    data: { utiliseLe: new Date() },
  });

  if (consomme.count !== 1) {
    return NextResponse.redirect(`${urlSite()}/mon-espace?lien=expire`);
  }

  const ligne = await prisma.jetonConnexion.findUnique({
    where: { jeton },
    select: { clienteId: true },
  });
  if (!ligne) {
    return NextResponse.redirect(`${urlSite()}/mon-espace?lien=expire`);
  }

  await ouvrirSessionCliente(ligne.clienteId);
  return NextResponse.redirect(`${urlSite()}/mon-espace`);
}
