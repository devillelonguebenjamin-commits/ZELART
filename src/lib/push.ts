import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Notifications de l'application gérante (Web Push).
//
// Les clés VAPID qui signent les envois sont créées au premier besoin et
// rangées dans la table des paramètres : pas de variable à ajouter sur Vercel,
// et elles ne changent plus ensuite (en changer désabonnerait tous les
// appareils). La clé privée ne sert qu'à signer les notifications de Zélia :
// sa fuite permettrait au pire d'envoyer des notifications à ses appareils.

const CLE_PUBLIQUE = "vapidCleePublique";
const CLE_PRIVEE = "vapidCleePrivee";
const SUJET = "mailto:contact@zelart.fr";

async function clesVapid(): Promise<{ publique: string; privee: string }> {
  const lignes = await prisma.parametre.findMany({
    where: { cle: { in: [CLE_PUBLIQUE, CLE_PRIVEE] } },
  });
  const publique = lignes.find((l) => l.cle === CLE_PUBLIQUE)?.valeur;
  const privee = lignes.find((l) => l.cle === CLE_PRIVEE)?.valeur;
  if (publique && privee) return { publique, privee };

  const nouvelles = webpush.generateVAPIDKeys();
  // createMany + skipDuplicates : si deux requêtes créent les clés en même
  // temps, la première gagne et la seconde relit la même paire.
  await prisma.parametre.createMany({
    data: [
      { cle: CLE_PUBLIQUE, valeur: nouvelles.publicKey },
      { cle: CLE_PRIVEE, valeur: nouvelles.privateKey },
    ],
    skipDuplicates: true,
  });
  return clesVapid();
}

export async function clePubliquePush(): Promise<string> {
  return (await clesVapid()).publique;
}

export type NotificationGerante = {
  titre: string;
  corps: string;
  /** Page à ouvrir quand Zélia touche la notification. */
  url?: string;
  /** Une notification du même tag remplace la précédente au lieu de s'empiler. */
  tag?: string;
};

/**
 * Prévient Zélia sur ses appareils abonnés. Ne lève jamais : une notification
 * qui ne part pas ne doit pas faire échouer une réservation ou un paiement.
 */
export async function notifierZelia(notification: NotificationGerante): Promise<number> {
  try {
    const abonnements = await prisma.abonnementPush.findMany();
    if (abonnements.length === 0) return 0;
    const { publique, privee } = await clesVapid();
    webpush.setVapidDetails(SUJET, publique, privee);

    const charge = JSON.stringify({ url: "/admin", ...notification });
    let envoyees = 0;
    await Promise.all(
      abonnements.map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            charge,
            { TTL: 24 * 60 * 60, urgency: "high" }
          );
          envoyees++;
          await prisma.abonnementPush.update({
            where: { id: a.id },
            data: { dernierEnvoiLe: new Date() },
          });
        } catch (erreur) {
          const statut = (erreur as { statusCode?: number }).statusCode;
          // 404 / 410 : l'appareil s'est désabonné ou l'application a été
          // supprimée. L'abonnement ne servira plus jamais.
          if (statut === 404 || statut === 410) {
            await prisma.abonnementPush.delete({ where: { id: a.id } }).catch(() => {});
          } else {
            console.error("Notification non envoyée", statut, erreur);
          }
        }
      })
    );
    return envoyees;
  } catch (erreur) {
    console.error("Notifications indisponibles", erreur);
    return 0;
  }
}
