import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ouvrirSessionCliente } from "@/lib/cliente-auth";
import { urlSite } from "@/lib/site";

// Le clic sur ce lien prouve que la nouvelle boîte est bien accessible : c'est
// à ce moment seulement que l'adresse de connexion change.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jeton: string }> }
): Promise<NextResponse> {
  const { jeton } = await params;

  // Consommation atomique : un lien rejoué ne rejoue pas le changement.
  const consomme = await prisma.changementEmail.updateMany({
    where: { jeton, utiliseLe: null, expireLe: { gt: new Date() } },
    data: { utiliseLe: new Date() },
  });
  if (consomme.count !== 1) {
    return NextResponse.redirect(`${urlSite()}/mon-espace?email=expire`);
  }

  const demande = await prisma.changementEmail.findUnique({
    where: { jeton },
    select: { clienteId: true, nouvelEmail: true },
  });
  if (!demande) {
    return NextResponse.redirect(`${urlSite()}/mon-espace?email=expire`);
  }

  try {
    await prisma.cliente.update({
      where: { id: demande.clienteId },
      data: { email: demande.nouvelEmail },
    });
  } catch {
    // L'adresse a pu être prise entre la demande et la confirmation.
    return NextResponse.redirect(`${urlSite()}/mon-espace?email=occupee`);
  }

  // La confirmation vaut preuve d'accès à la boîte : on ouvre la session, comme
  // pour un lien de connexion, afin qu'elle retrouve son espace directement.
  await ouvrirSessionCliente(demande.clienteId);
  return NextResponse.redirect(`${urlSite()}/mon-espace?email=ok`);
}
