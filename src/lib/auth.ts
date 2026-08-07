import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const NOM_COOKIE = "zelart_admin";

// Jeton de session dérivé du mot de passe : changer ADMIN_PASSWORD
// invalide toutes les sessions ouvertes.
function jetonAttendu(): string | null {
  const motDePasse = process.env.ADMIN_PASSWORD;
  if (!motDePasse) return null;
  return createHmac("sha256", motDePasse).update("zelart-admin-session").digest("hex");
}

export async function estAdmin(): Promise<boolean> {
  const attendu = jetonAttendu();
  if (!attendu) return false;
  const valeur = (await cookies()).get(NOM_COOKIE)?.value;
  if (!valeur) return false;

  // La comparaison se fait sur les octets, la longueur doit donc se mesurer sur
  // les octets elle aussi : « é » compte pour un caractère et deux octets, et un
  // cookie forgé de 64 caractères accentués passerait un contrôle fait sur la
  // chaîne pour faire ensuite lever timingSafeEqual — soit une erreur 500 sur
  // tout l'espace gérante, là où un refus était attendu.
  const fourni = Buffer.from(valeur);
  const cible = Buffer.from(attendu);
  if (fourni.length !== cible.length) return false;
  return timingSafeEqual(fourni, cible);
}

export async function exigerAdmin(): Promise<void> {
  if (!(await estAdmin())) redirect("/admin/connexion");
}

export async function ouvrirSessionAdmin(): Promise<void> {
  const jeton = jetonAttendu();
  if (!jeton) throw new Error("ADMIN_PASSWORD n'est pas configuré");
  (await cookies()).set(NOM_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function fermerSessionAdmin(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE);
}
