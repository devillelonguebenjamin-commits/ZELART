"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fenetrePourDebut, formatHeure, formatJour, PREAVIS_MS } from "@/lib/creneaux";
import { reservationSchema, urlImageValide } from "@/lib/validations";
import { envoyerEmail } from "@/lib/email";
import { envoyerDemandeAcompte, estNouvelleCliente } from "@/lib/acompte";
import { urlSite } from "@/lib/site";
import { deposeNecessaire, prestationProposee, trouverDepose } from "@/lib/regles";
import { formatPrix, totalRendezVous } from "@/lib/format";

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
    prestationId: formData.get("prestationId"),
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

  const catalogue = await prisma.prestation.findMany({ where: { active: true } });
  const prestation = catalogue.find((p) => p.id === donnees.prestationId);
  if (!prestation) {
    return { erreur: "Cette prestation n'est plus proposée." };
  }

  // Le formulaire filtre déjà, mais il est contournable : on revalide ici.
  if (!prestationProposee(prestation, etatOngles, typePoseActuel)) {
    return {
      erreur:
        "Cette prestation ne correspond pas à l'état de vos ongles. Reprenez la première étape.",
    };
  }

  const deposeRequise = deposeNecessaire(etatOngles, typePoseActuel, prestation.typeActe)
    ? trouverDepose(catalogue, typePoseActuel)
    : null;

  const debut = new Date(donnees.debut);
  if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now() + PREAVIS_MS) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  const fenetre = await fenetrePourDebut(debut);
  if (!fenetre) {
    return { erreur: CRENEAU_INDISPONIBLE };
  }

  // La dépose s'ajoute au temps de fauteuil.
  const dureeTotale = prestation.dureeMin + (deposeRequise?.dureeMin ?? 0);
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
            consentementMarketing: accord,
            consentementLe: accord ? new Date() : null,
          },
        });

        const rendezVous = await tx.rendezVous.create({
          data: {
            clienteId: cliente.id,
            prestationId: prestation.id,
            debut,
            fin: finRendezVous,
            noteCliente: donnees.noteCliente || null,
            inspiration: donnees.inspiration || null,
            etatOngles,
            typePoseActuel,
            deposeId: deposeRequise?.id ?? null,
            consentementSante: true,
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
  const total = totalRendezVous(prestation, deposeRequise);
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Nouvelle demande de RDV — ${donnees.prenom} ${donnees.nom}`,
      `<p>Nouvelle demande de rendez-vous à confirmer :</p>
       <p><strong>${prestation.nom}</strong> — ${formatPrix(prestation.prixCents, prestation.aPartirDe)}<br>
       ${deposeRequise ? `<strong>${deposeRequise.nom}</strong> — ${formatPrix(deposeRequise.prixCents, deposeRequise.aPartirDe)}<br>` : ""}
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
