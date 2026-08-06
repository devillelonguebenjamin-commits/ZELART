import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { urlSite } from "@/lib/site";

// Pas de créneau précis à faire correspondre : l'annonce part à tout le
// monde en attente, au premier arrivé de reprendre le créneau libéré.
// Chacune n'est prévenue qu'une fois — à elle de se réinscrire si l'annonce
// ne débouche sur rien, plutôt que de la relancer à chaque annulation
// suivante.
export async function notifierListeAttente(): Promise<{ prevenues: number }> {
  const enAttente = await prisma.listeAttente.findMany({ where: { notifieeLe: null } });
  if (enAttente.length === 0) return { prevenues: 0 };

  for (const personne of enAttente) {
    await envoyerEmail(
      personne.email,
      "Une place vient de se libérer chez Zelart Nails 🤍",
      `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
        <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
        <p>Bonjour ${personne.prenom},</p>
        <p>Une cliente vient d&rsquo;annuler : un créneau s&rsquo;est libéré.</p>
        <p style="margin:24px 0">
          <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
            Voir les créneaux
          </a>
        </p>
        <p style="font-size:13px;color:#8a6274">Ouvert à toutes : la première à réserver le garde.</p>
        <p>À très vite,<br>Zélia ✨</p>
      </div>`
    );
  }

  await prisma.listeAttente.updateMany({
    where: { id: { in: enAttente.map((p) => p.id) } },
    data: { notifieeLe: new Date() },
  });

  return { prevenues: enAttente.length };
}
