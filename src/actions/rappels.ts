"use server";

import { revalidatePath } from "next/cache";
import { exigerAdmin } from "@/lib/auth";
import {
  CLE_RAPPELS_ACTIFS,
  cleRelance,
  DELAIS_RELANCE_DEFAUT,
  enregistrerParametre,
} from "@/lib/parametres";
import { executerRappels } from "@/lib/rappels";
import type { TypePose } from "@/generated/prisma/client";

export type EtatRappels = { ok?: boolean; message?: string };

export async function enregistrerReglagesRappels(
  _etatPrecedent: EtatRappels,
  formData: FormData
): Promise<EtatRappels> {
  await exigerAdmin();

  const actifs = formData.get("rappelsActifs") === "on";
  await enregistrerParametre(CLE_RAPPELS_ACTIFS, actifs ? "1" : "");

  for (const technique of Object.keys(DELAIS_RELANCE_DEFAUT) as TypePose[]) {
    const jours = Number(formData.get(cleRelance(technique)));
    if (!Number.isInteger(jours) || jours < 1 || jours > 180) {
      return { ok: false, message: "Les délais doivent être compris entre 1 et 180 jours." };
    }
    await enregistrerParametre(cleRelance(technique), String(jours));
  }

  revalidatePath("/admin/reglages");
  return {
    ok: true,
    message: actifs
      ? "Rappels activés — l'envoi a lieu chaque matin."
      : "Rappels désactivés : plus aucun envoi automatique.",
  };
}

// Déclenchement manuel, utile pour vérifier le fonctionnement sans attendre
// l'exécution du lendemain.
export async function lancerRappelsMaintenant(): Promise<EtatRappels> {
  await exigerAdmin();

  const bilan = await executerRappels();
  if (!bilan.actifs) {
    return { ok: false, message: "Les rappels sont désactivés : activez-les d'abord." };
  }

  revalidatePath("/admin");
  const echecs = bilan.rappels.echecs + bilan.relances.echecs;
  return {
    ok: echecs === 0,
    message:
      `${bilan.rappels.envoyes} rappel(s) de rendez-vous et ${bilan.relances.envoyees} relance(s) de repousse envoyé(s).` +
      (echecs > 0 ? ` ${echecs} envoi(s) en échec — vérifiez le service d'e-mails.` : ""),
  };
}
