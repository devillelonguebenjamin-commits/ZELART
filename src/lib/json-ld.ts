// `</script>` dans une valeur (un avis client, une légende de photo…)
// interromprait le bloc JSON-LD avant l'heure : on échappe systématiquement
// les chevrons, sans jamais faire confiance au contenu qui l'alimente.
export function jsonLdSecurise(objet: unknown): string {
  return JSON.stringify(objet).replace(/</g, "\\u003c");
}
