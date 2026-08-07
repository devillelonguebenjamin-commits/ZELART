import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAdmin } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { corpsHtml, destinataires } from "@/lib/campagne";

// L'envoi se fait par petits lots successifs, appelés en boucle par le
// navigateur : la progression reste visible et aucune requête ne dépasse le
// temps d'exécution autorisé, quelle que soit la taille de la base.
const TAILLE_LOT = 8;
const PAUSE_MS = 300; // respecte la limite de débit du service d'envoi

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }

  const { campagneId } = (await request.json()) as { campagneId?: string };
  if (!campagneId) {
    return NextResponse.json({ error: "Campagne non précisée." }, { status: 400 });
  }

  const campagne = await prisma.campagne.findUnique({ where: { id: campagneId } });
  if (!campagne) {
    return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
  }
  if (campagne.statut === "ENVOYEE") {
    return NextResponse.json({ restant: 0, envoyes: 0, echecs: 0, termine: true });
  }

  const [cibles, dejaEnvoyes] = await Promise.all([
    destinataires(campagne.segment),
    prisma.envoiCampagne.findMany({
      where: { campagneId },
      select: { clienteId: true },
    }),
  ]);

  const traites = new Set(dejaEnvoyes.map((e) => e.clienteId));
  const restants = cibles.filter((c) => !traites.has(c.id));

  if (restants.length === 0) {
    await prisma.campagne.update({
      where: { id: campagneId },
      data: { statut: "ENVOYEE", envoyeeLe: campagne.envoyeeLe ?? new Date() },
    });
    return NextResponse.json({ restant: 0, envoyes: 0, echecs: 0, termine: true });
  }

  if (campagne.statut === "BROUILLON") {
    await prisma.campagne.update({
      where: { id: campagneId },
      data: { statut: "EN_COURS", envoyeeLe: new Date() },
    });
  }

  const lot = restants.slice(0, TAILLE_LOT);
  let envoyes = 0;
  let echecs = 0;

  for (const [index, cliente] of lot.entries()) {
    // La destinataire est réservée **avant** l'envoi : c'est la contrainte
    // d'unicité (campagne, cliente) qui arbitre entre deux appels simultanés —
    // un double-clic ou deux onglets ouverts. En enregistrant après coup, les
    // deux appels sélectionnaient le même lot et envoyaient chacun leur copie,
    // avant qu'une des écritures n'échoue et ne rende un 500 en milieu de lot.
    let envoi;
    try {
      envoi = await prisma.envoiCampagne.create({
        data: { campagneId, clienteId: cliente.id, ok: false, erreur: "Envoi en cours…" },
      });
    } catch {
      continue; // déjà pris en charge par un autre appel
    }

    const resultat = await envoyerEmail(
      cliente.email,
      campagne.objet,
      corpsHtml(campagne.contenu, cliente)
    );
    if (resultat.ok) envoyes++;
    else echecs++;

    await prisma.envoiCampagne.update({
      where: { id: envoi.id },
      data: { ok: resultat.ok, erreur: resultat.ok ? null : resultat.erreur.slice(0, 500) },
    });

    if (index < lot.length - 1) await pause(PAUSE_MS);
  }

  const restant = restants.length - lot.length;
  if (restant === 0) {
    await prisma.campagne.update({ where: { id: campagneId }, data: { statut: "ENVOYEE" } });
  }

  return NextResponse.json({ restant, envoyes, echecs, termine: restant === 0 });
}
