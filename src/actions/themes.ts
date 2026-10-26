"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import { enregistrerTheme, estIdTheme } from "@/lib/saison";

function lireJour(formData: FormData, champ: string): string | null {
  const valeur = String(formData.get(champ) ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(valeur) ? valeur : null;
}

/**
 * Active un thème, éventuellement entre deux dates incluses. Un seul thème à
 * la fois : en activer un remplace le précédent.
 */
export async function activerTheme(id: string, formData: FormData): Promise<void> {
  await exigerAdmin();
  if (!estIdTheme(id)) return;
  let debut = lireJour(formData, "debut");
  let fin = lireJour(formData, "fin");
  // Dates saisies à l'envers : on les remet dans l'ordre plutôt que de
  // refuser, l'intention ne fait pas de doute.
  if (debut && fin && fin < debut) [debut, fin] = [fin, debut];
  await enregistrerTheme({ theme: id, debut, fin });
  // Le bandeau vit dans la mise en page : toutes les pages sont concernées.
  revalidatePath("/", "layout");
}

export async function desactiverTheme(): Promise<void> {
  await exigerAdmin();
  await enregistrerTheme({ theme: null, debut: null, fin: null });
  revalidatePath("/", "layout");
}
