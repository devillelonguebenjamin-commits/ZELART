"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import { enregistrerParametre } from "@/lib/parametres";
import { clePhotoNiveau, cleTexteNiveau, NIVEAUX, type Niveau } from "@/lib/nail-art";

// Ce que Zélia écrit sur chaque niveau, et la photo qui l'illustre.
//
// Le texte est facultatif : vidé, il laisse revenir la formulation par défaut
// plutôt qu'un blanc. C'est la seule façon d'éviter qu'un effacement malheureux
// laisse une carte muette devant les clientes.

const TEXTE_MAX = 400;

export type EtatNiveau = { ok?: boolean; message?: string };

export async function enregistrerTexteNiveau(
  niveau: number,
  _etatPrecedent: EtatNiveau,
  formData: FormData
): Promise<EtatNiveau> {
  await exigerAdmin();
  if (!NIVEAUX.includes(niveau as Niveau)) {
    return { ok: false, message: "Niveau inconnu." };
  }

  const texte = String(formData.get("texte") ?? "").trim().slice(0, TEXTE_MAX);
  await enregistrerParametre(cleTexteNiveau(niveau as Niveau), texte);

  revalidatePath("/admin/prestations");
  revalidatePath("/prestations");
  revalidatePath("/reserver");
  return {
    ok: true,
    message: texte ? "Texte enregistré ✨" : "Texte vidé : la description par défaut revient.",
  };
}

export async function retirerPhotoNiveau(niveau: number): Promise<void> {
  await exigerAdmin();
  if (!NIVEAUX.includes(niveau as Niveau)) return;

  // L'image reste sur Vercel Blob : quelques kilo-octets orphelins coûtent
  // moins cher qu'une photo effacée à tort.
  await enregistrerParametre(clePhotoNiveau(niveau as Niveau), "");

  revalidatePath("/admin/prestations");
  revalidatePath("/prestations");
  revalidatePath("/reserver");
}
