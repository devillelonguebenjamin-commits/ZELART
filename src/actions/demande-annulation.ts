"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { echapperHtml, envoyerEmail, enteteLogo } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { notifierListeAttente } from "@/lib/liste-attente";
import { envoyerSmsSansBloquer } from "@/lib/sms";
import { urlSite } from "@/lib/site";

// Réponse de Zélia à une demande d'annulation faite par la cliente.

export type EtatDemandeAnnulation = { ok?: boolean; message?: string };

function enveloppe(prenom: string, contenu: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
    ${enteteLogo()}
    <p>Bonjour ${echapperHtml(prenom)},</p>
    ${contenu}
    <p>À très vite,<br>Zélia ✨</p>
  </div>`;
}

async function chargerDemande(id: string) {
  const rdv = await prisma.rendezVous.findUnique({ where: { id }, include: { cliente: true } });
  if (!rdv || !rdv.annulationDemandeeLe || rdv.statut === "ANNULE") return null;
  return rdv;
}

export async function validerAnnulation(id: string): Promise<EtatDemandeAnnulation> {
  await exigerAdmin();
  const rdv = await chargerDemande(id);
  if (!rdv) return { ok: false, message: "Cette demande n'est plus en attente." };

  const etaitConfirme = rdv.statut === "CONFIRME";
  await prisma.rendezVous.update({
    where: { id },
    data: {
      statut: "ANNULE",
      // Décidée par Zélia : rien à revérifier dans « Annulations à vérifier ».
      annulationConfirmeeLe: new Date(),
    },
  });
  // Le créneau libéré peut intéresser une cliente en liste d'attente.
  if (etaitConfirme) await notifierListeAttente({ debut: rdv.debut });

  const quand = `${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`;
  const courriel = await envoyerEmail(
    rdv.cliente.email,
    `Votre rendez-vous du ${formatJour(rdv.debut)} est annulé`,
    enveloppe(
      rdv.cliente.prenom,
      `<p>Comme vous me l'avez demandé, votre rendez-vous du <strong>${quand}</strong> est annulé.</p>
       ${rdv.acompteRegleLe ? "<p>Votre acompte reste acquis pour un prochain rendez-vous : vous pouvez reporter une fois en le conservant.</p>" : ""}
       <p>Pour reprendre rendez-vous : <a href="${urlSite()}/reserver">${urlSite().replace(/^https?:\/\//, "")}/reserver</a></p>`
    )
  );
  const sms = await envoyerSmsSansBloquer(
    rdv.cliente.telephone,
    `Zelart Nails : comme demande, votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est annule. A bientot ! Zelia`
  );
  if (courriel.ok || sms) {
    await prisma.rendezVous.update({ where: { id }, data: { annulationNotifieeLe: new Date() } });
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${rdv.clienteId}`);
  revalidatePath("/mon-espace");
  return {
    ok: true,
    message:
      courriel.ok || sms
        ? `Annulation validée, ${rdv.cliente.prenom} est prévenue (${[courriel.ok && "e-mail", sms && "SMS"].filter(Boolean).join(" et ")}).`
        : `Annulation validée, mais ${rdv.cliente.prenom} n'a pas pu être prévenue : écrivez-lui.`,
  };
}

export async function refuserAnnulation(id: string): Promise<EtatDemandeAnnulation> {
  await exigerAdmin();
  const rdv = await chargerDemande(id);
  if (!rdv) return { ok: false, message: "Cette demande n'est plus en attente." };

  await prisma.rendezVous.update({
    where: { id },
    data: { annulationDemandeeLe: null, motifAnnulation: null },
  });

  const quand = `${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`;
  const courriel = await envoyerEmail(
    rdv.cliente.email,
    `Votre rendez-vous du ${formatJour(rdv.debut)} est maintenu`,
    enveloppe(
      rdv.cliente.prenom,
      `<p>Je n'ai pas pu donner suite à votre demande d'annulation : votre rendez-vous du
       <strong>${quand}</strong> est <strong>maintenu</strong>.</p>
       <p>Pour en parler, écrivez-moi par SMS au 06 45 29 20 01.</p>`
    )
  );
  const sms = await envoyerSmsSansBloquer(
    rdv.cliente.telephone,
    `Zelart Nails : votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est maintenu. Pour en parler : SMS au 06 45 29 20 01. Zelia`
  );

  revalidatePath("/admin");
  revalidatePath("/mon-espace");
  return {
    ok: true,
    message:
      courriel.ok || sms
        ? `Demande refusée : le rendez-vous est maintenu et ${rdv.cliente.prenom} est prévenue.`
        : `Demande refusée, mais ${rdv.cliente.prenom} n'a pas pu être prévenue : écrivez-lui.`,
  };
}
