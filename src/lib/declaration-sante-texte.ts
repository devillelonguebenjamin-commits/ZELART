// Le texte de la déclaration santé, partagé par le formulaire de réservation
// (ce que la cliente lit), le registre (ce qui est archivé) et le formulaire
// papier (ce qu'elle signe au salon). Un seul texte, pour que la preuve
// archivée soit mot pour mot ce qui a été affiché.
//
// Toute modification du texte change la version : une déclaration ancienne
// garde le texte de son époque, recopié dans le registre au moment où elle a
// été faite.
//
// Ce texte est une **déclaration et une information**, pas une décharge. Une
// clause qui écarte la responsabilité d'une professionnelle envers une
// consommatrice est réputée non écrite (code de la consommation, R212-1) ;
// l'ancienne version, « Zelart décline toute responsabilité », ne protégeait
// donc de rien. Ce qui protège, c'est de pouvoir montrer que la cliente a été
// informée des risques et a déclaré — ou non — ses allergies.

export const VERSION_DECLARATION = "2026-11-13";

export const TITRE_DECLARATION = "Déclaration santé et information sur les produits";

export const POINTS_DECLARATION = [
  "J'ai signalé à Zélia toute allergie connue (notamment aux gels, résines, colles ou acrylates), tout problème de santé, traitement ou état particulier pouvant concerner la prestation, ou je n'en ai aucun à signaler.",
  "Je suis informée que les produits utilisés (gels, résines, colles, dissolvants) peuvent provoquer une réaction allergique, y compris sans antécédent. Je préviendrai Zélia de tout changement avant mon rendez-vous.",
  "En cas de rougeur, démangeaison ou gonflement après la prestation, je préviens Zélia et je consulte un médecin.",
  "Zélia peut adapter ou refuser la prestation en cas de contre-indication (ongle abîmé, infecté ou décollé, plaie, mycose…).",
  "J'accepte que les informations de santé que je communique soient conservées pour la sécurité de mes prestations, dans les conditions de la politique de confidentialité.",
] as const;

/** Le texte archivé, tel quel, dans le registre. */
export function texteDeclaration(): string {
  return [TITRE_DECLARATION, ...POINTS_DECLARATION.map((p) => `• ${p}`)].join("\n");
}

/**
 * Le texte affiché aux réservations en ligne du 4 août au 13 novembre 2026,
 * avant le registre : seule une case cochée était enregistrée.
 */
export const DECLARATION_HISTORIQUE = {
  du: "2026-08-04",
  au: VERSION_DECLARATION,
  texte:
    "📌 Consentement & responsabilités : J'accepte et je confirme avoir communiqué toutes mes informations de santé et allergies nécessaires, et je comprends que les produits utilisés peuvent contenir des substances potentiellement allergènes. Je déclare accepter les conditions et les risques liés à la prestation. Zelart décline toute responsabilité en cas de réaction non signalée à l'avance ; en cas d'ongle abîmé, infecté ou en mauvais état, Zelart peut refuser la prestation.",
};
