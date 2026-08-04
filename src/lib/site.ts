// Adresse publique du site, utilisée dans les liens envoyés par e-mail.
// Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL suit automatiquement le domaine de
// production : rien à changer le jour où un nom de domaine est branché.
// Identifie la version réellement déployée : permet de vérifier qu'une
// modification est bien en ligne, sans avoir à fouiller le tableau de bord.
export function versionDeployee(): { sha: string; message: string | null } {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "développement local";
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null;
  return { sha, message };
}

export function urlSite(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
