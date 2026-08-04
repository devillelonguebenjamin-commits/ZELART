import { randomInt } from "crypto";

export const POSES_PAR_TOUR_DEFAUT = 3;

export type LotPublic = {
  id: string;
  libelle: string;
  texteSurRoue: string;
  chance: number;
  couleur: string;
  aRetirerAuSalon: boolean;
};

// Les chances sont des poids : la part réelle d'un lot est sa chance rapportée
// au total. La roue reste donc cohérente même si Zélia ne tombe pas sur 100.
export function totalChances(lots: { chance: number }[]): number {
  return lots.reduce((somme, lot) => somme + Math.max(0, lot.chance), 0);
}

export function partEffective(lot: { chance: number }, lots: { chance: number }[]): number {
  const total = totalChances(lots);
  if (total <= 0) return 0;
  return (Math.max(0, lot.chance) / total) * 100;
}

// Tirage côté serveur uniquement : le navigateur ne fait qu'animer un
// résultat déjà décidé, il ne peut donc pas l'influencer.
export function tirerLot<T extends { chance: number }>(lots: T[]): T | null {
  const total = totalChances(lots);
  if (lots.length === 0 || total <= 0) return null;

  const tirage = randomInt(0, total);
  let cumul = 0;
  for (const lot of lots) {
    cumul += Math.max(0, lot.chance);
    if (tirage < cumul) return lot;
  }
  return lots[lots.length - 1];
}

export function codeRecompense(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tirage = Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]);
  return `GAIN-${tirage.join("")}`;
}

// Un tour est offert à chaque palier de poses réalisées.
export function toursDisponibles(
  posesRealisees: number,
  toursJoues: number,
  posesParTour: number
): number {
  if (posesParTour <= 0) return 0;
  return Math.max(0, Math.floor(posesRealisees / posesParTour) - toursJoues);
}

export function progressionJauge(
  posesRealisees: number,
  toursJoues: number,
  posesParTour: number
): number {
  if (posesParTour <= 0) return 0;
  return Math.min(posesParTour, posesRealisees - toursJoues * posesParTour);
}
