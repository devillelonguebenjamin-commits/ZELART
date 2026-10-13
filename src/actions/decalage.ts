"use server";

import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { creneauProposeDepuisSaisie, formatHeure, formatJour } from "@/lib/creneaux";
import { urlSite } from "@/lib/site";
import {
  MARGE_EXPIRATION_MS,
  STATUTS_DEPLACABLES,
  annoncerDecalage,
  envoyerProposition,
  nouveauJeton,
  obstacleAuDecalage,
} from "@/lib/decalage";

export type EtatDecalage = { ok?: boolean; message?: string };

const LONGUEUR_MESSAGE = 500;

function quand(date: Date): string {
  return `${formatJour(date)} à ${formatHeure(date)}`;
}

/**
 * Ce que les deux gestes de Zélia vérifient d'abord : un horaire lisible, un
 * rendez-vous encore déplaçable, une durée conservée, un créneau libre.
 */
async function preparer(
  rendezVousId: string,
  formData: FormData,
  margeMs: number
): Promise<
  | { erreur: string }
  | {
      rdv: { id: string; debut: Date; fin: Date; debutInitial: Date | null; cliente: { prenom: string; email: string; telephone: string | null } };
      debut: Date;
      fin: Date;
      message: string | null;
    }
> {
  const debut = creneauProposeDepuisSaisie(String(formData.get("debut") ?? ""));
  if (!debut) return { erreur: "Indiquez une date et une heure valides." };
  if (debut.getTime() < Date.now() + margeMs) {
    return { erreur: "Ce nouvel horaire est déjà passé, ou trop proche." };
  }

  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: {
      id: true,
      debut: true,
      fin: true,
      statut: true,
      debutInitial: true,
      cliente: { select: { prenom: true, email: true, telephone: true } },
    },
  });
  if (!rdv) return { erreur: "Ce rendez-vous est introuvable." };
  if (!(STATUTS_DEPLACABLES as readonly string[]).includes(rdv.statut)) {
    return { erreur: "Seul un rendez-vous en attente ou confirmé se déplace." };
  }
  if (rdv.debut.getTime() === debut.getTime()) {
    return { erreur: "C'est déjà l'horaire de ce rendez-vous." };
  }

  // La durée est conservée : ce sont les mêmes prestations, à une autre heure.
  const fin = new Date(debut.getTime() + (rdv.fin.getTime() - rdv.debut.getTime()));
  const obstacle = await obstacleAuDecalage(rdv.id, debut, fin);
  if (obstacle) return { erreur: obstacle };

  const brut = String(formData.get("message") ?? "").trim().slice(0, LONGUEUR_MESSAGE);
  return { rdv, debut, fin, message: brut || null };
}

/**
 * Déplace un rendez-vous déjà convenu avec la cliente, et lui envoie la
 * confirmation écrite de la nouvelle heure.
 *
 * Le rappel de la veille est réarmé : parti pour l'ancienne date, il doit
 * repartir pour la nouvelle. Une proposition encore en attente sur ce
 * rendez-vous est retirée, la décision venant d'être prise autrement.
 */
export async function decalerRendezVous(
  rendezVousId: string,
  _etat: EtatDecalage,
  formData: FormData
): Promise<EtatDecalage> {
  await exigerAdmin();
  const prep = await preparer(rendezVousId, formData, 0);
  if ("erreur" in prep) return { ok: false, message: prep.erreur };
  const { rdv, debut, fin, message } = prep;

  await prisma.$transaction([
    prisma.rendezVous.update({
      where: { id: rdv.id },
      data: {
        debut,
        fin,
        decaleLe: new Date(),
        debutInitial: rdv.debutInitial ?? rdv.debut,
        rappelEnvoyeLe: null,
      },
    }),
    prisma.propositionDecalage.updateMany({
      where: { rendezVousId: rdv.id, statut: "EN_ATTENTE" },
      data: { statut: "ANNULEE" },
    }),
  ]);

  const prevenue = await annoncerDecalage({ ...rdv, debut }, rdv.debut, message);
  return {
    ok: true,
    message: prevenue
      ? `Rendez-vous déplacé au ${quand(debut)}. ${rdv.cliente.prenom} a reçu la confirmation.`
      : `Rendez-vous déplacé au ${quand(debut)}, mais ${rdv.cliente.prenom} n'a pas pu être prévenue (pas d'e-mail ou envoi en échec) : prévenez-la vous-même.`,
  };
}

