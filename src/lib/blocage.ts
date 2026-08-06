import { prisma } from "@/lib/prisma";

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
  "La réservation en ligne n'est pas disponible pour ce compte. Contactez Zélia par SMS au 06 45 29 20 01.";

function numeroNormalise(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  // 0645292001 et +33645292001 désignent le même numéro.
  return chiffres.startsWith("33") ? `0${chiffres.slice(2)}` : chiffres;
}

export async function clienteBloquee(email: string, telephone?: string): Promise<boolean> {
  const bloquees = await prisma.cliente.findMany({
    where: { bloqueeLe: { not: null } },
    select: { email: true, telephone: true },
  });
  if (bloquees.length === 0) return false;

  if (bloquees.some((c) => c.email.toLowerCase() === email.trim().toLowerCase())) return true;
  if (!telephone) return false;

  const cible = numeroNormalise(telephone);
  return cible.length >= 9 && bloquees.some((c) => numeroNormalise(c.telephone) === cible);
}
