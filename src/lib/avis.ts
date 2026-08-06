import { prisma } from "@/lib/prisma";

// Avis Google de l'établissement, via l'API Places (New).
//
// Deux limites de la plateforme, à connaître avant de s'y fier :
//   1. Google ne renvoie que **cinq avis** par établissement, et le choix lui
//      appartient. Il n'existe pas de moyen officiel d'en obtenir davantage.
//   2. Les avis ne doivent être ni modifiés ni tronqués, et doivent rester
//      attribués à leur auteur avec un lien vers Google.

export const CLE_PLACE_ID = "googlePlaceId";
export const CLE_ETABLISSEMENT = "googleEtablissement";
const CLE_CACHE = "avisGoogleCache";

// Google autorise une mise en cache temporaire. Six heures suffisent à rendre
// l'appel invisible dans la facture sans jamais afficher d'avis très vieux.
const FRAICHEUR_MS = 6 * 60 * 60 * 1000;

const CHAMPS = "rating,userRatingCount,googleMapsUri,reviews";

export type AvisGoogle = {
  auteur: string;
  urlAuteur: string | null;
  photoAuteur: string | null;
  note: number;
  texte: string;
  quand: string;
};

export type FicheAvis = {
  note: number | null;
  nombre: number | null;
  urlGoogle: string | null;
  avis: AvisGoogle[];
};

export function cleGoogle(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;
}

type ReponsePlace = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }[];
};

function convertir(place: ReponsePlace): FicheAvis {
  return {
    note: place.rating ?? null,
    nombre: place.userRatingCount ?? null,
    urlGoogle: place.googleMapsUri ?? null,
    avis: (place.reviews ?? [])
      .map((avis) => ({
        auteur: avis.authorAttribution?.displayName ?? "Cliente Google",
        urlAuteur: avis.authorAttribution?.uri ?? null,
        photoAuteur: avis.authorAttribution?.photoUri ?? null,
        note: avis.rating ?? 0,
        texte: (avis.text?.text ?? avis.originalText?.text ?? "").trim(),
        quand: avis.relativePublishTimeDescription ?? "",
      }))
      .filter((avis) => avis.texte.length > 0),
  };
}

async function interrogerGoogle(placeId: string, cle: string): Promise<FicheAvis> {
  const reponse = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      headers: { "X-Goog-Api-Key": cle, "X-Goog-FieldMask": CHAMPS },
      // Le cache est tenu en base : il survit aux redémarrages et permet de
      // continuer à afficher les avis si Google devient indisponible.
      cache: "no-store",
    }
  );
  if (!reponse.ok) {
    throw new Error(`Google a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 200)}`);
  }
  return convertir((await reponse.json()) as ReponsePlace);
}

/** Avis affichés sur le site. `null` tant que rien n'est configuré. */
export async function avisGoogle(): Promise<FicheAvis | null> {
  const cle = cleGoogle();
  const [reglage, cache] = await Promise.all([
    prisma.parametre.findUnique({ where: { cle: CLE_PLACE_ID } }),
    prisma.parametre.findUnique({ where: { cle: CLE_CACHE } }),
  ]);

  const enCache = lireCache(cache?.valeur);
  if (!cle || !reglage?.valeur) return null;

  const frais = cache && Date.now() - cache.modifieLe.getTime() < FRAICHEUR_MS;
  if (frais && enCache) return enCache;

  try {
    const fiche = await interrogerGoogle(reglage.valeur, cle);
    await prisma.parametre.upsert({
      where: { cle: CLE_CACHE },
      update: { valeur: JSON.stringify(fiche) },
      create: { cle: CLE_CACHE, valeur: JSON.stringify(fiche) },
    });
    return fiche;
  } catch (erreur) {
    // Une panne côté Google ne doit pas vider la page : on ressert le dernier
    // état connu, même périmé.
    console.error("Avis Google indisponibles", erreur);
    return enCache;
  }
}

