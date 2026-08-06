import { prisma } from "@/lib/prisma";
import type { TypeAvantage } from "@/generated/prisma/client";

// Programme « Squad ».
//
// Une filleule ne compte que lorsqu'elle est **réellement venue** : une simple
// inscription ne déclenche rien. Sans cette règle, trois personnes inscrites
// qui ne se présentent jamais offriraient une manucure.
//
// Le palier n'est jamais stocké : il se recalcule à chaque lecture depuis les
// filleules venues. Seuls les avantages accordés sont conservés, puisqu'ils se
// consomment. Une valeur figée finirait par diverger de la réalité — une
// filleule dont le rendez-vous repasse en annulé, par exemple.

export const REMISE_FILLEULE_POURCENT = 15;

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
    avantage: "−15 % sur votre prochaine prestation",
    emoji: "💕",
  },
  { cle: "SQUAD", nom: "Squad", seuil: 3, avantage: "Une manucure offerte", emoji: "🌟" },
  {
    cle: "ICONE",
    nom: "Icône",
    seuil: 5,
    avantage: "Un nail art niveau 2 ou un set de press-on, au choix",
    emoji: "👑",
  },
  {
    cle: "DIVA",
    nom: "DIVA",
    seuil: 10,
    avantage: "Statut Ambassadrice : une pose offerte par an et la dépose offerte",
    emoji: "💎",
  },
];

// Le statut Ambassadrice se mérite chaque année : sans une filleule venue dans
// les douze derniers mois, il redescend au palier précédent jusqu'à
// réactivation. Les paliers inférieurs, eux, restent acquis.
const FENETRE_MAINTIEN_MS = 365 * 24 * 60 * 60 * 1000;

const AVANTAGE_DU_PALIER: Partial<Record<Palier["cle"], TypeAvantage>> = {
  BESTIE: "BESTIE_REMISE",
  SQUAD: "SQUAD_MANUCURE",
  ICONE: "ICONE_CHOIX",
  DIVA: "DIVA_POSE_ANNUELLE",
};

export const LIBELLE_AVANTAGE: Record<TypeAvantage, string> = {
  BESTIE_REMISE: "−15 % sur une prestation",
  SQUAD_MANUCURE: "Une manucure offerte",
  ICONE_CHOIX: "Un nail art niveau 2 ou un set de press-on, au choix",
  DIVA_POSE_ANNUELLE: "Une pose offerte",
};

export type StatutParrainage = {
  filleulesVenues: number;
  palier: Palier;
  /** Palier atteint sur le seul décompte, avant la règle de maintien. */
  palierAcquis: Palier;
  /** Vrai quand le statut Ambassadrice est perdu faute de filleule récente. */
  ambassadriceEnSommeil: boolean;
  suivant: Palier | null;
  restantes: number;
  deposeOfferte: boolean;
};

function palierPourNombre(nombre: number): Palier {
  return [...PALIERS].reverse().find((p) => nombre >= p.seuil) ?? PALIERS[0];
}

/**
 * Décompte des filleules venues au moins une fois, et date de la plus récente
 * arrivée dans la squad — celle qui décide du maintien du statut Ambassadrice.
 */
async function filleulesVenues(
  clienteId: string
): Promise<{ nombre: number; derniereArrivee: Date | null }> {
  const filleules = await prisma.cliente.findMany({
    where: {
      parraineParId: clienteId,
      rendezVous: { some: { statut: "TERMINE" } },
    },
    select: {
      rendezVous: {
        where: { statut: "TERMINE" },
        orderBy: { debut: "asc" },
        take: 1,
        select: { debut: true },
      },
    },
  });

  // « Arrivée » dans la squad = première venue de la filleule, pas sa dernière.
  const premieres = filleules
    .map((f) => f.rendezVous[0]?.debut)
    .filter((d): d is Date => d instanceof Date);

  return {
    nombre: filleules.length,
    derniereArrivee: premieres.length > 0 ? new Date(Math.max(...premieres.map(Number))) : null,
  };
}

export async function statutParrainage(clienteId: string): Promise<StatutParrainage> {
  const { nombre, derniereArrivee } = await filleulesVenues(clienteId);
  const palierAcquis = palierPourNombre(nombre);

  const maintienOk =
    derniereArrivee !== null && Date.now() - derniereArrivee.getTime() < FENETRE_MAINTIEN_MS;
  const ambassadriceEnSommeil = palierAcquis.cle === "DIVA" && !maintienOk;
  const palier = ambassadriceEnSommeil
    ? PALIERS.find((p) => p.cle === "ICONE")!
    : palierAcquis;

  const suivant = PALIERS.find((p) => p.seuil > nombre) ?? null;

  return {
    filleulesVenues: nombre,
    palier,
    palierAcquis,
    ambassadriceEnSommeil,
    suivant,
    restantes: suivant ? suivant.seuil - nombre : 0,
    // Suspendue avec le statut : elle n'est donc jamais annoncée « à vie ».
    deposeOfferte: palier.cle === "DIVA",
  };
}

function nouveauCodeAvantage(): string {
  return `SQUAD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Accorde les avantages dus et renvoie ceux qui viennent d'être créés.
 *
 * Idempotent : la contrainte d'unicité (cliente, type, période) garantit qu'un
 * avantage n'est jamais accordé deux fois, même si deux attributions partent en
 * même temps — au statut « Terminé » d'un rendez-vous et à la tâche du matin.
 */
export async function attribuerAvantages(
  clienteId: string
): Promise<{ type: TypeAvantage; code: string }[]> {
  const statut = await statutParrainage(clienteId);
  const accordes: { type: TypeAvantage; code: string }[] = [];

  // Tous les paliers franchis, pas seulement le dernier : une cliente qui
  // amène trois filleules d'un coup ne doit pas perdre le palier Bestie.
  for (const palier of PALIERS) {
    const type = AVANTAGE_DU_PALIER[palier.cle];
    if (!type || statut.filleulesVenues < palier.seuil) continue;

    // Seule la pose des Ambassadrices se renouvelle, et seulement tant que le
    // statut tient.
    if (type === "DIVA_POSE_ANNUELLE" && statut.palier.cle !== "DIVA") continue;
    const periode = type === "DIVA_POSE_ANNUELLE" ? String(new Date().getFullYear()) : "";

    try {
      const avantage = await prisma.avantageParrainage.create({
        data: { clienteId, type, periode, code: nouveauCodeAvantage() },
      });
      accordes.push({ type, code: avantage.code });
    } catch {
      // Déjà accordé : c'est le fonctionnement normal, pas une anomalie.
    }
  }

  return accordes;
}
