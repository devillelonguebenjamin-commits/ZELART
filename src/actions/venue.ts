"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { recompenserMarraine } from "@/lib/parrainage-email";
import { LIBELLE_AVANTAGE } from "@/lib/parrainage-bareme";
import { dateParis, partiesParis } from "@/lib/creneaux";

export type EtatVenue = { ok?: boolean; message?: string };

/**
 * Confirme qu'une cliente est bien venue, avec un mot sur la visite.
 *
 * C'est le même geste que le bouton « Terminé » de l'agenda, enrichi de deux
 * choses : le commentaire, et surtout le retour de ce que la validation a
 * déclenché chez la marraine — sinon Zélia offre une manucure sans le savoir.
 */
/**
 * Revient sur une validation de venue.
 *
 * Le geste manquait, et son absence coûtait cher : un clic malheureux sur la
 * carte voisine marquait « venue » une cliente attendue dans un mois, et rien
 * ne permettait de le défaire. Le rendez-vous repart donc en « confirmé », et
 * pourra être validé le jour venu.
 *
 * Ce que cette annulation ne peut pas défaire, et qu'elle dit franchement
 * plutôt que de le passer sous silence : si la cliente est une filleule, la
 * validation a pu débloquer un palier chez sa marraine, **et l'e-mail est
 * parti**. Un message envoyé ne se rappelle pas. Le palier, lui, se recalcule
 * tout seul à la baisse puisqu'il se déduit des venues réelles ; l'avantage
 * déjà accordé reste, et se retire depuis l'écran Parrainage.
 */
