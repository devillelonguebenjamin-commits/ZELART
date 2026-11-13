import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Côté serveur du registre des déclarations santé (le texte est dans
// declaration-sante-texte.ts, lisible aussi par le navigateur).

/**
 * Adresse IP et navigateur de la requête en cours, joints à une déclaration
 * faite en ligne : avec l'heure, c'est ce qui rattache la case cochée à une
 * personne et à un appareil. Jamais affichés ailleurs que dans la preuve.
 */
export async function originePourPreuve(): Promise<{ ip: string | null; navigateur: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const navigateur = h.get("user-agent")?.slice(0, 300) || null;
  return { ip, navigateur };
}

/** Les déclarations d'un rendez-vous, la plus récente d'abord. */
export function declarationsDuRendezVous(rendezVousId: string) {
  return prisma.declarationSante.findMany({
    where: { rendezVousId },
    orderBy: { accepteeLe: "desc" },
  });
}
