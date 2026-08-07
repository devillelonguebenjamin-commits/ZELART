import type { TypeActe, TypePose } from "@/generated/prisma/client";

// Ce que la page « Les prestations expliquées » raconte est **déduit du
// catalogue et des règles**, jamais recopié à côté : un tarif modifié, une
// prestation retirée ou un délai de relance ajusté doivent se voir sur la page
// sans que personne y pense. Une explication figée dans du texte finirait par
// contredire ce que le formulaire de réservation applique vraiment.

export type PrestationExpliquee = {
  id: string;
  nom: string;
  categorie: string;
  description: string | null;
  dureeMin: number;
  prixCents: number;
  aPartirDe: boolean;
  typeActe: TypeActe;
  typePose: TypePose;
};

export type Technique = {
  categorie: string;
  typePose: TypePose;
  description: string | null;
  /** Pose la moins chère de la catégorie, celle qui sert de repère. */
  aPartirDeCents: number;
  dureeMinimale: number;
  /** Vrai si le catalogue propose un remplissage pour cette technique. */
  remplissagePossible: boolean;
  remplissage: { prixCents: number; aPartirDe: boolean } | null;
  depose: { prixCents: number; aPartirDe: boolean } | null;
  /** Retour conseillé, en jours — le même délai que celui des relances. */
  retourJours: number;
};

const NIVEAU = /nail art niveau (\d)/i;

/** Prestations « nues » : ni dépose, ni remplissage, ni nail art. */
function estBase(p: PrestationExpliquee): boolean {
  return p.typeActe === "POSE" && !NIVEAU.test(p.nom);
}

export function techniques(
  prestations: PrestationExpliquee[],
  delais: Record<TypePose, number>
): Technique[] {
  const parCategorie = new Map<string, PrestationExpliquee[]>();
  for (const p of prestations) {
    const groupe = parCategorie.get(p.categorie);
    if (groupe) groupe.push(p);
    else parCategorie.set(p.categorie, [p]);
  }

  const resultat: Technique[] = [];
  for (const [categorie, items] of parCategorie) {
    const poses = items.filter((p) => p.typeActe === "POSE");
    if (poses.length === 0) continue;

    const remplissage = items.find((p) => p.typeActe === "REMPLISSAGE");
    const depose = items.find((p) => p.typeActe === "DEPOSE");
    const repere = poses.reduce((a, b) => (b.prixCents < a.prixCents ? b : a));

    resultat.push({
      categorie,
      typePose: repere.typePose,
      // La description est cherchée **parmi les poses** : celle d'une dépose
      // parle de la dépose, et la carte annonçait « Dépose seule de votre
      // vernis semi-permanent » en guise de définition du semi-permanent.
      description: poses.find((p) => p.description)?.description ?? null,
      aPartirDeCents: repere.prixCents,
      dureeMinimale: Math.min(...poses.map((p) => p.dureeMin)),
      remplissagePossible: Boolean(remplissage),
      remplissage: remplissage
        ? { prixCents: remplissage.prixCents, aPartirDe: remplissage.aPartirDe }
        : null,
      depose: depose ? { prixCents: depose.prixCents, aPartirDe: depose.aPartirDe } : null,
      retourJours: delais[repere.typePose],
    });
  }

  return resultat.sort((a, b) => a.aPartirDeCents - b.aPartirDeCents);
}

export type NiveauNailArt = {
  niveau: number;
  /** Écart de prix par rapport à la même prestation sans nail art. */
  supplementMinCents: number;
  supplementMaxCents: number;
  tempsMin: number;
  tempsMax: number;
};

/**
 * Ce que chaque niveau de nail art ajoute, mesuré sur le catalogue.
 *
 * Le sens des niveaux (ce qui distingue un « niveau 2 » d'un « niveau 3 ») ne
 * vit nulle part dans le système : seule Zélia le sait, et c'est elle qui
 * tranche à la lecture d'une inspiration. On s'en tient donc à ce qui est
 * vérifiable — le supplément et le temps — plutôt que d'inventer des
 * définitions que le salon ne suivrait pas.
 *
 * Un écart est renvoyé sous forme de fourchette : rien ne garantit que tous les
 * tarifs évoluent du même pas.
 */
export function niveauxNailArt(prestations: PrestationExpliquee[]): NiveauNailArt[] {
  // Repère par catégorie : la pose sans nail art la moins chère.
  const reperes = new Map<string, PrestationExpliquee>();
  for (const p of prestations.filter(estBase)) {
    const actuel = reperes.get(p.categorie);
    if (!actuel || p.prixCents < actuel.prixCents) reperes.set(p.categorie, p);
  }

  const parNiveau = new Map<number, { prix: number[]; temps: number[] }>();
  for (const p of prestations) {
    const trouve = p.nom.match(NIVEAU);
    if (!trouve || p.typeActe !== "POSE") continue;

    const repere = reperes.get(p.categorie);
    if (!repere) continue;

    const entree = parNiveau.get(Number(trouve[1])) ?? { prix: [], temps: [] };
    entree.prix.push(p.prixCents - repere.prixCents);
    entree.temps.push(p.dureeMin - repere.dureeMin);
    parNiveau.set(Number(trouve[1]), entree);
  }

  return [...parNiveau.entries()]
    .map(([niveau, { prix, temps }]) => ({
      niveau,
      supplementMinCents: Math.min(...prix),
      supplementMaxCents: Math.max(...prix),
      tempsMin: Math.min(...temps),
      tempsMax: Math.max(...temps),
    }))
    .sort((a, b) => a.niveau - b.niveau);
}
