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

  // La relance d'acompte tourne même si les rappels sont désactivés (cf.
  // executerRappels) : elle mérite donc d'apparaître même dans ce cas.
  if (!bilan.actifs) {
    const echecsAcompte = bilan.acompte.echecs;
    return {
      ok: echecsAcompte === 0,
      message:
        `Les rappels sont désactivés. ${bilan.acompte.envoyees} relance(s) d'acompte envoyée(s) quand même.` +
        (echecsAcompte > 0 ? ` ${echecsAcompte} envoi(s) en échec.` : ""),
    };
  }

  revalidatePath("/admin");
  const echecs = bilan.rappels.echecs + bilan.relances.echecs + bilan.avis.echecs + bilan.acompte.echecs;
  return {
    ok: echecs === 0,
    message:
      `${bilan.rappels.envoyes} rappel(s), ${bilan.relances.envoyees} relance(s) de repousse, ` +
      `${bilan.avis.envoyees} demande(s) d'avis et ${bilan.acompte.envoyees} relance(s) d'acompte envoyé(s).` +
      (echecs > 0 ? ` ${echecs} envoi(s) en échec — vérifiez le service d'e-mails.` : ""),
  };
}
