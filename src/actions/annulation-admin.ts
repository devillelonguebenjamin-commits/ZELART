"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { echapperHtml, envoyerEmail } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { notifierListeAttente } from "@/lib/liste-attente";
import { urlSite } from "@/lib/site";

// Annuler ou refuser en disant pourquoi.
//
// Jusqu'ici, une annulation par Zélia ne partait nulle part : la cliente
// découvrait le changement en consultant son espace, ou ne le découvrait pas.
// Acceptable pour un rendez-vous que la cliente annule elle-même, pas pour
// celui qu'on lui retire.
//
// Deux gestes en un, parce qu'ils vont ensemble dans la vraie vie : le mot
// d'explication, et la proposition d'autres créneaux. Annoncer une annulation
// sans proposer de suite, c'est perdre la cliente ; la reprogrammer sans un mot,
// c'est brusque.

export type EtatAnnulation = { ok?: boolean; message?: string };

const NOTE_MAX = 800;

export async function annulerAvecMessage(
  rendezVousId: string,
  _etatPrecedent: EtatAnnulation,
  formData: FormData
): Promise<EtatAnnulation> {
  await exigerAdmin();

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rdv) return { ok: false, message: "Rendez-vous introuvable." };
  if (rdv.statut === "ANNULE") return { ok: false, message: "Ce rendez-vous est déjà annulé." };

  const note = String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX);

  // Les créneaux proposés sont revérifiés : celui qui a été coché il y a cinq
  // minutes peut avoir été réservé entre-temps, et proposer un horaire déjà pris
  // ferait revenir la cliente sur un refus.
  const demandes = formData
    .getAll("creneaux")
    .filter((v): v is string => typeof v === "string")
    .slice(0, 6)
    .map((v) => new Date(v))
    .filter((d) => !Number.isNaN(d.getTime()));

  const libres: Date[] = [];
  for (const debut of demandes) {
    const occupe = await prisma.rendezVous.findFirst({
      where: { statut: { not: "ANNULE" }, id: { not: rendezVousId }, debut: { lte: debut }, fin: { gt: debut } },
      select: { id: true },
    });
    const bloque = await prisma.indisponibilite.findFirst({
      where: { debut: { lte: debut }, fin: { gt: debut } },
      select: { id: true },
    });
    if (!occupe && !bloque) libres.push(debut);
  }

  const etaitConfirme = rdv.statut === "CONFIRME";
  await prisma.rendezVous.update({ where: { id: rendezVousId }, data: { statut: "ANNULE" } });

  // Le créneau libéré peut intéresser la liste d'attente — mais seulement s'il
  // était réellement retenu. Une demande jamais confirmée n'occupait rien.
  if (etaitConfirme) await notifierListeAttente();

  let envoi: string;
  if (!note && libres.length === 0) {
    envoi = "sans message";
  } else {
    const titre = etaitConfirme
      ? `Votre rendez-vous du ${formatJour(rdv.debut)} est annulé`
      : rdv.creneauPropose
        ? "Votre proposition d'horaire chez Zelart Nails"
        : "Votre demande de rendez-vous chez Zelart Nails";

    const ouverture = etaitConfirme
      ? `<p>Je suis au regret d'annuler votre rendez-vous du <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong>.</p>`
      : rdv.creneauPropose
        ? `<p>Merci d'avoir proposé le <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong>. Je ne peux malheureusement pas retenir cet horaire.</p>`
        : `<p>Merci pour votre demande du <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong>. Je ne peux malheureusement pas la retenir.</p>`;

    const mot = note
      ? `<p style="background:#fdf2f8;border-radius:12px;padding:14px 18px;margin:18px 0">${echapperHtml(note).replace(/\n/g, "<br>")}</p>`
      : "";

    const propositions =
      libres.length > 0
        ? `<p>Voici ce que je peux vous proposer à la place :</p>
           <ul>${libres
             .map((d) => `<li><strong>${formatJour(d)} à ${formatHeure(d)}</strong></li>`)
             .join("")}</ul>
           <p style="font-size:13px;color:#8a6274">Ces créneaux sont libres à l'instant où je vous écris ;
           réservez celui qui vous convient pour le garder.</p>`
        : "";

    const resultat = await envoyerEmail(
      rdv.cliente.email,
      titre,
      `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
        <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
        <p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
        ${ouverture}
        ${mot}
        ${propositions}
        <p style="margin:24px 0">
          <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
            Choisir un créneau
          </a>
        </p>
        <p>À très vite,<br>Zélia ✨</p>
      </div>`
    );
    if (resultat.ok) {
      await prisma.rendezVous.update({
        where: { id: rendezVousId },
        data: { annulationNotifieeLe: new Date() },
      });
    }
    envoi = resultat.ok ? "et la cliente est prévenue" : `mais l'e-mail n'est pas parti (${resultat.erreur})`;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${rdv.clienteId}`);

  const ecartes = demandes.length - libres.length;
  return {
    ok: true,
    message:
      `${etaitConfirme ? "Rendez-vous annulé" : "Demande refusée"} ${envoi}.` +
      (ecartes > 0
        ? ` ${ecartes} créneau${ecartes > 1 ? "x" : ""} coché${ecartes > 1 ? "s" : ""} n'${ecartes > 1 ? "étaient" : "était"} plus libre${ecartes > 1 ? "s" : ""} : non proposé${ecartes > 1 ? "s" : ""}.`
        : ""),
  };
}
