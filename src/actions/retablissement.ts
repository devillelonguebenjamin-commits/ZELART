"use server";

import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml, enteteLogo } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix } from "@/lib/format";
import { reseauxPourEmail } from "@/lib/parametres";
import { occupeLeCreneau, DELAI_EXPIRATION_ACOMPTE_MS } from "@/lib/acompte-bornes";
import { preparerLienAcompte, verifierAcompte } from "@/lib/acompte";
import { urlSite } from "@/lib/site";
import { envoyerSmsSansBloquer } from "@/lib/sms";

export type EtatRetablissement = { ok?: boolean; message?: string };

/**
 * Deux façons de rétablir, parce que Zélia rétablit pour deux raisons opposées.
 *
 * - **maintenir** : la cliente est en règle, ou Zélia renonce à l'acompte. Le
 *   rendez-vous est mis hors de portée de la libération automatique, pour de
 *   bon. Le message dit « rien à régler », et c'est vrai.
 * - **relancer** : Zélia veut l'acompte. La cliente reçoit un lien frais et un
 *   délai de 48 h qui repart de zéro ; sans règlement, le créneau sera de
 *   nouveau libéré. Le message le dit en toutes lettres.
 *
 * Un seul bouton faisait les deux à moitié, et c'est ce qui a produit
 * l'incident : il disait à la cliente « rien à régler de plus », la laissait
 * exposée à la libération automatique avec une demande d'acompte déjà échue,
 * et elle était réannulée moins de 24 h plus tard. Deux fois de suite pour le
 * même rendez-vous ; et une cliente qui avait reçu par SMS « bien maintenu »
 * s'est retrouvée annulée par e-mail seulement.
 */
export type ModeRetablissement = "maintenir" | "relancer";

const HEURES = Math.round(DELAI_EXPIRATION_ACOMPTE_MS / 3_600_000);

