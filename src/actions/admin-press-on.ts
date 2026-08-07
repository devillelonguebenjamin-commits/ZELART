"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatPrix } from "@/lib/format";
import { LIBELLE_REMISE, totalCommande } from "@/lib/press-on";
import { reglagesAcompte } from "@/lib/parametres";
import type { StatutCommandePressOn } from "@/generated/prisma/client";

const STATUTS: StatutCommandePressOn[] = [
  "DEMANDE",
  "A_PAYER",
  "PAYEE",
  "EN_FABRICATION",
  "PRETE",
  "REMISE",
  "ANNULEE",
];

function rafraichir(commandeId: string): void {
  revalidatePath("/admin/press-on");
  revalidatePath(`/admin/press-on/${commandeId}`);
  revalidatePath("/mon-espace");
}

// --- Commandes ---

export async function changerStatutCommande(id: string, statut: string): Promise<void> {
  await exigerAdmin();
  if (!STATUTS.includes(statut as StatutCommandePressOn)) return;
  const nouveau = statut as StatutCommandePressOn;

  const commande = await prisma.commandePressOn.findUnique({
    where: { id },
    include: { cliente: true, modele: true },
  });
  if (!commande) return;

  await prisma.commandePressOn.update({
    where: { id },
    data: {
      statut: nouveau,
      // Ces dates racontent l'histoire de la commande : on ne les récrit pas si
      // Zélia repasse par une étape déjà franchie.
      ...(nouveau === "PAYEE" && !commande.paiementRecuLe ? { paiementRecuLe: new Date() } : {}),
      ...(nouveau === "REMISE" && !commande.remiseLe ? { remiseLe: new Date() } : {}),
    },
  });

  if (nouveau === "PRETE") {
    const enMainPropre = commande.modeRemise === "MAIN_PROPRE";
    await envoyerEmail(
      commande.cliente.email,
      "Votre set de press-on est prêt ✨",
      `<p>Bonjour ${echapperHtml(commande.cliente.prenom)},</p>
       <p>Votre set <strong>${echapperHtml(commande.modele.nom)}</strong> est terminé !</p>
       <p>${
         enMainPropre
           ? "Écrivez-moi par SMS au 06 45 29 20 01 pour convenir du moment de la remise."
           : "Il part par voie postale à l'adresse indiquée lors de votre commande."
       }</p>
       <p>À très vite,<br>Zélia ✨</p>`
    );
  }

  rafraichir(id);
}

// Les frais de port doivent être annoncés avant validation de la commande
// (CGV) : Zélia les chiffre ici, puis envoie le lien de paiement.
export async function enregistrerFraisPort(formData: FormData): Promise<void> {
  await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const saisie = String(formData.get("fraisPortEuros") ?? "").replace(",", ".").trim();
  if (!id) return;

  // Champ vidé : on repasse à « frais non chiffrés », ce qui n'est pas 0 €.
  if (saisie === "") {
    await prisma.commandePressOn.update({ where: { id }, data: { fraisPortCents: null } });
    rafraichir(id);
    return;
  }

  const euros = Number(saisie);
  if (!Number.isFinite(euros) || euros < 0 || euros > 200) return;

  await prisma.commandePressOn.update({
    where: { id },
    data: { fraisPortCents: Math.round(euros * 100) },
  });
  rafraichir(id);
}

export async function enregistrerNoteCommande(id: string, formData: FormData): Promise<void> {
  await exigerAdmin();
  const note = String(formData.get("note") ?? "").slice(0, 2000);
  await prisma.commandePressOn.update({ where: { id }, data: { note: note || null } });
  rafraichir(id);
}

export type EtatEnvoiPaiement = { ok?: boolean; message?: string };

