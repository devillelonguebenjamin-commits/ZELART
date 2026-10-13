import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { occupeLeCreneau } from "@/lib/acompte-bornes";
import { envoyerEmail, echapperHtml, enteteLogo } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { urlSite } from "@/lib/site";
import { envoyerSmsSansBloquer } from "@/lib/sms";

// Déplacer un rendez-vous.
//
// Deux gestes, parce que Zélia déplace pour deux raisons :
//
//   - **décaler** : c'est déjà convenu avec la cliente (au téléphone, par SMS).
//     Le site enregistre et lui envoie la confirmation écrite de la nouvelle
//     heure, rien de plus ;
//   - **proposer** : c'est une question. La cliente reçoit un lien, accepte ou
//     garde son horaire, et Zélia est prévenue de la réponse. En attendant,
//     l'horaire proposé est retenu : le voir réservé par une autre cliente avant
//     la réponse serait la pire des issues.
//
// Avant, un changement d'horaire passait par une annulation suivie d'une
// nouvelle saisie : la cliente recevait « votre rendez-vous est annulé » alors
// que rien ne l'était.

/** Statuts qu'on peut déplacer : ce qui est encore à venir et pas tranché contre. */
export const STATUTS_DEPLACABLES = ["EN_ATTENTE", "CONFIRME"] as const;

/** Une proposition sans réponse est relancée une fois, au bout de ce délai. */
export const DELAI_RELANCE_DECALAGE_MS = 24 * 60 * 60 * 1000;

/** En deçà, une proposition n'a plus le temps d'être organisée : elle expire. */
export const MARGE_EXPIRATION_MS = 2 * 60 * 60 * 1000;

export function nouveauJeton(): string {
  return randomBytes(24).toString("base64url");
}

/** Filtre Prisma des propositions qui retiennent encore leur créneau. */
export function propositionQuiRetient(maintenant: Date = new Date()) {
  return { statut: "EN_ATTENTE" as const, debut: { gt: maintenant } };
}

/**
 * Ce qui empêche de placer ce rendez-vous sur [debut, fin), ou `null`.
 *
 * Les mêmes contrôles que partout ailleurs — un autre rendez-vous, un congé ou
 * un créneau bloqué — plus les propositions en attente **des autres**
 * rendez-vous. Les horaires d'ouverture ne comptent pas : comme pour un
 * rendez-vous noté à la main, Zélia dispose de son agenda.
 */
export async function obstacleAuDecalage(
  rendezVousId: string,
  debut: Date,
  fin: Date
): Promise<string | null> {
  const [rdv, indispo, proposition] = await Promise.all([
    prisma.rendezVous.findFirst({
      where: { ...occupeLeCreneau(), id: { not: rendezVousId }, debut: { lt: fin }, fin: { gt: debut } },
      include: { cliente: { select: { prenom: true, nom: true } } },
    }),
    prisma.indisponibilite.findFirst({ where: { debut: { lt: fin }, fin: { gt: debut } } }),
    prisma.propositionDecalage.findFirst({
      where: {
        ...propositionQuiRetient(),
        rendezVousId: { not: rendezVousId },
        debut: { lt: fin },
        fin: { gt: debut },
      },
      include: { rendezVous: { include: { cliente: { select: { prenom: true } } } } },
    }),
  ]);
  if (rdv) {
    return `Ce créneau chevauche le rendez-vous de ${rdv.cliente.prenom} ${rdv.cliente.nom} (${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}).`;
  }
  if (indispo) {
    return `Ce créneau tombe sur un blocage (${indispo.motif ?? "congé"}). Retirez-le depuis l'onglet Congés si besoin.`;
  }
  if (proposition) {
    return `Ce créneau est déjà proposé à ${proposition.rendezVous.cliente.prenom}, qui n'a pas encore répondu.`;
  }
  return null;
}

/**
 * Retenue des créneaux publics : une proposition en attente chevauche-t-elle
 * cette fenêtre ? Lu par la liste des créneaux et par la réservation.
 */
export async function fenetreRetenueParProposition(debut: Date, fin: Date): Promise<boolean> {
  const n = await prisma.propositionDecalage.count({
    where: { ...propositionQuiRetient(), debut: { lt: fin }, fin: { gt: debut } },
  });
  return n > 0;
}

type RdvPourMessage = {
  id: string;
  debut: Date;
  cliente: { prenom: string; email: string; telephone: string | null };
};

