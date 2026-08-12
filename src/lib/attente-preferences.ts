import { partiesParis } from "@/lib/creneaux";
import { JOURS_ATTENTE, MOMENTS, type Moment } from "@/lib/attente-bornes";

// Réexportés pour que les appelants serveur n'aient qu'une porte d'entrée.
export { JOURS_ATTENTE, MOMENTS };
export type { Moment };

// Ce qu'une personne en liste d'attente accepterait, et comment on le confronte
// à un créneau qui vient de se libérer.
//
// Le principe tient en une phrase : **le silence vaut « n'importe quand »**.
// Quelqu'un qui ne coche rien reste prévenu de tout, comme avant. Seule une
// préférence explicitement exprimée peut écarter une annonce, et c'est ce qui
// évite de brûler l'unique notification promise pour un créneau qui ne convient
// pas.

/** L'après-midi commence à 13 h : c'est la coupure des créneaux du salon. */
const HEURE_BASCULE = 13;

export function momentDuCreneau(debut: Date): Moment {
  return partiesParis(debut).heure < HEURE_BASCULE ? "matin" : "apresmidi";
}

/** Jour de la semaine parisien, 1 = lundi … 7 = dimanche. */
export function jourSemaineParis(debut: Date): number {
  const { annee, mois, jour } = partiesParis(debut);
  return ((new Date(Date.UTC(annee, mois - 1, jour, 12)).getUTCDay() + 6) % 7) + 1;
}

/** "1,3,6" vers [1, 3, 6], en ignorant tout ce qui n'est pas un jour ouvré. */
export function lireJours(brut: string | null): number[] {
  if (!brut) return [];
  return [
    ...new Set(
      brut
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => JOURS_ATTENTE.some((j) => j.numero === n))
    ),
  ].sort((a, b) => a - b);
}

export function ecrireJours(numeros: number[]): string | null {
  const propres = lireJours(numeros.join(","));
  return propres.length > 0 ? propres.join(",") : null;
}

export function lireMoment(brut: string | null): Moment | null {
  return MOMENTS.some((m) => m.id === brut) ? (brut as Moment) : null;
}

/**
 * Ce créneau peut-il intéresser cette personne ?
 *
 * Le doute profite toujours à l'envoi : une préférence absente ne filtre rien.
 */
export function creneauCorrespond(
  preference: { joursSouhaites: string | null; momentSouhaite: string | null },
  debut: Date
): boolean {
  const jours = lireJours(preference.joursSouhaites);
  if (jours.length > 0 && !jours.includes(jourSemaineParis(debut))) return false;

  const moment = lireMoment(preference.momentSouhaite);
  if (moment && moment !== momentDuCreneau(debut)) return false;

  return true;
}

/** Résumé lisible pour l'agenda : « samedi et mercredi, plutôt le matin ». */
export function resumePreference(preference: {
  joursSouhaites: string | null;
  momentSouhaite: string | null;
}): string {
  const jours = lireJours(preference.joursSouhaites).map(
    (n) => JOURS_ATTENTE.find((j) => j.numero === n)!.libelle.toLowerCase()
  );
  const moment = lireMoment(preference.momentSouhaite);
  const libelleMoment = moment === "matin" ? "plutôt le matin" : "plutôt l'après-midi";

  if (jours.length === 0 && !moment) return "N'importe quel jour, n'importe quelle heure";
  if (jours.length === 0) return `N'importe quel jour, ${libelleMoment}`;

  const listeJours =
    jours.length === 1
      ? jours[0]
      : `${jours.slice(0, -1).join(", ")} ou ${jours[jours.length - 1]}`;
  return moment ? `${listeJours}, ${libelleMoment}` : listeJours;
}
