import { prisma } from "@/lib/prisma";

// Ce qui attend un geste de Zélia, onglet par onglet.
//
// Une seule fonction pour tout le monde : la barre de navigation affiche ces
// compteurs, et le message quotidien les reprend. Deux décomptes séparés
// finiraient par ne pas dire la même chose, et c'est précisément le genre
// d'écart qui fait perdre confiance dans une pastille.

export type EnAttente = {
  agenda: number;
  pressOn: number;
  parrainage: number;
  listeAttente: number;
  /** Messages de clientes que Zélia n'a pas encore lus. */
  clientes: number;
  /** Lots gagnés à la roue et pas encore remis. */
  roue: number;
  /** Vrai dès qu'un onglet réclame quelque chose. */
  total: number;
};

export async function compterEnAttente(): Promise<EnAttente> {
  const maintenant = new Date();

  const [agenda, pressOn, parrainage, listeAttente, clientes, roue] = await Promise.all([
    // Demandes de rendez-vous encore à trancher. Celles dont l'heure est passée
    // ne comptent plus : les relancer n'aurait plus d'objet.
    prisma.rendezVous.count({ where: { statut: "EN_ATTENTE", fin: { gte: maintenant } } }),
    // Commandes reçues mais dont le règlement n'a pas encore été demandé.
    prisma.commandePressOn.count({ where: { statut: "DEMANDE" } }),
    prisma.avantageParrainage.count({ where: { utiliseLe: null } }),
    prisma.listeAttente.count({ where: { notifieeLe: null } }),
    // Un message sans réponse est ce qui se voit le plus de l'extérieur : une
    // cliente qui a écrit sait qu'elle a écrit.
    prisma.messageCliente.count({ where: { deZelia: false, luLe: null } }),
    // Un lot gagné et non remis attend un geste de Zélia, au même titre qu'un
    // avantage de parrainage. Les clientes éligibles à tourner, elles, ne
    // comptent pas ici : elles attendent leur propre geste, et une pastille que
    // Zélia ne peut pas vider cesserait d'être regardée.
    prisma.recompense.count({ where: { utiliseLe: null } }),
  ]);

  return {
    agenda,
    pressOn,
    parrainage,
    listeAttente,
    clientes,
    roue,
    total: agenda + pressOn + parrainage + clientes + roue,
  };
}
