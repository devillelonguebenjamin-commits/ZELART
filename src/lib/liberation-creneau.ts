import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { notifierListeAttente } from "@/lib/liste-attente";
import { urlSite } from "@/lib/site";
import { envoyerSmsSansBloquer } from "@/lib/sms";
import { DELAI_EXPIRATION_ACOMPTE_MS } from "@/lib/acompte-bornes";

/**
 * Annonce à une cliente que son créneau a été rendu faute d'acompte.
 *
 * Un seul chemin y mène : le passage quotidien, après avoir demandé à SumUp où
 * en est le paiement.
 */
export type CreneauRendu = {
  id: string;
  debut: Date;
  cliente: { prenom: string; email: string; telephone: string | null };
};

/** Ce qui est réellement parti — et non ce qu'on a tenté d'envoyer. */
export type Prevenue = { email: boolean; sms: boolean };

const HEURES = Math.round(DELAI_EXPIRATION_ACOMPTE_MS / 3_600_000);

export function corpsCreneauLibere(rdv: CreneauRendu): string {
  return `<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
     <p>Faute d'acompte reçu dans les ${HEURES} heures, votre rendez-vous du
     <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong> a été annulé et le
     créneau remis à la réservation. <strong>Merci de ne pas vous présenter.</strong></p>
     <p>Rien n'est perdu si vous êtes toujours partante : choisissez une nouvelle date.
     <strong>Ne réglez pas l'ancien lien</strong>, il ne correspond plus à aucun rendez-vous.</p>
     <p style="margin:24px 0">
       <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
         Choisir une nouvelle date
       </a>
     </p>
     <p style="font-size:13px;color:#8a6274">Vous aviez réglé ? Répondez à ce message ou envoyez un
     SMS au 06 45 29 20 01 : votre rendez-vous sera rétabli.</p>`;
}

/**
 * Prévient la cliente par e-mail **et** par SMS, et propose le créneau à la
 * liste d'attente.
 *
 * Le SMS manquait, et c'est lui qui compte le plus : le reste du site double
 * déjà par SMS la confirmation et le rappel, mais pas l'annulation — le seul
 * message qu'il est grave de rater, puisqu'une cliente qui le rate se présente
 * pour rien. Il manquait surtout dans un cas réel : une cliente rétablie avait
 * reçu un SMS « votre rendez-vous est bien maintenu », puis avait été réannulée
 * par e-mail seulement. Le dernier SMS qu'elle avait disait le contraire de la
 * vérité.
 *
 * L'annulation elle-même n'est pas faite ici : l'appelant l'enregistre avant
 * d'écrire, pour qu'un envoi en échec ne laisse pas un créneau retenu.
 */
export async function annoncerCreneauRendu(
  rdv: CreneauRendu,
  enveloppe: (contenu: string) => string
): Promise<Prevenue> {
  await notifierListeAttente({ debut: rdv.debut });

  const courriel = await envoyerEmail(
    rdv.cliente.email,
    "Votre rendez-vous chez Zelart Nails est annulé",
    enveloppe(corpsCreneauLibere(rdv))
  );
  const sms = await envoyerSmsSansBloquer(
    rdv.cliente.telephone,
    `Zelart Nails : faute d'acompte recu, votre rendez-vous du ${formatJour(rdv.debut)} a ${formatHeure(rdv.debut)} est ANNULE. Merci de ne pas vous presenter. Pour reprendre rendez-vous : ${urlSite()}/reserver`
  );
  return { email: courriel.ok, sms };
}
