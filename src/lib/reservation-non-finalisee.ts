import { prisma } from "@/lib/prisma";
import { verifierAcompte } from "@/lib/acompte";
import { envoyerEmail, echapperHtml, enteteLogo } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { urlSite } from "@/lib/site";

// Réservations non finalisées : l'acompte demandé à la réservation n'a pas été
// réglé dans les 10 minutes.
//
// La demande est alors annulée et son créneau rendu, mais **jamais sur la
// seule foi de l'horloge** : SumUp est d'abord interrogé. Un paiement fait à la
// dernière seconde, dont la sonnette n'est pas encore arrivée, garde sa place ;
// et si SumUp ne répond pas, on attend le passage suivant plutôt que d'annuler
// à l'aveugle une cliente qui a peut-être payé.
//
// Il n'y a pas de tâche toutes les minutes : la vérification tourne à chaque
// affichage des créneaux (accueil, réservation), à chaque réservation, dans
// l'agenda, sur la page de la demande et chaque matin. La requête ne coûte
// presque rien quand il n'y a rien à faire, ce qui est le cas le plus courant.

/** Marge laissée à la sonnette de SumUp au-delà de l'heure limite. */
const MARGE_MS = 2 * 60 * 1000;

/** Au-delà, prévenir la cliente n'a plus de sens : elle est passée à autre chose. */
const PREVENIR_JUSQUA_MS = 24 * 60 * 60 * 1000;

export async function expirerReservationsNonFinalisees(
  maintenant: Date = new Date()
): Promise<number> {
  const candidates = await prisma.rendezVous.findMany({
    where: {
      statut: "EN_ATTENTE",
      acompteLimite: { lt: new Date(maintenant.getTime() - MARGE_MS) },
      acompteRegleLe: null,
      // « Confirmer sans acompte » ou rétablissement : une décision de Zélia.
      maintenuManuellementLe: null,
    },
    include: { cliente: { select: { prenom: true, email: true } } },
    take: 20,
  });

  let annulees = 0;
  for (const rdv of candidates) {
    if (rdv.acompteReference) {
      const etat = await verifierAcompte(rdv.id);
      if (etat === "PAID" || etat === null) continue;
    }
    // Garde contre deux passages simultanés et un paiement constaté entre-temps.
    const { count } = await prisma.rendezVous.updateMany({
      where: { id: rdv.id, statut: "EN_ATTENTE", acompteRegleLe: null, maintenuManuellementLe: null },
      data: {
        statut: "ANNULE",
        annuleAutomatiquementLe: maintenant,
        // Une réservation jamais finalisée n'a rien à faire dans « Annulations
        // à vérifier » : elle n'a jamais été un rendez-vous.
        annulationConfirmeeLe: maintenant,
      },
    });
    if (count === 0) continue;
    annulees++;

    if (rdv.acompteLimite && maintenant.getTime() - rdv.acompteLimite.getTime() < PREVENIR_JUSQUA_MS) {
      const resultat = await envoyerEmail(
        rdv.cliente.email,
        "Votre réservation n'a pas été finalisée",
        `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
          ${enteteLogo()}
          <p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
          <p>L'acompte de votre demande du <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong>
          n'a pas été réglé dans les 10 minutes : la demande est annulée et le créneau a été libéré.
          Aucun montant ne vous a été prélevé.</p>
          <p>Vous pouvez reprendre rendez-vous quand vous voulez :
          <a href="${urlSite()}/reserver">${urlSite().replace(/^https?:\/\//, "")}/reserver</a></p>
          <p>À très vite,<br>Zélia ✨</p>
        </div>`
      );
      if (resultat.ok) {
        await prisma.rendezVous.update({
          where: { id: rdv.id },
          data: { annulationNotifieeLe: new Date() },
        });
      }
    }
  }
  return annulees;
}