/**
 * Propose un autre horaire : la cliente répond depuis le lien reçu, le créneau
 * proposé est retenu en attendant, et le rendez-vous ne bouge qu'à son accord.
 */
export async function proposerDecalage(
  rendezVousId: string,
  _etat: EtatDecalage,
  formData: FormData
): Promise<EtatDecalage> {
  await exigerAdmin();
  const prep = await preparer(rendezVousId, formData, MARGE_EXPIRATION_MS);
  if ("erreur" in prep) return { ok: false, message: prep.erreur };
  const { rdv, debut, fin, message } = prep;

  // Une seule proposition vivante par rendez-vous : la nouvelle remplace
  // l'ancienne, dont le lien cesse de fonctionner.
  const [, proposition] = await prisma.$transaction([
    prisma.propositionDecalage.updateMany({
      where: { rendezVousId: rdv.id, statut: "EN_ATTENTE" },
      data: { statut: "ANNULEE" },
    }),
    prisma.propositionDecalage.create({
      data: { rendezVousId: rdv.id, ancienDebut: rdv.debut, debut, fin, message, jeton: nouveauJeton() },
    }),
  ]);

  if (!(await envoyerProposition(rdv, proposition))) {
    await prisma.propositionDecalage.update({
      where: { id: proposition.id },
      data: { statut: "ANNULEE" },
    });
    return {
      ok: false,
      message: `La proposition n'a pas pu être envoyée à ${rdv.cliente.prenom} (pas d'e-mail ou envoi en échec). Rien n'a changé : proposez-lui par SMS, puis utilisez « Décaler ».`,
    };
  }
  return {
    ok: true,
    message: `Proposition envoyée à ${rdv.cliente.prenom} pour le ${quand(debut)}. Ce créneau lui est réservé jusqu'à sa réponse ; vous serez prévenue par e-mail.`,
  };
}

/** Retire une proposition restée sans réponse ; son lien cesse de fonctionner. */
export async function retirerProposition(propositionId: string): Promise<EtatDecalage> {
  await exigerAdmin();
  const { count } = await prisma.propositionDecalage.updateMany({
    where: { id: propositionId, statut: "EN_ATTENTE" },
    data: { statut: "ANNULEE" },
  });
  return count
    ? { ok: true, message: "Proposition retirée. Le rendez-vous garde son horaire." }
    : { ok: false, message: "Cette proposition a déjà reçu une réponse ou n'est plus valable." };
}

async function prevenirZelia(sujet: string, corps: string): Promise<void> {
  if (!process.env.NOTIFY_EMAIL) return;
  await envoyerEmail(
    process.env.NOTIFY_EMAIL,
    sujet,
    `${corps}<p><a href="${urlSite()}/admin">Ouvrir l'agenda</a></p>`
  );
}

/**
 * La réponse de la cliente, depuis la page du lien. Publique par nature : le
 * jeton, long et aléatoire, tient lieu d'identification, comme le lien de
 * connexion à l'espace cliente.
 */
