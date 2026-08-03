// Adresse publique du site, utilisée dans les liens envoyés par e-mail.
// Sur Vercel, VERCEL_PROJECT_PRODUCTION_URL suit automatiquement le domaine de
// production : rien à changer le jour où un nom de domaine est branché.
export function urlSite(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
