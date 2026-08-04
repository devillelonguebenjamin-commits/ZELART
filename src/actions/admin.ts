"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { optionsBlob } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { exigerAdmin, fermerSessionAdmin, ouvrirSessionAdmin } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { z } from "zod";
import { dateParis, formatHeure, formatJour } from "@/lib/creneaux";
import { envoyerDemandeAcompte } from "@/lib/acompte";
import { formatPrix, totalRendezVous } from "@/lib/format";
import {
  CLE_LIEN_ACOMPTE,
  CLE_MONTANT_ACOMPTE,
  enregistrerParametre,
  lienSumUpValide,
} from "@/lib/parametres";
import type { StatutRendezVous } from "@/generated/prisma/client";

// --- Session ---

export async function connexionAdmin(formData: FormData): Promise<void> {
  const motDePasse = formData.get("motDePasse");
  if (
    !process.env.ADMIN_PASSWORD ||
    typeof motDePasse !== "string" ||
    motDePasse !== process.env.ADMIN_PASSWORD
  ) {
    redirect("/admin/connexion?erreur=1");
  }
  await ouvrirSessionAdmin();
  redirect("/admin");
}

export async function deconnexionAdmin(): Promise<void> {
  await fermerSessionAdmin();
  redirect("/admin/connexion");
}

// --- Rendez-vous ---

const STATUTS: StatutRendezVous[] = ["EN_ATTENTE", "CONFIRME", "ANNULE", "TERMINE", "NO_SHOW"];

export async function changerStatutRendezVous(
  id: string,
  statut: string
): Promise<void> {
  await exigerAdmin();
  if (!STATUTS.includes(statut as StatutRendezVous)) return;

  const rendezVous = await prisma.rendezVous.update({
    where: { id },
    data: { statut: statut as StatutRendezVous },
    include: { cliente: true, prestation: true, depose: true },
  });

  if (statut === "CONFIRME") {
    const total = totalRendezVous(rendezVous.prestation, rendezVous.depose);
    await envoyerEmail(
      rendezVous.cliente.email,
      "Votre rendez-vous chez Zelart Nails est confirmé 🤍",
      `<p>Bonjour ${rendezVous.cliente.prenom},</p>
       <p>Votre rendez-vous est confirmé :</p>
       <p><strong>${rendezVous.prestation.nom}</strong> — ${formatPrix(rendezVous.prestation.prixCents, rendezVous.prestation.aPartirDe)}<br>
       ${rendezVous.depose ? `<strong>${rendezVous.depose.nom}</strong> — ${formatPrix(rendezVous.depose.prixCents, rendezVous.depose.aPartirDe)}<br>` : ""}
       <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong></p>
       <p>${formatJour(rendezVous.debut)} à ${formatHeure(rendezVous.debut)}<br>
       L'Atelier du Regard — 108 avenue de la République, 44600 Saint-Nazaire</p>
       <p>À très vite,<br>Zélia ✨</p>`
    );
  }

  revalidatePath("/admin");
}

// --- Clientes ---

export async function enregistrerNotesCliente(
  clienteId: string,
  formData: FormData
): Promise<void> {
  await exigerAdmin();
  const notes = String(formData.get("notes") ?? "").slice(0, 2000);
  await prisma.cliente.update({ where: { id: clienteId }, data: { notes: notes || null } });
  revalidatePath(`/admin/clientes/${clienteId}`);
}

// --- Prestations ---

export async function modifierPrestation(formData: FormData): Promise<void> {
  await exigerAdmin();
  const id = String(formData.get("id") ?? "");
  const prixEuros = Number(String(formData.get("prixEuros") ?? "").replace(",", "."));
  const dureeMin = Number(formData.get("dureeMin"));
  if (!id || !Number.isFinite(prixEuros) || prixEuros < 0 || !Number.isInteger(dureeMin) || dureeMin <= 0) {
    return;
  }
  await prisma.prestation.update({
    where: { id },
    data: {
      prixCents: Math.round(prixEuros * 100),
      dureeMin,
      active: formData.get("active") === "on",
      aPartirDe: formData.get("aPartirDe") === "on",
    },
  });
  revalidatePath("/admin/prestations");
  revalidatePath("/");
}

// --- Congés / indisponibilités ---

