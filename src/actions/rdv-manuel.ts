"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { nouveauCodeUnique } from "@/lib/cliente-auth";
import { creneauProposeDepuisSaisie, formatHeure, formatJour } from "@/lib/creneaux";
import { DOMAINE_SANS_EMAIL } from "@/lib/email";
import { totalDuree } from "@/lib/format";

// Rendez-vous pris de vive voix, saisi par Zélia.
//
// Trois différences assumées avec une réservation en ligne :
//   - il naît **confirmé**. La cliente et Zélia se sont mises d'accord de vive
//     voix ; le faire passer par « en attente » lui demanderait de confirmer ce
//     qu'elle vient de décider ;
//   - **aucun e-mail ne part** : ni demande d'acompte, ni notification à
//     elle-même. Elle était dans la conversation ;
//   - **aucune contrainte de créneau** : ni préavis, ni fenêtre d'ouverture. Le
//     calendrier récurrent sert à ce que les clientes ne réservent pas
//     n'importe quand ; Zélia, elle, décide de son propre agenda.
//
// Le contrôle de chevauchement, lui, reste : une double réservation reste une
// double réservation, qu'elle vienne du site ou du carnet.

export type EtatRdvManuel = { ok?: boolean; message?: string };

const saisieSchema = z.object({
  prenom: z.string().trim().min(1, "Indiquez le prénom.").max(60, "Prénom trop long."),
  nom: z.string().trim().min(1, "Indiquez le nom.").max(60, "Nom trop long."),
  telephone: z
    .string()
    .trim()
    .regex(/^(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().toLowerCase().max(120).email("Adresse e-mail invalide.").or(z.literal("")),
  note: z.string().trim().max(500, "Note trop longue.").optional(),
});

/** Adresse de complaisance, unique, qui n'atteint aucune boîte réelle. */
function emailDeComplaisance(): string {
  return `sans-email.${randomBytes(6).toString("hex")}@${DOMAINE_SANS_EMAIL}`;
}

export async function creerRendezVousManuel(
  _etatPrecedent: EtatRdvManuel,
  formData: FormData
): Promise<EtatRdvManuel> {
  await exigerAdmin();

  const debut = creneauProposeDepuisSaisie(String(formData.get("debut") ?? ""));
  if (!debut) return { ok: false, message: "Indiquez une date et une heure valides." };

  const clienteExistante = String(formData.get("clienteId") ?? "").trim();
  const prestationIds = [
    ...new Set(formData.getAll("prestationIds").filter((v): v is string => typeof v === "string")),
  ];

  const prestations = prestationIds.length
    ? await prisma.prestation.findMany({ where: { id: { in: prestationIds } } })
    : [];
  if (prestations.length !== prestationIds.length) {
    return { ok: false, message: "Une des prestations choisies est introuvable." };
  }

  // Sans prestation, la durée ne peut pas se déduire : Zélia la donne. C'est le
  // cas d'un rendez-vous encore flou — « elle passe mardi, on verra sur place ».
  const dureeSaisie = Number(formData.get("dureeMin"));
  const duree =
    prestations.length > 0
      ? totalDuree(prestations)
      : Number.isFinite(dureeSaisie) && dureeSaisie > 0
        ? Math.min(dureeSaisie, 600)
        : 60;
  const fin = new Date(debut.getTime() + duree * 60_000);

  // Coordonnées de la nouvelle cliente : validées avant la transaction, mais
  // enregistrées dedans. Créer la fiche d'abord laissait, sur un créneau déjà
  // pris, une cliente sans rendez-vous dans le fichier — une trace de tentative
  // que Zélia aurait dû nettoyer à la main.
  let nouvelles: z.infer<typeof saisieSchema> | null = null;
  if (!clienteExistante) {
    const analyse = saisieSchema.safeParse({
      prenom: formData.get("prenom"),
      nom: formData.get("nom"),
      telephone: formData.get("telephone") ?? "",
      email: formData.get("email") ?? "",
      note: formData.get("note") ?? undefined,
    });
    if (!analyse.success) {
      return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
    }
    nouvelles = analyse.data;
  }

  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  let cliente: { id: string; prenom: string; nom: string };
  try {
    cliente = await prisma.$transaction(
      async (tx) => {
        const conflit = await tx.rendezVous.findFirst({
          where: { statut: { not: "ANNULE" }, debut: { lt: fin }, fin: { gt: debut } },
          include: { cliente: { select: { prenom: true, nom: true } } },
        });
        if (conflit) {
          throw new Error(
            `CONFLIT:${conflit.cliente.prenom} ${conflit.cliente.nom} à ${formatHeure(conflit.debut)}`
          );
        }

        let retenue = clienteExistante
          ? await tx.cliente.findUnique({
              where: { id: clienteExistante },
              select: { id: true, prenom: true, nom: true },
            })
          : null;

        if (!retenue && nouvelles) {
          // Une adresse déjà connue désigne une cliente existante : on la
          // réutilise plutôt que d'échouer sur la contrainte d'unicité, et
          // surtout plutôt que de couper son historique en deux fiches.
          if (nouvelles.email) {
            retenue = await tx.cliente.findUnique({
              where: { email: nouvelles.email },
              select: { id: true, prenom: true, nom: true },
            });
          }
          retenue ??= await tx.cliente.create({
            data: {
              prenom: nouvelles.prenom,
              nom: nouvelles.nom,
              email: nouvelles.email || emailDeComplaisance(),
              // Une habituée peut n'avoir laissé que son prénom : le numéro est
              // facultatif ici, même si la colonne ne l'est pas.
              telephone: nouvelles.telephone || "",
              codeParrainage: await nouveauCodeUnique(tx),
            },
            select: { id: true, prenom: true, nom: true },
          });
        }

        if (!retenue) throw new Error("SANS_CLIENTE");

        await tx.rendezVous.create({
          data: {
            clienteId: retenue.id,
            debut,
            fin,
            statut: "CONFIRME",
            consentementSante: true,
            noteCliente: note || null,
            lignes: {
              create: prestations.map((prestation, ordre) => ({
                prestationId: prestation.id,
                automatique: false,
                prixCents: prestation.prixCents,
                ordre,
              })),
            },
          },
        });

        return retenue;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("CONFLIT:")) {
      return {
        ok: false,
        message: `Ce créneau chevauche déjà un rendez-vous : ${message.slice(8)}.`,
      };
    }
    if (message === "SANS_CLIENTE") {
      return { ok: false, message: "Choisissez une cliente ou renseignez ses coordonnées." };
    }
    console.error("Échec de la saisie manuelle", e);
    return { ok: false, message: "Une erreur est survenue, réessayez." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${cliente.id}`);
  return {
    ok: true,
    message: `Rendez-vous noté pour ${cliente.prenom} ${cliente.nom}, le ${formatJour(debut)} à ${formatHeure(debut)}.`,
  };
}
