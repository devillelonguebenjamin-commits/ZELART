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

/** Écart entre la durée prévue et la durée réellement passée. */
export type EcartDuree = {
  nom: string;
  /** Nombre de visites mesurées pour cette prestation. */
  mesures: number;
  prevuMin: number;
  /** Moyenne du temps réellement passé, en minutes. */
  reelMin: number;
  ecartMin: number;
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

  /** Durées mesurées, quand l'heure de sortie a été notée. */
  durees: {
    mesurees: number;
    /** Visites terminées sur la période, mesurées ou non. */
    total: number;
    ecartMedianMin: number;
    debordent: number;
    /** Par prestation, sur les seules visites à une prestation. */
    parPrestation: EcartDuree[];
  };

  /** Délai entre la demande et la réponse. */
  reponses: {
    mesurees: number;
    medianeHeures: number;
    sousDeuxHeures: number;
    /** Demandes qui attendent encore, et depuis combien d'heures pour la plus vieille. */
    enAttente: number;
    plusVieilleHeures: number;
  };

  /** Marge, quand le coût matière est renseigné. */
  marge: {
    /** Part du chiffre d'affaires dont le coût matière est connu. */
    couvertureCents: number;
    coutCents: number;
    margeCents: number;
    part: number;
  };

  /** Part du chiffre d'affaires dont le montant a été confirmé à l'encaissement. */
  fiabilite: { confirmeCents: number; totalCents: number; part: number };
  provenances: {
    repondues: number;
    lignes: { id: string; nombre: number; part: number }[];
  };
};

/** Médiane d'une série **déjà triée**. Zéro sur une série vide. */
function mediane(triee: number[]): number {
  if (triee.length === 0) return 0;
  const milieu = Math.floor(triee.length / 2);
  return triee.length % 2 === 1 ? triee[milieu] : (triee[milieu - 1] + triee[milieu]) / 2;
}

function ligneVide(cle: string): LigneMois {
  return { cle, poses: 0, posesCents: 0, pressOn: 0, pressOnCents: 0, totalCents: 0 };
}

