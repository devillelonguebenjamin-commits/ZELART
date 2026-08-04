import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DESC_VSP = "Sur vos ongles naturels, tenue plus courte qu'avec un gainage !";
const DESC_GAINAGE =
  "Du gel sur vos ongles naturels sans rajouter de longueur : des ongles naturels mais solides !";
const DESC_GELX =
  "Aussi appelée pose américaine : une pose de capsules entières, pour laisser place au nail art !";
const DESC_POPIT = "Rallongement entièrement en gel, pour un résultat clean ou pour du nail art !";

// prixCents : 3500 = 35,00 € — dureeMin : durée indicative, à ajuster par Zélia
const prestations = [
  // Vernis semi-permanent
  { categorie: "Vernis semi-permanent", nom: "VSP simple", prixCents: 3500, dureeMin: 75, description: DESC_VSP },
  { categorie: "Vernis semi-permanent", nom: "VSP + nail art niveau 1", prixCents: 4000, dureeMin: 90, description: DESC_VSP },
  { categorie: "Vernis semi-permanent", nom: "VSP + nail art niveau 2", prixCents: 4500, dureeMin: 105, description: DESC_VSP },
  { categorie: "Vernis semi-permanent", nom: "VSP + nail art niveau 3", prixCents: 5000, dureeMin: 120, description: DESC_VSP, aPartirDe: true },
  { categorie: "Vernis semi-permanent", nom: "Dépose VSP", prixCents: 500, dureeMin: 30, description: "Dépose seule de votre vernis semi-permanent." },
  // Gainage
  { categorie: "Gainage", nom: "Gainage + VSP simple", prixCents: 4000, dureeMin: 90, description: DESC_GAINAGE },
  { categorie: "Gainage", nom: "Gainage + nail art niveau 1", prixCents: 4500, dureeMin: 105, description: DESC_GAINAGE },
  { categorie: "Gainage", nom: "Gainage + nail art niveau 2", prixCents: 5000, dureeMin: 120, description: DESC_GAINAGE },
  { categorie: "Gainage", nom: "Gainage + nail art niveau 3", prixCents: 5500, dureeMin: 135, description: DESC_GAINAGE, aPartirDe: true },
  { categorie: "Gainage", nom: "Remplissage gainage", prixCents: 3500, dureeMin: 90 },
  { categorie: "Gainage", nom: "Remplissage gainage + nail art niveau 1", prixCents: 4000, dureeMin: 105 },
  { categorie: "Gainage", nom: "Remplissage gainage + nail art niveau 2", prixCents: 4500, dureeMin: 120 },
  { categorie: "Gainage", nom: "Remplissage gainage + nail art niveau 3", prixCents: 5000, dureeMin: 135, aPartirDe: true },
  { categorie: "Gainage", nom: "Dépose gel", prixCents: 3000, dureeMin: 45 },
  // Pose Gel X
  { categorie: "Pose Gel X", nom: "Pose Gel X + VSP simple", prixCents: 4500, dureeMin: 105, description: DESC_GELX },
  { categorie: "Pose Gel X", nom: "Pose Gel X + nail art niveau 1", prixCents: 5000, dureeMin: 120, description: DESC_GELX },
  { categorie: "Pose Gel X", nom: "Pose Gel X + nail art niveau 2", prixCents: 5500, dureeMin: 135, description: DESC_GELX },
  { categorie: "Pose Gel X", nom: "Pose Gel X + nail art niveau 3", prixCents: 6000, dureeMin: 150, description: DESC_GELX, aPartirDe: true },
  { categorie: "Pose Gel X", nom: "Dépose Gel X", prixCents: 3500, dureeMin: 45 },
  // Pose Pop-it
  { categorie: "Pose Pop-it", nom: "Pose Pop-it + VSP simple", prixCents: 5500, dureeMin: 120, description: DESC_POPIT },
  { categorie: "Pose Pop-it", nom: "Pose Pop-it + nail art niveau 1", prixCents: 6000, dureeMin: 135, description: DESC_POPIT },
  { categorie: "Pose Pop-it", nom: "Pose Pop-it + nail art niveau 2", prixCents: 6500, dureeMin: 150, description: DESC_POPIT },
  { categorie: "Pose Pop-it", nom: "Pose Pop-it + nail art niveau 3", prixCents: 7000, dureeMin: 165, description: DESC_POPIT, aPartirDe: true },
  { categorie: "Pose Pop-it", nom: "Remplissage Pop-it", prixCents: 5000, dureeMin: 105 },
  { categorie: "Pose Pop-it", nom: "Remplissage Pop-it + nail art niveau 1", prixCents: 5500, dureeMin: 120 },
  { categorie: "Pose Pop-it", nom: "Remplissage Pop-it + nail art niveau 2", prixCents: 6000, dureeMin: 135 },
  { categorie: "Pose Pop-it", nom: "Remplissage Pop-it + nail art niveau 3", prixCents: 6500, dureeMin: 150, aPartirDe: true },
  { categorie: "Pose Pop-it", nom: "Dépose Pop-it", prixCents: 3000, dureeMin: 45, description: "Entre 30 € et 35 € selon la longueur.", aPartirDe: true },
];

// Rendez-vous du lundi au samedi, à 9h ou 14h (une cliente par créneau)
const disponibilites = [1, 2, 3, 4, 5, 6].flatMap((jourSemaine) => [
  { jourSemaine, heureDebut: "09:00", heureFin: "12:30" },
  { jourSemaine, heureDebut: "14:00", heureFin: "18:00" },
]);

const TYPE_POSE: Record<string, "VSP" | "GAINAGE" | "GEL_X" | "POP_IT"> = {
  "Vernis semi-permanent": "VSP",
  Gainage: "GAINAGE",
  "Pose Gel X": "GEL_X",
  "Pose Pop-it": "POP_IT",
};

function typeActe(nom: string): "POSE" | "REMPLISSAGE" | "DEPOSE" {
  if (nom.startsWith("Dépose")) return "DEPOSE";
  if (nom.startsWith("Remplissage")) return "REMPLISSAGE";
  return "POSE";
}

async function main() {
  if ((await prisma.prestation.count()) === 0) {
    await prisma.prestation.createMany({
      data: prestations.map((p, i) => ({
        ...p,
        ordre: i,
        typeActe: typeActe(p.nom),
        typePose: TYPE_POSE[p.categorie],
      })),
    });
    console.log(`${prestations.length} prestations créées`);
  } else {
    console.log("Prestations déjà présentes, seed ignoré");
  }

  if ((await prisma.disponibilite.count()) === 0) {
    await prisma.disponibilite.createMany({ data: disponibilites });
    console.log(`${disponibilites.length} disponibilités créées`);
  } else {
    console.log("Disponibilités déjà présentes, seed ignoré");
  }
}

main().finally(() => prisma.$disconnect());
