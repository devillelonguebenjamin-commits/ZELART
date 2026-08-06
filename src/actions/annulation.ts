"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { envoyerEmail } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { annulationPossible, DELAI_ANNULATION_H } from "@/lib/annulation";
import { notifierListeAttente } from "@/lib/liste-attente";

export type EtatAnnulation = { ok?: boolean; message?: string };

export async function annulerParCliente(rendezVousId: string): Promise<EtatAnnulation> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour gérer vos rendez-vous." };
  }

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });

  // On vérifie la propriété : un identifiant deviné ne doit rien permettre.
  if (!rdv || rdv.clienteId !== clienteId) {
    return { ok: false, message: "Ce rendez-vous est introuvable." };
  }
  if (rdv.statut === "ANNULE") {
    return { ok: false, message: "Ce rendez-vous est déjà annulé." };
  }
  if (!annulationPossible(rdv.debut)) {
    return {
      ok: false,
      message: `L'annulation en ligne n'est plus possible à moins de ${DELAI_ANNULATION_H} h du rendez-vous. Prévenez Zélia par SMS au 06 45 29 20 01.`,
    };
  }

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { statut: "ANNULE" },
  });

  // Le créneau libéré peut intéresser une cliente en liste d'attente.
  await notifierListeAttente();

  // Zélia doit le savoir tout de suite pour reproposer le créneau.
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Annulation — ${rdv.cliente.prenom} ${rdv.cliente.nom} le ${formatJour(rdv.debut)}`,
      `<p>${rdv.cliente.prenom} ${rdv.cliente.nom} vient d'annuler depuis son espace :</p>
       <p><strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong><br>
       ${rdv.lignes.map((l) => l.prestation.nom).join(" + ")}</p>
       <p>Le créneau est de nouveau disponible à la réservation.</p>`
    );
  }

  revalidatePath("/mon-espace");
  revalidatePath("/admin");
  return {
    ok: true,
    message: "Votre rendez-vous est annulé. Le créneau est libéré, à bientôt 🤍",
  };
}
