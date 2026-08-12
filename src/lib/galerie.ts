// Ce que dit une photo de la galerie quand on ne la voit pas.
//
// Le texte alternatif servait de repli générique : seize photos décrites par
// « Réalisation Zelart ». C'est inutile pour une personne qui navigue au
// lecteur d'écran, et invisible pour Google Images, qui n'a alors aucune raison
// de rattacher ces images à une pose Gel X ou à un nail art.
//
// Plutôt que de demander une légende de plus à Zélia, la description se déduit
// de ce qui a réellement été fait : les prestations du rendez-vous d'où sort la
// photo. Une donnée déjà saisie décrit mieux qu'une case qu'on oublie de
// remplir.

const LIEU = "Zelart Nails, prothésiste ongulaire à Saint-Nazaire";

export const LEGENDE_PAR_DEFAUT = `Réalisation de ${LIEU}`;

/** "Pose Gel X et nail art, par Zelart Nails, prothésiste ongulaire à Saint-Nazaire" */
export function descriptionRealisation(prestations: { nom: string; categorie: string }[]): string {
  // Les catégories plutôt que les noms : « VSP + nail art niveau 1 » se lit mal
  // à voix haute, « Vernis semi-permanent » se lit bien et se cherche mieux.
  const categories = [...new Set(prestations.map((p) => p.categorie))].filter(Boolean);
  if (categories.length === 0) return LEGENDE_PAR_DEFAUT;

  const liste =
    categories.length === 1
      ? categories[0]
      : `${categories.slice(0, -1).join(", ")} et ${categories[categories.length - 1]}`;
  return `${liste}, par ${LIEU}`;
}
