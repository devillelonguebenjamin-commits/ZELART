// « Comment m'avez-vous connue ? »
//
// Une liste courte et fermée, parce qu'un champ libre produit trente
// orthographes de « bouche à oreille » et ne se compte pas. La question est
// facultative et posée une seule fois : elle ne doit jamais retarder une
// réservation.
//
// « Une amie m'en a parlé » vient en tête parce que c'est la réponse la plus
// utile : celle qui dit que le parrainage et le bouche-à-oreille fonctionnent.

export const PROVENANCES = [
  { id: "bouche-a-oreille", libelle: "Une amie m'en a parlé" },
  { id: "instagram", libelle: "Instagram" },
  { id: "tiktok", libelle: "TikTok" },
  { id: "google", libelle: "Recherche Google" },
  { id: "passage", libelle: "En passant devant l'institut" },
  { id: "autre", libelle: "Autrement" },
] as const;

export type Provenance = (typeof PROVENANCES)[number]["id"];

export function provenanceValide(valeur: string): valeur is Provenance {
  return PROVENANCES.some((p) => p.id === valeur);
}

export function libelleProvenance(id: string | null): string {
  return PROVENANCES.find((p) => p.id === id)?.libelle ?? "Non renseigné";
}
