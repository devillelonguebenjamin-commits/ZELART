import { prisma } from "@/lib/prisma";
import { jourParis } from "@/lib/creneaux";
import { enregistrerParametre } from "@/lib/parametres";

// Habillages saisonniers du site : Halloween, Noël, Saint-Valentin, Pâques.
//
// Un seul thème à la fois, choisi depuis l'onglet Thèmes de l'espace gérante,
// avec des dates de début et de fin facultatives. Les dates permettent de
// programmer un thème à l'avance, et surtout qu'il s'éteigne tout seul : une
// citrouille encore affichée mi-novembre ferait négligé.

export const THEMES = [
  {
    id: "halloween",
    nom: "Halloween",
    emoji: "🎃",
    periode: "fin octobre",
    decor: "Lune, chauves-souris, toile d'araignée, fantôme et citrouilles.",
  },
  {
    id: "noel",
    nom: "Noël",
    emoji: "🎄",
    periode: "décembre",
    decor: "Guirlande lumineuse, flocons de neige, sapins et cadeaux.",
  },
  {
    id: "saint-valentin",
    nom: "Saint-Valentin",
    emoji: "💕",
    periode: "début février",
    decor: "Cœurs qui s'envolent, lettre d'amour et flèche de Cupidon.",
  },
  {
    id: "paques",
    nom: "Pâques",
    emoji: "🐣",
    periode: "mars ou avril",
    decor: "Œufs décorés dans l'herbe, papillons, tulipes et lapin.",
  },
] as const;

export type IdTheme = (typeof THEMES)[number]["id"];

export function estIdTheme(valeur: string | null | undefined): valeur is IdTheme {
  return THEMES.some((t) => t.id === valeur);
}

const CLE_THEME = "themeSaison";
const CLE_DEBUT = "themeSaisonDebut";
const CLE_FIN = "themeSaisonFin";

export type ReglageTheme = {
  theme: IdTheme | null;
  /** « 2026-10-20 », inclus ; vide = dès maintenant. */
  debut: string | null;
  /** « 2026-10-31 », inclus ; vide = jusqu'à désactivation. */
  fin: string | null;
};

export async function reglageTheme(): Promise<ReglageTheme> {
  const lignes = await prisma.parametre.findMany({
    where: { cle: { in: [CLE_THEME, CLE_DEBUT, CLE_FIN] } },
  });
  const valeur = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur || null;
  const theme = valeur(CLE_THEME);
  return {
    theme: estIdTheme(theme) ? theme : null,
    debut: valeur(CLE_DEBUT),
    fin: valeur(CLE_FIN),
  };
}

/** Le thème réglé est-il visible aujourd'hui ? Comparé en jour de Paris. */
export function themeEnCours(reglage: ReglageTheme, maintenant: Date = new Date()): IdTheme | null {
  if (!reglage.theme) return null;
  const aujourdhui = jourParis(maintenant);
  if (reglage.debut && aujourdhui < reglage.debut) return null;
  if (reglage.fin && aujourdhui > reglage.fin) return null;
  return reglage.theme;
}

/** Le thème à afficher en ce moment sur le site public, ou `null`. */
export async function themeSaison(): Promise<IdTheme | null> {
  return themeEnCours(await reglageTheme());
}

export async function enregistrerTheme(reglage: ReglageTheme): Promise<void> {
  await enregistrerParametre(CLE_THEME, reglage.theme ?? "");
  await enregistrerParametre(CLE_DEBUT, reglage.debut ?? "");
  await enregistrerParametre(CLE_FIN, reglage.fin ?? "");
}
