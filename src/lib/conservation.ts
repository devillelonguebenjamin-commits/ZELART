import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { optionsBlob, stockageConfigure } from "@/lib/blob";
import {
  CONSERVATION_CLIENTE_ANS,
  CONSERVATION_DECLARATION_ANS,
  CONSERVATION_LISTE_ATTENTE_ANS,
} from "@/lib/conservation-durees";

// Durées de conservation des données, appliquées chaque matin par la tâche
// quotidienne. Ce sont celles annoncées dans la politique de confidentialité,
// alignées sur la pratique courante recommandée par la CNIL pour un fichier
// clients :
//
//   - fiche cliente (coordonnées, historique, notes, fidélité, messages,
//     photos d'inspiration) : tant que la cliente vient, puis 3 ans après son
//     dernier contact — dernier rendez-vous, commande ou message ;
//   - déclaration santé : 5 ans après le rendez-vous, délai pendant lequel une
//     action en justice reste possible. Elle survit à la suppression de la
//     fiche (cf. DeclarationSante) ;
//   - liste d'attente : 1 an après l'inscription.
//
// Une promesse de suppression qui n'est appliquée par rien n'est pas tenue :
// la politique annonçait « trois ans » sans qu'aucun code ne supprime quoi que
// ce soit.

const AN_MS = 365.25 * 24 * 60 * 60 * 1000;

function ilYA(ans: number, maintenant: Date): Date {
  return new Date(maintenant.getTime() - ans * AN_MS);
}

/**
 * Supprime des fiches clientes et tout ce qui en dépend (suppression en
 * cascade), photos d'inspiration comprises : ces fichiers sont stockés à part
 * et la base ne les efface pas d'elle-même. Les photos de réalisations restent,
 * elles sont le travail de Zélia. Les déclarations santé restent aussi.
 */
export async function supprimerFichesClientes(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (stockageConfigure()) {
    const images = await prisma.inspirationImage.findMany({
      where: { rendezVous: { clienteId: { in: ids } } },
      select: { url: true },
    });
    for (const image of images) {
      try {
        await del(image.url, optionsBlob());
      } catch (erreur) {
        // Un fichier déjà absent ne doit pas empêcher d'effacer la fiche.
        console.error("Photo d'inspiration non supprimée", image.url, erreur);
      }
    }
  }
  await prisma.cliente.deleteMany({ where: { id: { in: ids } } });
}

export type BilanConservation = { clientes: number; declarations: number; listeAttente: number };

export async function appliquerConservation(
  maintenant: Date = new Date()
): Promise<BilanConservation> {
  const limiteCliente = ilYA(CONSERVATION_CLIENTE_ANS, maintenant);

  // Aucun signe de vie depuis trois ans : ni rendez-vous (passé récent ou à
  // venir), ni commande, ni message, et une fiche elle-même plus ancienne.
  const inactives = await prisma.cliente.findMany({
    where: {
      creeLe: { lt: limiteCliente },
      rendezVous: { none: { debut: { gte: limiteCliente } } },
      commandes: { none: { modifieLe: { gte: limiteCliente } } },
      messages: { none: { creeLe: { gte: limiteCliente } } },
    },
    select: { id: true },
  });
  await supprimerFichesClientes(inactives.map((c) => c.id));

  const { count: declarations } = await prisma.declarationSante.deleteMany({
    where: { rendezVousLe: { lt: ilYA(CONSERVATION_DECLARATION_ANS, maintenant) } },
  });
  const { count: listeAttente } = await prisma.listeAttente.deleteMany({
    where: { creeLe: { lt: ilYA(CONSERVATION_LISTE_ATTENTE_ANS, maintenant) } },
  });

  return { clientes: inactives.length, declarations, listeAttente };
}