export async function repondreProposition(
  jeton: string,
  accepte: boolean
): Promise<EtatDecalage> {
  const p = await prisma.propositionDecalage.findUnique({
    where: { jeton },
    include: {
      rendezVous: {
        select: {
          id: true,
          debut: true,
          statut: true,
          debutInitial: true,
          cliente: { select: { prenom: true, nom: true, email: true, telephone: true } },
        },
      },
    },
  });
  if (!p) return { ok: false, message: "Ce lien n'est pas valable." };
  const rdv = p.rendezVous;

  if (p.statut !== "EN_ATTENTE") {
    return {
      ok: false,
      message:
        p.statut === "ACCEPTEE"
          ? `Vous avez déjà accepté : votre rendez-vous est le ${quand(rdv.debut)}.`
          : `Cette proposition n'est plus valable. Votre rendez-vous reste le ${quand(rdv.debut)}.`,
    };
  }

  const perime =
    p.debut.getTime() < Date.now() + MARGE_EXPIRATION_MS ||
    rdv.debut.getTime() <= Date.now() ||
    !(STATUTS_DEPLACABLES as readonly string[]).includes(rdv.statut);
  if (perime) {
    await prisma.propositionDecalage.update({ where: { id: p.id }, data: { statut: "EXPIREE" } });
    return {
      ok: false,
      message: "Cette proposition a expiré. Pour toute question, un SMS au 06 45 29 20 01 suffit.",
    };
  }

  const nomCliente = `${rdv.cliente.prenom} ${rdv.cliente.nom}`;

  if (!accepte) {
    await prisma.propositionDecalage.update({
      where: { id: p.id },
      data: { statut: "REFUSEE", reponduLe: new Date() },
    });
    await prevenirZelia(
      `${nomCliente} garde son horaire`,
      `<p><strong>${echapperHtml(nomCliente)}</strong> a refusé le ${quand(p.debut)}.</p>
       <p>Son rendez-vous reste le <strong>${quand(rdv.debut)}</strong>, et le créneau proposé est de nouveau libre.</p>`
    );
    return { ok: true, message: `C'est noté : votre rendez-vous reste le ${quand(rdv.debut)}.` };
  }

  // Le créneau était retenu, mais Zélia a pu y poser un congé ou un rendez-vous
  // noté à la main depuis : on revérifie au moment de l'accord.
  const obstacle = await obstacleAuDecalage(rdv.id, p.debut, p.fin);
  if (obstacle) {
    await prisma.propositionDecalage.update({ where: { id: p.id }, data: { statut: "EXPIREE" } });
    await prevenirZelia(
      `${nomCliente} a accepté un créneau devenu indisponible`,
      `<p><strong>${echapperHtml(nomCliente)}</strong> a accepté le ${quand(p.debut)}, mais ce créneau n'est plus libre : ${echapperHtml(obstacle)}</p>
       <p>Son rendez-vous reste le <strong>${quand(rdv.debut)}</strong>. Recontactez-la.</p>`
    );
    return {
      ok: false,
      message: `Ce créneau n'est malheureusement plus disponible. Votre rendez-vous reste le ${quand(rdv.debut)} ; je reviens vers vous.`,
    };
  }

  await prisma.$transaction([
    prisma.rendezVous.update({
      where: { id: rdv.id },
      data: {
        debut: p.debut,
        fin: p.fin,
        decaleLe: new Date(),
        debutInitial: rdv.debutInitial ?? rdv.debut,
        rappelEnvoyeLe: null,
      },
    }),
    prisma.propositionDecalage.update({
      where: { id: p.id },
      data: { statut: "ACCEPTEE", reponduLe: new Date() },
    }),
  ]);
  await annoncerDecalage({ id: rdv.id, debut: p.debut, cliente: rdv.cliente }, rdv.debut, null);
  await prevenirZelia(
    `${nomCliente} accepte le nouvel horaire`,
    `<p><strong>${echapperHtml(nomCliente)}</strong> a accepté : son rendez-vous passe du ${quand(rdv.debut)} au <strong>${quand(p.debut)}</strong>.</p>`
  );
  return { ok: true, message: `C'est noté : votre rendez-vous est déplacé au ${quand(p.debut)}.` };
}
