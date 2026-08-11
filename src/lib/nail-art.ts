import { prisma } from "@/lib/prisma";

// Les trois niveaux de nail art, expliqués et illustrés.
//
// Ce que le niveau veut dire ne vit nulle part dans le système : seule Zélia en
// juge, à la lecture d'une inspiration. Le site ne l'invente donc pas — il
// affiche **ce qu'elle a écrit** et **les photos qu'elle a choisies**, à côté du
// supplément tarifaire, qui, lui, se mesure sur le catalogue.
//
// Les textes ci-dessous sont un point de départ, volontairement descriptifs et
// prudents : ils parlent de complexité et de temps de dessin, jamais de motifs
// précis que le salon ne suivrait pas. Zélia les remplace depuis l'espace
// gérante ; le jour où elle le fait, ce sont ses mots qui s'affichent.

export const NIVEAUX = [1, 2, 3] as const;
export type Niveau = (typeof NIVEAUX)[number];

export const TEXTE_PAR_DEFAUT: Record<Niveau, { titre: string; texte: string }> = {
  1: {
    titre: "Simple et net",
    texte:
      "Un décor discret, posé sur quelques ongles : une couleur unie rehaussée d'un détail, une french, un dégradé simple. Idéal si vous voulez une touche en plus sans que cela se remarque de loin.",
  },
  2: {
    titre: "Travaillé",
    texte:
      "Un dessin construit, avec plusieurs couleurs ou plusieurs éléments par ongle, et davantage d'ongles décorés. C'est le niveau le plus demandé : visible, personnalisé, mais qui reste portable au quotidien.",
  },
  3: {
    titre: "Sur-mesure",
    texte:
      "Une création détaillée, dessinée à main levée, souvent sur l'ensemble des ongles : relief, incrustations, motifs fins. C'est le niveau des occasions et des envies précises. Comptez plus de temps sur place.",
  },
};

export function clePhotoNiveau(niveau: Niveau): string {
  return `nailArtPhoto${niveau}`;
}

export function cleTexteNiveau(niveau: Niveau): string {
  return `nailArtTexte${niveau}`;
}

export type NiveauExplique = {
  niveau: Niveau;
  titre: string;
  texte: string;
  photoUrl: string | null;
  /** Supplément mesuré sur le catalogue, en centimes. Null si non calculable. */
  supplementMinCents: number | null;
  supplementMaxCents: number | null;
};

/**
 * Les trois niveaux prêts à afficher : textes (les siens ou ceux par défaut),
 * photos, et le supplément lu dans le catalogue.
 */
export async function niveauxExpliques(
  supplements: { niveau: number; supplementMinCents: number; supplementMaxCents: number }[] = []
): Promise<NiveauExplique[]> {
  const cles = NIVEAUX.flatMap((n) => [clePhotoNiveau(n), cleTexteNiveau(n)]);
  const lignes = await prisma.parametre.findMany({ where: { cle: { in: cles } } });
  const valeur = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur?.trim() || null;

  return NIVEAUX.map((niveau) => {
    const mesure = supplements.find((s) => s.niveau === niveau);
    return {
      niveau,
      titre: TEXTE_PAR_DEFAUT[niveau].titre,
      texte: valeur(cleTexteNiveau(niveau)) ?? TEXTE_PAR_DEFAUT[niveau].texte,
      photoUrl: valeur(clePhotoNiveau(niveau)),
      supplementMinCents: mesure?.supplementMinCents ?? null,
      supplementMaxCents: mesure?.supplementMaxCents ?? null,
    };
  });
}
