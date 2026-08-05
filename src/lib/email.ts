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

// Resend accepte « Nom <adresse> », Brevo veut les deux séparément. On admet
// donc les deux écritures dans EMAIL_FROM, sans piéger sur un détail de format.
export function analyserExpediteur(brut: string): { nom: string; adresse: string } {
  const avecNom = brut.trim().match(/^(.*?)\s*<\s*([^<>\s]+)\s*>$/);
  return {
    nom: avecNom?.[1]?.replace(/^["']|["']$/g, "").trim() || "Zelart Nails",
    adresse: (avecNom?.[2] ?? brut).trim(),
  };
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
  const { nom, adresse } = analyserExpediteur(expediteur);
  const reponse = await fetch(process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": cle, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: nom, email: adresse },
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

// Brevo n'expédie que depuis une adresse vérifiée par un lien reçu dans la
// boîte concernée. On demande la liste plutôt que de laisser un 400 obscur
// surgir au premier envoi réel.
export type EtatExpediteur =
  | { verifiable: false }
  | { verifiable: true; valide: boolean; connus: string[] };

export async function verifierExpediteurBrevo(): Promise<EtatExpediteur> {
  const cle = process.env.BREVO_API_KEY;
  if (!cle || !process.env.EMAIL_FROM) return { verifiable: false };

  try {
    const reponse = await fetch(
      (process.env.BREVO_API_URL ?? "https://api.brevo.com/v3/smtp/email").replace(
        /\/smtp\/email$/,
        "/senders"
      ),
      { headers: { "api-key": cle, Accept: "application/json" }, cache: "no-store" }
    );
    if (!reponse.ok) return { verifiable: false };

    const donnees = (await reponse.json()) as {
      senders?: { email?: string; active?: boolean }[];
    };
    const connus = (donnees.senders ?? [])
      .filter((s) => s.active !== false)
      .map((s) => (s.email ?? "").toLowerCase())
      .filter(Boolean);

    const { adresse } = analyserExpediteur(process.env.EMAIL_FROM);
    return { verifiable: true, valide: connus.includes(adresse.toLowerCase()), connus };
  } catch {
    return { verifiable: false };
  }
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
