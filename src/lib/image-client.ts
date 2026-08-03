const COTE_MAX = 1600;
const SEUIL_COMPRESSION = 700 * 1024;

// Réduit les photos de téléphone (souvent 3–5 Mo) avant l'envoi. En cas
// d'échec (format exotique type HEIC), le fichier d'origine est renvoyé tel
// quel — le serveur reste seul juge de ce qu'il accepte.
export async function compresserImage(fichier: File): Promise<Blob> {
  try {
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    if (echelle === 1 && fichier.size <= SEUIL_COMPRESSION) return fichier;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    const contexte = canvas.getContext("2d");
    if (!contexte) return fichier;
    contexte.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressee = await new Promise<Blob | null>((resoudre) =>
      canvas.toBlob(resoudre, "image/jpeg", 0.82)
    );
    return compressee && compressee.size < fichier.size ? compressee : fichier;
  } catch {
    return fichier;
  }
}
