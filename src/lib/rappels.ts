import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { reglagesRappels } from "@/lib/parametres";
import { urlSite } from "@/lib/site";
import type { TypePose } from "@/generated/prisma/client";

export type BilanRappels = {
  actifs: boolean;
  rappels: { envoyes: number; echecs: number };
  relances: { envoyees: number; echecs: number };
};

const JOUR_MS = 24 * 60 * 60 * 1000;

const LIBELLE_TECHNIQUE: Record<TypePose, string> = {
  VSP: "vernis semi-permanent",
  GAINAGE: "gainage",
  GEL_X: "pose Gel X",
  POP_IT: "pose Pop-it",
};

function enveloppe(contenu: string, pied?: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
  <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
  ${contenu}
  <p style="margin-top:24px">À très vite,<br>Zélia ✨</p>
  ${
    pied
      ? `<hr style="border:none;border-top:1px solid #f6d9e7;margin:28px 0 12px">
         <p style="font-size:12px;color:#8a6274;margin:0">${pied}</p>`
      : ""
  }
</div>`;
}

// --- Rappel la veille du rendez-vous -----------------------------------------

async function envoyerRappels(): Promise<{ envoyes: number; echecs: number }> {
  const maintenant = new Date();
  const debutFenetre = new Date(maintenant.getTime() + JOUR_MS);
  const finFenetre = new Date(maintenant.getTime() + 2 * JOUR_MS);

  const rendezVous = await prisma.rendezVous.findMany({
    where: {
      statut: "CONFIRME",
      rappelEnvoyeLe: null,
      debut: { gte: debutFenetre, lt: finFenetre },
    },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });

  let envoyes = 0;
  let echecs = 0;

  for (const rdv of rendezVous) {
    const total = totalTarifs(rdv.lignes.map((l) => l.prestation));
    const resultat = await envoyerEmail(
      rdv.cliente.email,
      `Rappel : votre rendez-vous ${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}`,
      enveloppe(
        `<p>Bonjour ${rdv.cliente.prenom},</p>
         <p>Petit rappel de votre rendez-vous <strong>demain</strong> :</p>
         <p>${rdv.lignes
           .map((l) => `${l.prestation.nom} — ${formatPrix(l.prestation.prixCents, l.prestation.aPartirDe)}`)
           .join("<br>")}<br>
         <strong>Total : ${formatPrix(total.prixCents, total.aPartirDe)}</strong></p>
         <p><strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong><br>
         L'Atelier du Regard — 108 avenue de la République, 44600 Saint-Nazaire</p>
         <p>Un empêchement ? Prévenez-moi au plus vite pour que je puisse proposer le créneau à
         quelqu'un d'autre : <a href="${urlSite()}/mon-espace">votre espace</a> ou par SMS au
         06 45 29 20 01.</p>`
      )
    );

    if (resultat.ok) {
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { rappelEnvoyeLe: new Date() },
      });
      envoyes++;
    } else {
      echecs++;
    }
  }

  return { envoyes, echecs };
}

// --- Relance quand la repousse arrive ----------------------------------------

async function envoyerRelances(
  delais: Record<TypePose, number>
): Promise<{ envoyees: number; echecs: number }> {
  const maintenant = new Date();
  const delaiMax = Math.max(...Object.values(delais));

  // On ne remonte pas au-delà du plus long délai + une semaine : passé ce
  // point, une relance n'a plus de sens.
  const candidats = await prisma.rendezVous.findMany({
    where: {
      statut: "TERMINE",
      relanceEnvoyeeLe: null,
      debut: { gte: new Date(maintenant.getTime() - (delaiMax + 7) * JOUR_MS) },
    },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
    orderBy: { debut: "desc" },
  });

  let envoyees = 0;
  let echecs = 0;
  const dejaTraitees = new Set<string>();

  for (const rdv of candidats) {
    // Une seule relance par cliente, sur sa pose la plus récente.
    if (dejaTraitees.has(rdv.clienteId)) continue;
    dejaTraitees.add(rdv.clienteId);

    // Une cliente désinscrite ne reçoit plus ce type de message.
    if (rdv.cliente.desabonneLe) continue;

    // La technique posée détermine le moment de la repousse.
    const technique = rdv.lignes.find((l) => !l.automatique)?.prestation.typePose;
    if (!technique) continue;

    const joursEcoules = Math.floor((maintenant.getTime() - rdv.debut.getTime()) / JOUR_MS);
    if (joursEcoules < delais[technique]) continue;

    // Inutile de relancer si un prochain rendez-vous est déjà pris.
    const prochain = await prisma.rendezVous.count({
      where: {
        clienteId: rdv.clienteId,
        statut: { not: "ANNULE" },
        debut: { gt: maintenant },
      },
    });
    if (prochain > 0) continue;

    const resultat = await envoyerEmail(
      rdv.cliente.email,
      "C'est bientôt le moment de refaire vos ongles 🌸",
      enveloppe(
        `<p>Bonjour ${rdv.cliente.prenom},</p>
         <p>Votre ${LIBELLE_TECHNIQUE[technique]} a maintenant ${joursEcoules} jours : c'est
         généralement le bon moment pour un remplissage ou une nouvelle pose, avant que la repousse
         ne fragilise vos ongles.</p>
         <p style="margin:24px 0">
           <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
             Choisir mon créneau
           </a>
         </p>
         <p>Si vous préférez attendre, aucun souci — ce message est juste un repère 🤍</p>`,
        `Vous recevez ce message en tant que cliente de Zelart Nails.<br>
         <a href="${urlSite()}/desabonnement/${rdv.cliente.jetonDesabonnement}" style="color:#8a6274">Ne plus recevoir ces rappels</a>`
      )
    );

    if (resultat.ok) {
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { relanceEnvoyeeLe: new Date() },
      });
      envoyees++;
    } else {
      echecs++;
    }
  }

  return { envoyees, echecs };
}

export async function executerRappels(): Promise<BilanRappels> {
  const { actifs, delais } = await reglagesRappels();
  if (!actifs) {
    return { actifs: false, rappels: { envoyes: 0, echecs: 0 }, relances: { envoyees: 0, echecs: 0 } };
  }

  const rappels = await envoyerRappels();
  const relances = await envoyerRelances(delais);
  return { actifs: true, rappels, relances };
}