// Lien direct vers le formulaire d'avis Google, sans passer par l'API : un
// simple lien Google Maps, qui fonctionne même si la clé d'API venait à
// manquer. `null` tant qu'aucun établissement n'est connecté.
export async function lienDemandeAvis(): Promise<string | null> {
  const reglage = await prisma.parametre.findUnique({ where: { cle: CLE_PLACE_ID } });
  if (!reglage?.valeur) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(reglage.valeur)}`;
}

function lireCache(brut: string | undefined): FicheAvis | null {
  if (!brut) return null;
  try {
    return JSON.parse(brut) as FicheAvis;
  } catch {
    return null;
  }
}

export type Candidat = { placeId: string; nom: string; adresse: string; nombre: number | null };

// Le réflexe naturel est de coller le lien de la page Google plutôt que de
// retaper le nom. On accepte donc les deux, et l'identifiant d'établissement
// quand il est là — les liens de recherche Google ne le contiennent pas, mais
// ceux de Maps parfois oui.
export function normaliserRechercheAvis(
  saisie: string
): { placeId: string } | { requete: string } | null {
  const propre = saisie.trim();
  if (!propre) return null;

  const identifiant = propre.match(/\b(ChIJ[A-Za-z0-9_-]{8,})\b/);
  if (identifiant) return { placeId: identifiant[1] };

  if (/^https?:\/\//i.test(propre)) {
    try {
      const url = new URL(propre);
      const place = url.searchParams.get("place_id");
      if (place) return { placeId: place };
      const recherche = url.searchParams.get("q") ?? url.searchParams.get("query");
      if (recherche?.trim()) return { requete: recherche.trim() };
      // Adresse de la forme /maps/place/Nom+Du+Salon/…
      const segment = url.pathname.split("/").filter(Boolean).at(2);
      if (segment) return { requete: decodeURIComponent(segment).replace(/\+/g, " ") };
      return null;
    } catch {
      return null;
    }
  }

  return { requete: propre };
}

// Saint-Nazaire : une recherche sur « ZELART » seul ramènerait des
// établissements du monde entier. Le salon ne bouge pas, on oriente donc
// Google vers sa région.
const BIAIS_SAINT_NAZAIRE = {
  circle: { center: { latitude: 47.2735, longitude: -2.2138 }, radius: 30000 },
};

const CHAMPS_FICHE = "id,displayName,formattedAddress,userRatingCount";

/** Détaille un établissement dont on connaît déjà l'identifiant. */
export async function detaillerEtablissement(placeId: string): Promise<Candidat> {
  const cle = cleGoogle();
  if (!cle) throw new Error("Aucune clé d'API Google n'est configurée sur le site.");

  const reponse = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    { headers: { "X-Goog-Api-Key": cle, "X-Goog-FieldMask": CHAMPS_FICHE }, cache: "no-store" }
  );
  if (!reponse.ok) {
    throw new Error(`Google a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 200)}`);
  }
  const place = (await reponse.json()) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    userRatingCount?: number;
  };
  return {
    placeId: place.id ?? placeId,
    nom: place.displayName?.text ?? "Sans nom",
    adresse: place.formattedAddress ?? "",
    nombre: place.userRatingCount ?? null,
  };
}

/**
 * Retrouve l'établissement à partir de son nom, pour épargner à Zélia la chasse
 * au « Place ID » dans la console Google.
 */
export async function chercherEtablissement(requete: string): Promise<Candidat[]> {
  const cle = cleGoogle();
  if (!cle) throw new Error("Aucune clé d'API Google n'est configurée sur le site.");

  const reponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": cle,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: requete,
      languageCode: "fr",
      maxResultCount: 5,
      locationBias: BIAIS_SAINT_NAZAIRE,
    }),
    cache: "no-store",
  });
  if (!reponse.ok) {
    throw new Error(`Google a répondu ${reponse.status} : ${(await reponse.text()).slice(0, 200)}`);
  }

  const donnees = (await reponse.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      userRatingCount?: number;
    }[];
  };
  return (donnees.places ?? [])
    .filter((place) => place.id)
    .map((place) => ({
      placeId: place.id!,
      nom: place.displayName?.text ?? "Sans nom",
      adresse: place.formattedAddress ?? "",
      nombre: place.userRatingCount ?? null,
    }));
}

/** Vide le cache : le prochain affichage rappellera Google. */
export async function oublierCacheAvis(): Promise<void> {
  await prisma.parametre.deleteMany({ where: { cle: CLE_CACHE } });
}
