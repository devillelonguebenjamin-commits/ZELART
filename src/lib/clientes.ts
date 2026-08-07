import { prisma } from "@/lib/prisma";

export type LigneCliente = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  notes: string | null;
  consentementMarketing: boolean;
  desabonneLe: Date | null;
  creeLe: Date;
  nbHonores: number;
  /** Tous statuts confondus : ce que la suppression de la fiche emporterait. */
  nbRendezVous: number;
  dernierRdv: Date | null;
  totalCents: number;
};

// Recherche libre sur le nom, l'e-mail ou le téléphone.
export function filtreRecherche(recherche: string) {
  const q = recherche.trim();
  if (!q) return {};
  const mode = "insensitive" as const;
  return {
    OR: [
      { prenom: { contains: q, mode } },
      { nom: { contains: q, mode } },
      { email: { contains: q, mode } },
      { telephone: { contains: q } },
    ],
  };
}

export async function listerClientes(recherche = ""): Promise<LigneCliente[]> {
  const clientes = await prisma.cliente.findMany({
    where: filtreRecherche(recherche),
    include: {
      rendezVous: {
        select: {
          debut: true,
          statut: true,
          lignes: { select: { prestation: { select: { prixCents: true } } } },
        },
        orderBy: { debut: "desc" },
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return clientes.map((cliente) => {
    const honores = cliente.rendezVous.filter((r) => r.statut === "TERMINE");
    return {
      id: cliente.id,
      prenom: cliente.prenom,
      nom: cliente.nom,
      email: cliente.email,
      telephone: cliente.telephone,
      notes: cliente.notes,
      consentementMarketing: cliente.consentementMarketing,
      desabonneLe: cliente.desabonneLe,
      creeLe: cliente.creeLe,
      nbHonores: honores.length,
      nbRendezVous: cliente.rendezVous.length,
      dernierRdv: cliente.rendezVous[0]?.debut ?? null,
      totalCents: honores.reduce(
        (somme, r) => somme + r.lignes.reduce((s, l) => s + l.prestation.prixCents, 0),
        0
      ),
    };
  });
}
