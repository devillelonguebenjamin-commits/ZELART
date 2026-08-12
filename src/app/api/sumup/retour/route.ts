import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifierAcompte } from "@/lib/acompte";

// Sonnette de SumUp : « quelque chose a bougé sur un paiement ».
//
// Cette adresse est publique et **rien de ce qu'elle reçoit n'est cru**. La
// spécification de SumUp ne documente ni le format du message, ni aucune
// signature : un inconnu pourrait donc poster ici « la référence untel est
// payée » et faire valider un rendez-vous sans avoir rien réglé.
//
// D'où le fonctionnement retenu : du corps reçu, on ne retient **que la
// référence**, et uniquement pour savoir qui aller interroger. L'état, lui, est
// redemandé à l'API SumUp, qui reste la seule autorité. Le pire qu'un plaisantin
// puisse obtenir, c'est que le site pose une question dont il connaît déjà la
// réponse.
//
// Sans référence exploitable, on repasse sur tous les acomptes en attente : il y
// en a peu, et rater un règlement coûte plus cher qu'un appel de trop.

export async function POST(requete: Request): Promise<NextResponse> {
  let reference: string | null = null;
  try {
    const corps = (await requete.json()) as { checkout_reference?: unknown; id?: unknown };
    if (typeof corps?.checkout_reference === "string") {
      reference = corps.checkout_reference.slice(0, 120);
    } else if (typeof corps?.id === "string") {
      const parId = await prisma.rendezVous.findFirst({
        where: { acompteCheckoutId: corps.id.slice(0, 120) },
        select: { acompteReference: true },
      });
      reference = parId?.acompteReference ?? null;
    }
  } catch {
    // Corps illisible : ce n'est pas une erreur de notre côté, et SumUp n'a pas
    // à être invité à réessayer.
  }

  const concernes = reference
    ? await prisma.rendezVous.findMany({
        where: { acompteReference: reference, acompteRegleLe: null },
        select: { id: true },
      })
    : await prisma.rendezVous.findMany({
        where: {
          statut: { not: "ANNULE" },
          acompteReference: { not: null },
          acompteRegleLe: null,
          debut: { gt: new Date() },
        },
        select: { id: true },
        take: 50,
      });

  for (const rdv of concernes) await verifierAcompte(rdv.id);

  // Toujours 200 : un échec ferait rejouer la notification en boucle sans que
  // cela change quoi que ce soit, l'état venant de l'API et non du message.
  return NextResponse.json({ recu: true });
}
