import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { reglagesAcompte, reglagesRappels } from "@/lib/parametres";
import { lienDemandeAvis } from "@/lib/avis";
import { urlSite } from "@/lib/site";
import type { TypePose } from "@/generated/prisma/client";

export type BilanRappels = {
  actifs: boolean;
  rappels: { envoyes: number; echecs: number };
  relances: { envoyees: number; echecs: number };
  avis: { envoyees: number; echecs: number };
  acompte: { envoyees: number; echecs: number };
  reconquete: { envoyees: number; echecs: number };
};

const JOUR_MS = 24 * 60 * 60 * 1000;
const DELAI_AVIS_JOURS = 3;
const DELAI_RELANCE_ACOMPTE_MS = JOUR_MS; // 24 h, comme demandé
const DELAI_RECONQUETE_JOURS = 90; // ~3 mois sans venir

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
         L'Atelier du Regard — 108 avenue de la République, 44600 Saint-Nazaire<br>
         <a href="${urlSite()}/api/calendrier/${rdv.id}">📅 Ajouter à mon calendrier</a></p>
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

// --- Demande d'avis Google, quelques jours après la pose -------------------

async function envoyerDemandesAvis(): Promise<{ envoyees: number; echecs: number }> {
  const lien = await lienDemandeAvis();
  if (!lien) return { envoyees: 0, echecs: 0 };

  const maintenant = new Date();
  // Fenêtre bornée : au-delà de deux semaines de retard, la relance n'a plus
  // grand sens et mieux vaut ne pas remonter indéfiniment le passé.
  const debutFenetre = new Date(maintenant.getTime() - (DELAI_AVIS_JOURS + 14) * JOUR_MS);
  const finFenetre = new Date(maintenant.getTime() - DELAI_AVIS_JOURS * JOUR_MS);

  const [dejaDemandes, candidats] = await Promise.all([
    prisma.rendezVous.findMany({
      where: { demandeAvisEnvoyeeLe: { not: null } },
      select: { clienteId: true },
    }),
    prisma.rendezVous.findMany({
      where: { statut: "TERMINE", demandeAvisEnvoyeeLe: null, fin: { gte: debutFenetre, lt: finFenetre } },
      include: { cliente: true },
      orderBy: { fin: "desc" },
    }),
  ]);
  const dejaDemandeSet = new Set(dejaDemandes.map((r) => r.clienteId));

  let envoyees = 0;
  let echecs = 0;
  const traitees = new Set<string>();

  for (const rdv of candidats) {
    // Une seule demande par cliente, jamais répétée à chaque visite.
    if (dejaDemandeSet.has(rdv.clienteId) || traitees.has(rdv.clienteId)) continue;
    traitees.add(rdv.clienteId);
    if (rdv.cliente.desabonneLe) continue;

    const resultat = await envoyerEmail(
      rdv.cliente.email,
      "Votre avis compte pour Zelart Nails 🤍",
      enveloppe(
        `<p>Bonjour ${rdv.cliente.prenom},</p>
         <p>J'espère que votre pose vous plaît toujours autant ! Si vous avez deux minutes, un avis
         Google m'aiderait énormément à me faire connaître.</p>
         <p style="margin:24px 0">
           <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
             Laisser un avis
           </a>
         </p>
         <p>Merci infiniment, quelle que soit votre réponse 🌸</p>`,
        `Vous recevez ce message en tant que cliente de Zelart Nails.<br>
         <a href="${urlSite()}/desabonnement/${rdv.cliente.jetonDesabonnement}" style="color:#8a6274">Ne plus recevoir ce type de message</a>`
      )
    );

    if (resultat.ok) {
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { demandeAvisEnvoyeeLe: new Date() },
      });
      envoyees++;
    } else {
      echecs++;
    }
  }

  return { envoyees, echecs };
}

// --- Relance si l'acompte demandé n'est toujours pas réglé ------------------

async function envoyerRelancesAcompte(): Promise<{ envoyees: number; echecs: number }> {
  const { lien, montantCents } = await reglagesAcompte();
  if (!lien) return { envoyees: 0, echecs: 0 };

  const seuil = new Date(Date.now() - DELAI_RELANCE_ACOMPTE_MS);

  const candidats = await prisma.rendezVous.findMany({
    where: {
      statut: { not: "ANNULE" },
      acompteDemandeLe: { not: null, lte: seuil },
      acompteRegleLe: null,
      acompteRelanceEnvoyeeLe: null,
    },
    include: { cliente: true },
  });

  let envoyees = 0;
  let echecs = 0;

  for (const rdv of candidats) {
    const resultat = await envoyerEmail(
      rdv.cliente.email,
      "Toujours partante pour votre rendez-vous ? — Zelart Nails",
      enveloppe(
        `<p>Bonjour ${rdv.cliente.prenom},</p>
         <p>Je n'ai pas encore reçu votre acompte de <strong>${formatPrix(montantCents)}</strong>
         pour le rendez-vous du <strong>${formatJour(rdv.debut)} à ${formatHeure(rdv.debut)}</strong>.</p>
         <p style="margin:24px 0">
           <a href="${lien}" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
             Régler mon acompte de ${formatPrix(montantCents)}
           </a>
         </p>
         <p style="font-size:13px;color:#8a6274">Sans règlement, le créneau pourra être proposé à une
         autre cliente. Un empêchement ? Un simple SMS au 06 45 29 20 01 suffit.</p>`
      )
    );

    if (resultat.ok) {
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { acompteRelanceEnvoyeeLe: new Date() },
      });
      envoyees++;
    } else {
      echecs++;
    }
  }

  return { envoyees, echecs };
}

