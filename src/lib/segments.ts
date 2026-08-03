import type { Prisma } from "@/generated/prisma/client";

export type Segment = {
  id: string;
  libelle: string;
  description: string;
};

export const SEGMENTS: Segment[] = [
  {
    id: "toutes",
    libelle: "Toutes les clientes",
    description: "Toutes celles qui ont accepté de recevoir vos offres.",
  },
  {
    id: "inactives",
    libelle: "Clientes à relancer",
    description: "Aucun rendez-vous depuis plus de 3 mois — idéal pour une offre de retour.",
  },
  {
    id: "nouvelles",
    libelle: "Nouvelles clientes",
    description: "Première venue il y a moins de 60 jours — parfait pour le parrainage.",
  },
  {
    id: "fideles",
    libelle: "Clientes fidèles",
    description: "Au moins 3 rendez-vous honorés — à récompenser en priorité.",
  },
];

export function segmentValide(id: string): boolean {
  return SEGMENTS.some((s) => s.id === id);
}

const MOIS_3 = 90 * 24 * 60 * 60 * 1000;
const JOURS_60 = 60 * 24 * 60 * 60 * 1000;

// Base commune : seules les clientes ayant donné leur accord et ne s'étant pas
// désinscrites peuvent être démarchées.
export function filtreDestinataires(segment: string): Prisma.ClienteWhereInput {
  const maintenant = Date.now();
  const base: Prisma.ClienteWhereInput = {
    consentementMarketing: true,
    desabonneLe: null,
  };

  switch (segment) {
    case "inactives":
      return {
        ...base,
        rendezVous: {
          none: { debut: { gte: new Date(maintenant - MOIS_3) } },
        },
      };
    case "nouvelles":
      return { ...base, creeLe: { gte: new Date(maintenant - JOURS_60) } };
    case "fideles":
      return {
        ...base,
        rendezVous: { some: { statut: "TERMINE" } },
      };
    default:
      return base;
  }
}

// Le segment « fidèles » demande un comptage que Prisma ne sait pas exprimer
// dans un `where` : on affine après coup.
export function seuilFidelite(segment: string): number {
  return segment === "fideles" ? 3 : 0;
}
