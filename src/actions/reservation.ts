"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fenetrePourDebut, formatHeure, formatJour, PREAVIS_MS } from "@/lib/creneaux";
import { reservationSchema, urlImageValide } from "@/lib/validations";
import { envoyerEmail } from "@/lib/email";
import { envoyerDemandeAcompte, estNouvelleCliente } from "@/lib/acompte";
import { clienteBloquee, MESSAGE_BLOCAGE } from "@/lib/blocage";
import { urlSite } from "@/lib/site";
import { nouveauCode } from "@/lib/cliente-auth";
import { deposeNecessaire, prestationProposee, trouverDepose } from "@/lib/regles";
import { formatPrix, totalDuree, totalTarifs } from "@/lib/format";

const LIBELLE_ETAT: Record<string, string> = {
  NATUREL: "ongles nus",
  POSE_ZELART: "pose Zelart",
  POSE_EXTERIEURE: "pose faite ailleurs",
};

const LIBELLE_POSE: Record<string, string> = {
  VSP: "vernis semi-permanent",
  GAINAGE: "gainage",
  GEL_X: "Gel X",
  POP_IT: "Pop-it",
};

export type EtatReservation = { erreur?: string };

const CRENEAU_INDISPONIBLE =
  "Ce créneau n'est plus disponible, merci d'en choisir un autre.";

