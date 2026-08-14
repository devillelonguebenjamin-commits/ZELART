import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { urlSite } from "@/lib/site";
import { CLE_ECHEC_CONNEXION, enregistrerParametre } from "@/lib/parametres";
import { nouveauJeton, VALIDITE_LIEN_MIN } from "@/lib/cliente-auth";

// L'envoi du lien de connexion, sorti de l'action qui le portait.
//
// Deux portes y mènent désormais : la connexion, et l'inscription, qui se
// termine par le même geste. Les laisser écrire chacune leur version aurait
// donné deux e-mails différents, deux durées de validité, et un jour un verrou
// anti-renvoi appliqué d'un côté seulement.

/** Un renvoi trop rapproché n'ouvre pas de second lien : une adresse ne doit pas pouvoir être inondée. */
export const DELAI_RENVOI_MS = 60_000;

export type Destinataire = { id: string; prenom: string; email: string };

/**
 * Crée un jeton, envoie le lien, et rend `true` si le message est parti.
 *
 * L'appelant ne dit jamais à la visiteuse ce que vaut ce booléen : la réponse
 * est volontairement la même que l'adresse existe ou non, sans quoi le
 * formulaire deviendrait un moyen de savoir qui est cliente chez Zélia.
 */
export async function envoyerLienConnexion(
  cliente: Destinataire,
  options: { respecterDelai?: boolean } = {}
): Promise<boolean> {
  if (options.respecterDelai !== false) {
    const recent = await prisma.jetonConnexion.findFirst({
      where: { clienteId: cliente.id, creeLe: { gt: new Date(Date.now() - DELAI_RENVOI_MS) } },
      select: { id: true },
    });
    if (recent) return false;
  }

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
    "Votre lien de connexion · Zelart Nails",
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
    // Le jeton est retiré : sans cela, le verrou anti-renvoi considérerait
    // qu'un lien vient d'être envoyé et refuserait la nouvelle tentative, et la
    // cliente réessaierait sans que rien ne reparte.
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
    return false;
  }

  await enregistrerParametre(CLE_ECHEC_CONNEXION, "");
  return true;
}
