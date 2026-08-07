import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  LIBELLE_AVANTAGE,
  PALIERS,
  REMISE_FILLEULE_POURCENT,
  type Palier,
} from "@/lib/parrainage-bareme";
import type { TypeAvantage } from "@/generated/prisma/client";

// Réexportés pour que les appelants côté serveur n'aient qu'une porte d'entrée.
export { LIBELLE_AVANTAGE, PALIERS, REMISE_FILLEULE_POURCENT, type Palier };

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

// Le statut Ambassadrice se mérite chaque année : sans une filleule venue dans
// les douze derniers mois, il redescend au palier précédent jusqu'à
// réactivation. Les paliers inférieurs, eux, restent acquis.
const FENETRE_MAINTIEN_MS = 365 * 24 * 60 * 60 * 1000;

const AVANTAGE_DU_PALIER: Partial<Record<Palier["cle"], TypeAvantage>> = {
  BESTIE: "BESTIE_HUILE",
  SQUAD: "SQUAD_REMISE",
  ICONE: "ICONE_NAIL_ART",
  DIVA: "DIVA_POSE_ANNUELLE",
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
};

function palierPourNombre(nombre: number): Palier {
  return [...PALIERS].reverse().find((p) => nombre >= p.seuil) ?? PALIERS[0];
}

/** Première venue de chaque filleule — vide tant qu'elle n'est jamais venue. */
type PremieresVenues = { rendezVous: { debut: Date }[] }[];

/**
 * Décompte des filleules venues au moins une fois, et date de la plus récente
 * arrivée dans la squad — celle qui décide du maintien du statut Ambassadrice.
 *
 * Séparé de la requête pour servir aussi au classement de l'espace gérante, qui
 * charge toutes les marraines d'un coup : deux décomptes distincts finiraient
 * par ne plus dire la même chose.
 */
function decompte(filleules: PremieresVenues): { nombre: number; derniereArrivee: Date | null } {
  // « Arrivée » dans la squad = première venue de la filleule, pas sa dernière.
  const premieres = filleules
    .map((f) => f.rendezVous[0]?.debut)
    .filter((d): d is Date => d instanceof Date);

  return {
    nombre: premieres.length,
    derniereArrivee: premieres.length > 0 ? new Date(Math.max(...premieres.map(Number))) : null,
  };
}

const PREMIERE_VENUE = {
  rendezVous: {
    where: { statut: "TERMINE" },
    orderBy: { debut: "asc" },
    take: 1,
    select: { debut: true },
  },
} as const;

async function filleulesVenues(
  clienteId: string
): Promise<{ nombre: number; derniereArrivee: Date | null }> {
  const filleules = await prisma.cliente.findMany({
    where: {
      parraineParId: clienteId,
      rendezVous: { some: { statut: "TERMINE" } },
    },
    select: PREMIERE_VENUE,
  });
  return decompte(filleules);
}

/** Applique les règles de palier à un décompte déjà établi. */
export function statutDepuisDecompte(
  nombre: number,
  derniereArrivee: Date | null
): StatutParrainage {
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
  };
}

export async function statutParrainage(clienteId: string): Promise<StatutParrainage> {
  const { nombre, derniereArrivee } = await filleulesVenues(clienteId);
  return statutDepuisDecompte(nombre, derniereArrivee);
}

export type LigneSquad = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  codeParrainage: string;
  /** Filleules rattachées, venues ou non — le décompte du palier n'en retient qu'une part. */
  filleulesInscrites: number;
  statut: StatutParrainage;
};

/**
 * Classement des marraines pour l'espace gérante.
 *
 * Une seule requête plutôt qu'un `statutParrainage` par cliente : le nombre de
 * marraines n'est pas borné, et la page se chargerait de plus en plus lentement.
 */
export async function classementSquad(): Promise<LigneSquad[]> {
  const marraines = await prisma.cliente.findMany({
    where: { filleules: { some: {} } },
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      codeParrainage: true,
      filleules: { select: PREMIERE_VENUE },
    },
  });

  return marraines
    .map(({ filleules, ...cliente }) => {
      const { nombre, derniereArrivee } = decompte(filleules);
      return {
        ...cliente,
        filleulesInscrites: filleules.length,
        statut: statutDepuisDecompte(nombre, derniereArrivee),
      };
    })
    .sort(
      (a, b) =>
        b.statut.filleulesVenues - a.statut.filleulesVenues ||
        b.filleulesInscrites - a.filleulesInscrites ||
        a.prenom.localeCompare(b.prenom)
    );
}

