"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalDuree, totalTarifs } from "@/lib/format";
import { urlSite } from "@/lib/site";

// Corriger le niveau de nail art d'un rendez-vous déjà pris.
//
// Le cas est fréquent et coûteux : une cliente coche « nail art niveau 1 »
// parce que c'est le moins cher, puis décrit dans ses inspirations un dessin
// qui relève clairement du niveau 3. Jusqu'ici, l'écart se découvrait au
// fauteuil : soit Zélia offrait la différence, soit elle annonçait un
// supplément à quelqu'un qui ne s'y attendait pas, une main déjà limée.
//
// Le remplacement se fait donc à l'avance, et la cliente en est prévenue par
// e-mail, avec le nouveau prix et la nouvelle heure de fin. Personne ne
// découvre rien au dernier moment.

export type EtatAjustement = { ok?: boolean; message?: string };

/**
 * Les prestations qui peuvent en remplacer une autre.
 *
 * Même technique et même nature d'acte, ce qui délimite exactement les
 * variantes comparables : les quatre niveaux d'une pose Gel X entre eux, les
 * quatre d'un remplissage Pop-it entre eux. Un remplacement au-delà changerait
 * la prestation elle-même et non son niveau, ce qui ne se règle pas d'un menu
 * déroulant mais d'une conversation.
 */
export async function variantesPossibles(prestationId: string) {
  const prestation = await prisma.prestation.findUnique({
    where: { id: prestationId },
    select: { typeActe: true, typePose: true },
  });
  if (!prestation) return [];

  return prisma.prestation.findMany({
    where: {
      active: true,
      typeActe: prestation.typeActe,
      typePose: prestation.typePose,
    },
    orderBy: { ordre: "asc" },
    select: { id: true, nom: true, prixCents: true, aPartirDe: true, dureeMin: true },
  });
}

export async function ajusterPrestation(
  ligneId: string,
  _etatPrecedent: EtatAjustement,
  formData: FormData
): Promise<EtatAjustement> {
  await exigerAdmin();

  const nouvelleId = String(formData.get("prestationId") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 300);
  if (!nouvelleId) return { ok: false, message: "Choisissez une prestation." };

  const ligne = await prisma.lignePrestation.findUnique({
    where: { id: ligneId },
    include: {
      prestation: true,
      rendezVous: {
        include: {
          cliente: { select: { prenom: true, email: true } },
          lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
        },
      },
    },
  });
  if (!ligne) return { ok: false, message: "Cette ligne est introuvable." };
  if (ligne.prestationId === nouvelleId) {
    return { ok: false, message: "C'est déjà la prestation en place." };
  }

  const nouvelle = await prisma.prestation.findUnique({ where: { id: nouvelleId } });
  if (!nouvelle) return { ok: false, message: "Prestation inconnue." };
  if (
    nouvelle.typeActe !== ligne.prestation.typeActe ||
    nouvelle.typePose !== ligne.prestation.typePose
  ) {
    return {
      ok: false,
      message: "Cette prestation n'est pas une variante de celle en place.",
    };
  }
  // La contrainte d'unicité refuserait le doublon, mais un message vaut mieux
  // qu'une erreur de base de données.
  if (ligne.rendezVous.lignes.some((l) => l.prestationId === nouvelleId)) {
    return { ok: false, message: "Cette prestation figure déjà dans le rendez-vous." };
  }

  const ancienne = ligne.prestation;
  const lignesApres = ligne.rendezVous.lignes.map((l) =>
    l.id === ligne.id ? { ...l, prestation: nouvelle } : l
  );
  const duree = totalDuree(lignesApres.map((l) => l.prestation));
  const nouvelleFin = new Date(ligne.rendezVous.debut.getTime() + duree * 60_000);
  const total = totalTarifs(lignesApres.map((l) => l.prestation));

  await prisma.$transaction([
    prisma.lignePrestation.update({
      where: { id: ligne.id },
      // Le prix figé suit la prestation : c'est lui qui fait foi ensuite, et le
      // laisser à l'ancienne valeur ferait facturer un niveau 1 posé en 3.
      data: { prestationId: nouvelleId, prixCents: nouvelle.prixCents },
    }),
    prisma.rendezVous.update({
      where: { id: ligne.rendezVousId },
      data: { fin: nouvelleFin },
    }),
  ]);

  // Un niveau supérieur allonge la pose. Le rendez-vous suivant peut s'en
  // trouver mordu : on applique quand même, parce que refuser laisserait Zélia
  // sans moyen d'enregistrer la réalité, mais on le dit sans détour.
  const chevauche = await prisma.rendezVous.findFirst({
    where: {
      id: { not: ligne.rendezVousId },
      statut: { notIn: ["ANNULE", "NO_SHOW"] },
      debut: { lt: nouvelleFin },
      fin: { gt: ligne.rendezVous.debut },
    },
    select: { debut: true, cliente: { select: { prenom: true } } },
  });

  revalidatePath("/admin");
  revalidatePath("/mon-espace");
  revalidatePath(`/admin/clientes/${ligne.rendezVous.clienteId}`);

  const cliente = ligne.rendezVous.cliente;
  const envoi = await envoyerEmail(
    cliente.email,
    "Le détail de votre prestation a été ajusté · Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(cliente.prenom)},</p>
      <p>J'ai ajusté le détail de votre rendez-vous du
      <strong>${formatJour(ligne.rendezVous.debut)} à ${formatHeure(ligne.rendezVous.debut)}</strong>
      pour qu'il corresponde à ce que vous souhaitez :</p>
      <p style="margin:16px 0">
        <span style="color:#8a6274;text-decoration:line-through">${echapperHtml(ancienne.nom)} · ${formatPrix(ancienne.prixCents, ancienne.aPartirDe)}</span><br>
        <strong>${echapperHtml(nouvelle.nom)} · ${formatPrix(nouvelle.prixCents, nouvelle.aPartirDe)}</strong>
      </p>
      ${motif ? `<p>${echapperHtml(motif)}</p>` : ""}
      <p><strong>Nouveau total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong><br>
      Fin prévue vers ${formatHeure(nouvelleFin)}.</p>
      <p>L'horaire de début ne change pas. Si cet ajustement ne vous convient pas, dites-le moi
      depuis votre espace et nous en reparlons.</p>
      <p style="margin:24px 0">
        <a href="${urlSite()}/mon-espace" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Voir mon rendez-vous
        </a>
      </p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  const changement = `${ancienne.nom} → ${nouvelle.nom}. Nouveau total : ${formatPrix(total.prixCents, total.aPartirDe)}, fin vers ${formatHeure(nouvelleFin)}.`;
  const alerte = chevauche
    ? ` ⚠ La pose déborde maintenant sur le rendez-vous de ${chevauche.cliente.prenom} à ${formatHeure(chevauche.debut)}, à replacer.`
    : "";
  const courrier = envoi.ok
    ? " La cliente vient d'en être prévenue par e-mail."
    : " ⚠ L'e-mail n'est pas parti, prévenez-la autrement.";

  return { ok: true, message: `${changement}${alerte}${courrier}` };
}