function enveloppe(contenu: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
    ${enteteLogo()}
    ${contenu}
    <p>À très vite,<br>Zélia ✨</p>
  </div>`;
}

const ADRESSE = "L'Atelier du Regard, 108 avenue de la République, 44600 Saint-Nazaire";

function quand(date: Date): string {
  return `${formatJour(date)} à ${formatHeure(date)}`;
}

function motDeZelia(message: string | null | undefined): string {
  return message?.trim()
    ? `<blockquote style="border-left:3px solid #ec4899;margin:16px 0;padding:4px 0 4px 14px">${echapperHtml(message.trim())}</blockquote>`
    : "";
}

/** Confirmation écrite d'un déplacement déjà convenu de vive voix. */
export async function annoncerDecalage(
  rdv: RdvPourMessage,
  ancienDebut: Date,
  message: string | null
): Promise<boolean> {
  const courriel = await envoyerEmail(
    rdv.cliente.email,
    `Votre rendez-vous est déplacé au ${formatJour(rdv.debut)}`,
    enveloppe(`<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
      <p>Comme convenu, votre rendez-vous est déplacé :</p>
      <p><span style="text-decoration:line-through;color:#8a6274">${quand(ancienDebut)}</span><br>
      <strong>${quand(rdv.debut)}</strong><br>${ADRESSE}</p>
      ${motDeZelia(message)}
      <p><a href="${urlSite()}/api/calendrier/${rdv.id}">📅 Ajouter la nouvelle date à mon calendrier</a></p>`)
  );
  const sms = await envoyerSmsSansBloquer(
    rdv.cliente.telephone,
    `Zelart Nails : comme convenu, votre rendez-vous est deplace au ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)}. A tres vite, Zelia`
  );
  return courriel.ok || sms;
}

/** La proposition elle-même : la cliente répond depuis le lien. */
export async function envoyerProposition(
  rdv: RdvPourMessage,
  proposition: { debut: Date; jeton: string; message: string | null },
  relance = false
): Promise<boolean> {
  const lien = `${urlSite()}/decalage/${proposition.jeton}`;
  const courriel = await envoyerEmail(
    rdv.cliente.email,
    relance
      ? `Rappel : un autre horaire vous est proposé pour votre rendez-vous`
      : `Je vous propose un autre horaire pour votre rendez-vous`,
    enveloppe(`<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
      <p>${relance ? "Je reviens vers vous : je" : "Je"} vous propose de déplacer votre rendez-vous.</p>
      <p>Prévu le <strong>${quand(rdv.debut)}</strong><br>
      Proposé le <strong>${quand(proposition.debut)}</strong></p>
      ${motDeZelia(proposition.message)}
      <p style="margin:24px 0">
        <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Répondre à la proposition
        </a>
      </p>
      <p style="font-size:13px;color:#8a6274">Vous pourrez accepter le nouvel horaire ou garder celui
      prévu. Tant que vous n'avez pas répondu, votre rendez-vous reste le
      ${quand(rdv.debut)}.</p>`)
  );
  const sms = await envoyerSmsSansBloquer(
    rdv.cliente.telephone,
    `Zelart Nails : je vous propose de deplacer votre rendez-vous du ${formatJour(rdv.debut)} au ${formatJour(proposition.debut)} a ${formatHeure(proposition.debut)}. Repondez ici : ${lien}`
  );
  return courriel.ok || sms;
}

/**
 * Passage quotidien : relance une fois les propositions restées sans réponse,
 * et fait expirer celles qui n'ont plus de sens (horaire proposé trop proche,
 * ou rendez-vous d'origine passé).
 */
export async function suivreLesPropositions(): Promise<{ relancees: number; expirees: number }> {
  const maintenant = new Date();
  const limite = new Date(maintenant.getTime() + MARGE_EXPIRATION_MS);

  const { count: expirees } = await prisma.propositionDecalage.updateMany({
    where: {
      statut: "EN_ATTENTE",
      OR: [
        { debut: { lte: limite } },
        { rendezVous: { debut: { lte: maintenant } } },
        { rendezVous: { statut: { notIn: [...STATUTS_DEPLACABLES] } } },
      ],
    },
    data: { statut: "EXPIREE" },
  });

  const aRelancer = await prisma.propositionDecalage.findMany({
    where: {
      statut: "EN_ATTENTE",
      relanceEnvoyeeLe: null,
      creeLe: { lte: new Date(maintenant.getTime() - DELAI_RELANCE_DECALAGE_MS) },
    },
    include: {
      rendezVous: {
        select: { id: true, debut: true, cliente: { select: { prenom: true, email: true, telephone: true } } },
      },
    },
  });
  let relancees = 0;
  for (const p of aRelancer) {
    if (await envoyerProposition(p.rendezVous, p, true)) {
      await prisma.propositionDecalage.update({
        where: { id: p.id },
        data: { relanceEnvoyeeLe: new Date() },
      });
      relancees++;
    }
  }
  return { relancees, expirees };
}
