import { dateParis, jourParis, partiesParis } from "@/lib/creneaux";

// Grille mensuelle du calendrier de l'espace gérante.
//
// Construite en heure de Paris, jamais en heure serveur : un rendez-vous du
// 1er du mois à 9 h ne doit pas retomber dans la case du 31 précédent, et un
// changement d'heure ne doit pas décaler une semaine entière.
//
// La composition est séparée de l'affichage pour être vérifiable seule : les
// bornes de mois, le remplissage des semaines et le classement des rendez-vous
// sont exactement le genre de calcul qui se trompe en silence.

export type EvenementJour = {
  id: string;
  debut: Date;
  fin: Date;
  titre: string;
  soustitre?: string;
  statut: string;
  /** Vrai pour une indisponibilité : elle occupe la journée, elle ne s'ouvre pas. */
  indisponible?: boolean;
  lien?: string;
};

export type CaseJour = {
  /** "2026-08-07" */
  cle: string;
  numero: number;
  /** Faux pour les jours d'un mois voisin qui complètent la grille. */
  duMois: boolean;
  aujourdhui: boolean;
  /** Jour de repos : le salon n'ouvre pas, aucun créneau n'y est proposé. */
  ferme: boolean;
  evenements: EvenementJour[];
};

export type GrilleMois = {
  /** "2026-08" */
  cle: string;
  libelle: string;
  precedent: string;
  suivant: string;
  /** Semaines de sept jours, du lundi au dimanche. */
  semaines: CaseJour[][];
};

const JOUR_MS = 24 * 60 * 60 * 1000;

export const JOURS_SEMAINE = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Analyse "2026-08" ; retombe sur le mois en cours si la clé est absente ou fantaisiste. */
export function moisDemande(cle: string | undefined): { annee: number; mois: number } {
  const m = (cle ?? "").match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const annee = Number(m[1]);
    const mois = Number(m[2]);
    if (annee >= 2000 && annee <= 2100 && mois >= 1 && mois <= 12) return { annee, mois };
  }
  const p = partiesParis(new Date());
  return { annee: p.annee, mois: p.mois };
}

function decalerMois(annee: number, mois: number, pas: number): string {
  const total = annee * 12 + (mois - 1) + pas;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Premier et dernier instant du mois, bornes utiles à la requête. */
export function bornesMois(annee: number, mois: number): { debut: Date; fin: Date } {
  const debut = dateParis(annee, mois, 1, 0, 0);
  const suivant = mois === 12 ? dateParis(annee + 1, 1, 1, 0, 0) : dateParis(annee, mois + 1, 1, 0, 0);
  return { debut, fin: suivant };
}

/**
 * Compose la grille : semaines complètes du lundi au dimanche, les jours des
 * mois voisins étant conservés pour que la grille reste rectangulaire.
 */
export function grilleMois(
  annee: number,
  mois: number,
  evenements: EvenementJour[],
  /** Renvoie vrai si le salon ouvre ce jour-là ; tout est ouvert par défaut. */
  estOuvert: (cleJour: string) => boolean = () => true
): GrilleMois {
  const parJour = new Map<string, EvenementJour[]>();
  for (const evenement of evenements) {
    const cle = jourParis(evenement.debut);
    const groupe = parJour.get(cle);
    if (groupe) groupe.push(evenement);
    else parJour.set(cle, [evenement]);
  }
  for (const groupe of parJour.values()) {
    groupe.sort((a, b) => a.debut.getTime() - b.debut.getTime());
  }

  // Ancre à midi UTC : à Paris, midi UTC tombe toujours le même jour
  // calendaire, ce qui rend l'itération insensible aux changements d'heure.
  const premier = Date.UTC(annee, mois - 1, 1, 12);
  // getUTCDay : 0 = dimanche. On veut lundi en tête de semaine.
  const decalageDebut = (new Date(premier).getUTCDay() + 6) % 7;
  const depart = premier - decalageDebut * JOUR_MS;

  const cleAujourdhui = jourParis(new Date());
  const semaines: CaseJour[][] = [];

  for (let s = 0; s < 6; s++) {
    const semaine: CaseJour[] = [];
    for (let j = 0; j < 7; j++) {
      const jour = new Date(depart + (s * 7 + j) * JOUR_MS);
      const annee2 = jour.getUTCFullYear();
      const mois2 = jour.getUTCMonth() + 1;
      const numero = jour.getUTCDate();
      const cle = `${annee2}-${String(mois2).padStart(2, "0")}-${String(numero).padStart(2, "0")}`;
      semaine.push({
        cle,
        numero,
        duMois: mois2 === mois && annee2 === annee,
        aujourdhui: cle === cleAujourdhui,
        ferme: !estOuvert(cle),
        evenements: parJour.get(cle) ?? [],
      });
    }
    // Une sixième semaine n'est nécessaire que si le mois déborde vraiment :
    // l'afficher toujours laisserait une rangée vide onze mois sur douze.
    if (s === 5 && semaine.every((c) => !c.duMois)) break;
    semaines.push(semaine);
  }

  const cle = `${annee}-${String(mois).padStart(2, "0")}`;
  return {
    cle,
    libelle: new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      month: "long",
      year: "numeric",
    }).format(dateParis(annee, mois, 1, 12, 0)),
    precedent: decalerMois(annee, mois, -1),
    suivant: decalerMois(annee, mois, 1),
    semaines,
  };
}
