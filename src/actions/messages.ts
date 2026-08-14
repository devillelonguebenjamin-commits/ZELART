"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { clienteConnectee } from "@/lib/cliente-auth";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { LONGUEUR_MAX } from "@/lib/messages-bornes";
import { peutEcrire } from "@/lib/messages";
import { urlSite } from "@/lib/site";

export type EtatMessage = { ok?: boolean; message?: string };

function lireTexte(formData: FormData): string {
  return String(formData.get("texte") ?? "").trim().slice(0, LONGUEUR_MAX);
}

/**
 * Un message écrit par la cliente depuis son espace.
 *
 * Une cliente bloquée peut écrire, et ce n'est pas un oubli. Le blocage empêche
 * de réserver, pas de parler : couper la parole à quelqu'un avec qui un
 * différend est en cours ne fait que le déplacer vers le téléphone personnel de
 * Zélia, qui est exactement ce que ce fil sert à éviter. À elle de répondre ou
 * non.
 */
export async function ecrireAZelia(
  _etatPrecedent: EtatMessage,
  formData: FormData
): Promise<EtatMessage> {
  const clienteId = await clienteConnectee();
  if (!clienteId) {
    return { ok: false, message: "Connectez-vous pour écrire." };
  }

  const texte = lireTexte(formData);
  if (texte.length === 0) {
    return { ok: false, message: "Votre message est vide." };
  }

  // Le contrôle est ici et pas seulement dans l'affichage : masquer un
  // formulaire ne l'empêche pas d'être soumis.
  if (!(await peutEcrire(clienteId))) {
    return {
      ok: false,
      message:
        "La messagerie s'ouvre une fois votre rendez-vous confirmé. En attendant, un SMS au 06 45 29 20 01 est le plus sûr.",
    };
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { prenom: true, nom: true },
  });
  if (!cliente) return { ok: false, message: "Fiche introuvable." };

  await prisma.messageCliente.create({
    data: { clienteId, deZelia: false, texte },
  });

  revalidatePath("/mon-espace");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);

  // Zélia est prévenue par e-mail : sans cela, le fil ne serait relevé que par
  // hasard, et une question posée la veille d'un rendez-vous resterait sans
  // réponse. L'échec de l'envoi ne perd pas le message, qui est déjà écrit.
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `Message de ${cliente.prenom} ${cliente.nom}`,
      `<p><strong>${echapperHtml(cliente.prenom)} ${echapperHtml(cliente.nom)}</strong> vous écrit depuis son espace :</p>
       <blockquote style="border-left:3px solid #ec4899;margin:16px 0;padding:4px 0 4px 14px;color:#43242f">${echapperHtml(texte)}</blockquote>
       <p><a href="${urlSite()}/admin/clientes/${clienteId}">Répondre depuis sa fiche</a></p>`
    );
  }

  return { ok: true, message: "Message envoyé. Zélia vous répondra ici." };
}

/** La réponse de Zélia, depuis la fiche cliente. */
export async function repondreALaCliente(
  clienteId: string,
  _etatPrecedent: EtatMessage,
  formData: FormData
): Promise<EtatMessage> {
  await exigerAdmin();

  const texte = lireTexte(formData);
  if (texte.length === 0) {
    return { ok: false, message: "Le message est vide." };
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { prenom: true, email: true, desabonneLe: true },
  });
  if (!cliente) return { ok: false, message: "Cliente introuvable." };

  await prisma.messageCliente.create({
    data: { clienteId, deZelia: true, texte },
  });

  revalidatePath("/mon-espace");
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${clienteId}`);

  // La cliente est prévenue, y compris si elle s'est désinscrite des offres :
  // une réponse à sa propre question n'est pas de la prospection, et se taire
  // parce qu'elle refuse les nouveautés serait absurde.
  await envoyerEmail(
    cliente.email,
    "Zélia vous a répondu · Zelart Nails",
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(cliente.prenom)},</p>
      <p>J'ai répondu à votre message :</p>
      <blockquote style="border-left:3px solid #ec4899;margin:16px 0;padding:4px 0 4px 14px">${echapperHtml(texte)}</blockquote>
      <p style="margin:24px 0">
        <a href="${urlSite()}/mon-espace" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Répondre depuis mon espace
        </a>
      </p>
      <p>À très vite,<br>Zélia ✨</p>
    </div>`
  );

  return { ok: true, message: "Réponse envoyée." };
}
