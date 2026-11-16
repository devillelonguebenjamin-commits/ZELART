import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifierAcompte } from "@/lib/acompte";

// Interrogée toutes les quelques secondes par la page de confirmation, tant que
// la cliente la garde ouverte : dès que SumUp dit « payé », la page bascule sur
// « acompte reçu, en attente de confirmation par Zélia ».
//
// L'identifiant du rendez-vous est impossible à deviner, et la réponse ne dit
// rien d'autre que « réglé ou non ». SumUp n'est interrogé qu'une fois toutes
// les dix secondes au plus par rendez-vous, quel que soit le nombre d'onglets.

const INTERVALLE_MIN_MS = 10_000;

export const dynamic = "force-dynamic";

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const rdv = await prisma.rendezVous.findUnique({
    where: { id },
    select: { acompteRegleLe: true, acompteReference: true, acompteVerifieLe: true, statut: true },
  });
  if (!rdv) return NextResponse.json({ erreur: "introuvable" }, { status: 404 });

  let regle = rdv.acompteRegleLe !== null;
  const recent =
    rdv.acompteVerifieLe && Date.now() - rdv.acompteVerifieLe.getTime() < INTERVALLE_MIN_MS;
  if (!regle && rdv.acompteReference && rdv.statut !== "ANNULE" && !recent) {
    regle = (await verifierAcompte(id)) === "PAID";
  }
  return NextResponse.json({ regle }, { headers: { "Cache-Control": "no-store" } });
}
