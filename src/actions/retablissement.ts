"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { reseauxPourEmail } from "@/lib/parametres";
import { occupeLeCreneau } from "@/lib/acompte-bornes";
import { urlSite } from "@/lib/site";
import { envoyerSmsSansBloquer } from "@/lib/sms";

export type EtatRetablissement = { ok?: boolean; message?: string };

/**
 * Remet en « confirmé » un rendez-vous annulé, avec les précautions que
 * « Réactiver » n'avait pas.
 *
 * Né d'un incident : la libération automatique des créneaux a annulé des
 * rendez-vous dont l'acompte avait bien été réglé, et il fallait pouvoir les
 * rétablir vite, sans rien casser d'autre.
 *
 * Trois différences avec le simple changement de statut :
 *   - **le créneau est revérifié.** Il a pu être repris entre-temps — c'était
 *     précisément l'objet de la libération. Rétablir par-dessus ferait deux
 *     clientes sur un fauteuil, et on refuse plutôt que d'écraser ;
 *   - **aucune demande d'acompte ne repart.** La cliente l'a réglé ou Zélia y
 *     a renoncé ; dans les deux cas, réclamer serait la seconde erreur ;
 *   - **le message dit que rien n'a changé pour elle**, plutôt qu'un
 *     « votre rendez-vous est confirmé » qui laisserait croire à une nouvelle
 *     réservation. Elle a reçu un e-mail d'annulation ; celui-ci le contredit
 *     explicitement.
 */
export async function retablirRendezVous(
  rendezVousId: string,
  _etatPrecedent: EtatRetablissement,
  _formData: FormData
): Promise<EtatRetablissement> {
  await exigerAdmin();

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: { select: { prenom: true, email: true, telephone: true } },
      lignes: { include: { prestation: { select: { nom: true } } }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rdv) return { ok: false, message: "Ce rendez-vous est introuvable." };
  if (rdv.statut !== "ANNULE" && rdv.statut !== "NO_SHOW") {
    return { ok: false, message: "Ce rendez-vous n'est pas annulé." };
  }

  const [conflitRdv, conflitIndispo] = await Promise.all([
    prisma.rendezVous.findFirst({
      where: {
        ...occupeLeCreneau(),
        id: { not: rdv.id },
        debut: { lt: rdv.fin },
        fin: { gt: rdv.debut },
      },
      include: { cliente: { select: { prenom: true, nom: true } } },
    }),
    prisma.indisponibilite.findFirst({
      where: { debut: { lt: rdv.fin }, fin: { gt: rdv.debut } },
    }),
  ]);
  if (conflitRdv) {
    return {
      ok: false,
      message: `Impossible : ${conflitRdv.cliente.prenom} ${conflitRdv.cliente.nom} a pris ce créneau depuis (${formatHeure(conflitRdv.debut)}). Proposez une autre date à ${rdv.cliente.prenom}.`,
    };
  }
  if (conflitIndispo) {
    return {
      ok: false,
      message: `Impossible : ce créneau est bloqué (${conflitIndispo.motif ?? "sans intitulé"}). Retirez le blocage depuis l'onglet Congés, puis réessayez.`,
    };
  }

  await prisma.rendezVous.update({
    where: { id: rdv.id },
    data: { statut: "CONFIRME", annuleAutomatiquementLe: null },
  });

  const quand = `${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`;
  const passe = rdv.debut < new Date();

  // Un rendez-vous passé se rétablit pour l'historique et les chiffres ; il
  // n'y a plus personne à prévenir.
  if (!passe) {
    await envoyerEmail(
      rdv.cliente.email,
      `Votre rendez-vous du ${formatJour(rdv.debut)} est bien maintenu`,
      `<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
       <p>Vous avez reçu un message annonçant l'annulation de votre rendez-vous. <strong>C'était une
       erreur de notre part</strong>, et je vous prie de m'en excuser.</p>
       <p>Votre rendez-vous est <strong>bien maintenu</strong> :</p>
       <p><strong>${quand}</strong><br>
       ${echapperHtml(rdv.lignes.map((l) => l.prestation.nom).join(" + "))}<br>
       L'Atelier du Regard, 108 avenue de la République, 44600 Saint-Nazaire</p>
       <p>Rien à faire de votre côté, et rien à régler de plus.</p>
       <p><a href="${urlSite()}/api/calendrier/${rdv.id}">📅 Ajouter à mon calendrier</a></p>
       <p>À très vite,<br>Zélia ✨</p>
       ${await reseauxPourEmail()}`
    );
    await envoyerSmsSansBloquer(
      rdv.cliente.telephone,
      `Zelart Nails : votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est bien maintenu, l'annulation etait une erreur de notre part. Desolee ! Zelia`
    );
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${rdv.clienteId}`);
  return {
    ok: true,
    message: passe
      ? `Rendez-vous du ${quand} rétabli dans l'historique.`
      : `Rendez-vous du ${quand} rétabli. ${rdv.cliente.prenom} est prévenue que l'annulation était une erreur.`,
  };
}
