"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { urlSite } from "@/lib/site";
import { CLE_ECHEC_CONNEXION, enregistrerParametre } from "@/lib/parametres";
import { coordonneesSchema, emailSchema } from "@/lib/validations";
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
  const envoi = await envoyerEmail(
    cliente.email,
    "Votre lien de connexion — Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(cliente.prenom)},</p>
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

  // Le résultat de l'envoi était jeté. Or la réponse faite à la cliente est la
  // même dans tous les cas : un échec ressemblait donc trait pour trait à un
  // succès, et une cliente pouvait attendre indéfiniment un lien jamais parti.
  if (!envoi.ok) {
    // Le jeton est retiré : sans cela, le verrou anti-renvoi d'une minute
    // considérerait qu'un lien vient d'être envoyé et refuserait la nouvelle
    // tentative — la cliente réessaierait sans que rien ne reparte.
    await prisma.jetonConnexion.deleteMany({ where: { jeton } });
    console.error("Lien de connexion non envoyé", cliente.email, envoi.erreur);
    await enregistrerParametre(
      CLE_ECHEC_CONNEXION,
      JSON.stringify({
        date: new Date().toISOString(),
        adresse: cliente.email,
        erreur: envoi.erreur.slice(0, 300),
      })
    );
  } else {
    await enregistrerParametre(CLE_ECHEC_CONNEXION, "");
  }

  return reponseNeutre;
}

export type EtatInformations = { ok?: boolean; message?: string };

// Prénom, nom et téléphone se corrigent sans cérémonie : ils n'ouvrent aucun
// accès. L'adresse e-mail, elle, passe par une confirmation (plus bas).
export async function enregistrerMesInformations(
  _etatPrecedent: EtatInformations,
  formData: FormData
): Promise<EtatInformations> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour modifier vos informations." };
  }

  const analyse = coordonneesSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    telephone: formData.get("telephone"),
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await prisma.cliente.update({ where: { id: clienteId }, data: analyse.data });

  revalidatePath("/mon-espace");
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true, message: "Vos informations sont à jour 🤍" };
}

export async function demanderChangementEmail(
  _etatPrecedent: EtatInformations,
  formData: FormData
): Promise<EtatInformations> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour modifier votre adresse." };
  }

  const analyse = emailSchema.safeParse(formData.get("nouvelEmail"));
  if (!analyse.success) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }
  const nouvelEmail = analyse.data;

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { prenom: true, email: true },
  });
  if (!cliente) return { ok: false, message: "Fiche introuvable." };

  if (cliente.email === nouvelEmail) {
    return { ok: false, message: "C'est déjà votre adresse actuelle." };
  }

  // Une adresse déjà rattachée à une autre fiche ne peut pas être reprise ;
  // on le dit sans confirmer à qui elle appartient.
  const occupee = await prisma.cliente.findUnique({
    where: { email: nouvelEmail },
    select: { id: true },
  });
  if (occupee) {
    return {
      ok: false,
      message:
        "Cette adresse est déjà utilisée. Si elle est bien à vous, écrivez à Zélia pour réunir vos fiches.",
    };
  }

  const recent = await prisma.changementEmail.findFirst({
    where: { clienteId, creeLe: { gt: new Date(Date.now() - DELAI_RENVOI_MS) } },
    select: { id: true },
  });
  if (recent) {
    return {
      ok: false,
      message: "Un lien vient déjà d'être envoyé. Patientez une minute avant de réessayer.",
    };
  }

  const jeton = nouveauJeton();
  await prisma.changementEmail.create({
    data: {
      clienteId,
      nouvelEmail,
      jeton,
      expireLe: new Date(Date.now() + VALIDITE_LIEN_MIN * 60_000),
    },
  });

  const lien = `${urlSite()}/mon-espace/email/${jeton}`;
  const envoi = await envoyerEmail(
    nouvelEmail,
    "Confirmez votre nouvelle adresse — Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(cliente.prenom)},</p>
      <p>Vous souhaitez utiliser cette adresse pour votre espace Zelart. Confirmez-la en cliquant
      ci-dessous : le lien est valable ${VALIDITE_LIEN_MIN} minutes et ne sert qu'une fois.</p>
      <p style="margin:24px 0">
        <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Confirmer cette adresse
        </a>
      </p>
      <p style="font-size:13px;color:#8a6274">Tant que vous n'avez pas cliqué, rien ne change :
      vos rendez-vous continuent d'être envoyés à votre adresse actuelle.</p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );
  if (!envoi.ok) {
    return { ok: false, message: "L'envoi a échoué. Réessayez dans un instant." };
  }

  // L'ancienne adresse est prévenue : un accès laissé ouvert sur un
  // ordinateur partagé ne doit pas permettre une reprise silencieuse du compte.
  await envoyerEmail(
    cliente.email,
    "Demande de changement d'adresse — Zelart Nails",
    `<p>Bonjour ${echapperHtml(cliente.prenom)},</p>
     <p>Une demande vient d'être faite depuis votre espace pour remplacer cette adresse par
     <strong>${echapperHtml(nouvelEmail)}</strong>. Elle ne prendra effet qu'après confirmation depuis la
     nouvelle boîte.</p>
     <p>Si vous n'êtes pas à l'origine de cette demande, prévenez Zélia par SMS au 06 45 29 20 01.</p>`
  );

  return {
    ok: true,
    message: `Un lien de confirmation vient d'être envoyé à ${nouvelEmail}. Votre adresse actuelle reste active jusqu'à votre clic.`,
  };
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