// --- Reconquête après une longue absence -----------------------------------

async function envoyerReconquetes(): Promise<{ envoyees: number; echecs: number }> {
  const maintenant = new Date();
  const seuil = new Date(maintenant.getTime() - DELAI_RECONQUETE_JOURS * JOUR_MS);

  // Dernière venue honorée, cliente par cliente.
  const dernieresVenues = await prisma.rendezVous.groupBy({
    by: ["clienteId"],
    where: { statut: "TERMINE" },
    _max: { debut: true },
  });

  const absentes = dernieresVenues.filter(
    (v) => v._max.debut !== null && v._max.debut < seuil
  );
  if (absentes.length === 0) return { envoyees: 0, echecs: 0 };

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: absentes.map((v) => v.clienteId) }, desabonneLe: null, bloqueeLe: null },
  });
  const derniereVenue = new Map(absentes.map((v) => [v.clienteId, v._max.debut!]));

  // Un rendez-vous déjà pris rend le message absurde.
  const rdvAVenir = await prisma.rendezVous.groupBy({
    by: ["clienteId"],
    where: {
      clienteId: { in: clientes.map((c) => c.id) },
      statut: { not: "ANNULE" },
      debut: { gt: maintenant },
    },
    _count: { _all: true },
  });
  const aDejaRdv = new Set(rdvAVenir.map((r) => r.clienteId));

  let envoyees = 0;
  let echecs = 0;

  for (const cliente of clientes) {
    if (aDejaRdv.has(cliente.id)) continue;

    // Envoyé une seule fois par absence : si la cliente revient puis
    // s'éclipse de nouveau, elle pourra le recevoir une nouvelle fois.
    const venue = derniereVenue.get(cliente.id)!;
    if (cliente.reconqueteEnvoyeeLe && cliente.reconqueteEnvoyeeLe > venue) continue;

    const mois = Math.floor((maintenant.getTime() - venue.getTime()) / (30 * JOUR_MS));

    const resultat = await envoyerEmail(
      cliente.email,
      "Vos ongles me manquent 🌸",
      enveloppe(
        `<p>Bonjour ${cliente.prenom},</p>
         <p>Cela fait ${mois} mois que je ne vous ai pas vue — le salon n'est plus tout à fait le
         même sans vous !</p>
         <p>Si l'envie vous reprend, votre créneau vous attend : nouvelles couleurs, nouveaux
         designs, et toujours le même moment rien que pour vous.</p>
         <p style="margin:24px 0">
           <a href="${urlSite()}/reserver" style="background:#ec4899;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;display:inline-block;font-weight:600">
             Reprendre rendez-vous
           </a>
         </p>
         <p>Et si c'est simplement que le moment n'est pas venu, aucun souci — je serai là 🤍</p>`,
        `Vous recevez ce message en tant que cliente de Zelart Nails.<br>
         <a href="${urlSite()}/desabonnement/${cliente.jetonDesabonnement}" style="color:#8a6274">Ne plus recevoir ces messages</a>`
      )
    );

    if (resultat.ok) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { reconqueteEnvoyeeLe: new Date() },
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

  // La relance d'acompte ne dépend pas du réglage « rappels automatiques » :
  // comme l'envoi initial du lien, elle s'active dès qu'un lien SumUp est
  // configuré — c'est le fonctionnement attendu de l'acompte, pas un rappel
  // de confort qu'on pourrait vouloir couper séparément.
  const acompte = await envoyerRelancesAcompte();

  if (!actifs) {
    return {
      actifs: false,
      rappels: { envoyes: 0, echecs: 0 },
      relances: { envoyees: 0, echecs: 0 },
      avis: { envoyees: 0, echecs: 0 },
      acompte,
      reconquete: { envoyees: 0, echecs: 0 },
    };
  }

  const rappels = await envoyerRappels();
  const relances = await envoyerRelances(delais);
  const avis = await envoyerDemandesAvis();
  const reconquete = await envoyerReconquetes();
  return { actifs: true, rappels, relances, avis, acompte, reconquete };
}
