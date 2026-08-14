import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { reglagesAcompte } from "@/lib/parametres";
import { creerLienPaiement, lirePaiement, sumupConfigure, type EtatPaiement } from "@/lib/sumup";
import { urlSite } from "@/lib/site";
import { envoyerSmsSansBloquer } from "@/lib/sms";

/**
 * Faut-il demander un acompte pour ce rendez-vous.
 *
 * La règle de départ tenait en une ligne : pas d'autre rendez-vous actif, donc
 * cliente nouvelle, donc acompte. Elle se trompait sur tout un pan de la
 * clientèle. Les habituées enregistrées à la main par Zélia n'ont, dans le
 * site, aucun rendez-vous passé : elles étaient traitées en inconnues et se
 * voyaient réclamer quinze euros après un an de fidélité.
 *
 * Deux conditions, donc, et la dispense passe avant : ce que Zélia sait de sa
 * cliente l'emporte sur ce que la base a eu le temps d'enregistrer.
 */
export async function acompteADemander(
  clienteId: string,
  rendezVousId: string
): Promise<boolean> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { acompteDispense: true },
  });
  if (!cliente || cliente.acompteDispense) return false;

  const autres = await prisma.rendezVous.count({
    where: { clienteId, id: { not: rendezVousId }, statut: { not: "ANNULE" } },
  });
  return autres === 0;
}

/**
 * Crée le paiement propre à ce rendez-vous, ou `null` si l'API n'est pas
 * disponible — auquel cas l'appelant retombe sur le lien collé.
 *
 * Une référence déjà posée est réutilisée telle quelle : deux liens pour un
 * même acompte donneraient deux paiements, et le premier réglé passerait
 * inaperçu si la vérification interroge le second.
 */
async function lienAcompte(
  rendezVous: { id: string; acompteReference: string | null; cliente: { prenom: string; nom: string } },
  montantCents: number
): Promise<{ url: string } | null> {
  if (!sumupConfigure()) return null;

  // Un renvoi ne doit pas ouvrir un second paiement : la cliente pourrait
  // régler l'ancien lien, resté dans sa boîte, et ce règlement-là ne serait
  // jamais constaté puisque la vérification n'interroge qu'une référence.
  if (rendezVous.acompteReference) {
    const existant = await lirePaiement(rendezVous.acompteReference);
    if (existant?.etat === "PENDING" && existant.url) return { url: existant.url };
    if (existant?.etat === "PAID") return null; // déjà réglé : plus rien à demander
  }

  const description = `Acompte ${rendezVous.cliente.prenom} ${rendezVous.cliente.nom}`;
  const resultat = await creerLienPaiement(
    montantCents,
    description,
    `acompte-${rendezVous.id}`,
    `${urlSite()}/api/sumup/retour`
  );
  if (!resultat.ok) {
    // Le lien collé prendra le relais : un acompte non demandé coûte plus cher
    // qu'un acompte demandé sans rapprochement automatique.
    console.error("Lien d'acompte SumUp non créé", rendezVous.id, resultat.erreur);
    return null;
  }

  await prisma.rendezVous.update({
    where: { id: rendezVous.id },
    data: { acompteReference: resultat.reference, acompteCheckoutId: resultat.checkoutId },
  });
  return { url: resultat.url };
}

/**
 * Demande à SumUp où en est l'acompte de ce rendez-vous, et l'enregistre s'il
 * est réglé.
 *
 * Deux prudences qui comptent autant que le reste :
 *   - une absence de réponse ne vaut **jamais** « impayé » : sans elle, une
 *     coupure réseau relancerait une cliente qui a déjà payé ;
 *   - un acompte déjà marqué réglé n'est pas réinterrogé, et jamais démarqué.
 *     Zélia peut l'avoir coché à la main pour un règlement en espèces.
 */
export async function verifierAcompte(rendezVousId: string): Promise<EtatPaiement | null> {
  const rdv = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: { id: true, acompteReference: true, acompteRegleLe: true },
  });
  if (!rdv?.acompteReference || rdv.acompteRegleLe) return null;

  const paiement = await lirePaiement(rdv.acompteReference);
  if (paiement === null) return null;
  const etat = paiement.etat;

  await prisma.rendezVous.update({
    where: { id: rdv.id },
    data: {
      acompteVerifieLe: new Date(),
      ...(etat === "PAID" ? { acompteRegleLe: new Date() } : {}),
    },
  });
  return etat;
}

