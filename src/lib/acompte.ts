import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { reglagesAcompte } from "@/lib/parametres";

// Une cliente est « nouvelle » tant qu'elle n'a pas d'autre rendez-vous actif
// que celui qu'elle vient de prendre.
export async function estNouvelleCliente(
  clienteId: string,
  rendezVousId: string
): Promise<boolean> {
  const autres = await prisma.rendezVous.count({
    where: { clienteId, id: { not: rendezVousId }, statut: { not: "ANNULE" } },
  });
  return autres === 0;
}

// Envoie le lien de paiement de l'acompte et horodate la demande.
// Sans lien configuré, la fonction ne fait rien : Zélia garde la main.
export async function envoyerDemandeAcompte(rendezVousId: string): Promise<boolean> {
  const { lien, montantCents } = await reglagesAcompte();
  if (!lien) return false;

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rendezVous) return false;

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
            `<strong>${echapperHtml(l.prestation.nom)}</strong> — ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}`
        )
        .join("<br>")}<br>
      <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong></p>
      <p>${formatJour(rendezVous.debut)} à ${formatHeure(rendezVous.debut)}<br>
      L'Atelier du Regard — 108 avenue de la République, 44600 Saint-Nazaire</p>
      <p>S'agissant de votre premier rendez-vous, un acompte de
      <strong>${formatPrix(montantCents)}</strong> est demandé pour le confirmer. Il sera
      <strong>déduit du montant final</strong> le jour de votre pose.</p>
      <p style="margin:24px 0">
        <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
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

  if (!resultat.ok) return false;

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { acompteDemandeLe: new Date() },
  });
  return true;
}
