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
  if (!valeur || valeur.length !== attendu.length) return false;
  return timingSafeEqual(Buffer.from(valeur), Buffer.from(attendu));
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
