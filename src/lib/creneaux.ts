import { prisma } from "@/lib/prisma";

import { HORIZON_PROPOSITION_JOURS, PREAVIS_MS } from "@/lib/creneaux-bornes";

const PARIS_TZ = "Europe/Paris";

// Fenêtre de réservation proposée aux clientes : deux mois.
//
// Quatre semaines suffisaient tant que les créneaux se libéraient vite ; sur un
// agenda qui se remplit, elles donnaient l'impression qu'il ne restait plus rien
// alors que le mois suivant était entièrement libre — les jours en question
// n'étaient pas manquants, ils étaient hors champ.
//
// Le regroupement d'affichage se fait sur un libellé sans année (« lundi
// 10 août ») : au-delà d'un an d'horizon, deux dates se confondraient. Deux mois
// restent très loin de cette limite.
export const HORIZON_JOURS = 61;

// Réexportées pour que les appelants n'aient qu'une porte d'entrée.
export { HORIZON_PROPOSITION_JOURS, PREAVIS_MS };

const JOUR_MS = 24 * 60 * 60 * 1000;

export type Creneau = {
  debut: string; // instant UTC en ISO 8601
  jourLabel: string; // "lundi 10 août"
  heureLabel: string; // "9h00"
};

function tzOffsetMs(date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const commeUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return commeUtc - date.getTime();
}

// Instant UTC correspondant à une heure « murale » parisienne
export function dateParis(annee: number, mois: number, jour: number, heure: number, minute: number): Date {
  const estimation = Date.UTC(annee, mois - 1, jour, heure, minute);
  return new Date(estimation - tzOffsetMs(new Date(estimation)));
}

