import { randomInt } from "crypto";
import type { LotRoue } from "@/generated/prisma/client";

export const POSES_PAR_TOUR = 3;

export type Lot = {
  id: LotRoue;
  libelle: string;
  court: string;
  chance: number; // en pourcentage
  couleur: string;
  texteSurRoue: string;
  aRetirerAuSalon: boolean;
};

// L'ordre définit la disposition des quartiers sur la roue. Le dernier lot
// prend « le reste » : sa chance est déduite des autres, ce qui garantit un
// total de 100 % même si un pourcentage est ajusté plus tard.
const LOTS_DECLARES: Lot[] = [
  {
    id: "POSE_MOINS_50",
    libelle: "Votre prochaine pose à −50 %",
    court: "−50 % sur la prochaine pose",
    chance: 1,
    couleur: "#be185d",
    texteSurRoue: "−50 %",
    aRetirerAuSalon: true,
  },
  {
    id: "PORTE_CLEF",
    libelle: "Un porte-clefs nail art offert",
    court: "Porte-clefs nail art offert",
    chance: 10,
    couleur: "#ec4899",
    texteSurRoue: "Porte-clefs",
    aRetirerAuSalon: true,
  },
  {
    id: "MOINS_5",
    libelle: "−5 % sur votre prochaine pose",
    court: "−5 % sur la prochaine pose",
    chance: 30,
    couleur: "#f9a8d4",
    texteSurRoue: "−5 %",
    aRetirerAuSalon: true,
  },
  {
    id: "INAKA_10",
    libelle: "−10 % sur le site INAKA",
    court: "−10 % sur INAKA",
    chance: 0, // remplacé ci-dessous par le complément à 100
    couleur: "#fbcfe8",
    texteSurRoue: "−10 % INAKA",
    aRetirerAuSalon: false,
  },
];

const CHANCES_FIXES = LOTS_DECLARES.slice(0, -1).reduce((s, l) => s + l.chance, 0);

export const LOTS: Lot[] = LOTS_DECLARES.map((lot, i) =>
  i === LOTS_DECLARES.length - 1 ? { ...lot, chance: 100 - CHANCES_FIXES } : lot
);

export function lotParId(id: LotRoue): Lot {
  return LOTS.find((l) => l.id === id) ?? LOTS[LOTS.length - 1];
}

// Tirage côté serveur uniquement : le navigateur ne fait qu'animer un
// résultat déjà décidé, il ne peut donc pas l'influencer.
export function tirerLot(): Lot {
  const tirage = randomInt(0, 100); // 0 à 99
  let cumul = 0;
  for (const lot of LOTS) {
    cumul += lot.chance;
    if (tirage < cumul) return lot;
  }
  return LOTS[LOTS.length - 1];
}

export function codeRecompense(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tirage = Array.from({ length: 6 }, () => alphabet[randomInt(0, alphabet.length)]);
  return `GAIN-${tirage.join("")}`;
}

// Un tour est offert toutes les POSES_PAR_TOUR poses réalisées.
export function toursDisponibles(posesRealisees: number, toursJoues: number): number {
  return Math.max(0, Math.floor(posesRealisees / POSES_PAR_TOUR) - toursJoues);
}

export function progressionJauge(posesRealisees: number, toursJoues: number): number {
  return posesRealisees - toursJoues * POSES_PAR_TOUR;
}
