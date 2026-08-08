import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { LONGUEUR_MIN, motDePasseAcceptable } from "@/lib/mot-de-passe-bornes";

// Hachage des mots de passe de l'espace cliente.
//
// `scrypt` plutôt qu'une bibliothèque tierce : il est dans Node, il est lent et
// gourmand en mémoire par construction — donc coûteux à attaquer en force —, et
// il évite d'ajouter une dépendance native à installer sur l'hébergement.
//
// Le sel est tiré au hasard pour chaque mot de passe : deux clientes ayant
// choisi le même mot de passe n'ont pas la même empreinte, et une table
// précalculée ne sert à rien.

const deriver = promisify(scrypt) as (
  motDePasse: string,
  sel: Buffer,
  longueur: number
) => Promise<Buffer>;

const LONGUEUR = 64;

// Réexportées pour que les appelants serveur n'aient qu'une porte d'entrée.
export { LONGUEUR_MIN, motDePasseAcceptable };

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const empreinte = await deriver(motDePasse.normalize("NFKC"), sel, LONGUEUR);
  return `scrypt$${sel.toString("base64")}$${empreinte.toString("base64")}`;
}

/**
 * Compare sans fuiter par le temps de réponse.
 *
 * Renvoie faux plutôt que de lever sur une empreinte mal formée : une colonne
 * abîmée doit refuser l'accès, pas rendre une erreur 500 sur la page de
 * connexion.
 */
export async function motDePasseCorrespond(
  motDePasse: string,
  stocke: string | null
): Promise<boolean> {
  if (!stocke) return false;
  const [algo, selB64, empreinteB64] = stocke.split("$");
  if (algo !== "scrypt" || !selB64 || !empreinteB64) return false;

  try {
    const attendue = Buffer.from(empreinteB64, "base64");
    const obtenue = await deriver(motDePasse.normalize("NFKC"), Buffer.from(selB64, "base64"), attendue.length);
    return obtenue.length === attendue.length && timingSafeEqual(obtenue, attendue);
  } catch {
    return false;
  }
}
