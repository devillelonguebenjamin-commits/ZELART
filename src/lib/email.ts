// Envoi d'e-mails via Resend (https://resend.com).
// Sans RESEND_API_KEY, les envois sont simplement ignorés : le site
// fonctionne normalement, sans notifications.
export async function envoyerEmail(
  destinataire: string,
  sujet: string,
  html: string
): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) return;
  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Zelart Nails <onboarding@resend.dev>",
        to: [destinataire],
        subject: sujet,
        html,
      }),
    });
    if (!reponse.ok) {
      console.error("Envoi e-mail refusé", reponse.status, await reponse.text());
    }
  } catch (erreur) {
    console.error("Envoi e-mail échoué", erreur);
  }
}