function joursDepuisChamp(valeur: FormDataEntryValue | null): [number, number, number] | null {
  const texte = String(valeur ?? "");
  const m = texte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export async function ajouterConge(formData: FormData): Promise<void> {
  await exigerAdmin();
  const debutJ = joursDepuisChamp(formData.get("dateDebut"));
  const finJ = joursDepuisChamp(formData.get("dateFin")) ?? debutJ;
  if (!debutJ || !finJ) return;

  const debut = dateParis(debutJ[0], debutJ[1], debutJ[2], 0, 0);
  // Fin inclusive : on bloque jusqu'au lendemain 00h00 (heure de Paris)
  const lendemain = new Date(Date.UTC(finJ[0], finJ[1] - 1, finJ[2], 12) + 24 * 60 * 60 * 1000);
  const fin = dateParis(
    lendemain.getUTCFullYear(),
    lendemain.getUTCMonth() + 1,
    lendemain.getUTCDate(),
    0,
    0
  );
  if (fin <= debut) return;

  await prisma.indisponibilite.create({
    data: { debut, fin, motif: String(formData.get("motif") ?? "").slice(0, 200) || null },
  });
  revalidatePath("/admin/conges");
}

export async function supprimerConge(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.indisponibilite.delete({ where: { id } });
  revalidatePath("/admin/conges");
}

// --- Acompte ---

export async function marquerAcompteRegle(id: string, regle: boolean): Promise<void> {
  await exigerAdmin();
  await prisma.rendezVous.update({
    where: { id },
    data: { acompteRegleLe: regle ? new Date() : null },
  });
  revalidatePath("/admin");
}

export type EtatAcompte = { ok?: boolean; message?: string };

export async function renvoyerLienAcompte(id: string): Promise<void> {
  await exigerAdmin();
  await envoyerDemandeAcompte(id);
  revalidatePath("/admin");
}

export async function enregistrerReglagesAcompte(
  _etatPrecedent: EtatAcompte,
  formData: FormData
): Promise<EtatAcompte> {
  await exigerAdmin();

  const lien = String(formData.get("lienAcompte") ?? "").trim();
  const montant = Number(String(formData.get("montantAcompte") ?? "").replace(",", "."));

  if (lien && !lienSumUpValide(lien)) {
    return { ok: false, message: "Ce lien ne provient pas de SumUp (adresse en https://…sumup.com)." };
  }
  if (!Number.isFinite(montant) || montant <= 0) {
    return { ok: false, message: "Montant invalide." };
  }

  await enregistrerParametre(CLE_LIEN_ACOMPTE, lien);
  await enregistrerParametre(CLE_MONTANT_ACOMPTE, String(Math.round(montant * 100)));
  revalidatePath("/admin/reglages");
  revalidatePath("/admin");

  return {
    ok: true,
    message: lien
      ? "Réglages enregistrés — le lien partira automatiquement aux nouvelles clientes."
      : "Lien retiré : plus aucun envoi automatique d'acompte.",
  };
}

// --- Diagnostic e-mail ---

export type EtatTestEmail = { ok?: boolean; message?: string };

export async function envoyerEmailTest(
  _etatPrecedent: EtatTestEmail,
  formData: FormData
): Promise<EtatTestEmail> {
  await exigerAdmin();

  const destinataire = z
    .string()
    .trim()
    .email()
    .safeParse(formData.get("destinataire"));
  if (!destinataire.success) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }

  const resultat = await envoyerEmail(
    destinataire.data,
    "Test d'envoi — Zelart Nails",
    `<p>Bonjour,</p>
     <p>Ceci est un e-mail de test envoyé depuis l'espace gérante du site Zelart Nails.</p>
     <p>Si vous le recevez, les notifications de rendez-vous fonctionnent ✨</p>`
  );

  return resultat.ok
    ? { ok: true, message: `E-mail envoyé à ${destinataire.data} via ${resultat.fournisseur}. Vérifiez la boîte de réception (et les indésirables).` }
    : { ok: false, message: resultat.erreur };
}

// --- Galerie ---

// L'ajout de photo est traité par la route /api/galerie/upload, qui contourne
// la limite de 1 Mo imposée aux Server Actions.

export async function supprimerPhoto(id: string): Promise<void> {
  await exigerAdmin();
  const photo = await prisma.photo.delete({ where: { id } });
  try {
    await del(photo.url, optionsBlob());
  } catch (erreur) {
    console.error("Suppression du fichier blob échouée", erreur);
  }
  revalidatePath("/admin/galerie");
  revalidatePath("/");
}
