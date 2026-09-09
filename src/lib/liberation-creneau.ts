import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { notifierListeAttente } from "@/lib/liste-attente";
import { urlSite } from "@/lib/site";
import { DELAI_EXPIRATION_ACOMPTE_MS } from "@/lib/acompte-bornes";

/**
 * Annonce à une cliente que son créneau a été rendu faute d'acompte.
 *
 * Vit ici plutôt que dans la tâche quotidienne parce que deux chemins y
 * mènent, et qu'ils doivent dire la même chose :
 *
 *   - le passage de sept heures, qui libère les créneaux échus de la nuit ;
 *   - une autre cliente qui réserve ce créneau entre-temps. Le créneau
 *     redevient proposable dès la quarante-huitième heure, pas au prochain
 *     passage de la tâche : sans cela, le samedi convoité resterait retenu
 *     jusqu'au lendemain matin par une réservation que plus rien ne tient.
 *
 * Le second chemin est le plus délicat : la place est déjà prise quand la
 * cliente lit le message. D'où « choisissez une nouvelle date » plutôt que
 * « votre créneau vous attend », et la mise en garde sur l'ancien lien de
 * paiement, qui ne correspond plus à rien.
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
     <p style="font-size:13px;color:#8a6274">Un souci pour régler ? Un SMS au 06 45 29 20 01 et on
     trouve une solution.</p>`;
}

/**
 * Prévient la cliente, et propose le créneau à la liste d'attente.
 *
 * L'annulation elle-même n'est **pas** faite ici : selon le chemin, elle a
 * lieu dans une transaction qui ne doit pas attendre un envoi d'e-mail. Ce qui
 * suit est donc ce qui se fait après coup, une fois la place réellement rendue.
 *
 * `previenirListeAttente` est faux quand une autre cliente vient de prendre le
 * créneau : annoncer à la liste d'attente une place déjà occupée ferait courir
 * tout le monde pour rien.
 */
export async function annoncerCreneauRendu(
  rdv: CreneauRendu,
  enveloppe: (contenu: string) => string,
  previenirListeAttente: boolean
): Promise<boolean> {
  if (previenirListeAttente) await notifierListeAttente({ debut: rdv.debut });

  const resultat = await envoyerEmail(
    rdv.cliente.email,
    "Votre créneau chez Zelart Nails a été libéré",
    enveloppe(corpsCreneauLibere(rdv))
  );
  return resultat.ok;
}

/**
 * Annule les rendez-vous dont l'acompte a expiré et qui chevauchent la fenêtre
 * qu'une autre cliente vient de réserver.
 *
 * Appelée **dans** la transaction de réservation : c'est ce qui garantit qu'un
 * créneau n'est jamais tenu par deux rendez-vous à la fois, même une heure. On
 * rend les fiches annulées pour que l'appelant prévienne les clientes une fois
 * la transaction validée — écrire d'abord, écrire à la cliente ensuite.
 */
export async function annulerExpiresChevauchant(
  tx: Pick<typeof prisma, "rendezVous">,
  filtreExpire: object,
  fenetre: { debut: Date; fin: Date }
): Promise<CreneauRendu[]> {
  const expires = await tx.rendezVous.findMany({
    where: { ...filtreExpire, debut: { lt: fenetre.fin }, fin: { gt: fenetre.debut } },
    select: { id: true, debut: true, cliente: { select: { prenom: true, email: true } } },
  });
  if (expires.length === 0) return [];

  await tx.rendezVous.updateMany({
    where: { id: { in: expires.map((r) => r.id) } },
    data: { statut: "ANNULE" },
  });
  return expires;
}
