"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  creneauProposeDepuisSaisie,
  fenetrePourDebut,
  finPlageContinue,
  formatHeure,
  formatJour,
  HORIZON_PROPOSITION_JOURS,
  PREAVIS_MS,
  propositionDansLesBornes,
} from "@/lib/creneaux";
import { reservationSchema, urlImageValide } from "@/lib/validations";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { envoyerDemandeAcompte, acompteADemander } from "@/lib/acompte";
import { clienteBloquee, MESSAGE_BLOCAGE } from "@/lib/blocage";
import { urlSite } from "@/lib/site";
import { ficheCliente } from "@/lib/fiche-cliente";
import { provenanceValide } from "@/lib/provenance";
import { deposeNecessaire, prestationProposee, trouverDepose } from "@/lib/regles";
import { REMISE_FILLEULE_POURCENT } from "@/lib/parrainage";
import { formatDuree, formatPrix, totalDuree, totalTarifs } from "@/lib/format";

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
    provenance: formData.get("provenance") ?? undefined,
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

  // Deux chemins possibles : un créneau ouvert choisi dans la liste, ou une
  // proposition libre de la cliente quand aucun ne lui convient.
  const propose = formData.get("creneauPropose") === "on";
  const dureeTotale = totalDuree(lignes.map((l) => l.prestation));

  let debut: Date;
  let fenetre: { debut: Date; fin: Date };

  if (propose) {
    const souhaite = creneauProposeDepuisSaisie(String(formData.get("dateProposee") ?? ""));
    if (!souhaite) {
      return { erreur: "Indiquez la date et l'heure que vous souhaitez proposer." };
    }
    if (!propositionDansLesBornes(souhaite)) {
      return {
        erreur: `Proposez un horaire situé entre 24 h et ${HORIZON_PROPOSITION_JOURS} jours à partir de maintenant.`,
      };
    }
    debut = souhaite;
    // Aucune fenêtre d'ouverture ne correspond : la durée des prestations
    // délimite le créneau, et c'est elle qui sert au contrôle de chevauchement.
    fenetre = { debut, fin: new Date(debut.getTime() + dureeTotale * 60_000) };
  } else {
    if (!donnees.debut) return { erreur: "Choisissez un créneau." };
    debut = new Date(donnees.debut);
    if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now() + PREAVIS_MS) {
      return { erreur: CRENEAU_INDISPONIBLE };
    }
    const ouverte = await fenetrePourDebut(debut);
    if (!ouverte) {
      return { erreur: CRENEAU_INDISPONIBLE };
    }

    // Rien ne vérifiait que les prestations tenaient dans la journée : six
    // prestations cumulées débordaient l'heure de fermeture sans que personne
    // en soit averti — un rendez-vous de 9 h finissant à 14 h, pause déjeuner
    // comprise.
    //
    // La limite n'est pas la fenêtre choisie mais la **plage continue** dans
    // laquelle elle s'inscrit : les créneaux d'une journée se touchent, et une
    // pose qui déborde sur le suivant ne gêne personne puisqu'il n'y a qu'une
    // cliente à la fois. S'arrêter à la fenêtre rendait un nail art niveau 3
    // avec dépose irréservable ailleurs qu'au premier créneau du jour.
    const finPlage = await finPlageContinue(debut);
    const finPrestations = new Date(debut.getTime() + dureeTotale * 60_000);
    if (!finPlage || finPrestations > finPlage) {
      const disponible = finPlage ? (finPlage.getTime() - debut.getTime()) / 60_000 : 0;
      return {
        erreur: `Ces prestations demandent environ ${formatDuree(dureeTotale)}, et il reste ${formatDuree(disponible)} avant la fermeture à partir de cet horaire. Choisissez un créneau plus tôt dans la journée, retirez une prestation, ou écrivez-moi par SMS au 06 45 29 20 01 pour convenir d'un rendez-vous plus long.`,
      };
    }

    // Le créneau retenu s'étend jusqu'à la fin des prestations quand elles
    // débordent : sans cela, la fenêtre suivante resterait proposée à une autre
    // cliente alors que Zélia y est déjà occupée.
    fenetre = {
      debut: ouverte.debut,
      fin: finPrestations > ouverte.fin ? finPrestations : ouverte.fin,
    };
  }

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

        const accord = formData.get("consentementMarketing") === "on";
        const cliente = await ficheCliente(
          tx,
          {
            ...donnees,
            provenance: provenanceValide(donnees.provenance ?? "") ? donnees.provenance : null,
          },
          accord
        );

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
            creneauPropose: propose,
            remiseFilleule: marrainee && dejaVenue === 0,
            // Le taux est figé ici, comme le prix de chaque ligne : le barème
            // peut évoluer, ce qui a été annoncé à cette cliente ne bouge pas.
            remiseFilleulePourcent:
              marrainee && dejaVenue === 0 ? REMISE_FILLEULE_POURCENT : null,
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
    // P2034 : conflit d'écriture entre deux transactions sérialisables. Sur ce
    // chemin, cela ne peut vouloir dire qu'une chose — deux clientes ont visé le
    // même créneau en même temps. La transaction a bien protégé la base, mais
    // « une erreur est survenue » laissait croire à une panne du site.
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2034") {
      return { erreur: CRENEAU_INDISPONIBLE };
    }
    console.error("Échec de la réservation", e);
    return { erreur: "Une erreur est survenue, merci de réessayer." };
  }

  // Cliente inconnue et non dispensée : envoi automatique du lien d'acompte,
  // si Zélia l'a renseigné dans ses réglages.
  //
  // Sauf sur un horaire proposé : réclamer un acompte pour une heure que Zélia
  // n'a pas encore acceptée reviendrait à faire payer un rendez-vous qui peut
  // ne pas avoir lieu. La demande part à l'acceptation.
  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id: rendezVousId },
    select: { clienteId: true },
  });
  if (!propose && rendezVous && (await acompteADemander(rendezVous.clienteId, rendezVousId))) {
    await envoyerDemandeAcompte(rendezVousId);
  }

  // Notification à Zélia (sans effet si RESEND_API_KEY / NOTIFY_EMAIL absents)
  const total = totalTarifs(lignes.map((l) => l.prestation));
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `${propose ? "Créneau proposé" : "Nouvelle demande de RDV"} · ${donnees.prenom} ${donnees.nom}`,
      `<p>Nouvelle demande de rendez-vous à confirmer :</p>
       ${propose ? "<p><strong>⚠ Horaire proposé par la cliente</strong>, hors de vos créneaux habituels, à accepter ou refuser.</p>" : ""}
       <p>${lignes
         .map(
           (l) =>
             `<strong>${echapperHtml(l.prestation.nom)}</strong> : ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}${l.automatique ? " (dépose ajoutée)" : ""}`
         )
         .join("<br>")}<br>
       <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong><br>
       ${formatJour(debut)} à ${formatHeure(debut)}</p>
       <p>Ongles à l'arrivée : ${LIBELLE_ETAT[etatOngles]}${typePoseActuel ? ` (${LIBELLE_POSE[typePoseActuel]})` : ""}</p>
       <p>${echapperHtml(donnees.prenom)} ${echapperHtml(donnees.nom)}<br>
       ${echapperHtml(donnees.telephone)} · ${echapperHtml(donnees.email)}</p>
       ${donnees.noteCliente ? `<p>Message : ${echapperHtml(donnees.noteCliente)}</p>` : ""}
       <p><a href="${urlSite()}/admin">Ouvrir l'espace gérante</a></p>`
    );
  }

  redirect(`/confirmation/${rendezVousId}`);
}
