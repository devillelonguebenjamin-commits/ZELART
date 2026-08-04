"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { urlSite } from "@/lib/site";
import {
  clienteConnectee,
  fermerSessionCliente,
  nouveauJeton,
  VALIDITE_LIEN_MIN,
} from "@/lib/cliente-auth";

export type EtatLien = { ok?: boolean; message?: string };

// Un délai entre deux envois évite qu'une adresse soit inondée de liens.
const DELAI_RENVOI_MS = 60_000;

export async function demanderLienConnexion(
  _etatPrecedent: EtatLien,
  formData: FormData
): Promise<EtatLien> {
  const analyse = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .safeParse(formData.get("email"));
  if (!analyse.success) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }

  // Réponse identique que l'adresse existe ou non : personne ne peut deviner
  // qui est cliente chez Zélia.
  const reponseNeutre: EtatLien = {
    ok: true,
    message:
      "Si cette adresse correspond à un rendez-vous, un lien de connexion vient d'être envoyé. Pensez à regarder vos indésirables.",
  };

  const cliente = await prisma.cliente.findUnique({
    where: { email: analyse.data },
    select: { id: true, prenom: true, email: true },
  });
  if (!cliente) return reponseNeutre;

  const recent = await prisma.jetonConnexion.findFirst({
    where: { clienteId: cliente.id, creeLe: { gt: new Date(Date.now() - DELAI_RENVOI_MS) } },
    select: { id: true },
  });
  if (recent) return reponseNeutre;

  const jeton = nouveauJeton();
  await prisma.jetonConnexion.create({
    data: {
      jeton,
      clienteId: cliente.id,
      expireLe: new Date(Date.now() + VALIDITE_LIEN_MIN * 60_000),
    },
  });

  const lien = `${urlSite()}/mon-espace/connexion/${jeton}`;
  await envoyerEmail(
    cliente.email,
    "Votre lien de connexion — Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${cliente.prenom},</p>
      <p>Voici votre lien pour accéder à votre espace. Il est valable ${VALIDITE_LIEN_MIN} minutes et ne fonctionne qu'une fois.</p>
      <p style="margin:24px 0">
        <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Ouvrir mon espace
        </a>
      </p>
      <p style="font-size:13px;color:#8a6274">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : aucun accès n'a été ouvert.</p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  return reponseNeutre;
}

export async function deconnexionCliente(): Promise<void> {
  await fermerSessionCliente();
  redirect("/mon-espace");
}

// La cliente gère elle-même son accord : c'est le plus respectueux, et cela
// décharge Zélia des demandes de désinscription.
export async function changerAccordOffres(accepter: boolean): Promise<void> {
  const clienteId = await clienteConnectee();
  if (!clienteId) return;

  await prisma.cliente.update({
    where: { id: clienteId },
    data: accepter
      ? { consentementMarketing: true, consentementLe: new Date(), desabonneLe: null }
      : { consentementMarketing: false, desabonneLe: new Date() },
  });
  revalidatePath("/mon-espace");
}
