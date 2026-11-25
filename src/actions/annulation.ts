"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { annulationPossible, DELAI_ANNULATION_H } from "@/lib/annulation";
import { urlSite } from "@/lib/site";

// La cliente ne s'annule plus elle-même : elle **demande** l'annulation, et
// Zélia la valide ou la refuse depuis l'agenda. C'est à la validation que la
// cliente reçoit la confirmation (e-mail et SMS) et que le créneau se libère.
//
// Avant, l'annulation en ligne était immédiate : le créneau se libérait sans
// que Zélia le voie forcément, et elle pouvait se rendre au salon pour une
// cliente qui ne viendrait pas.
//
// L'heure de la demande fait foi pour le délai de prévenance : une demande
// faite plus de 48 h avant le rendez-vous vaut prévenance à temps, même si
// Zélia la valide plus tard.

export type EtatAnnulation = { ok?: boolean; message?: string };

export async function demanderAnnulation(
  rendezVousId: string,
  motif: string
): Promise<EtatAnnulation> {
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
  if (rdv.annulationDemandeeLe) {
    return { ok: true, message: "Votre demande d'annulation est déjà entre les mains de Zélia." };
  }
  if (!annulationPossible(rdv.debut)) {
    return {
      ok: false,
      message: `À moins de ${DELAI_ANNULATION_H} h du rendez-vous, prévenez-moi par SMS au 06 45 29 20 01.`,
    };
  }

  const motifPropre = motif.trim().slice(0, 500) || null;
  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { annulationDemandeeLe: new Date(), motifAnnulation: motifPropre },
  });

  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Demande d'annulation · ${rdv.cliente.prenom} ${rdv.cliente.nom} le ${formatJour(rdv.debut)}`,
      `<p>${echapperHtml(rdv.cliente.prenom)} ${echapperHtml(rdv.cliente.nom)} demande à annuler son rendez-vous :</p>
       <p><strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong><br>
       ${echapperHtml(rdv.lignes.map((l) => l.prestation.nom).join(" + "))}</p>
       ${motifPropre ? `<p>Motif : ${echapperHtml(motifPropre)}</p>` : ""}
       <p>Le rendez-vous reste réservé tant que vous n'avez pas validé l'annulation.</p>
       <p><a href="${urlSite()}/admin">Valider ou refuser dans l'agenda</a></p>`
    );
  }

  revalidatePath("/mon-espace");
  revalidatePath("/admin");
  return {
    ok: true,
    message:
      "Votre demande d'annulation est envoyée à Zélia. Vous recevrez sa confirmation par e-mail et SMS ; d'ici là, le rendez-vous reste réservé.",
  };
}
