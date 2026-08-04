// Délai minimum avant le rendez-vous pour une annulation en ligne, cohérent
// avec les CGV : passé ce cap, la cliente passe par Zélia, qui décide du sort
// de l'acompte.
export const DELAI_ANNULATION_H = 48;

export function annulationPossible(debut: Date): boolean {
  return debut.getTime() - Date.now() > DELAI_ANNULATION_H * 60 * 60 * 1000;
}
