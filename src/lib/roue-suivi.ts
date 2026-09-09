import { prisma } from "@/lib/prisma";
import { reglagesRoue } from "@/lib/parametres";
import { toursDisponibles } from "@/lib/roue";

// Ce que l'écran Roue doit montrer, et que rien ne montrait.
//
// La roue tournait en aveugle : Zélia créait des lots, réglait des chances, et
// n'apprenait qu'une cliente avait gagné qu'en ouvrant sa fiche — donc en le
// sachant déjà. Trois questions restaient sans réponse.
//
//   1. Qui peut tourner, et ne le sait peut-être pas.
//   2. Quel cadeau reste à donner.
//   3. Qu'est-ce qui a été gagné jusqu'ici.
//
// Les deux premières se ressemblent mais n'appellent pas le même geste, et
// c'est ce qui décide de leur place. Un cadeau à remettre attend **Zélia** :
// il compte dans la pastille de navigation, qui ne dit que cela. Une cliente
// éligible attend **elle-même** : Zélia ne peut pas tourner à sa place, et un
// compteur qu'elle ne peut pas vider deviendrait un décor qu'on cesse de
// regarder. Il s'affiche donc sur la page, comme une occasion, pas comme une
// tâche.

export type ClienteEligible = {
  id: string;
  prenom: string;
  nom: string;
  tours: number;
  posesRealisees: number;
};

export type CadeauADonner = {
  id: string;
  code: string;
  gagneLe: Date;
  libelle: string;
  aRetirerAuSalon: boolean;
  cliente: { id: string; prenom: string; nom: string };
};

export type LigneHistorique = CadeauADonner & { utiliseLe: Date | null };

/**
 * Les clientes dont la jauge est pleine et qui n'ont pas encore tourné.
 *
 * Deux décomptes groupés plutôt qu'une requête par cliente : le fichier a
 * vocation à grandir, et une boucle de requêtes finit toujours par se voir.
 * Les poses honorées font foi, comme au lancement de la roue — c'est la même
 * fonction qui tranche des deux côtés, sans quoi l'écran promettrait un tour
 * que le bouton refuserait.
 */
export async function clientesEligibles(): Promise<ClienteEligible[]> {
  const { posesParTour } = await reglagesRoue();

  const [poses, tours] = await Promise.all([
    prisma.rendezVous.groupBy({
      by: ["clienteId"],
      where: { statut: "TERMINE" },
      _count: { _all: true },
    }),
    prisma.recompense.groupBy({ by: ["clienteId"], _count: { _all: true } }),
  ]);

  const joues = new Map(tours.map((t) => [t.clienteId, t._count._all]));
  const candidates = poses
    .map((p) => ({
      clienteId: p.clienteId,
      posesRealisees: p._count._all,
      tours: toursDisponibles(p._count._all, joues.get(p.clienteId) ?? 0, posesParTour),
    }))
    .filter((c) => c.tours > 0);

  if (candidates.length === 0) return [];

  const fiches = await prisma.cliente.findMany({
    where: { id: { in: candidates.map((c) => c.clienteId) } },
    select: { id: true, prenom: true, nom: true },
  });
  const parId = new Map(fiches.map((f) => [f.id, f]));

  return candidates
    .flatMap((c) => {
      const fiche = parId.get(c.clienteId);
      return fiche ? [{ ...fiche, tours: c.tours, posesRealisees: c.posesRealisees }] : [];
    })
    .sort((a, b) => b.tours - a.tours || a.prenom.localeCompare(b.prenom));
}

function enLigne(r: {
  id: string;
  code: string;
  gagneLe: Date;
  utiliseLe: Date | null;
  lot: { libelle: string; aRetirerAuSalon: boolean };
  cliente: { id: string; prenom: string; nom: string };
}): LigneHistorique {
  return {
    id: r.id,
    code: r.code,
    gagneLe: r.gagneLe,
    utiliseLe: r.utiliseLe,
    libelle: r.lot.libelle,
    aRetirerAuSalon: r.lot.aRetirerAuSalon,
    cliente: r.cliente,
  };
}

/** Gains remportés et pas encore honorés, du plus ancien au plus récent. */
export async function cadeauxADonner(): Promise<CadeauADonner[]> {
  const gains = await prisma.recompense.findMany({
    where: { utiliseLe: null },
    orderBy: { gagneLe: "asc" },
    include: {
      lot: { select: { libelle: true, aRetirerAuSalon: true } },
      cliente: { select: { id: true, prenom: true, nom: true } },
    },
  });
  return gains.map(enLigne);
}

/** Tous les tours joués, du plus récent au plus ancien. */
export async function historiqueRoue(
  limite = 50
): Promise<{ lignes: LigneHistorique[]; total: number }> {
  const [gains, total] = await Promise.all([
    prisma.recompense.findMany({
      orderBy: { gagneLe: "desc" },
      take: limite,
      include: {
        lot: { select: { libelle: true, aRetirerAuSalon: true } },
        cliente: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    prisma.recompense.count(),
  ]);
  return { lignes: gains.map(enLigne), total };
}