export function partiesParis(date: Date): { annee: number; mois: number; jour: number; heure: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PARIS_TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return {
    annee: Number(parts.year),
    mois: Number(parts.month),
    jour: Number(parts.day),
    heure: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

/** Clé de jour ("2026-08-07") dans le fuseau du salon. */
export function jourParis(date: Date): string {
  const { annee, mois, jour } = partiesParis(date);
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

// Clé de regroupement mensuel ("2026-08") dans le fuseau du salon : un
// rendez-vous du 1er août à 9h ne doit pas retomber en juillet.
export function moisParis(date: Date): string {
  const { annee, mois } = partiesParis(date);
  return `${annee}-${String(mois).padStart(2, "0")}`;
}

// Premier instant d'un mois parisien, `decalage` mois avant le mois en cours.
export function debutDeMoisParis(reference: Date, decalage = 0): Date {
  const { annee, mois } = partiesParis(reference);
  const total = annee * 12 + (mois - 1) - decalage;
  return dateParis(Math.floor(total / 12), (total % 12) + 1, 1, 0, 0);
}

export function formatMois(cle: string): string {
  const [annee, mois] = cle.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    month: "long",
    year: "numeric",
  }).format(dateParis(annee, mois, 1, 12, 0));
}

export function formatJour(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatHeure(date: Date): string {
  const { heure, minute } = partiesParis(date);
  return `${heure}h${String(minute).padStart(2, "0")}`;
}

type Intervalle = { debut: Date; fin: Date };

/** Ouverture récurrente, éventuellement bornée dans le temps. */
type Ouverture = {
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  actifDu: Date | null;
  actifJusquau: Date | null;
};

/**
 * Vrai si cette ouverture s'applique au jour donné ("2026-10-05").
 *
 * La comparaison se fait sur la clé de jour parisienne, jamais sur les
 * instants : deux dates du même jour peuvent différer de plusieurs heures selon
 * l'heure enregistrée, et un `<=` sur les instants fermerait ou ouvrirait un
 * jour de trop selon la saison.
 */
export function ouvertureActive(dispo: Ouverture, cleJour: string): boolean {
  if (dispo.actifDu && jourParis(dispo.actifDu) > cleJour) return false;
  if (dispo.actifJusquau && jourParis(dispo.actifJusquau) < cleJour) return false;
  return true;
}

function chevauche(a: Intervalle, debut: Date, fin: Date): boolean {
  return a.debut < fin && a.fin > debut;
}

// Créneaux libres sur l'horizon : fenêtres d'ouverture récurrentes,
// moins les indisponibilités ponctuelles et les rendez-vous déjà pris
// (une seule cliente par fenêtre).
export async function getCreneauxDisponibles(): Promise<Creneau[]> {
  const maintenant = new Date();
  const finHorizon = new Date(maintenant.getTime() + (HORIZON_JOURS + 1) * JOUR_MS);

  const [dispos, indispos, rdvs] = await Promise.all([
    prisma.disponibilite.findMany(),
    prisma.indisponibilite.findMany({
      where: { debut: { lt: finHorizon }, fin: { gt: maintenant } },
      select: { debut: true, fin: true },
    }),
    prisma.rendezVous.findMany({
      where: { statut: { not: "ANNULE" }, debut: { lt: finHorizon }, fin: { gt: maintenant } },
      select: { debut: true, fin: true },
    }),
  ]);

  // Ancre à midi UTC : à Paris (UTC+1/+2), midi UTC tombe toujours le même
  // jour calendaire, ce qui rend l'itération jour par jour insensible aux
  // changements d'heure.
  const aujourdhui = partiesParis(maintenant);
  const ancre = Date.UTC(aujourdhui.annee, aujourdhui.mois - 1, aujourdhui.jour, 12);

  const creneaux: Creneau[] = [];
  for (let i = 0; i <= HORIZON_JOURS; i++) {
    const jourCourant = new Date(ancre + i * JOUR_MS);
    const annee = jourCourant.getUTCFullYear();
    const mois = jourCourant.getUTCMonth() + 1;
    const jour = jourCourant.getUTCDate();
    const jourSemaine = ((jourCourant.getUTCDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche

    const cleJour = `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;

    for (const dispo of dispos) {
      if (dispo.jourSemaine !== jourSemaine) continue;
      if (!ouvertureActive(dispo, cleJour)) continue;
      const [hd, md] = dispo.heureDebut.split(":").map(Number);
      const [hf, mf] = dispo.heureFin.split(":").map(Number);
      const debut = dateParis(annee, mois, jour, hd, md);
      const fin = dateParis(annee, mois, jour, hf, mf);

      if (debut.getTime() < maintenant.getTime() + PREAVIS_MS) continue;
      if (rdvs.some((r) => chevauche(r, debut, fin))) continue;
      if (indispos.some((r) => chevauche(r, debut, fin))) continue;

      creneaux.push({
        debut: debut.toISOString(),
        jourLabel: formatJour(debut),
        heureLabel: formatHeure(debut),
      });
    }
  }

  return creneaux.sort((a, b) => a.debut.localeCompare(b.debut));
}

// Fenêtres d'ouverture d'une période écoulée, indisponibilités déduites.
// Le calendrier récurrent est celui d'aujourd'hui : une modification des
// horaires se répercute donc sur le passé, ce qui reste une approximation
// suffisante pour un taux de remplissage.
export async function creneauxOuverts(debutPeriode: Date, finPeriode: Date): Promise<number> {
  const [dispos, indispos] = await Promise.all([
    prisma.disponibilite.findMany(),
    prisma.indisponibilite.findMany({
      where: { debut: { lt: finPeriode }, fin: { gt: debutPeriode } },
      select: { debut: true, fin: true },
    }),
  ]);

  const depart = partiesParis(debutPeriode);
  const ancre = Date.UTC(depart.annee, depart.mois - 1, depart.jour, 12);
  let ouverts = 0;

  for (let i = 0; ; i++) {
    const jourCourant = new Date(ancre + i * JOUR_MS);
    if (jourCourant.getTime() > finPeriode.getTime() + JOUR_MS) break;

    const annee = jourCourant.getUTCFullYear();
    const mois = jourCourant.getUTCMonth() + 1;
    const jour = jourCourant.getUTCDate();
    const jourSemaine = ((jourCourant.getUTCDay() + 6) % 7) + 1;

    const cleJour = `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;

    for (const dispo of dispos) {
      if (dispo.jourSemaine !== jourSemaine) continue;
      if (!ouvertureActive(dispo, cleJour)) continue;
      const [hd, md] = dispo.heureDebut.split(":").map(Number);
      const [hf, mf] = dispo.heureFin.split(":").map(Number);
      const debut = dateParis(annee, mois, jour, hd, md);
      const fin = dateParis(annee, mois, jour, hf, mf);

      if (debut < debutPeriode || debut >= finPeriode) continue;
      if (indispos.some((r) => chevauche(r, debut, fin))) continue;
      ouverts++;
    }
  }

  return ouverts;
}

// Créneau proposé par la cliente : il ne correspond à aucune fenêtre
// d'ouverture, on ne peut donc pas s'appuyer sur le calendrier récurrent. Deux
// bornes tout de même — le préavis, et un horizon au-delà duquel une demande
// n'a plus de sens.
/** Interprète « 2026-08-20T14:30 » comme une heure murale parisienne. */
export function creneauProposeDepuisSaisie(saisie: string): Date | null {
  const m = saisie.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, annee, mois, jour, heure, minute] = m.map(Number) as unknown as number[];
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31 || heure > 23 || minute > 59) return null;

  const date = dateParis(annee, mois, jour, heure, minute);
  // Une date inexistante (31 février) serait ramenée ailleurs par le calcul :
  // on vérifie qu'elle retombe bien sur ce qui a été saisi.
  const relu = partiesParis(date);
  if (relu.annee !== annee || relu.mois !== mois || relu.jour !== jour) return null;

  return date;
}

export function propositionDansLesBornes(debut: Date): boolean {
  const maintenant = Date.now();
  return (
    debut.getTime() >= maintenant + PREAVIS_MS &&
    debut.getTime() <= maintenant + HORIZON_PROPOSITION_JOURS * JOUR_MS
  );
}

// Retrouve la fenêtre d'ouverture dont `debut` est l'heure de départ.
// Renvoie null si ce début ne correspond à aucune fenêtre récurrente.
export async function fenetrePourDebut(debut: Date): Promise<{ debut: Date; fin: Date } | null> {
  const p = partiesParis(debut);
  const jourSemaine = ((new Date(Date.UTC(p.annee, p.mois - 1, p.jour, 12)).getUTCDay() + 6) % 7) + 1;
  const heureDebut = `${String(p.heure).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;

  // Toutes les ouvertures de ce jour et de cette heure, pas la première venue :
  // un changement d'horaires fait coexister l'ancienne ligne et la nouvelle sur
  // la même heure de début, et `findFirst` aurait pu renvoyer celle qui vient
  // d'expirer — refusant alors une réservation parfaitement valide.
  const candidates = await prisma.disponibilite.findMany({ where: { jourSemaine, heureDebut } });
  const dispo = candidates.find((d) => ouvertureActive(d, jourParis(debut)));
  if (!dispo) return null;

  const [hf, mf] = dispo.heureFin.split(":").map(Number);
  return { debut, fin: dateParis(p.annee, p.mois, p.jour, hf, mf) };
}
