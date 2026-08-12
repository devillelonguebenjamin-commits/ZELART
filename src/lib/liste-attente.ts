import { prisma } from "@/lib/prisma";
import { envoyerEmail, echapperHtml } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { creneauCorrespond } from "@/lib/attente-preferences";
import { urlSite } from "@/lib/site";

// Annonce d'un créneau libéré.
//
// Chacune n'est prévenue qu'une fois : à elle de se réinscrire si l'annonce ne
// débouche sur rien, plutôt que de la relancer à chaque annulation suivante.
//
// C'est précisément ce qui rendait l'ancien fonctionnement injuste. L'annonce
// partait à **tout le monde**, sans dire de quel créneau il s'agissait : une
// personne qui n'était libre que le samedi consommait son unique notification
// pour un mardi matin, et n'entendait plus jamais parler de rien. Deux
// corrections, indissociables :
//
//   - le créneau libéré est **nommé** dans le message ;
//   - une préférence explicite **écarte** l'annonce sans la consommer. Ne rien
//     avoir coché veut dire « n'importe quand » : ces personnes restent
//     prévenues de tout, comme avant.
//
// Sans créneau transmis (appelant qui n'en connaît pas), on retombe sur l'ancien
// comportement : tout le monde est prévenu. Une annonce imprécise vaut mieux
// qu'un créneau perdu.
export async function notifierListeAttente(creneau?: {
  debut: Date;
}): Promise<{ prevenues: number; ecartees: number }> {
  const enAttente = await prisma.listeAttente.findMany({ where: { notifieeLe: null } });
  if (enAttente.length === 0) return { prevenues: 0, ecartees: 0 };

  const concernees = creneau
    ? enAttente.filter((p) => creneauCorrespond(p, creneau.debut))
    : enAttente;

  let prevenues = 0;

  for (const personne of concernees) {
    // Marquée avant l'envoi, et une par une : l'ancien `updateMany` final
    // laissait, si la fonction expirait en cours de boucle, des personnes déjà
    // prévenues mais non marquées — toutes recevaient une nouvelle annonce à
    // l'annulation suivante. Une annonce manquée vaut mieux qu'une annonce en
    // double, la promesse faite étant « prévenue une fois ».
    await prisma.listeAttente.update({
      where: { id: personne.id },
      data: { notifieeLe: new Date() },
    });

    const quand = creneau
      ? `<p>Une cliente vient d&rsquo;annuler : le créneau du
         <strong>${formatJour(creneau.debut)} à ${formatHeure(creneau.debut)}</strong> est libre.</p>`
      : `<p>Une cliente vient d&rsquo;annuler : un créneau s&rsquo;est libéré.</p>`;

    const resultat = await envoyerEmail(
      personne.email,
      creneau
        ? `Un créneau s'est libéré le ${formatJour(creneau.debut)} 🤍`
        : "Une place vient de se libérer chez Zelart Nails 🤍",
      `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
        <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
        <p>Bonjour ${echapperHtml(personne.prenom)},</p>
        ${quand}
        <p style="margin:24px 0">
          <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
            Voir les créneaux
          </a>
        </p>
        <p style="font-size:13px;color:#8a6274">Ouvert à toutes : la première à réserver le garde.</p>
        <p>À très vite,<br>Zélia ✨</p>
      </div>`
    );
    if (resultat.ok) prevenues++;
  }

  return { prevenues, ecartees: enAttente.length - concernees.length };
}
