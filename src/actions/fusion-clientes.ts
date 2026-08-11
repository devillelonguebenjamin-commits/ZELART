"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import { fusionner } from "@/lib/fusion";

// Fusionner deux fiches qui désignent la même cliente.
//
// L'opération est irréversible, donc elle est prudente : rien n'est jamais
// écrasé par du vide, et le doute profite toujours à la conservation.
//
//   - **l'historique se cumule** : rendez-vous, commandes, lots gagnés,
//     filleules — tout est rattaché à la fiche gardée ;
//   - **l'identité vient de la fiche gardée**, sauf pour l'adresse : si celle
//     gardée est une adresse de complaisance et l'autre une vraie, c'est la
//     vraie qui l'emporte. C'est le cas courant, celui d'une habituée saisie de
//     vive voix qui a fini par réserver en ligne ;
//   - **les refus l'emportent sur les accords** : une désinscription ou un
//     blocage présent d'un côté vaut pour la fiche fusionnée. Se réabonner est
//     un geste de la cliente, jamais une conséquence d'un ménage interne.
//
// Les deux tables à contrainte d'unicité (envois de campagne, avantages de
// parrainage) ne peuvent pas simplement être déplacées : une ligne qui existe
// déjà des deux côtés est supprimée plutôt que dupliquée.

export type EtatFusion = { ok?: boolean; message?: string };

export async function fusionnerClientes(
  _etatPrecedent: EtatFusion,
  formData: FormData
): Promise<EtatFusion> {
  await exigerAdmin();

  const gardeeId = String(formData.get("gardeeId") ?? "");
  const absorbeeId = String(formData.get("absorbeeId") ?? "");
  if (!gardeeId || !absorbeeId) return { ok: false, message: "Choisissez les deux fiches." };
  if (gardeeId === absorbeeId) {
    return { ok: false, message: "Il s'agit de la même fiche." };
  }

  try {
    const resume = await fusionner(gardeeId, absorbeeId);

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/clientes/doublons");
    revalidatePath(`/admin/clientes/${gardeeId}`);

    const details = [
      resume.rdv > 0 && `${resume.rdv} rendez-vous`,
      resume.commandes > 0 && `${resume.commandes} commande${resume.commandes > 1 ? "s" : ""}`,
      resume.filleules > 0 && `${resume.filleules} filleule${resume.filleules > 1 ? "s" : ""}`,
    ].filter(Boolean);

    return {
      ok: true,
      message:
        `Fiches fusionnées sur ${resume.nom}` +
        (details.length > 0 ? ` — ${details.join(", ")} rattaché${details.length > 1 ? "s" : ""}.` : ".") +
        (resume.adresseReprise ? " L'adresse e-mail réelle a été conservée." : ""),
    };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.message === "INTROUVABLE") {
      return { ok: false, message: "Une des deux fiches n'existe plus." };
    }
    console.error("Fusion de fiches échouée", erreur);
    return { ok: false, message: "La fusion a échoué, rien n'a été modifié." };
  }
}
