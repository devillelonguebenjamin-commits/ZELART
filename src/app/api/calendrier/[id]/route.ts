import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererICS } from "@/lib/ics";
import { urlSite } from "@/lib/site";

// Fichier .ics d'un rendez-vous, public comme la page de confirmation
// (identifiant non devinable) : un lien à cliquer, sans connexion à ouvrir.
//
// Seulement une fois Zélia d'accord : une demande n'est pas un rendez-vous, et
// l'inscrire au calendrier de la cliente le lui ferait croire. Le contrôle est
// ici et pas seulement sur les liens — une adresse gardée de côté ou une page
// de confirmation restée ouverte contournerait un affichage conditionnel.
const STATUTS_AU_CALENDRIER = ["CONFIRME", "TERMINE"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id },
    include: { lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } } },
  });

  if (!rendezVous || rendezVous.statut === "ANNULE" || rendezVous.statut === "NO_SHOW") {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }
  if (!STATUTS_AU_CALENDRIER.includes(rendezVous.statut)) {
    return NextResponse.json(
      { error: "Ce rendez-vous n'est pas encore confirmé par Zélia." },
      { status: 409 }
    );
  }

  const ics = genererICS({
    uid: `${rendezVous.id}@${new URL(urlSite()).hostname}`,
    debut: rendezVous.debut,
    fin: rendezVous.fin,
    titre: `Zelart Nails — ${rendezVous.lignes.map((l) => l.prestation.nom).join(" + ")}`,
    lieu: "L'Atelier du Regard, 108 avenue de la République, 44600 Saint-Nazaire",
    description: "Rendez-vous chez Zélia, prothésiste ongulaire. Un empêchement ? SMS au 06 45 29 20 01.",
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rendez-vous-zelart.ics"',
    },
  });
}
