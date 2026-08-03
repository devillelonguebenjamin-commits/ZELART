"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fenetrePourDebut, formatHeure, formatJour, PREAVIS_MS } from "@/lib/creneaux";
import { reservationSchema } from "@/lib/validations";
import { envoyerEmail } from "@/lib/email";

export type EtatReservation = { erreur?: string };

const CRENEAU_INDISPONIBLE =
  "Ce créneau n'est plus disponible, merci d'en choisir un autre.";

export async function creerReservation(
  _etatPrecedent: EtatReservation,
  formData: FormData
): Promise<EtatReservation> {
  if (formData.get("majeure") !== "on") {
    return { erreur: "Vous devez certifier avoir 18 ans ou plus." };
  }

  const analyse = reservationSchema.safeParse({
    prestationId: formData.get("prestationId"),
    debut: formData.get("debut"),
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
    noteCliente: formData.get("noteCliente") ?? undefined,
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const donnees = analyse.data;

  const prestation = await prisma.prestation.findFirst({
    where: { id: donnees.prestationId, active: true },
  });
  if (!prestation) {
    return { erreur: "Cette prestation n'est plus proposée." };
  }

  const debut = new Date(donnees.debut);
  if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now() + PREAVIS_MS) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  const fenetre = await fenetrePourDebut(debut);
  if (!fenetre) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  const finRendezVous = new Date(debut.getTime() + prestation.dureeMin * 60_000);

  let rendezVousId: string;
  try {
    rendezVousId = await prisma.$transaction(
      async (tx) => {
        // Une seule cliente par fenêtre d'ouverture : tout rendez-vous actif
        // qui chevauche la fenêtre rend le créneau indisponible.
        const conflitRdv = await tx.rendezVous.findFirst({
          where: {
            statut: { not: "ANNULE" },
            debut: { lt: fenetre.fin },
            fin: { gt: fenetre.debut },
          },
          select: { id: true },
        });
        const conflitIndispo = await tx.indisponibilite.findFirst({
          where: { debut: { lt: fenetre.fin }, fin: { gt: fenetre.debut } },
          select: { id: true },
        });
        if (conflitRdv || conflitIndispo) throw new Error("CRENEAU_PRIS");

        // Le consentement se donne, jamais ne se retire tout seul : une
        // réservation sans la case cochée n'annule pas un accord antérieur.
        const accord = formData.get("consentementMarketing") === "on";
        const cliente = await tx.cliente.upsert({
          where: { email: donnees.email },
          update: {
            prenom: donnees.prenom,
            nom: donnees.nom,
            telephone: donnees.telephone,
            ...(accord
              ? { consentementMarketing: true, consentementLe: new Date(), desabonneLe: null }
              : {}),
          },
          create: {
            prenom: donnees.prenom,
            nom: donnees.nom,
            email: donnees.email,
            telephone: donnees.telephone,
            consentementMarketing: accord,
            consentementLe: accord ? new Date() : null,
          },
        });

        const rendezVous = await tx.rendezVous.create({
          data: {
            clienteId: cliente.id,
            prestationId: prestation.id,
            debut,
            fin: finRendezVous,
            noteCliente: donnees.noteCliente || null,
          },
        });
        return rendezVous.id;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    if (e instanceof Error && e.message === "CRENEAU_PRIS") {
      return { erreur: CRENEAU_INDISPONIBLE };
    }
    console.error("Échec de la réservation", e);
    return { erreur: "Une erreur est survenue, merci de réessayer." };
  }

  // Notification à Zélia (sans effet si RESEND_API_KEY / NOTIFY_EMAIL absents)
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Nouvelle demande de RDV — ${donnees.prenom} ${donnees.nom}`,
      `<p>Nouvelle demande de rendez-vous à confirmer :</p>
       <p><strong>${prestation.nom}</strong><br>
       ${formatJour(debut)} à ${formatHeure(debut)}</p>
       <p>${donnees.prenom} ${donnees.nom}<br>
       ${donnees.telephone} · ${donnees.email}</p>
       ${donnees.noteCliente ? `<p>Message : ${donnees.noteCliente}</p>` : ""}
       <p><a href="https://zelart.vercel.app/admin">Ouvrir l'espace gérante</a></p>`
    );
  }

  redirect(`/confirmation/${rendezVousId}`);
}
