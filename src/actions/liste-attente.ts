"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { clienteBloquee, MESSAGE_BLOCAGE } from "@/lib/blocage";
import { listeAttenteSchema } from "@/lib/validations";

export type EtatListeAttente = { ok?: boolean; message?: string };

// Réponse unique, que l'inscription vienne d'être créée ou qu'elle existe déjà :
// la cliente n'a pas à savoir laquelle des deux, et une réponse différenciée
// dirait qui figure sur la liste.
const MESSAGE_INSCRITE = "C'est noté — je vous préviens dès qu'une place se libère 🤍";

/** Délai avant qu'une même adresse puisse se réinscrire. */
const DELAI_REINSCRIPTION_MS = 60 * 60 * 1000;

export async function rejoindreListeAttente(
  _etatPrecedent: EtatListeAttente,
  formData: FormData
): Promise<EtatListeAttente> {
  const analyse = listeAttenteSchema.safeParse({
    prenom: formData.get("prenom"),
    email: formData.get("email"),
    telephone: formData.get("telephone") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const donnees = analyse.data;

  // Le formulaire est public : sans ce contrôle, une cliente bloquée s'inscrit
  // ici et reçoit les annonces d'annulation, ce que le blocage est justement
  // censé empêcher. Même message évasif qu'ailleurs — on ne dit jamais à
  // quelqu'un qu'il est bloqué.
  if (await clienteBloquee(donnees.email, donnees.telephone)) {
    return { ok: false, message: MESSAGE_BLOCAGE };
  }

  // Une inscription déjà en attente rend la suivante inutile : sans cela, la
  // même adresse s'inscrit autant de fois qu'elle le veut et reçoit autant de
  // copies de chaque annonce. On répond comme si de rien n'était, l'intention
  // de la cliente étant satisfaite dans les deux cas.
  const dejaInscrite = await prisma.listeAttente.findFirst({
    where: { email: donnees.email, notifieeLe: null },
    select: { id: true },
  });
  if (dejaInscrite) {
    return { ok: true, message: MESSAGE_INSCRITE };
  }

  // Deuxième garde-fou, pour le cas où la précédente inscription a déjà été
  // notifiée : on limite le rythme plutôt que le nombre total.
  const recente = await prisma.listeAttente.findFirst({
    where: { email: donnees.email, creeLe: { gt: new Date(Date.now() - DELAI_REINSCRIPTION_MS) } },
    select: { id: true },
  });
  if (recente) {
    return { ok: true, message: MESSAGE_INSCRITE };
  }

  await prisma.listeAttente.create({ data: donnees });
  revalidatePath("/admin");

  return { ok: true, message: MESSAGE_INSCRITE };
}

export async function supprimerListeAttente(id: string): Promise<void> {
  await exigerAdmin();
  await prisma.listeAttente.delete({ where: { id } });
  revalidatePath("/admin");
}
