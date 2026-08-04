import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { optionsBlob, stockageConfigure } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const TAILLE_MAX = 4 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }
  if (!stockageConfigure()) {
    return NextResponse.json({ error: "Stockage des photos non configuré." }, { status: 503 });
  }

  const donnees = await request.formData();
  const rendezVousId = String(donnees.get("rendezVousId") ?? "");
  const fichier = donnees.get("fichier");

  if (!rendezVousId) {
    return NextResponse.json({ error: "Rendez-vous non précisé." }, { status: 400 });
  }
  if (!(fichier instanceof File) || fichier.size === 0) {
    return NextResponse.json({ error: "Aucune image reçue." }, { status: 400 });
  }
  if (!fichier.type.startsWith("image/")) {
    return NextResponse.json({ error: "Ce fichier n'est pas une image." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX) {
    return NextResponse.json({ error: "Image trop lourde après compression." }, { status: 400 });
  }

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: { clienteId: true },
  });
  if (!rdv) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  try {
    const blob = await put(`realisations/${rendezVousId}.jpg`, fichier, {
      access: "public",
      addRandomSuffix: true,
      contentType: fichier.type,
      ...optionsBlob(),
    });

    await prisma.realisation.create({ data: { url: blob.url, rendezVousId } });
    revalidatePath(`/admin/clientes/${rdv.clienteId}`);
    return NextResponse.json({ url: blob.url });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Envoi refusé.";
    console.error("Ajout de réalisation échoué", erreur);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
