import { z } from "zod";

// Coordonnées communes aux formulaires publics : mêmes règles, mêmes messages.
const prenom = z.string().trim().min(1, "Indiquez votre prénom.").max(60, "Prénom trop long.");
const nom = z.string().trim().min(1, "Indiquez votre nom.").max(60, "Nom trop long.");
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Adresse e-mail trop longue.")
  .email("Adresse e-mail invalide.");
const telephone = z
  .string()
  .trim()
  .regex(/^(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/, "Numéro de téléphone invalide (format français attendu).");

// Coordonnées que la cliente corrige elle-même depuis son espace.
export const coordonneesSchema = z.object({ prenom, nom, telephone });
export const emailSchema = email;

export const reservationSchema = z.object({
  prestationIds: z
    .array(z.string().min(1))
    .min(1, "Choisissez au moins une prestation.")
    .max(6, "Six prestations au maximum par rendez-vous."),
  debut: z.string().min(1, "Choisissez un créneau."),
  prenom,
  nom,
  email,
  telephone,
  noteCliente: z.string().trim().max(500, "Votre message ne doit pas dépasser 500 caractères.").optional(),
  inspiration: z
    .string()
    .trim()
    .max(1000, "Votre inspiration ne doit pas dépasser 1000 caractères.")
    .optional(),
  etatOngles: z.enum(["NATUREL", "POSE_ZELART", "POSE_EXTERIEURE"], {
    message: "Indiquez dans quel état sont vos ongles.",
  }),
  typePoseActuel: z.enum(["VSP", "GAINAGE", "GEL_X", "POP_IT"]).nullable(),
});

export const commandePressOnSchema = z
  .object({
    modeleId: z.string().min(1, "Choisissez un modèle."),
    prenom,
    nom,
    email,
    telephone,
    modeRemise: z.enum(["MAIN_PROPRE", "POSTAL"], {
      message: "Indiquez comment vous souhaitez recevoir votre set.",
    }),
    adresse: z.string().trim().max(300, "Adresse trop longue.").optional(),
    forme: z.string().trim().max(60).optional(),
    longueur: z.string().trim().max(60).optional(),
    mesures: z
      .string()
      .trim()
      .max(300, "Vos mesures ne doivent pas dépasser 300 caractères.")
      .optional(),
    inspiration: z
      .string()
      .trim()
      .max(1000, "Votre description ne doit pas dépasser 1000 caractères.")
      .optional(),
  })
  // Sans adresse, un envoi postal n'a pas de destination : Zélia ne pourrait ni
  // chiffrer le port ni expédier.
  .refine((d) => d.modeRemise !== "POSTAL" || (d.adresse ?? "").length >= 10, {
    message: "Indiquez l'adresse complète de livraison.",
    path: ["adresse"],
  });

// Les URL d'images sont produites par notre propre stockage : on refuse tout
// autre hôte, le formulaire étant public.
export function urlImageValide(url: string): boolean {
  try {
    const analysee = new URL(url);
    return (
      analysee.protocol === "https:" && analysee.hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export type DonneesReservation = z.infer<typeof reservationSchema>;
