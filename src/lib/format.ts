export function formatPrix(prixCents: number, aPartirDe = false): string {
  const euros = (prixCents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: prixCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${aPartirDe ? "à partir de " : ""}${euros} €`;
}

type LigneTarif = { prixCents: number; aPartirDe: boolean };

// Total d'un rendez-vous, toutes prestations confondues. Le « à partir de » se
// propage : dès qu'une ligne est indicative, le total l'est aussi.
export function totalTarifs(lignes: LigneTarif[]): LigneTarif {
  return lignes.reduce<LigneTarif>(
    (cumul, ligne) => ({
      prixCents: cumul.prixCents + ligne.prixCents,
      aPartirDe: cumul.aPartirDe || ligne.aPartirDe,
    }),
    { prixCents: 0, aPartirDe: false }
  );
}

export function totalDuree(lignes: { dureeMin: number }[]): number {
  return lignes.reduce((cumul, ligne) => cumul + ligne.dureeMin, 0);
}

export function formatDuree(dureeMin: number): string {
  const heures = Math.floor(dureeMin / 60);
  const minutes = dureeMin % 60;
  if (heures === 0) return `${minutes} min`;
  return minutes === 0 ? `${heures}h` : `${heures}h${String(minutes).padStart(2, "0")}`;
}

export function grouperParCategorie<T extends { categorie: string }>(
  prestations: T[]
): { nom: string; prestations: T[] }[] {
  const groupes = new Map<string, T[]>();
  for (const p of prestations) {
    const groupe = groupes.get(p.categorie);
    if (groupe) groupe.push(p);
    else groupes.set(p.categorie, [p]);
  }
  return [...groupes.entries()].map(([nom, items]) => ({ nom, prestations: items }));
}
