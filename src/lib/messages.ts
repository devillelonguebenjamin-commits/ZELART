import { prisma } from "@/lib/prisma";

// La conversation entre une cliente et Zélia.
//
// Ce que ce fil remplace : un SMS sur le téléphone personnel de Zélia, où une
// question sur une pose se mêlait à sa vie privée, se lisait entre deux
// clientes et se perdait. Ici, le message arrive rattaché à la fiche, à côté de
// l'historique des poses et des notes techniques, c'est-à-dire là où la réponse
// se prépare.
//
// Ce fil ne remplace pas le SMS pour l'urgence : une cliente en retard doit
// pouvoir joindre Zélia tout de suite, et c'est écrit dans l'espace cliente.

import { type MessagePublic } from "@/lib/messages-bornes";

export { LONGUEUR_MAX, type MessagePublic } from "@/lib/messages-bornes";

export async function conversation(clienteId: string): Promise<MessagePublic[]> {
  return prisma.messageCliente.findMany({
    where: { clienteId },
    orderBy: { creeLe: "asc" },
    select: { id: true, deZelia: true, texte: true, luLe: true, creeLe: true },
  });
}

/**
 * Marque comme lus les messages écrits par l'autre.
 *
 * `deZelia` désigne l'auteur, pas le lecteur : quand la cliente ouvre son
 * espace, ce sont les messages de Zélia qu'elle lit, et inversement. Les
 * confondre ferait disparaître la pastille de Zélia dès qu'une cliente
 * consulte sa page, sans que rien n'ait été lu de son côté.
 */
export async function marquerLus(clienteId: string, lecteur: "cliente" | "zelia"): Promise<void> {
  await prisma.messageCliente.updateMany({
    where: { clienteId, deZelia: lecteur === "cliente", luLe: null },
    data: { luLe: new Date() },
  });
}

/** Messages de clientes que Zélia n'a pas encore lus. */
export async function messagesNonLus(): Promise<number> {
  return prisma.messageCliente.count({ where: { deZelia: false, luLe: null } });
}

/**
 * Fiches ayant au moins un message non lu, la plus ancienne attente d'abord.
 *
 * L'ordre n'est pas anodin : trier par message le plus récent ferait remonter
 * celle qui vient d'écrire et laisserait tout en bas celle qui attend depuis
 * trois jours. C'est l'inverse de ce qu'on veut.
 */
export async function fichesEnAttenteDeReponse(): Promise<
  { clienteId: string; prenom: string; nom: string; extrait: string; depuis: Date; nombre: number }[]
> {
  const messages = await prisma.messageCliente.findMany({
    where: { deZelia: false, luLe: null },
    orderBy: { creeLe: "asc" },
    select: {
      clienteId: true,
      texte: true,
      creeLe: true,
      cliente: { select: { prenom: true, nom: true } },
    },
  });

  const parCliente = new Map<
    string,
    { clienteId: string; prenom: string; nom: string; extrait: string; depuis: Date; nombre: number }
  >();
  for (const message of messages) {
    const existant = parCliente.get(message.clienteId);
    if (existant) {
      existant.nombre += 1;
      continue;
    }
    parCliente.set(message.clienteId, {
      clienteId: message.clienteId,
      prenom: message.cliente.prenom,
      nom: message.cliente.nom,
      extrait: message.texte.slice(0, 120),
      depuis: message.creeLe,
      nombre: 1,
    });
  }
  return [...parCliente.values()];
}