export async function tableauDeBord(): Promise<TableauDeBord> {
  const maintenant = new Date();
  const debutHistorique = debutDeMoisParis(maintenant, MOIS_AFFICHES - 1);
  const debutMoisCourant = debutDeMoisParis(maintenant);

  const [
    rendezVous,
    commandes,
    posesParCliente,
    premiereVenue,
    annules,
    absences,
    delaisReponse,
    attente,
  ] = await Promise.all([
    // Seules les poses honorées comptent : une demande en attente n'est pas
    // du chiffre d'affaires.
    prisma.rendezVous.findMany({
      where: { statut: "TERMINE", debut: { gte: debutHistorique } },
      select: {
        debut: true,
        fin: true,
        finReelle: true,
        clienteId: true,
        lignes: {
          select: {
            prixCents: true,
            prixConfirme: true,
            prestation: {
              select: {
                nom: true,
                categorie: true,
                prixCents: true,
                aPartirDe: true,
                dureeMin: true,
                coutMatiereCents: true,
              },
            },
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
    // Délais de réponse : seules les demandes reçues depuis la mise en place de
    // l'horodatage en portent un, d'où le filtre sur sa présence plutôt que sur
    // une période.
    prisma.rendezVous.findMany({
      where: { repondueLe: { not: null }, creeLe: { gte: debutHistorique } },
      select: { creeLe: true, repondueLe: true },
    }),
    prisma.rendezVous.findMany({
      where: { statut: "EN_ATTENTE" },
      select: { creeLe: true },
      orderBy: { creeLe: "asc" },
    }),
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
      // Un « à partir de » ne rend le total indicatif que tant que le montant
      // réellement facturé n'a pas été saisi. Depuis que Zélia peut l'écrire,
      // l'avertissement doit disparaître quand il n'a plus lieu d'être — sinon
      // il apprend à ne plus être lu.
      if (l.prestation.aPartirDe && !l.prixConfirme) prixIndicatifs = true;
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

  // D'où viennent les clientes, sur celles qui ont répondu. On compte les
  // fiches, pas les rendez-vous : une habituée qui revient dix fois ne doit pas
  // faire croire que son canal en a amené dix.
  const parProvenance = await prisma.cliente.groupBy({
    by: ["provenance"],
    where: { provenance: { not: null } },
    _count: { _all: true },
  });
  const repondues = parProvenance.reduce((somme, p) => somme + p._count._all, 0);
  const provenances = {
    repondues,
    lignes: parProvenance
      .map((p) => ({
        id: p.provenance ?? "",
        nombre: p._count._all,
        part: repondues > 0 ? Math.round((p._count._all / repondues) * 100) : 0,
      }))
      .sort((a, b) => b.nombre - a.nombre),
  };

  // ── Durées : ce qui était prévu, ce qui s'est passé ────────────────
  //
  // L'écart n'est attribuable à une prestation précise que sur les visites qui
  // n'en comportent qu'une. Sur un rendez-vous à trois lignes, un débordement
  // d'une demi-heure ne dit pas laquelle a débordé ; le compter partout ferait
  // trois fausses mesures au lieu d'une vraie.
  const mesurees = rendezVous.filter((r) => r.finReelle !== null);
  const ecarts = mesurees
    .map((r) => Math.round((r.finReelle!.getTime() - r.fin.getTime()) / 60_000))
    .sort((a, b) => a - b);

  const parPrestationDuree = new Map<string, { prevu: number; reel: number[] }>();
  for (const r of mesurees) {
    if (r.lignes.length !== 1) continue;
    const nom = r.lignes[0].prestation.nom;
    const reel = Math.round((r.finReelle!.getTime() - r.debut.getTime()) / 60_000);
    const entree = parPrestationDuree.get(nom);
    if (entree) entree.reel.push(reel);
    else parPrestationDuree.set(nom, { prevu: r.lignes[0].prestation.dureeMin, reel: [reel] });
  }

  const durees = {
    mesurees: mesurees.length,
    total: rendezVous.length,
    ecartMedianMin: mediane(ecarts),
    debordent: ecarts.filter((e) => e > 0).length,
    parPrestation: [...parPrestationDuree.entries()]
      .map(([nom, { prevu, reel }]) => {
        const moyenne = Math.round(reel.reduce((s, v) => s + v, 0) / reel.length);
        return { nom, mesures: reel.length, prevuMin: prevu, reelMin: moyenne, ecartMin: moyenne - prevu };
      })
      .sort((a, b) => Math.abs(b.ecartMin) - Math.abs(a.ecartMin)),
  };

  // ── Délai de réponse ───────────────────────────────────────────────
  const heures = delaisReponse
    .map((r) => (r.repondueLe!.getTime() - r.creeLe.getTime()) / 3_600_000)
    .sort((a, b) => a - b);
  const plusVieille = attente[0];

  const reponses = {
    mesurees: heures.length,
    medianeHeures: Math.round(mediane(heures) * 10) / 10,
    sousDeuxHeures: heures.filter((h) => h <= 2).length,
    enAttente: attente.length,
    plusVieilleHeures: plusVieille
      ? Math.round((maintenant.getTime() - plusVieille.creeLe.getTime()) / 3_600_000)
      : 0,
  };

  // ── Marge et fiabilité ─────────────────────────────────────────────
  //
  // La marge ne porte que sur les lignes dont le coût est renseigné, et la
  // couverture le dit : une marge calculée sur la moitié du catalogue n'est pas
  // la marge du salon.
  let couvertureCents = 0;
  let coutCents = 0;
  let confirmeCents = 0;
  let totalLignesCents = 0;

  for (const r of rendezVous) {
    for (const l of r.lignes) {
      const prix = l.prixCents ?? l.prestation.prixCents;
      totalLignesCents += prix;
      if (l.prixConfirme) confirmeCents += prix;
      if (l.prestation.coutMatiereCents !== null) {
        couvertureCents += prix;
        coutCents += l.prestation.coutMatiereCents;
      }
    }
  }

  const marge = {
    couvertureCents,
    coutCents,
    margeCents: couvertureCents - coutCents,
    part: couvertureCents > 0 ? Math.round(((couvertureCents - coutCents) / couvertureCents) * 100) : 0,
  };

  const fiabilite = {
    confirmeCents,
    totalCents: totalLignesCents,
    part: totalLignesCents > 0 ? Math.round((confirmeCents / totalLignesCents) * 100) : 0,
  };

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
    durees,
    reponses,
    marge,
    fiabilite,
    provenances,
  };
}
