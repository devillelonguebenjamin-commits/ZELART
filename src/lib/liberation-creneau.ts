import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { notifierListeAttente } from "@/lib/liste-attente";
import { urlSite } from "@/lib/site";
import { DELAI_EXPIRATION_ACOMPTE_MS } from "@/lib/acompte-bornes";

/**
 * Annonce à une cliente que son créneau a été rendu faute d'acompte.
 *
 * Un seul chemin y mène désormais : le passage quotidien, après avoir demandé
 * à SumUp où en est le paiement. Une première version libérait aussi le
 * créneau au fil de l'eau, quand une autre cliente le réservait ; elle a été
 * retirée, parce qu'elle annulait sans pouvoir vérifier.
 */
export type CreneauRendu = {
  id: string;
  debut: Date;
  cliente: { prenom: string; email: string };
};

const HEURES = Math.round(DELAI_EXPIRATION_ACOMPTE_MS / 3_600_000);

export function corpsCreneauLibere(rdv: CreneauRendu): string {
  return `<p>Bonjour ${echapperHtml(rdv.cliente.prenom)},</p>
     <p>Faute d'acompte reçu dans les ${HEURES} heures, votre rendez-vous du
     <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong> a été annulé et le
     créneau remis à la réservation.</p>
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
 * Prévient la cliente, et propose le créneau à la liste d'attente.
 *
 * L'annulation elle-même n'est pas faite ici : l'appelant l'enregistre avant
 * d'écrire, pour qu'un envoi en échec ne laisse pas un créneau retenu.
 */
export async function annoncerCreneauRendu(
  rdv: CreneauRendu,
  enveloppe: (contenu: string) => string
): Promise<boolean> {
  await notifierListeAttente({ debut: rdv.debut });

  const resultat = await envoyerEmail(
    rdv.cliente.email,
    "Votre créneau chez Zelart Nails a été libéré",
    enveloppe(corpsCreneauLibere(rdv))
  );
  return resultat.ok;
}
