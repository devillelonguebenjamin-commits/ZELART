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

// Alphabet sans caractères ambigus (0/O, 1/I) pour une lecture à voix haute.
// 32 lettres : 256 est un multiple exact, le reste de la division est donc
// uniforme et aucune lettre n'est favorisée.
const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nouveauCode(longueur = 5): string {
  const octets = randomBytes(longueur);
  const code = [...octets].map((o) => ALPHABET_CODE[o % ALPHABET_CODE.length]).join("");
  return `ZEL-${code}`;
}

/**
 * Code de parrainage libre, vérifié en base avant d'être rendu.
 *
 * L'unicité est garantie par la contrainte de la colonne ; sans cette
 * vérification, un tirage malheureux ferait échouer l'enregistrement de la
 * cliente — au milieu d'une réservation, avec pour seul retour « une erreur est
 * survenue ». Cinq lettres offrent 33 millions de combinaisons, mais la
 * probabilité d'une collision croît avec le fichier client, et une seule suffit
 * à perdre un rendez-vous.
 *
 * `db` accepte aussi bien le client Prisma qu'une transaction : la vérification
 * doit avoir lieu dans la même que l'insertion.
 */
type LecteurCliente = {
  cliente: {
    findUnique(args: {
      where: { codeParrainage: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

const TENTATIVES_CODE = 5;

export async function nouveauCodeUnique(db: LecteurCliente): Promise<string> {
  for (let essai = 0; essai < TENTATIVES_CODE; essai++) {
    // Après quelques échecs, ce n'est plus la malchance : le fichier client est
    // dense, on allonge le code plutôt que de tirer indéfiniment.
    const code = nouveauCode(essai < 3 ? 5 : 6);
    const pris = await db.cliente.findUnique({
      where: { codeParrainage: code },
      select: { id: true },
    });
    if (!pris) return code;
  }
  throw new Error("Impossible de tirer un code de parrainage libre.");
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

  // Comparaison sur les octets, longueur mesurée sur les octets : une signature
  // forgée en caractères multi-octets passerait un contrôle fait sur la chaîne
  // et ferait lever timingSafeEqual. Or ce chemin sert aussi à pré-remplir le
  // formulaire de réservation — une erreur ici empêcherait de réserver.
  const fournie = Buffer.from(valeur.slice(separateur + 1));
  const attendue = Buffer.from(signature(clienteId, cle));
  if (fournie.length !== attendue.length) return null;
  if (!timingSafeEqual(fournie, attendue)) return null;

  // La fiche peut avoir été supprimée entre-temps (droit à l'effacement).
  const existe = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });
  return existe ? clienteId : null;
}
