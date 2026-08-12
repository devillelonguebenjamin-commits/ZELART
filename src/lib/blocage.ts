import { prisma } from "@/lib/prisma";
import { cleTelephone } from "@/lib/telephone";

// Une cliente bloquée ne peut plus ni réserver ni commander de press-on.
//
// Le contrôle porte sur l'adresse **et** sur le numéro : la fiche est unique
// par e-mail, donc réserver avec une autre adresse créerait une fiche neuve et
// contournerait le blocage. Le numéro reste, lui, le même en pratique.
//
// Le message renvoyé ne dit jamais « vous êtes bloquée » : il renvoie vers
// Zélia, à qui revient la conversation. Rien ne sert d'humilier quelqu'un sur
// une page publique, et un refus explicite invite surtout à recommencer avec
// d'autres coordonnées.
export const MESSAGE_BLOCAGE =
  "La réservation en ligne n'est pas disponible pour ce compte. Contactez-moi par SMS au 06 45 29 20 01.";

export async function clienteBloquee(email: string, telephone?: string): Promise<boolean> {
  const bloquees = await prisma.cliente.findMany({
    where: { bloqueeLe: { not: null } },
    select: { email: true, telephoneNormalise: true },
  });
  if (bloquees.length === 0) return false;

  if (bloquees.some((c) => c.email.toLowerCase() === email.trim().toLowerCase())) return true;

  const cible = cleTelephone(telephone);
  return cible !== null && bloquees.some((c) => c.telephoneNormalise === cible);
}
