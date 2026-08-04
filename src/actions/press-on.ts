"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { nouveauCode } from "@/lib/cliente-auth";
import { commandePressOnSchema, urlImageValide } from "@/lib/validations";
import { formatPrix } from "@/lib/format";
import { LIBELLE_REMISE } from "@/lib/press-on";
import { urlSite } from "@/lib/site";

export type EtatCommande = { erreur?: string };

export async function commanderPressOn(
  _etatPrecedent: EtatCommande,
  formData: FormData
): Promise<EtatCommande> {
  if (formData.get("conditions") !== "on") {
    return {
      erreur:
        "Vous devez accepter les conditions de vente des press-on (paiement avant fabrication, aucun retour).",
    };
  }

  const analyse = commandePressOnSchema.safeParse({
    modeleId: formData.get("modeleId"),
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
    modeRemise: formData.get("modeRemise"),
    adresse: formData.get("adresse") ?? undefined,
    forme: formData.get("forme") ?? undefined,
    longueur: formData.get("longueur") ?? undefined,
    mesures: formData.get("mesures") ?? undefined,
    inspiration: formData.get("inspiration") ?? undefined,
  });
  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const donnees = analyse.data;

  const modele = await prisma.modelePressOn.findUnique({ where: { id: donnees.modeleId } });
  if (!modele || !modele.actif) {
    return { erreur: "Ce modèle n'est plus proposé." };
  }
  // Un set dessiné pour la cliente a besoin d'une direction : sans description,
  // Zélia n'a rien à créer.
  if (modele.surMesure && !donnees.inspiration) {
    return { erreur: "Décrivez vos envies pour que Zélia puisse dessiner votre set." };
  }

  const images = formData
    .getAll("inspirationImages")
    .filter((v): v is string => typeof v === "string" && urlImageValide(v))
    .slice(0, 3);

  const accord = formData.get("consentementMarketing") === "on";
  const cliente = await prisma.cliente.upsert({
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

  // Le prix est figé ici : le catalogue peut changer avant la fabrication.
  const commande = await prisma.commandePressOn.create({
    data: {
      clienteId: cliente.id,
      modeleId: modele.id,
      prixCents: modele.prixCents,
      aPartirDe: modele.aPartirDe,
      modeRemise: donnees.modeRemise,
      adresse: donnees.modeRemise === "POSTAL" ? (donnees.adresse ?? null) : null,
      forme: donnees.forme || null,
      longueur: donnees.longueur || null,
      mesures: donnees.mesures || null,
      inspiration: donnees.inspiration || null,
      images: { create: images.map((url) => ({ url })) },
    },
  });

  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Commande press-on — ${donnees.prenom} ${donnees.nom}`,
      `<p>Nouvelle commande de press-on à chiffrer :</p>
       <p><strong>${modele.nom}</strong> — ${formatPrix(modele.prixCents, modele.aPartirDe)}<br>
       ${LIBELLE_REMISE[donnees.modeRemise]}</p>
       ${donnees.adresse ? `<p>Adresse :<br>${donnees.adresse.replace(/\n/g, "<br>")}</p>` : ""}
       ${donnees.mesures ? `<p>Mesures : ${donnees.mesures}</p>` : ""}
       ${donnees.forme || donnees.longueur ? `<p>Forme : ${donnees.forme ?? "—"} · Longueur : ${donnees.longueur ?? "—"}</p>` : ""}
       ${donnees.inspiration ? `<p>Envies : ${donnees.inspiration}</p>` : ""}
       <p>${donnees.prenom} ${donnees.nom}<br>${donnees.telephone} · ${donnees.email}</p>
       <p><a href="${urlSite()}/admin/press-on">Ouvrir les commandes</a></p>`
    );
  }

  revalidatePath("/admin/press-on");
  redirect(`/press-on/confirmation/${commande.id}`);
}
