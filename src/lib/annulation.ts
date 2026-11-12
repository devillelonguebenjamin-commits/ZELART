// Délai minimum avant le rendez-vous pour une annulation en ligne, cohérent
// avec les CGV : passé ce cap, la cliente passe par Zélia, qui décide du sort
// de l'acompte.
export const DELAI_ANNULATION_H = 48;

// Règle de l'acompte : il est perdu si la cliente ne prévient pas au moins
// 24 h à l'avance (annulation ou absence). Prévenue à temps, elle peut
// reporter une fois en le gardant. Affichée partout où l'acompte est évoqué.
export const DELAI_PREVENANCE_ACOMPTE_H = 24;
export const REGLE_ACOMPTE = `L'acompte est perdu si vous ne prévenez pas au moins ${DELAI_PREVENANCE_ACOMPTE_H} h à l'avance (annulation ou absence). Prévenue à temps, vous pouvez reporter votre rendez-vous une fois en le conservant.`;

export function annulationPossible(debut: Date): boolean {
  return debut.getTime() - Date.now() > DELAI_ANNULATION_H * 60 * 60 * 1000;
}