/**
 * Passe en revue les acomptes demandés et non réglés.
 *
 * Appelée par la tâche quotidienne : la sonnette de SumUp peut ne pas sonner
 * (elle n'est garantie par rien), et un acompte réglé qui reste marqué impayé
 * déclencherait une relance injustifiée.
 */
export async function verifierAcomptesEnAttente(): Promise<{ verifies: number; regles: number }> {
  if (!sumupConfigure()) return { verifies: 0, regles: 0 };

  const attente = await prisma.rendezVous.findMany({
    where: {
      statut: { not: "ANNULE" },
      acompteReference: { not: null },
      acompteRegleLe: null,
      debut: { gt: new Date() },
    },
    select: { id: true },
  });

  let regles = 0;
  for (const rdv of attente) {
    if ((await verifierAcompte(rdv.id)) === "PAID") regles++;
  }
  return { verifies: attente.length, regles };
}

// Envoie le lien de paiement de l'acompte et horodate la demande.
//
// Deux liens possibles, et la différence n'est pas cosmétique :
//
//   - **un paiement créé pour ce rendez-vous** (API configurée), qui porte une
//     référence à nous. C'est la seule façon de savoir ensuite, tout seul, si
//     l'acompte a été réglé : une transaction SumUp ne dit pas qui a payé ;
//   - **le lien réutilisable collé dans les réglages**, à défaut. Il fonctionne
//     mais reste anonyme : le règlement se cochera à la main.
//
// Sans aucun des deux, la fonction ne fait rien : Zélia garde la main.
export async function envoyerDemandeAcompte(rendezVousId: string): Promise<boolean> {
  const { lien, montantCents } = await reglagesAcompte();

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rendezVous) return false;

  const paiement = await lienAcompte(rendezVous, montantCents);
  const adressePaiement = paiement?.url ?? lien;
  if (!adressePaiement) return false;

  const total = totalTarifs(rendezVous.lignes.map((l) => l.prestation));

  const resultat = await envoyerEmail(
    rendezVous.cliente.email,
    `Votre acompte pour réserver le ${formatJour(rendezVous.debut)}`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(rendezVous.cliente.prenom)},</p>
      <p>Merci pour votre demande de rendez-vous :</p>
      <p>${rendezVous.lignes
        .map(
          (l) =>
            `<strong>${echapperHtml(l.prestation.nom)}</strong> : ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}`
        )
        .join("<br>")}<br>
      <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong></p>
      <p>${formatJour(rendezVous.debut)} à ${formatHeure(rendezVous.debut)}<br>
      L'Atelier du Regard, 108 avenue de la République, 44600 Saint-Nazaire</p>
      <p>S'agissant de votre premier rendez-vous, un acompte de
      <strong>${formatPrix(montantCents)}</strong> est demandé pour le confirmer. Il sera
      <strong>déduit du montant final</strong> le jour de votre pose.</p>
      <p style="margin:24px 0">
        <a href="${adressePaiement}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Régler mon acompte de ${formatPrix(montantCents)}
        </a>
      </p>
      <p style="font-size:13px;color:#8a6274">Le paiement est traité par SumUp. Votre rendez-vous
      est définitivement réservé dès réception. À défaut, le créneau pourra être proposé à une
      autre cliente. L'acompte n'est pas remboursable en cas d'annulation ; un report est accepté
      une fois.</p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  // L'acompte est ce qui bloque le plus souvent : un e-mail non lu, et le
  // rendez-vous reste en attente. Le SMS porte le lien, seul cas où il en
  // contient un.
  await envoyerSmsSansBloquer(
    rendezVous.cliente.telephone,
    `Zelart Nails : pour confirmer votre rendez-vous du ${formatJour(rendezVous.debut)}, un acompte de ${formatPrix(montantCents)} est demande. ${adressePaiement}`
  );

  if (!resultat.ok) return false;

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { acompteDemandeLe: new Date() },
  });
  return true;
}
