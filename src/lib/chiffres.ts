import { prisma } from "@/lib/prisma";
import { creneauxOuverts, debutDeMoisParis, moisParis } from "@/lib/creneaux";

// Nombre de mois affichés dans l'historique du tableau de bord.
export const MOIS_AFFICHES = 12;

export type LigneMois = {
  cle: string;
  poses: number;
  posesCents: number;
  pressOn: number;
  pressOnCents: number;
  totalCents: number;
};

export type LignePrestationChiffre = {
  nom: string;
  categorie: string;
  fois: number;
  totalCents: number;
};

export type TableauDeBord = {
  mois: LigneMois[];
  moisCourant: LigneMois;
  caTotalCents: number;
  posesHonorees: number;
  panierMoyenCents: number;
  prixIndicatifs: boolean;
  prestations: LignePrestationChiffre[];
  remplissage: { occupes: number; ouverts: number; part: number };
  clientes: { total: number; fidelisees: number; part: number; nouvellesCeMois: number };
  annulations: { annules: number; absences: number };
};

function ligneVide(cle: string): LigneMois {
  return { cle, poses: 0, posesCents: 0, pressOn: 0, pressOnCents: 0, totalCents: 0 };
}

export async function tableauDeBord(): Promise<TableauDeBord> {
  const maintenant = new Date();
  const debutHistorique = debutDeMoisParis(maintenant, MOIS_AFFICHES - 1);
  const debutMoisCourant = debutDeMoisParis(maintenant);

  const [rendezVous, commandes, posesParCliente, premiereVenue, annules, absences] =
    await Promise.all([
    // Seules les poses honorées comptent : une demande en attente n'est pas
    // du chiffre d'affaires.
    prisma.rendezVous.findMany({
      where: { statut: "TERMINE", debut: { gte: debutHistorique } },
      select: {
        debut: true,
        clienteId: true,
        lignes: {
          select: {
            prixCents: true,
            prestation: { select: { nom: true, categorie: true, prixCents: true, aPartirDe: true } },
          },
        },
      },
    }),
    prisma.commandePressOn.findMany({
      where: { statut: "REMISE", creeLe: { gte: debutHistorique } },
      select: {
        creeLe: true,
        remiseLe: true,
        prixCents: true,
        fraisPortCents: true,
        aPartirDe: true,
      },
    }),
    // « Revenir », c'est être repassée sur le fauteuil : seules les poses
    // honorées comptent, pas les demandes en attente.
    prisma.rendezVous.groupBy({
      by: ["clienteId"],
      where: { statut: "TERMINE" },
      _count: { _all: true },
    }),
    // Une nouvelle cliente est celle dont le tout premier rendez-vous tombe
    // ce mois-ci — pas celle dont la fiche vient d'être créée.
    prisma.rendezVous.groupBy({
      by: ["clienteId"],
      where: { statut: { not: "ANNULE" } },
      _min: { debut: true },
    }),
    prisma.rendezVous.count({ where: { statut: "ANNULE", debut: { gte: debutHistorique } } }),
    prisma.rendezVous.count({ where: { statut: "NO_SHOW", debut: { gte: debutHistorique } } }),
  ]);

  // Squelette de tous les mois, pour que les mois creux apparaissent aussi.
  const parMois = new Map<string, LigneMois>();
  for (let i = MOIS_AFFICHES - 1; i >= 0; i--) {
    const cle = moisParis(debutDeMoisParis(maintenant, i));
    parMois.set(cle, ligneVide(cle));
  }

  const prestations = new Map<string, LignePrestationChiffre>();
  let prixIndicatifs = false;

  for (const rdv of rendezVous) {
    const ligne = parMois.get(moisParis(rdv.debut));
    if (!ligne) continue;
    ligne.poses++;

    for (const l of rdv.lignes) {
      // Le prix figé à la demande fait foi ; les demandes antérieures à ce
      // suivi retombent sur le tarif actuel.
      const prix = l.prixCents ?? l.prestation.prixCents;
      if (l.prestation.aPartirDe) prixIndicatifs = true;
      ligne.posesCents += prix;

      const cumul = prestations.get(l.prestation.nom);
      if (cumul) {
        cumul.fois++;
        cumul.totalCents += prix;
      } else {
        prestations.set(l.prestation.nom, {
          nom: l.prestation.nom,
          categorie: l.prestation.categorie,
          fois: 1,
          totalCents: prix,
        });
      }
    }
  }

  for (const commande of commandes) {
    // Une commande compte au mois de sa remise, quand l'argent est encaissé.
    const ligne = parMois.get(moisParis(commande.remiseLe ?? commande.creeLe));
    if (!ligne) continue;
    if (commande.aPartirDe) prixIndicatifs = true;
    ligne.pressOn++;
    ligne.pressOnCents += commande.prixCents + (commande.fraisPortCents ?? 0);
  }

  const mois = [...parMois.values()];
  for (const ligne of mois) ligne.totalCents = ligne.posesCents + ligne.pressOnCents;

  const caTotalCents = mois.reduce((somme, l) => somme + l.totalCents, 0);
  const posesHonorees = mois.reduce((somme, l) => somme + l.poses, 0);

  // Taux de remplissage sur les 30 derniers jours : ce qui a été réservé
  // rapporté aux créneaux réellement ouverts.
  const debutFenetre = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [ouverts, occupes] = await Promise.all([
    creneauxOuverts(debutFenetre, maintenant),
    prisma.rendezVous.count({
      where: { statut: { not: "ANNULE" }, debut: { gte: debutFenetre, lt: maintenant } },
    }),
  ]);

  const venues = posesParCliente.length;
  const fidelisees = posesParCliente.filter((c) => c._count._all > 1).length;
  const nouvellesCeMois = premiereVenue.filter(
    (c) => c._min.debut !== null && c._min.debut >= debutMoisCourant
  ).length;

  return {
    mois,
    moisCourant: mois.at(-1) ?? ligneVide(moisParis(maintenant)),
    caTotalCents,
    posesHonorees,
    panierMoyenCents:
      posesHonorees > 0
        ? Math.round(mois.reduce((s, l) => s + l.posesCents, 0) / posesHonorees)
        : 0,
    prixIndicatifs,
    prestations: [...prestations.values()].sort((a, b) => b.fois - a.fois),
    remplissage: {
      occupes,
      ouverts,
      part: ouverts > 0 ? Math.round((occupes / ouverts) * 100) : 0,
    },
    clientes: {
      total: venues,
      fidelisees,
      part: venues > 0 ? Math.round((fidelisees / venues) * 100) : 0,
      nouvellesCeMois,
    },
    annulations: { annules, absences },
  };
}
