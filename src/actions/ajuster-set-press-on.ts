"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatPrix } from "@/lib/format";
import { urlSite } from "@/lib/site";

// Fixer le niveau de nail art d'une commande de press-on.
//
// Pendant exact de l'ajustement des rendez-vous, à une différence près qui
// change tout : un set se **paie avant d'être fabriqué**. Le bon moment pour
// corriger le niveau se situe donc entre la commande et la demande de
// règlement, et la fenêtre se referme dès que la cliente a payé.

export type EtatAjustementSet = { ok?: boolean; message?: string };

/** Les sets qui peuvent en remplacer un autre : les variantes de la même famille. */
export async function variantesSet(modeleId: string) {
  const modele = await prisma.modelePressOn.findUnique({
    where: { id: modeleId },
    select: { collection: true, surMesure: true },
  });
  // Hors sur-mesure, il n'y a pas de niveau : un modèle de collection est
  // dessiné une fois pour toutes, seules les mesures changent.
  if (!modele?.surMesure) return [];

  return prisma.modelePressOn.findMany({
    where: { actif: true, surMesure: true, collection: modele.collection },
    orderBy: { ordre: "asc" },
    select: { id: true, nom: true, prixCents: true, aPartirDe: true },
  });
}

export async function ajusterSetPressOn(
  commandeId: string,
  _etatPrecedent: EtatAjustementSet,
  formData: FormData
): Promise<EtatAjustementSet> {
  await exigerAdmin();

  const nouveauId = String(formData.get("modeleId") ?? "");
  const motif = String(formData.get("motif") ?? "").trim().slice(0, 300);
  if (!nouveauId) return { ok: false, message: "Choisissez un set." };

  const commande = await prisma.commandePressOn.findUnique({
    where: { id: commandeId },
    include: { modele: true, cliente: { select: { prenom: true, email: true } } },
  });
  if (!commande) return { ok: false, message: "Commande introuvable." };
  if (commande.modeleId === nouveauId) {
    return { ok: false, message: "C'est déjà le set en place." };
  }

  // Une fois réglée, la commande ne se renchérit plus : le prix a été payé, et
  // revenir dessus reviendrait à changer un contrat exécuté. Si le niveau était
  // mal jugé, cela se règle de vive voix, pas par un formulaire.
  if (commande.paiementRecuLe || commande.statut === "REMISE" || commande.statut === "ANNULEE") {
    return {
      ok: false,
      message: "Cette commande est déjà réglée ou close : son tarif ne se modifie plus ici.",
    };
  }

  const nouveau = await prisma.modelePressOn.findUnique({ where: { id: nouveauId } });
  if (!nouveau) return { ok: false, message: "Set inconnu." };
  if (!nouveau.surMesure || nouveau.collection !== commande.modele.collection) {
    return { ok: false, message: "Ce set n'est pas une variante de celui commandé." };
  }

  const ancien = commande.modele;
  // Le lien de règlement portait l'ancien montant : le garder ferait payer le
  // mauvais prix, en toute discrétion. Il est retiré, et Zélia en renvoie un.
  const paiementDejaDemande = commande.paiementDemandeLe !== null;

  await prisma.commandePressOn.update({
    where: { id: commandeId },
    data: {
      modeleId: nouveauId,
      prixCents: nouveau.prixCents,
      aPartirDe: nouveau.aPartirDe,
      ...(paiementDejaDemande ? { lienPaiement: null, montantDemandeCents: null } : {}),
    },
  });

  revalidatePath("/admin/press-on");
  revalidatePath(`/admin/press-on/${commandeId}`);
  revalidatePath("/mon-espace");

  const changement = `${ancien.nom} → ${nouveau.nom} (${formatPrix(nouveau.prixCents, nouveau.aPartirDe)}).`;

  // Pas de règlement demandé : la cliente n'a encore rien vu de chiffré, et
  // l'e-mail de demande de paiement portera le bon tarif. Un message
  // supplémentaire ne ferait qu'inquiéter sans rien apprendre.
  if (!paiementDejaDemande) {
    return {
      ok: true,
      message: `${changement} La demande de règlement partira au nouveau tarif.`,
    };
  }

  const envoi = await envoyerEmail(
    commande.cliente.email,
    "Le détail de votre set a été ajusté · Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(commande.cliente.prenom)},</p>
      <p>J'ai ajusté le détail de votre set pour qu'il corresponde à ce que vous souhaitez :</p>
      <p style="margin:16px 0">
        <span style="color:#8a6274;text-decoration:line-through">${echapperHtml(ancien.nom)} · ${formatPrix(ancien.prixCents, ancien.aPartirDe)}</span><br>
        <strong>${echapperHtml(nouveau.nom)} · ${formatPrix(nouveau.prixCents, nouveau.aPartirDe)}</strong>
      </p>
      ${motif ? `<p>${echapperHtml(motif)}</p>` : ""}
      <p><strong>Le lien de règlement que vous avez reçu n'est plus valable</strong>, puisqu'il
      portait l'ancien montant. Je vous en renvoie un tout de suite.</p>
      <p>Si cet ajustement ne vous convient pas, dites-le moi avant de régler et nous en reparlons.</p>
      <p style="margin:24px 0">
        <a href="${urlSite()}/mon-espace" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Voir ma commande
        </a>
      </p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  return {
    ok: true,
    message:
      `${changement} ⚠ Le règlement avait déjà été demandé : l'ancien lien portait le mauvais montant, il a été retiré. ` +
      `Renvoyez la demande de règlement.` +
      (envoi.ok
        ? " La cliente vient d'être prévenue par e-mail."
        : " ⚠ L'e-mail n'est pas parti, prévenez-la autrement."),
  };
}