// Envoie le montant à régler et le lien SumUp, et bascule la commande en
// « en attente de règlement ». Sans lien configuré, rien n'est envoyé.
export async function envoyerDemandePaiement(id: string): Promise<EtatEnvoiPaiement> {
  await exigerAdmin();

  const { lien } = await reglagesAcompte();
  if (!lien) {
    return {
      ok: false,
      message: "Renseignez d'abord votre lien de paiement SumUp dans les réglages.",
    };
  }

  const commande = await prisma.commandePressOn.findUnique({
    where: { id },
    include: { cliente: true, modele: true },
  });
  if (!commande) return { ok: false, message: "Commande introuvable." };
  if (commande.modeRemise === "POSTAL" && commande.fraisPortCents === null) {
    return { ok: false, message: "Chiffrez les frais de port avant de demander le règlement." };
  }

  const total = totalCommande(commande);
  const resultat = await envoyerEmail(
    commande.cliente.email,
    `Votre commande de press-on — ${formatPrix(total.prixCents, total.aPartirDe)}`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${commande.cliente.prenom},</p>
      <p>Merci pour votre commande :</p>
      <p><strong>${commande.modele.nom}</strong> — ${formatPrix(commande.prixCents, commande.aPartirDe)}<br>
      ${
        commande.fraisPortCents !== null
          ? `Frais d'envoi — ${formatPrix(commande.fraisPortCents)}<br>`
          : ""
      }
      <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong><br>
      ${LIBELLE_REMISE[commande.modeRemise]}</p>
      <p>Les press-on étant réalisés sur-mesure, le règlement est demandé
      <strong>avant la fabrication</strong>.</p>
      <p style="margin:24px 0">
        <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Régler ma commande
        </a>
      </p>
      <p style="font-size:13px;color:#8a6274">Le paiement est traité par SumUp. Votre set est lancé
      dès réception du règlement. Les press-on étant personnalisés, aucun retour ni remboursement
      n'est possible ; en cas de défaut visible à la remise, un échange ou un ajustement vous est
      proposé.</p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  if (!resultat.ok) {
    return { ok: false, message: resultat.erreur };
  }

  await prisma.commandePressOn.update({
    where: { id },
    data: { statut: "A_PAYER", paiementDemandeLe: new Date() },
  });
  rafraichir(id);
  return { ok: true, message: `Demande de règlement envoyée à ${commande.cliente.email}.` };
}

// --- Catalogue ---

const modeleSchema = z.object({
  nom: z.string().trim().min(2, "Le nom est trop court.").max(80, "Le nom est trop long."),
  collection: z
    .string()
    .trim()
    .min(2, "Indiquez une collection.")
    .max(60, "Le nom de collection est trop long."),
  description: z.string().trim().max(300, "La description est trop longue.").optional(),
  prixEuros: z.coerce.number().min(0, "Le prix ne peut pas être négatif.").max(1000),
});

export type EtatModele = { ok?: boolean; message?: string };

export async function creerModelePressOn(
  _etatPrecedent: EtatModele,
  formData: FormData
): Promise<EtatModele> {
  await exigerAdmin();

  const analyse = modeleSchema.safeParse({
    nom: formData.get("nom"),
    collection: formData.get("collection"),
    description: formData.get("description") ?? undefined,
    prixEuros: formData.get("prixEuros"),
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const dernier = await prisma.modelePressOn.findFirst({ orderBy: { ordre: "desc" } });
  await prisma.modelePressOn.create({
    data: {
      nom: analyse.data.nom,
      collection: analyse.data.collection,
      description: analyse.data.description || null,
      prixCents: Math.round(analyse.data.prixEuros * 100),
      aPartirDe: formData.get("aPartirDe") === "on",
      surMesure: formData.get("surMesure") === "on",
      ordre: (dernier?.ordre ?? -1) + 1,
    },
  });

  revalidatePath("/admin/press-on");
  revalidatePath("/press-on");
  return { ok: true, message: `Modèle « ${analyse.data.nom} » ajouté.` };
}

export async function modifierModelePressOn(formData: FormData): Promise<void> {
  await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const euros = Number(String(formData.get("prixEuros") ?? "").replace(",", "."));
  if (!id || !Number.isFinite(euros) || euros < 0) return;

  await prisma.modelePressOn.update({
    where: { id },
    data: {
      prixCents: Math.round(euros * 100),
      aPartirDe: formData.get("aPartirDe") === "on",
      actif: formData.get("actif") === "on",
    },
  });

  revalidatePath("/admin/press-on");
  revalidatePath("/press-on");
}

export async function supprimerModelePressOn(id: string): Promise<void> {
  await exigerAdmin();

  // Un modèle déjà commandé garde sa trace : on le retire de la vitrine sans
  // rompre l'historique des commandes.
  const commandes = await prisma.commandePressOn.count({ where: { modeleId: id } });
  if (commandes > 0) {
    await prisma.modelePressOn.update({ where: { id }, data: { actif: false } });
  } else {
    await prisma.modelePressOn.delete({ where: { id } });
  }

  revalidatePath("/admin/press-on");
  revalidatePath("/press-on");
}
