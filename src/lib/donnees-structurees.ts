import type { Prestation } from "@/generated/prisma/client";
import type { FicheAvis } from "@/lib/avis";
import type { Reseau } from "@/lib/parametres";
import { plagesActives } from "@/lib/horaires";
import { urlSite } from "@/lib/site";

// La fiche que Google lit pour comprendre de quel établissement il s'agit.
//
// Elle existait déjà, réduite au nom, à l'adresse et au téléphone. Ce qui
// manquait n'était pas décoratif : sans horaires, la fiche ne peut pas dire
// « ouvert » ; sans `sameAs`, rien ne relie le compte Instagram et le site à la
// même personne ; sans les prestations et leurs prix, une recherche du type
// « prix pose gel x saint-nazaire » n'a aucune raison de tomber ici.
//
// Deux abstentions volontaires :
//
//   - **pas de coordonnées géographiques.** Il aurait fallu les inventer, et
//     une latitude approximative placerait le salon dans la rue d'à côté.
//     `hasMap` renvoie à la fiche Google, qui elle les connaît exactement.
//   - **pas de zone desservie élargie.** Annoncer dix communes alentour serait
//     une déclaration invérifiable ; l'institut est à Saint-Nazaire.

const ADRESSE = {
  "@type": "PostalAddress",
  streetAddress: "108 avenue de la République",
  addressLocality: "Saint-Nazaire",
  postalCode: "44600",
  addressRegion: "Loire-Atlantique",
  addressCountry: "FR",
} as const;

const JOURS_SCHEMA = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
] as const;

/**
 * Les fenêtres d'ouverture, regroupées par horaire identique.
 *
 * Une ligne par couple d'heures plutôt qu'une par jour : « du mardi au samedi,
 * 9h-12h30 » se dit en une entrée, ce qui donne une fiche lisible plutôt qu'une
 * liste de dix-huit répétitions.
 */
async function horairesSchema() {
  const plages = await plagesActives();
  const parHoraire = new Map<string, { opens: string; closes: string; jours: Set<number> }>();

  for (const plage of plages) {
    const cle = `${plage.heureDebut}-${plage.heureFin}`;
    const groupe = parHoraire.get(cle) ?? {
      opens: plage.heureDebut,
      closes: plage.heureFin,
      jours: new Set<number>(),
    };
    // La base suit ISO 8601 (1 = lundi, 7 = dimanche) ; schema.org nomme les
    // jours, et le dimanche y retombe sur l'indice 0 de notre table.
    groupe.jours.add(plage.jourSemaine % 7);
    parHoraire.set(cle, groupe);
  }

  return [...parHoraire.values()].map((groupe) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [...groupe.jours].sort((a, b) => a - b).map((j) => JOURS_SCHEMA[j]),
    opens: groupe.opens,
    closes: groupe.closes,
  }));
}

/**
 * Le catalogue, une offre par prestation.
 *
 * Un tarif « à partir de » ne se déclare pas comme un prix ferme : il passe par
 * un `minPrice`, faute de quoi Google annoncerait un prix que Zélia n'a jamais
 * promis. C'est le cas du nail art niveau 3, dont le prix dépend du dessin.
 */
function catalogue(prestations: Prestation[]) {
  if (prestations.length === 0) return undefined;

  return {
    "@type": "OfferCatalog",
    name: "Prestations",
    itemListElement: prestations.map((prestation) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: prestation.nom,
        category: prestation.categorie,
        ...(prestation.description ? { description: prestation.description } : {}),
      },
      priceCurrency: "EUR",
      ...(prestation.aPartirDe
        ? {
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: (prestation.prixCents / 100).toFixed(2),
              priceCurrency: "EUR",
            },
          }
        : { price: (prestation.prixCents / 100).toFixed(2) }),
    })),
  };
}

export type EntreeFiche = {
  prestations: Prestation[];
  reseaux: Reseau[];
  avis: FicheAvis | null;
  /** Adresses des visuels de la galerie, les premiers suffisent. */
  images: string[];
};

export async function ficheEtablissement(entree: EntreeFiche) {
  const base = urlSite();

  // Tout ce qui désigne la même entité ailleurs sur le web. C'est ce qui permet
  // à Google de rattacher le compte Instagram et la fiche Google à ce site, et
  // donc de présenter le site officiel plutôt qu'un intermédiaire lorsque
  // quelqu'un cherche « Zelart » par son nom.
  const sameAs = [
    ...entree.reseaux.map((r) => r.url),
    ...(entree.avis?.urlGoogle ? [entree.avis.urlGoogle] : []),
  ].filter(Boolean);

  const offres = catalogue(entree.prestations);

  // Une même photo peut figurer deux fois dans la galerie (ajoutée à la main
  // puis publiée depuis une fiche) ; la répéter dans la fiche n'apporte rien.
  const images = [...new Set(entree.images)].slice(0, 6);

  return {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    "@id": `${base}/#salon`,
    name: "Zelart Nails",
    description:
      "Prothésiste ongulaire et nail artist certifiée à Saint-Nazaire : vernis semi-permanent, gainage, pose Gel X, pose Pop-it, nail art et press-on nails, sur rendez-vous.",
    url: base,
    telephone: "+33645292001",
    email: "Zelia.barreteaupro@outlook.fr",
    priceRange: "€€",
    currenciesAccepted: "EUR",
    address: ADRESSE,
    areaServed: { "@type": "City", name: "Saint-Nazaire" },
    // L'institut qui héberge le fauteuil : une adresse partagée s'explique
    // mieux qu'elle ne se cache, y compris pour Google.
    containedInPlace: { "@type": "Place", name: "L'Atelier du Regard", address: ADRESSE },
    ...(entree.avis?.urlGoogle ? { hasMap: entree.avis.urlGoogle } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    openingHoursSpecification: await horairesSchema(),
    ...(offres ? { hasOfferCatalog: offres } : {}),
    // Conservé pour la page elle-même. Google, lui, ne reprend pas dans ses
    // résultats les avis qu'une entreprise publie sur son propre site à son
    // propre sujet : la note qui compte pour le classement reste celle de la
    // fiche Google.
    ...(entree.avis?.note
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: entree.avis.note,
            reviewCount: entree.avis.nombre ?? entree.avis.avis.length,
          },
        }
      : {}),
  };
}
