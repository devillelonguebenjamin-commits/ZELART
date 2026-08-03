// Vercel nomme la variable BLOB_READ_WRITE_TOKEN, mais permet de la préfixer
// par le nom du magasin (ex. ZELART_PHOTOS_BLOB_READ_WRITE_TOKEN). On accepte
// les deux formes pour que la galerie fonctionne quel que soit le réglage.
export function jetonBlob(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [nom, valeur] of Object.entries(process.env)) {
    if (nom.endsWith("BLOB_READ_WRITE_TOKEN") && valeur) return valeur;
  }
  return undefined;
}

// Nom de la variable trouvée, pour l'afficher dans la page Réglages.
export function nomVariableBlob(): string | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "BLOB_READ_WRITE_TOKEN";
  for (const [nom, valeur] of Object.entries(process.env)) {
    if (nom.endsWith("BLOB_READ_WRITE_TOKEN") && valeur) return nom;
  }
  return null;
}