export async function annulerVenue(rendezVousId: string): Promise<EtatVenue> {
  await exigerAdmin();

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: {
      statut: true,
      clienteId: true,
      cliente: { select: { prenom: true, parraineParId: true } },
    },
  });
  if (!rendezVous) return { ok: false, message: "Ce rendez-vous est introuvable." };
  if (rendezVous.statut !== "TERMINE") {
    return { ok: false, message: "Ce rendez-vous n'est pas marqué comme réalisé." };
  }

  await prisma.rendezVous.update({
    where: { id: rendezVousId },
    data: { statut: "CONFIRME" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/parrainage");
  revalidatePath(`/admin/clientes/${rendezVous.clienteId}`);

  const base = `${rendezVous.cliente.prenom} repasse en « confirmé ». Vous pourrez valider sa venue le jour du rendez-vous.`;

  // Aucune marraine : rien d'autre à signaler.
  if (!rendezVous.cliente.parraineParId) return { ok: true, message: base };

  const avantages = await prisma.avantageParrainage.findMany({
    where: { clienteId: rendezVous.cliente.parraineParId, utiliseLe: null },
    select: { type: true },
  });
  if (avantages.length === 0) return { ok: true, message: base };

  return {
    ok: true,
    message:
      `${base} Attention : c'est une filleule, et sa marraine a des avantages non utilisés ` +
      `(${avantages.map((a) => LIBELLE_AVANTAGE[a.type]).join(", ")}). Si l'un d'eux vient de ` +
      `cette validation, retirez-le depuis l'onglet Parrainage. L'e-mail qui l'annonçait, lui, est déjà parti.`,
  };
}

/**
 * Heure de fin réelle, à partir de l'heure saisie (« 16:45 ») et du jour du
 * rendez-vous.
 *
 * Le jour vient du rendez-vous et non de la saisie : Zélia note une heure, pas
 * une date. Une pose qui déborde après minuit est le seul cas où cela
 * tromperait — on le traite en reportant au lendemain plutôt qu'en produisant
 * une durée négative.
 */
function finReelleDepuisHeure(saisie: string, debut: Date): Date | null {
  const m = saisie.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const heure = Number(m[1]);
  const minute = Number(m[2]);
  if (heure > 23 || minute > 59) return null;

  const jour = partiesParis(debut);
  let fin = dateParis(jour.annee, jour.mois, jour.jour, heure, minute);
  if (fin <= debut) fin = new Date(fin.getTime() + 24 * 60 * 60 * 1000);
  // Au-delà, c'est une faute de frappe plutôt qu'une très longue pose.
  if (fin.getTime() - debut.getTime() > 12 * 60 * 60 * 1000) return null;
  return fin;
}

/** Montant saisi en euros, rendu en centimes. `null` si le champ est vide. */
function centimesDepuisChamp(valeur: FormDataEntryValue | null): number | null {
  const texte = String(valeur ?? "").trim().replace(",", ".");
  if (!texte) return null;
  const euros = Number(texte);
  if (!Number.isFinite(euros) || euros < 0 || euros > 10_000) return null;
  return Math.round(euros * 100);
}

export async function validerVenue(
  rendezVousId: string,
  _etatPrecedent: EtatVenue,
  formData: FormData
): Promise<EtatVenue> {
  await exigerAdmin();

  const commentaire = String(formData.get("commentaire") ?? "").trim().slice(0, 1000);

  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: {
      statut: true,
      debut: true,
      fin: true,
      clienteId: true,
      cliente: { select: { prenom: true } },
      lignes: { select: { id: true, prestationId: true } },
    },
  });
  if (!rendezVous) return { ok: false, message: "Ce rendez-vous est introuvable." };

  // Déjà validé : on met à jour le commentaire sans repasser par le
  // parrainage, qui a déjà été honoré.
  const dejaValide = rendezVous.statut === "TERMINE";

  // Le contrôle est ici et pas seulement dans l'affichage : un bouton caché
  // reste atteignable, et c'est précisément cette validation-là qui a été faite
  // par erreur sur un rendez-vous situé un mois plus tard. Une venue ne se
  // constate pas à l'avance.
  //
  // La retouche du commentaire échappe à la règle : elle ne prétend rien sur la
  // présence de la cliente, et c'est justement ce qu'on veut pouvoir faire sur
  // un rendez-vous validé à tort avant de l'annuler.
  if (!dejaValide && rendezVous.fin > new Date()) {
    return {
      ok: false,
      message: "Ce rendez-vous n'a pas encore eu lieu : sa venue se validera le jour venu.",
    };
  }

  // Fiche de sortie : l'heure réelle et les montants encaissés se notent au
  // moment où la cliente s'en va, parce que c'est le seul moment où on les
  // connaît. Les demander plus tard, c'est ne jamais les avoir.
  const finReelle = finReelleDepuisHeure(
    String(formData.get("finReelle") ?? ""),
    rendezVous.debut
  );

  const montants = rendezVous.lignes
    .map((ligne) => ({ ligne, cents: centimesDepuisChamp(formData.get(`prix_${ligne.id}`)) }))
    .filter((x): x is { ligne: (typeof rendezVous.lignes)[number]; cents: number } => x.cents !== null);

  await prisma.$transaction([
    prisma.rendezVous.update({
      where: { id: rendezVousId },
      data: {
        statut: "TERMINE",
        commentaireVisite: commentaire || null,
        // Une heure illisible n'efface pas celle déjà notée : la saisie est
        // facultative, et un champ vide veut dire « je ne la note pas », pas
        // « oublie ce que tu savais ».
        ...(finReelle ? { finReelle } : {}),
      },
    }),
    ...montants.map(({ ligne, cents }) =>
      prisma.lignePrestation.update({
        where: { id: ligne.id },
        data: { prixCents: cents, prixConfirme: true },
      })
    ),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/chiffres");
  revalidatePath(`/admin/clientes/${rendezVous.clienteId}`);

  if (dejaValide) {
    return { ok: true, message: "Commentaire enregistré." };
  }

  const deblocage = await recompenserMarraine(rendezVous.clienteId);
  const base = `Venue de ${rendezVous.cliente.prenom} confirmée.`;

  if (!deblocage) return { ok: true, message: base };

  return {
    ok: true,
    message:
      `${base} 🎉 ${deblocage.marraine} passe ${deblocage.palier} et débloque : ` +
      `${deblocage.avantages.join(", ")}. Elle vient d'en être prévenue par e-mail.`,
  };
}
