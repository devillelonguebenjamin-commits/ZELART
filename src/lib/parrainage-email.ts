import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { urlSite } from "@/lib/site";
import { attribuerAvantages, LIBELLE_AVANTAGE, statutParrainage } from "@/lib/parrainage";

export type DeblocageParrainage = {
  marraine: string;
  palier: string;
  avantages: string[];
};

/**
 * Recalcule le palier d'une marraine, accorde ce qui est dû et la prévient.
 *
 * Appelée quand une filleule vient d'honorer un rendez-vous. L'envoi n'a lieu
 * que pour les avantages **nouvellement** accordés : sans cela, chaque venue
 * d'une filleule renverrait toute la liste.
 *
 * Renvoie ce qui a été débloqué, pour que Zélia voie l'effet de sa validation
 * plutôt que de le découvrir par hasard.
 */
export async function recompenserMarraine(
  filleuleId: string
): Promise<DeblocageParrainage | null> {
  const filleule = await prisma.cliente.findUnique({
    where: { id: filleuleId },
    select: { parraineParId: true, prenom: true },
  });
  if (!filleule?.parraineParId) return null;

  const accordes = await attribuerAvantages(filleule.parraineParId);
  if (accordes.length === 0) return null;

  const marraine = await prisma.cliente.findUnique({
    where: { id: filleule.parraineParId },
    select: { prenom: true, nom: true, email: true, desabonneLe: true, bloqueeLe: true },
  });
  const statutFinal = await statutParrainage(filleule.parraineParId);
  const bilan: DeblocageParrainage = {
    marraine: marraine ? `${marraine.prenom} ${marraine.nom}` : "la marraine",
    palier: statutFinal.palier.nom,
    avantages: accordes.map((a) => LIBELLE_AVANTAGE[a.type]),
  };

  // Zélia est prévenue la première : c'est elle qui honore l'avantage au salon,
  // et elle doit pouvoir le préparer — une pose offerte n'est pas un détail
  // à découvrir au moment de l'encaissement. L'envoi a lieu même si la marraine
  // est bloquée ou désinscrite : ce sont ses e-mails à elle qui s'arrêtent, pas
  // le suivi de la gérante.
  if (process.env.NOTIFY_EMAIL) {
    await envoyerEmail(
      process.env.NOTIFY_EMAIL,
      `${statutFinal.palier.emoji} Palier ${statutFinal.palier.nom} atteint — ${bilan.marraine}`,
      `<p><strong>${echapperHtml(bilan.marraine)}</strong> vient d'atteindre le palier
       <strong>${statutFinal.palier.nom}</strong> : ${echapperHtml(filleule.prenom)} est venue grâce à elle.</p>
       <p>Sa squad compte <strong>${statutFinal.filleulesVenues} filleule${statutFinal.filleulesVenues > 1 ? "s" : ""} venue${statutFinal.filleulesVenues > 1 ? "s" : ""}</strong>.</p>
       <p>À honorer :</p>
       <ul>${accordes.map((a) => `<li><strong>${LIBELLE_AVANTAGE[a.type]}</strong> — code <code>${a.code}</code></li>`).join("")}</ul>
       ${marraine?.bloqueeLe ? "<p><strong>⚠ Cette cliente est bloquée</strong> — l'avantage est enregistré, à vous de voir.</p>" : ""}
       <p><a href="${urlSite()}/admin/parrainage">Ouvrir l'onglet Parrainage</a></p>`
    );
  }

  if (!marraine || marraine.bloqueeLe) return bilan;

  // Un avantage gagné n'est pas de la prospection : il reste accordé même à une
  // désinscrite, elle le retrouvera dans son espace. Seul l'e-mail est retenu.
  if (marraine.desabonneLe) return bilan;

  const lignes = accordes
    .map((a) => `<li><strong>${LIBELLE_AVANTAGE[a.type]}</strong> — code <code>${a.code}</code></li>`)
    .join("");

  await envoyerEmail(
    marraine.email,
    `${statutFinal.palier.emoji} Vous passez ${statutFinal.palier.nom} !`,
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
      <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
      <p>Bonjour ${echapperHtml(marraine.prenom)},</p>
      <p>${echapperHtml(filleule.prenom)} est venue grâce à vous — votre squad compte maintenant
      <strong>${statutFinal.filleulesVenues} filleule${statutFinal.filleulesVenues > 1 ? "s" : ""}</strong> !</p>
      <p>Vous débloquez :</p>
      <ul>${lignes}</ul>
      <p style="font-size:13px;color:#8a6274">Présentez simplement votre code à Zélia lors de votre
      prochain rendez-vous — vos avantages sont aussi listés dans votre espace.</p>
      <p style="margin:24px 0">
        <a href="${urlSite()}/mon-espace" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
          Voir ma squad
        </a>
      </p>
      <p>Merci infiniment,<br>Zélia ✨</p>
    </div>`
  );

  return bilan;
}
