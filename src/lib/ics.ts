// Fichier .ics (RFC 5545) pour un rendez-vous : ouvert par n'importe quel
// calendrier (Google, Apple, Outlook…) sans dépendre d'un service tiers.
// Servi par une route plutôt qu'attaché à l'e-mail : Brevo et Resend ont des
// API de pièces jointes différentes, un simple lien évite d'avoir à en gérer
// deux — et fonctionne aussi bien depuis la page de confirmation.

function formatUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

// Virgule, point-virgule et retour à la ligne ont un sens réservé dans le
// format ; un nom de prestation ou une note de cliente pourrait en contenir.
function echapper(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/[,;]/g, "\\$&").replace(/\r?\n/g, "\\n");
}

// Les lignes de plus de 75 octets doivent être repliées avec un retour suivi
// d'une espace : sans quoi certains clients (Outlook en tête) tronquent le champ.
function replier(ligne: string): string {
  const octets = Buffer.byteLength(ligne, "utf8");
  if (octets <= 75) return ligne;
  let reste = ligne;
  const morceaux: string[] = [];
  while (Buffer.byteLength(reste, "utf8") > 74) {
    let coupe = 74;
    // On ne coupe pas au milieu d'un caractère multioctet.
    while ((reste.codePointAt(coupe) ?? 0) >= 0x80 && (reste.charCodeAt(coupe) & 0xc0) === 0x80) coupe--;
    morceaux.push(reste.slice(0, coupe));
    reste = " " + reste.slice(coupe);
  }
  morceaux.push(reste);
  return morceaux.join("\r\n");
}

export function genererICS(evenement: {
  uid: string;
  debut: Date;
  fin: Date;
  titre: string;
  lieu: string;
  description: string;
}): string {
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zelart Nails//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evenement.uid}`,
    `DTSTAMP:${formatUTC(new Date())}`,
    `DTSTART:${formatUTC(evenement.debut)}`,
    `DTEND:${formatUTC(evenement.fin)}`,
    `SUMMARY:${echapper(evenement.titre)}`,
    `LOCATION:${echapper(evenement.lieu)}`,
    `DESCRIPTION:${echapper(evenement.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lignes.map(replier).join("\r\n") + "\r\n";
}
