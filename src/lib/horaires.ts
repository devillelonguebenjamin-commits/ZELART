import { prisma } from "@/lib/prisma";
import { jourParis, ouvertureActive } from "@/lib/creneaux";

// La phrase des horaires, dite par la base et non recopiée à la main.
//
// Elle a déjà été fausse : « du lundi au samedi, à 9h ou 14h » est restée
// affichée après que Zélia eut posé son dimanche-lundi et ses trois créneaux.
// Une phrase figée survit toujours au changement qu'elle décrit — d'autant plus
// ici, où le changement est *daté* : deux régimes coexistent dans la table, l'un
// jusqu'au 30 septembre, l'autre à partir du 1er octobre.
//
// D'où deux phrases plutôt qu'une : celle qui vaut aujourd'hui, et celle qui
// prendra le relais, annoncée à l'avance. C'est aussi ce qu'une cliente veut
// savoir quand elle réserve à deux mois.

const JOURS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

type Regime = { jours: number[]; heures: string[] };

/** "09:00" → "9h" ; "14:30" → "14h30". */
function heureCourte(heure: string): string {
  const [h, m] = heure.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

function listeFrancaise(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? "";
  return `${elements.slice(0, -1).join(", ")} ou ${elements[elements.length - 1]}`;
}

function libelleJours(jours: number[]): string {
  if (jours.length === 0) return "";
  if (jours.length === 1) return `le ${JOURS[jours[0]]}`;
  // Une suite continue se dit « du mardi au samedi » ; le reste s'énumère.
  const continu = jours.every((j, i) => i === 0 || j === jours[i - 1] + 1);
  return continu
    ? `du ${JOURS[jours[0]]} au ${JOURS[jours[jours.length - 1]]}`
    : `les ${jours.map((j) => JOURS[j]).join(", ")}`;
}

function corps(regime: Regime): string {
  const heures = listeFrancaise(regime.heures.map(heureCourte));
  return `${libelleJours(regime.jours)}, à ${heures} (une cliente par créneau).`;
}

function repos(regime: Regime): string {
  const fermes = [0, 1, 2, 3, 4, 5, 6].filter((j) => !regime.jours.includes(j));
  if (fermes.length === 0) return "";
  // Seul le premier jour prend la majuscule : c'est un début de phrase, pas une
  // énumération de noms propres.
  const liste = fermes.map((j) => JOURS[j]).join(" et ");
  return ` ${liste.charAt(0).toUpperCase()}${liste.slice(1)} : repos.`;
}

export type Horaires = {
  /** Ce qui s'applique aujourd'hui. */
  actuel: string;
  /** Le régime suivant et sa date d'entrée en vigueur, s'il en existe un. */
  aVenir: string | null;
};

export async function horaires(reference = new Date()): Promise<Horaires> {
  const toutes = await prisma.disponibilite.findMany({
    orderBy: [{ jourSemaine: "asc" }, { heureDebut: "asc" }],
  });
  if (toutes.length === 0) return { actuel: "", aVenir: null };

  const regimePour = (cleJour: string): Regime => {
    const actives = toutes.filter((d) => ouvertureActive(d, cleJour));
    return {
      jours: [...new Set(actives.map((d) => d.jourSemaine))].sort((a, b) => a - b),
      heures: [...new Set(actives.map((d) => d.heureDebut))].sort(),
    };
  };

  const aujourdhui = jourParis(reference);
  const actuel = regimePour(aujourdhui);

  // Le prochain basculement est la plus proche date d'ouverture à venir. Elle
  // n'est annoncée que si elle change réellement quelque chose.
  const bascules = toutes
    .map((d) => d.actifDu)
    .filter((d): d is Date => d !== null && jourParis(d) > aujourdhui)
    .sort((a, b) => a.getTime() - b.getTime());

  let aVenir: string | null = null;
  if (bascules.length > 0) {
    const suivant = regimePour(jourParis(bascules[0]));
    const identique =
      suivant.jours.join() === actuel.jours.join() && suivant.heures.join() === actuel.heures.join();
    if (!identique && suivant.jours.length > 0) {
      // « 1 octobre » n'existe pas en français : le premier du mois est ordinal.
      const jour = Number(
        bascules[0].toLocaleDateString("fr-FR", { day: "numeric", timeZone: "Europe/Paris" })
      );
      const mois = bascules[0].toLocaleDateString("fr-FR", {
        month: "long",
        timeZone: "Europe/Paris",
      });
      const date = `${jour === 1 ? "1er" : jour} ${mois}`;
      aVenir = `À partir du ${date} : ${corps(suivant)}${repos(suivant)}`;
    }
  }

  return {
    actuel: actuel.jours.length > 0 ? `Rendez-vous ${corps(actuel)}${repos(actuel)}` : "",
    aVenir,
  };
}
