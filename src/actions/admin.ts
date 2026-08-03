"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { jetonBlob } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { exigerAdmin, fermerSessionAdmin, ouvrirSessionAdmin } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { z } from "zod";
import { dateParis, formatHeure, formatJour } from "@/lib/creneaux";
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
    include: { cliente: true, prestation: true },
  });

  if (statut === "CONFIRME") {
    await envoyerEmail(
      rendezVous.cliente.email,
      "Votre rendez-vous chez Zelart Nails est confirmé 🤍",
      `<p>Bonjour ${rendezVous.cliente.prenom},</p>
       <p>Votre rendez-vous est confirmé :</p>
       <p><strong>${rendezVous.prestation.nom}</strong><br>
       ${formatJour(rendezVous.debut)} à ${formatHeure(rendezVous.debut)}<br>
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

// L'image est envoyée directement du navigateur au stockage (voir
// /api/galerie/upload) ; il ne reste ici qu'à enregistrer sa référence.
export async function enregistrerPhoto(url: string, legende: string): Promise<void> {
  await exigerAdmin();
  let hote: string;
  try {
    const analysee = new URL(url);
    hote = analysee.hostname;
    if (analysee.protocol !== "https:") throw new Error();
  } catch {
    throw new Error("URL d'image inattendue.");
  }
  if (!hote.endsWith(".blob.vercel-storage.com")) {
    throw new Error("URL d'image inattendue.");
  }
  await prisma.photo.create({ data: { url, legende: legende.slice(0, 200) || null } });
  revalidatePath("/admin/galerie");
  revalidatePath("/");
}

export async function supprimerPhoto(id: string): Promise<void> {
  await exigerAdmin();
  const photo = await prisma.photo.delete({ where: { id } });
  try {
    await del(photo.url, { token: jetonBlob() });
  } catch (erreur) {
    console.error("Suppression du fichier blob échouée", erreur);
  }
  revalidatePath("/admin/galerie");
  revalidatePath("/");
}
