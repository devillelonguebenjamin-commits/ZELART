// Barème du programme « Squad », sans aucune dépendance d'exécution.
//
// Il vit à part de `parrainage.ts`, qui importe Prisma : les composants qui
// affichent la remise ou les paliers tournent dans le navigateur, et importer
// le module complet y entraînerait Prisma tout entier. Le taux était jusqu'ici
// recopié en dur dans trois composants — il a suffi d'en changer un pour que
// les autres mentent.

import type { TypeAvantage } from "@/generated/prisma/client";

export const REMISE_FILLEULE_POURCENT = 10;

export type Palier = {
  cle: "AUCUN" | "BESTIE" | "SQUAD" | "ICONE" | "DIVA";
  nom: string;
  seuil: number;
  avantage: string;
  emoji: string;
};

export const PALIERS: Palier[] = [
  { cle: "AUCUN", nom: "Squad en formation", seuil: 0, avantage: "", emoji: "✨" },
  {
    cle: "BESTIE",
    nom: "Bestie",
    seuil: 1,
    avantage: "Une huile à cuticule offerte",
    emoji: "💕",
  },
  {
    cle: "SQUAD",
    nom: "Squad",
    seuil: 3,
    avantage: "−10 % sur votre prochaine prestation",
    emoji: "🌟",
  },
  { cle: "ICONE", nom: "Icône", seuil: 5, avantage: "Un nail art niveau 2 offert", emoji: "👑" },
  {
    cle: "DIVA",
    nom: "DIVA",
    seuil: 10,
    avantage: "Statut Ambassadrice : une pose offerte par an",
    emoji: "💎",
  },
];

// Les trois libellés du bas ne sont plus attribués, mais restent affichés : une
// cliente qui a gagné « −15 % » doit continuer à lire « −15 % », dans son
// espace comme sur la fiche de Zélia.
export const LIBELLE_AVANTAGE: Record<TypeAvantage, string> = {
  BESTIE_HUILE: "Une huile à cuticule",
  SQUAD_REMISE: "−10 % sur une prestation",
  ICONE_NAIL_ART: "Un nail art niveau 2",
  DIVA_POSE_ANNUELLE: "Une pose offerte",

  BESTIE_REMISE: "−15 % sur une prestation (ancien barème)",
  SQUAD_MANUCURE: "Une manucure offerte (ancien barème)",
  ICONE_CHOIX: "Un nail art niveau 2 ou un set de press-on, au choix (ancien barème)",
};
