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
import { formatPrix, totalTarifs } from "@/lib/format";
import {
  CLE_AUTRE_RESEAU,
  CLE_AUTRE_RESEAU_LIBELLE,
  CLE_INSTAGRAM,
  CLE_LIEN_ACOMPTE,
  CLE_TIKTOK,
  normaliserLienReseau,
  reseauxPourEmail,
  CLE_MONTANT_ACOMPTE,
  enregistrerParametre,
  lienSumUpValide,
} from "@/lib/parametres";
import {
  CLE_ETABLISSEMENT,
  CLE_PLACE_ID,
  chercherEtablissement,
  detaillerEtablissement,
  normaliserRechercheAvis,
  oublierCacheAvis,
  type Candidat,
} from "@/lib/avis";
import { notifierListeAttente } from "@/lib/liste-attente";
import { recompenserMarraine } from "@/lib/parrainage-email";
import { urlSite } from "@/lib/site";
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
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });

  if (statut === "CONFIRME") {
    const total = totalTarifs(rendezVous.lignes.map((l) => l.prestation));
    await envoyerEmail(
      rendezVous.cliente.email,
      "Votre rendez-vous chez Zelart Nails est confirmé 🤍",
      `<p>Bonjour ${rendezVous.cliente.prenom},</p>
       <p>Votre rendez-vous est confirmé :</p>
       <p>${rendezVous.lignes
         .map(
           (l) =>
             `<strong>${l.prestation.nom}</strong> — ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}`
         )
         .join("<br>")}<br>
       <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong></p>
       <p>${formatJour(rendezVous.debut)} à ${formatHeure(rendezVous.debut)}<br>
       L'Atelier du Regard — 108 avenue de la République, 44600 Saint-Nazaire</p>
       <p><a href="${urlSite()}/api/calendrier/${rendezVous.id}">📅 Ajouter à mon calendrier</a></p>
       <p>À très vite,<br>Zélia ✨</p>
       ${await reseauxPourEmail()}`
    );
  }

  // Une annulation libère le créneau : la liste d'attente peut être intéressée.
  if (statut === "ANNULE") {
    await notifierListeAttente();
  }

  // Une filleule qui vient de passer en « Terminé » entre dans la squad de sa
  // marraine : c'est le moment de recalculer son palier.
  if (statut === "TERMINE") {
    await recompenserMarraine(rendezVous.clienteId);
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

export type EtatReseaux = { ok?: boolean; message?: string };

export async function enregistrerReseaux(
  _etatPrecedent: EtatReseaux,
  formData: FormData
): Promise<EtatReseaux> {
  await exigerAdmin();

  const champs = [
    { cle: CLE_INSTAGRAM, nom: "instagram", plateforme: "instagram" as const, libelle: "Instagram" },
    { cle: CLE_TIKTOK, nom: "tiktok", plateforme: "tiktok" as const, libelle: "TikTok" },
    { cle: CLE_AUTRE_RESEAU, nom: "autre", plateforme: "libre" as const, libelle: "Autre lien" },
  ];

  const aEnregistrer: { cle: string; valeur: string }[] = [];
  for (const champ of champs) {
    const saisie = String(formData.get(champ.nom) ?? "");
    const lien = normaliserLienReseau(saisie, champ.plateforme);
    if (lien === null) {
      return {
        ok: false,
        message:
          champ.plateforme === "libre"
            ? "Le lien libre doit être une adresse complète commençant par https://."
            : `${champ.libelle} : indiquez un pseudo (@zelart) ou une adresse complète.`,
      };
    }
    aEnregistrer.push({ cle: champ.cle, valeur: lien });
  }

  aEnregistrer.push({
    cle: CLE_AUTRE_RESEAU_LIBELLE,
    valeur: String(formData.get("autreLibelle") ?? "").trim().slice(0, 30),
  });

  for (const { cle, valeur } of aEnregistrer) {
    await enregistrerParametre(cle, valeur);
  }

  // Ces liens apparaissent dans le pied de page, donc sur toutes les pages.
  revalidatePath("/", "layout");

  const actifs = aEnregistrer.filter((p) => p.cle !== CLE_AUTRE_RESEAU_LIBELLE && p.valeur).length;
  return {
    ok: true,
    message:
      actifs > 0
        ? `Enregistré — ${actifs} lien${actifs > 1 ? "s" : ""} affiché${actifs > 1 ? "s" : ""} sur le site.`
        : "Enregistré — aucun réseau n'est affiché pour le moment.",
  };
}

// --- Avis Google ---

export type EtatAvis = { ok?: boolean; message?: string; candidats?: Candidat[] };

export async function gererAvisGoogle(
  _etatPrecedent: EtatAvis,
  formData: FormData
): Promise<EtatAvis> {
  await exigerAdmin();
  const intention = String(formData.get("intention") ?? "");

  if (intention === "deconnecter") {
    await enregistrerParametre(CLE_PLACE_ID, "");
    await enregistrerParametre(CLE_ETABLISSEMENT, "");
    await oublierCacheAvis();
    revalidatePath("/");
    revalidatePath("/admin/reglages");
    return { ok: true, message: "Les avis Google ne sont plus affichés sur le site." };
  }

  if (intention === "rafraichir") {
    await oublierCacheAvis();
    revalidatePath("/");
    return { ok: true, message: "Avis rafraîchis : la page d'accueil rappellera Google." };
  }

  if (intention === "connecter") {
    const placeId = String(formData.get("placeId") ?? "").trim();
    if (!placeId) return { ok: false, message: "Établissement introuvable, relancez la recherche." };
    await enregistrerParametre(CLE_PLACE_ID, placeId);
    await enregistrerParametre(CLE_ETABLISSEMENT, String(formData.get("nom") ?? "").slice(0, 200));
    await oublierCacheAvis();
    revalidatePath("/");
    revalidatePath("/admin/reglages");
    return { ok: true, message: "Établissement connecté — les avis apparaissent sur l'accueil." };
  }

  const cible = normaliserRechercheAvis(String(formData.get("requete") ?? ""));
  if (!cible) {
    return {
      ok: false,
      message: "Indiquez le nom de l'établissement, ou collez le lien de sa page Google.",
    };
  }

  try {
    const candidats =
      "placeId" in cible
        ? [await detaillerEtablissement(cible.placeId)]
        : await chercherEtablissement(cible.requete);
    if (candidats.length === 0) {
      return {
        ok: false,
        message:
          "Google ne trouve aucun établissement à ce nom. Reprenez le nom exact de la fiche, avec la ville.",
      };
    }
    return { ok: true, candidats };
  } catch (erreur) {
    return { ok: false, message: erreur instanceof Error ? erreur.message : "Recherche impossible." };
  }
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