function corpsMessage(contenu: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
    ${enteteLogo()}
    ${contenu}
    <p>À très vite,<br>Zélia ✨</p>
  </div>`;
}

export async function retablirRendezVous(
  rendezVousId: string,
  mode: ModeRetablissement
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

  const passe = rdv.debut < new Date();
  if (mode === "relancer" && passe) {
    return { ok: false, message: "Ce rendez-vous est passé : il n'y a plus d'acompte à demander." };
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

  // Un règlement a pu arriver entre-temps : SumUp est interrogé avant toute
  // chose. S'il est constaté, demander à la cliente de payer une seconde fois
  // serait la pire des erreurs possibles, quel que soit le mode choisi.
  const etatPaiement = rdv.acompteReference ? await verifierAcompte(rdv.id) : null;
  const regle = etatPaiement === "PAID" || rdv.acompteRegleLe !== null;
  const modeEffectif: ModeRetablissement = regle ? "maintenir" : mode;

  // « Relancer » : le lien et la remise à zéro du délai passent **avant** le
  // changement de statut. Si aucun lien ne peut partir, on refuse plutôt que
  // de rétablir un rendez-vous dont la demande est déjà échue — c'est
  // exactement ainsi qu'il était réannulé le lendemain.
  let lien: { url: string; montantCents: number } | null = null;
  if (modeEffectif === "relancer") {
    lien = await preparerLienAcompte(rdv.id);
    if (!lien) {
      return {
        ok: false,
        message:
          "Aucun lien d'acompte n'a pu être préparé (ni API SumUp, ni lien réutilisable dans les Réglages). Rien n'a été modifié : configurez un lien, ou rétablissez sans acompte.",
      };
    }
  }

  const etaitAuto = rdv.annuleAutomatiquementLe !== null;
  await prisma.rendezVous.update({
    where: { id: rdv.id },
    data: {
      statut: "CONFIRME",
      annuleAutomatiquementLe: null,
      annulationConfirmeeLe: null,
      // La pièce maîtresse : un rendez-vous maintenu à la main échappe pour
      // de bon à la libération automatique. En mode « relancer », il y reste
      // exposé — mais avec un délai neuf, posé juste au-dessus.
      maintenuManuellementLe: modeEffectif === "maintenir" ? new Date() : null,
    },
  });

  const quand = `${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`;
  const prestations = echapperHtml(rdv.lignes.map((l) => l.prestation.nom).join(" + "));

  // Un rendez-vous passé se rétablit pour l'historique et les chiffres ; il
  // n'y a plus personne à prévenir.
  let prevenue = false;
  if (!passe) {
    const ouverture = etaitAuto
      ? `<p>Vous avez reçu un message annonçant l'annulation de votre rendez-vous. <strong>Il ne
         tient plus</strong> : votre rendez-vous est rétabli.</p>`
      : `<p>Bonne nouvelle : votre rendez-vous est de nouveau <strong>confirmé</strong>.</p>`;

    const suite =
      modeEffectif === "maintenir"
        ? `<p>${regle ? "Votre acompte est bien reçu. " : ""}<strong>Rien à faire de votre côté, et
           rien à régler de plus.</strong> Ce message remplace les précédents.</p>`
        : `<p><strong>Pour le garder, un acompte de ${formatPrix(lien!.montantCents)} est à régler
           dans les ${HEURES} heures</strong>. Sans règlement dans ce délai, le créneau sera de
           nouveau libéré.</p>
           <p style="margin:24px 0">
             <a href="${lien!.url}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
               Régler mon acompte de ${formatPrix(lien!.montantCents)}
             </a>
           </p>
           <p style="font-size:13px;color:#8a6274">Ce lien remplace les précédents. L'acompte est
           déduit du montant final le jour de votre pose.</p>`;

    const courriel = await envoyerEmail(
      rdv.cliente.email,
      modeEffectif === "maintenir"
        ? `Votre rendez-vous du ${formatJour(rdv.debut)} est bien maintenu`
        : `Votre rendez-vous du ${formatJour(rdv.debut)} : acompte à régler sous ${HEURES} h`,
      corpsMessage(`<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
        ${ouverture}
        <p><strong>${quand}</strong><br>${prestations}<br>
        L'Atelier du Regard, 108 avenue de la République, 44600 Saint-Nazaire</p>
        ${suite}
        <p><a href="${urlSite()}/api/calendrier/${rdv.id}">📅 Ajouter à mon calendrier</a></p>
        ${await reseauxPourEmail()}`)
    );

    const sms = await envoyerSmsSansBloquer(
      rdv.cliente.telephone,
      modeEffectif === "maintenir"
        ? `Zelart Nails : votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est bien maintenu. Rien a regler. Ce message remplace les precedents. Zelia`
        : `Zelart Nails : votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est retabli. Acompte de ${formatPrix(lien!.montantCents)} a regler sous ${HEURES} h, sinon il sera annule : ${lien!.url}`
    );
    prevenue = courriel.ok || sms;
  }

  // Pas de revalidation de l'agenda ici : la ligne disparaîtrait du bloc
  // « à vérifier » avec le compte rendu, et Zélia ne lirait jamais « n'a pas
  // pu être prévenue ». Le bouton rafraîchit quand elle a lu.

  if (passe) return { ok: true, message: `Rendez-vous du ${quand} rétabli dans l'historique.` };

  const quoi =
    modeEffectif === "maintenir"
      ? regle && mode === "relancer"
        ? `SumUp indique l'acompte comme réglé : rendez-vous maintenu sans nouvelle demande.`
        : `Maintenu sans acompte : le site ne l'annulera plus.`
      : `Nouveau lien d'acompte envoyé ; sans règlement sous ${HEURES} h, il sera de nouveau libéré.`;
  return {
    ok: true,
    message: prevenue
      ? `${quoi} ${rdv.cliente.prenom} est prévenue.`
      : `${quoi} Mais ${rdv.cliente.prenom} n'a pas pu être prévenue (envoi en échec) : contactez-la vous-même.`,
  };
}

/**
 * Laisse une annulation en place, et le dit à la cliente sans ambiguïté.
 *
 * Né du même incident : une cliente annulée, rétablie (« bien maintenu, rien à
 * régler »), puis réannulée par e-mail seulement, pouvait légitimement croire
 * son rendez-vous maintenu. Ce message tranche : il dit que le rendez-vous est
 * annulé, demande de ne pas se présenter, et précise qu'il remplace les
 * précédents. Il part par e-mail **et** par SMS.
 *
 * Le rendez-vous sort ensuite du bloc « Annulations à vérifier » : Zélia l'a
 * examiné et tranché.
 */
export async function laisserAnnule(rendezVousId: string): Promise<EtatRetablissement> {
  await exigerAdmin();

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: { cliente: { select: { prenom: true, email: true, telephone: true } } },
  });
  if (!rdv) return { ok: false, message: "Ce rendez-vous est introuvable." };
  if (rdv.statut !== "ANNULE") return { ok: false, message: "Ce rendez-vous n'est pas annulé." };

  const quand = `${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`;
  let prevenue = false;

  if (rdv.debut > new Date()) {
    const courriel = await envoyerEmail(
      rdv.cliente.email,
      `Votre rendez-vous du ${formatJour(rdv.debut)} est annulé`,
      corpsMessage(`<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
        <p>Je vous confirme que votre rendez-vous du <strong>${quand}</strong> est
        <strong>annulé</strong>. Merci de ne pas vous présenter.</p>
        <p><strong>Ce message remplace les précédents</strong>, si certains ont pu prêter à
        confusion.</p>
        <p>Si vous souhaitez un nouveau rendez-vous :</p>
        <p style="margin:24px 0">
          <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
            Choisir une nouvelle date
          </a>
        </p>`)
    );
    const sms = await envoyerSmsSansBloquer(
      rdv.cliente.telephone,
      `Zelart Nails : je vous confirme que votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est ANNULE. Merci de ne pas vous presenter. Ce message remplace les precedents. Zelia`
    );
    prevenue = courriel.ok || sms;
  }

  await prisma.rendezVous.update({
    where: { id: rdv.id },
    data: {
      annulationConfirmeeLe: new Date(),
      ...(prevenue ? { annulationNotifieeLe: new Date() } : {}),
    },
  });

  // Pas de revalidation de l'agenda ici : la ligne disparaîtrait du bloc
  // « à vérifier » avec le compte rendu, et Zélia ne lirait jamais « n'a pas
  // pu être prévenue ». Le bouton rafraîchit quand elle a lu.

  if (rdv.debut <= new Date()) {
    return { ok: true, message: "Annulation confirmée (rendez-vous passé, personne à prévenir)." };
  }
  return {
    ok: true,
    message: prevenue
      ? `Annulation confirmée. ${rdv.cliente.prenom} a reçu un message clair : rendez-vous annulé, ne pas se présenter.`
      : `Annulation confirmée, mais ${rdv.cliente.prenom} n'a pas pu être prévenue (envoi en échec) : appelez-la.`,
  };
}