export async function creerReservation(
  _etatPrecedent: EtatReservation,
  formData: FormData
): Promise<EtatReservation> {
  if (formData.get("majeure") !== "on") {
    return { erreur: "Vous devez certifier avoir 18 ans ou plus." };
  }
  if (formData.get("consentementSante") !== "on") {
    return {
      erreur:
        "Vous devez accepter les conditions relatives à votre santé et aux produits utilisés.",
    };
  }

  const analyse = reservationSchema.safeParse({
    prestationIds: formData.getAll("prestationIds").filter((v) => typeof v === "string"),
    debut: formData.get("debut"),
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
    noteCliente: formData.get("noteCliente") ?? undefined,
    inspiration: formData.get("inspiration") ?? undefined,
    etatOngles: formData.get("etatOngles") ?? undefined,
    typePoseActuel: formData.get("typePoseActuel") || null,
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const donnees = analyse.data;

  const { etatOngles, typePoseActuel } = donnees;
  if (etatOngles !== "NATUREL" && !typePoseActuel) {
    return { erreur: "Indiquez le type de pose que vous portez actuellement." };
  }

  if (await clienteBloquee(donnees.email, donnees.telephone)) {
    return { erreur: MESSAGE_BLOCAGE };
  }

  const catalogue = await prisma.prestation.findMany({ where: { active: true } });
  const demandees = [...new Set(donnees.prestationIds)].map((id) =>
    catalogue.find((p) => p.id === id)
  );
  if (demandees.some((p) => !p)) {
    return { erreur: "Une des prestations choisies n'est plus proposée." };
  }
  const prestations = demandees.filter((p) => p !== undefined);

  // Le formulaire filtre déjà, mais il est contournable : on revalide ici.
  if (!prestations.every((p) => prestationProposee(p, etatOngles, typePoseActuel))) {
    return {
      erreur:
        "Une des prestations ne correspond pas à l'état de vos ongles. Reprenez la première étape.",
    };
  }

  const deposeRequise = deposeNecessaire(
    etatOngles,
    typePoseActuel,
    prestations.map((p) => p.typeActe)
  )
    ? trouverDepose(catalogue, typePoseActuel)
    : null;

  // La dépose imposée peut déjà figurer dans la sélection : pas de doublon.
  const lignes = [
    ...prestations.map((prestation) => ({ prestation, automatique: false })),
    ...(deposeRequise && !prestations.some((p) => p.id === deposeRequise.id)
      ? [{ prestation: deposeRequise, automatique: true }]
      : []),
  ];

  const debut = new Date(donnees.debut);
  if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now() + PREAVIS_MS) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  const fenetre = await fenetrePourDebut(debut);
  if (!fenetre) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  const dureeTotale = totalDuree(lignes.map((l) => l.prestation));
  const finRendezVous = new Date(debut.getTime() + dureeTotale * 60_000);

  const imagesInspiration = formData
    .getAll("inspirationImages")
    .filter((v): v is string => typeof v === "string" && urlImageValide(v))
    .slice(0, 3);

  let rendezVousId: string;
  try {
    rendezVousId = await prisma.$transaction(
      async (tx) => {
        // Une seule cliente par fenêtre d'ouverture : tout rendez-vous actif
        // qui chevauche la fenêtre rend le créneau indisponible.
        const conflitRdv = await tx.rendezVous.findFirst({
          where: {
            statut: { not: "ANNULE" },
            debut: { lt: fenetre.fin },
            fin: { gt: fenetre.debut },
          },
          select: { id: true },
        });
        const conflitIndispo = await tx.indisponibilite.findFirst({
          where: { debut: { lt: fenetre.fin }, fin: { gt: fenetre.debut } },
          select: { id: true },
        });
        if (conflitRdv || conflitIndispo) throw new Error("CRENEAU_PRIS");

        // Le consentement se donne, jamais ne se retire tout seul : une
        // réservation sans la case cochée n'annule pas un accord antérieur.
        const accord = formData.get("consentementMarketing") === "on";
        const cliente = await tx.cliente.upsert({
          where: { email: donnees.email },
          update: {
            prenom: donnees.prenom,
            nom: donnees.nom,
            telephone: donnees.telephone,
            ...(accord
              ? { consentementMarketing: true, consentementLe: new Date(), desabonneLe: null }
              : {}),
          },
          create: {
            prenom: donnees.prenom,
            nom: donnees.nom,
            email: donnees.email,
            telephone: donnees.telephone,
            codeParrainage: nouveauCode(),
            consentementMarketing: accord,
            consentementLe: accord ? new Date() : null,
          },
        });

        // Une réservation annulée ne consomme pas l'offre de bienvenue : on
        // compte donc les rendez-vous encore valides, pas toutes les demandes.
        const dejaVenue = await tx.rendezVous.count({
          where: { clienteId: cliente.id, statut: { not: "ANNULE" } },
        });

        // Parrainage : réservé aux nouvelles clientes, une seule fois, et
        // jamais à soi-même.
        //
        // La condition « nouvelle » est indispensable, pas cosmétique : une
        // filleule compte pour sa marraine dès qu'elle a une pose honorée. Sans
        // elle, une habituée pourrait saisir le code d'une amie et la faire
        // monter d'un palier sur-le-champ, sans amener personne.
        const code = String(formData.get("codeParrainage") ?? "").trim().toUpperCase();
        let marrainee = cliente.parraineParId !== null;
        if (code && !marrainee && dejaVenue === 0) {
          const marraine = await tx.cliente.findUnique({
            where: { codeParrainage: code },
            select: { id: true },
          });
          if (marraine && marraine.id !== cliente.id) {
            await tx.cliente.update({
              where: { id: cliente.id },
              data: { parraineParId: marraine.id },
            });
            marrainee = true;
          }
        }

        const rendezVous = await tx.rendezVous.create({
          data: {
            clienteId: cliente.id,
            debut,
            fin: finRendezVous,
            noteCliente: donnees.noteCliente || null,
            inspiration: donnees.inspiration || null,
            etatOngles,
            typePoseActuel,
            consentementSante: true,
            remiseFilleule: marrainee && dejaVenue === 0,
            lignes: {
              create: lignes.map((ligne, ordre) => ({
                prestationId: ligne.prestation.id,
                automatique: ligne.automatique,
                prixCents: ligne.prestation.prixCents,
                ordre,
              })),
            },
            inspirations: { create: imagesInspiration.map((url) => ({ url })) },
          },
        });
        return rendezVous.id;
      },
      { isolationLevel: "Serializable" }
    );
  } catch (e) {
    if (e instanceof Error && e.message === "CRENEAU_PRIS") {
      return { erreur: CRENEAU_INDISPONIBLE };
    }
    console.error("Échec de la réservation", e);
    return { erreur: "Une erreur est survenue, merci de réessayer." };
  }

  // Nouvelle cliente : envoi automatique du lien d'acompte, si Zélia l'a
  // renseigné dans ses réglages.
  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: { clienteId: true },
  });
  if (rendezVous && (await estNouvelleCliente(rendezVous.clienteId, rendezVousId))) {
    await envoyerDemandeAcompte(rendezVousId);
  }

  // Notification à Zélia (sans effet si RESEND_API_KEY / NOTIFY_EMAIL absents)
  const total = totalTarifs(lignes.map((l) => l.prestation));
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Nouvelle demande de RDV — ${donnees.prenom} ${donnees.nom}`,
      `<p>Nouvelle demande de rendez-vous à confirmer :</p>
       <p>${lignes
         .map(
           (l) =>
             `<strong>${l.prestation.nom}</strong> — ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}${l.automatique ? " (dépose ajoutée)" : ""}`
         )
         .join("<br>")}<br>
       <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong><br>
       ${formatJour(debut)} à ${formatHeure(debut)}</p>
       <p>Ongles à l'arrivée : ${LIBELLE_ETAT[etatOngles]}${typePoseActuel ? ` (${LIBELLE_POSE[typePoseActuel]})` : ""}</p>
       <p>${donnees.prenom} ${donnees.nom}<br>
       ${donnees.telephone} · ${donnees.email}</p>
       ${donnees.noteCliente ? `<p>Message : ${donnees.noteCliente}</p>` : ""}
       <p><a href="${urlSite()}/admin">Ouvrir l'espace gérante</a></p>`
    );
  }

  redirect(`/confirmation/${rendezVousId}`);
}
