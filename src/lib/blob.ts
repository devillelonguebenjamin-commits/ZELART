// Deux modes d'authentification coexistent chez Vercel :
//   - un jeton statique BLOB_READ_WRITE_TOKEN (parfois préfixé du nom du magasin) ;
//   - une authentification OIDC automatique, où seul BLOB_STORE_ID est exposé.
// Le SDK gère le second cas tout seul : il suffit de ne pas lui imposer de jeton.
export function jetonBlob(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [nom, valeur] of Object.entries(process.env)) {
    if (nom.endsWith("BLOB_READ_WRITE_TOKEN") && valeur) return valeur;
  }
  return undefined;
}

export function optionsBlob(): { token?: string } {
  const token = jetonBlob();
  return token ? { token } : {};
}

export function stockageConfigure(): boolean {
  return Boolean(jetonBlob() || process.env.BLOB_STORE_ID);
}

// Décrit la configuration détectée, pour la page Réglages.
export function modeStockage(): string {
  if (jetonBlob()) return "jeton BLOB_READ_WRITE_TOKEN";
  if (process.env.BLOB_STORE_ID) return "authentification automatique (BLOB_STORE_ID)";
  return "aucune";
}
