// Envoi d'e-mails via Brevo (https://brevo.com) ou Resend (https://resend.com),
// selon la clé configurée — Brevo est prioritaire si les deux sont présentes.
// Sans aucune clé, les envois sont simplement ignorés : le site fonctionne
// normalement, sans notifications.

async function envoyerViaBrevo(cle: string, destinataire: string, sujet: string, html: string) {
  const expediteur = process.env.EMAIL_FROM ?? "zelart.notifications@example.invalid";
  const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
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
    console.error("Envoi Brevo refusé", reponse.status, await reponse.text());
  }
}

async function envoyerViaResend(cle: string, destinataire: string, sujet: string, html: string) {
  const reponse = await fetch("https://api.resend.com/emails", {
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
    console.error("Envoi Resend refusé", reponse.status, await reponse.text());
  }
}

export async function envoyerEmail(
  destinataire: string,
  sujet: string,
  html: string
): Promise<void> {
  try {
    if (process.env.BREVO_API_KEY) {
      await envoyerViaBrevo(process.env.BREVO_API_KEY, destinataire, sujet, html);
    } else if (process.env.RESEND_API_KEY) {
      await envoyerViaResend(process.env.RESEND_API_KEY, destinataire, sujet, html);
    }
  } catch (erreur) {
    console.error("Envoi e-mail échoué", erreur);
  }
}
