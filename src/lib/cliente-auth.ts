import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const NOM_COOKIE = "zelart_cliente";
const DUREE_SESSION = 60 * 60 * 24 * 60; // 60 jours
export const VALIDITE_LIEN_MIN = 30;

// Le secret dédié est préférable ; à défaut on retombe sur le mot de passe
// gérante, ce qui évite une variable d'environnement supplémentaire.
function secret(): string | null {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? null;
}

function signature(clienteId: string, cle: string): string {
  return createHmac("sha256", cle).update(clienteId).digest("hex");
}

export function nouveauCode(): string {
  // Alphabet sans caractères ambigus (0/O, 1/I) pour une lecture à voix haute.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const octets = randomBytes(5);
  const code = [...octets].map((o) => alphabet[o % alphabet.length]).join("");
  return `ZEL-${code}`;
}

export function nouveauJeton(): string {
  return randomBytes(32).toString("base64url");
}

export async function ouvrirSessionCliente(clienteId: string): Promise<void> {
  const cle = secret();
  if (!cle) throw new Error("Aucun secret de session configuré.");
  (await cookies()).set(NOM_COOKIE, `${clienteId}.${signature(clienteId, cle)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: DUREE_SESSION,
    path: "/",
  });
}

export async function fermerSessionCliente(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE);
}

export async function clienteConnectee(): Promise<string | null> {
  const cle = secret();
  if (!cle) return null;

  const valeur = (await cookies()).get(NOM_COOKIE)?.value;
  if (!valeur) return null;

  const separateur = valeur.lastIndexOf(".");
  if (separateur <= 0) return null;

  const clienteId = valeur.slice(0, separateur);
  const fournie = valeur.slice(separateur + 1);
  const attendue = signature(clienteId, cle);
  if (fournie.length !== attendue.length) return null;
  if (!timingSafeEqual(Buffer.from(fournie), Buffer.from(attendue))) return null;

  // La fiche peut avoir été supprimée entre-temps (droit à l'effacement).
  const existe = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  return existe ? clienteId : null;
}
