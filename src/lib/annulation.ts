// Le délai de prévenance, unique sur tout le site et dans les CGV :
//   - l'annulation en ligne ferme à moins de 48 h du rendez-vous ;
//   - l'acompte est perdu si la cliente ne prévient pas au moins 48 h avant
//     (annulation ou absence). Prévenue à temps, elle peut reporter une fois en
//     le gardant.
// Un seul nombre pour les deux : deux délais différents (la FAQ disait 24 h)
// laissaient la cliente deviner lequel s'appliquait.
export const DELAI_ANNULATION_H = 48;
export const REGLE_ACOMPTE = `L'acompte est perdu si vous ne prévenez pas au moins ${DELAI_ANNULATION_H} h à l'avance (annulation ou absence). Prévenue à temps, vous pouvez reporter votre rendez-vous une fois en le conservant.`;

export function annulationPossible(debut: Date): boolean {
  return debut.getTime() - Date.now() > DELAI_ANNULATION_H * 60 * 60 * 1000;
}