// Même alphabet lisible que les codes de parrainage : ces codes se lisent à
// voix haute au salon. `Math.random` conviendrait au tirage, mais `randomBytes`
// évite deux codes identiques après un redémarrage.
function nouveauCodeAvantage(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = [...randomBytes(6)].map((o) => alphabet[o % alphabet.length]).join("");
  return `SQUAD-${code}`;
}

/**
 * Avantages qui récompensent le même palier, barèmes confondus.
 *
 * Les valeurs de l'ancien barème sont conservées pour que ce qui a été promis
 * reste lisible ; il faut en contrepartie savoir qu'elles occupent la place du
 * nouvel avantage correspondant.
 */
const EQUIVALENTS: Record<TypeAvantage, TypeAvantage[]> = {
  BESTIE_HUILE: ["BESTIE_HUILE", "BESTIE_REMISE"],
  BESTIE_REMISE: ["BESTIE_REMISE", "BESTIE_HUILE"],
  SQUAD_REMISE: ["SQUAD_REMISE", "SQUAD_MANUCURE"],
  SQUAD_MANUCURE: ["SQUAD_MANUCURE", "SQUAD_REMISE"],
  ICONE_NAIL_ART: ["ICONE_NAIL_ART", "ICONE_CHOIX"],
  ICONE_CHOIX: ["ICONE_CHOIX", "ICONE_NAIL_ART"],
  DIVA_POSE_ANNUELLE: ["DIVA_POSE_ANNUELLE"],
};

/** Vrai quand l'échec vient du couple (cliente, type, période) déjà présent. */
function dejaAccorde(e: unknown): boolean {
  const cible = (e as { code?: string; meta?: { target?: unknown } })?.meta?.target;
  const champs = Array.isArray(cible) ? cible.map(String) : [String(cible ?? "")];
  return champs.some((c) => c.includes("clienteId") || c.includes("periode"));
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

  // Ce que la cliente a déjà, ancien barème compris. La contrainte d'unicité ne
  // porte que sur le type exact : sans ce contrôle, une marraine qui avait
  // gagné « −15 % » sous l'ancien barème recevrait en plus l'huile à cuticule
  // à la venue suivante, deux fois récompensée pour un palier franchi une fois.
  const dejaObtenus = new Set(
    (
      await prisma.avantageParrainage.findMany({
        where: { clienteId },
        select: { type: true, periode: true },
      })
    ).map((a) => `${a.type}|${a.periode}`)
  );

  // Tous les paliers franchis, pas seulement le dernier : une cliente qui
  // amène trois filleules d'un coup ne doit pas perdre le palier Bestie.
  for (const palier of PALIERS) {
    const type = AVANTAGE_DU_PALIER[palier.cle];
    if (!type || statut.filleulesVenues < palier.seuil) continue;

    // Seule la pose des Ambassadrices se renouvelle, et seulement tant que le
    // statut tient.
    if (type === "DIVA_POSE_ANNUELLE" && statut.palier.cle !== "DIVA") continue;
    const periode = type === "DIVA_POSE_ANNUELLE" ? String(new Date().getFullYear()) : "";

    // Un palier franchi une fois ne se récompense qu'une fois, quel que soit le
    // barème en vigueur ce jour-là.
    if (EQUIVALENTS[type].some((equivalent) => dejaObtenus.has(`${equivalent}|${periode}`))) {
      continue;
    }

    // Deux échecs possibles, à ne pas confondre : l'avantage est déjà accordé —
    // le cas normal, la contrainte fait son travail — ou le code tiré existe
    // déjà. Tout absorber ferait disparaître sans bruit un avantage mérité.
    for (let essai = 0; ; essai++) {
      try {
        const avantage = await prisma.avantageParrainage.create({
          data: { clienteId, type, periode, code: nouveauCodeAvantage() },
        });
        accordes.push({ type, code: avantage.code });
        break;
      } catch (e) {
        if (dejaAccorde(e)) break;
        if (essai >= 4) throw e;
      }
    }
  }

  return accordes;
}
