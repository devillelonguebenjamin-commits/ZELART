// Envoi d'e-mails via Brevo (https://brevo.com) ou Resend (https://resend.com),
// selon la clé configurée — Brevo est prioritaire si les deux sont présentes.
// Sans aucune clé, les envois sont simplement ignorés : le site fonctionne
// normalement, sans notifications.

export type Fournisseur = "brevo" | "resend" | null;

export type ResultatEmail =
  | { ok: true; fournisseur: Exclude<Fournisseur, null> }
  | { ok: false; erreur: string };

export function fournisseurEmail(): Fournisseur {
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function expediteurConfigure(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  return fournisseurEmail() === "resend"
    ? "Zelart Nails <onboarding@resend.dev>"
    : "(non défini)";
}

async function envoyerViaBrevo(
  cle: string,
  destinataire: string,
  sujet: string,
  html: string
): Promise<ResultatEmail> {
  const expediteur = process.env.EMAIL_FROM;
  if (!expediteur) {
    return { ok: false, erreur: "EMAIL_FROM n'est pas défini (adresse expéditrice validée chez Brevo)." };
  }
  const reponse = await fetch(process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": cle, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Zelart Nails", email: expediteur },
      to: [{ email: destinataire }],
      subject: sujet,
      htmlContent: html,
    }),
  });
  if (!reponse.ok) {
    return { ok: false, erreur: `Brevo a refusé l'envoi (${reponse.status}) : ${await reponse.text()}` };
  }
  return { ok: true, fournisseur: "brevo" };
}

async function envoyerViaResend(
  cle: string,
  destinataire: string,
  sujet: string,
  html: string
): Promise<ResultatEmail> {
  const reponse = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Zelart Nails <onboarding@resend.dev>",
      to: [destinataire],
      subject: sujet,
      html,
    }),
  });
  if (!reponse.ok) {
    return { ok: false, erreur: `Resend a refusé l'envoi (${reponse.status}) : ${await reponse.text()}` };
  }
  return { ok: true, fournisseur: "resend" };
}

export async function envoyerEmail(
  destinataire: string,
  sujet: string,
  html: string
): Promise<ResultatEmail> {
  const fournisseur = fournisseurEmail();
  if (!fournisseur) {
    return { ok: false, erreur: "Aucune clé d'envoi configurée (BREVO_API_KEY ou RESEND_API_KEY)." };
  }
  try {
    const resultat =
      fournisseur === "brevo"
        ? await envoyerViaBrevo(process.env.BREVO_API_KEY!, destinataire, sujet, html)
        : await envoyerViaResend(process.env.RESEND_API_KEY!, destinataire, sujet, html);
    if (!resultat.ok) console.error(resultat.erreur);
    return resultat;
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    console.error("Envoi e-mail échoué", erreur);
    return { ok: false, erreur: `Envoi impossible : ${message}` };
  }
}
