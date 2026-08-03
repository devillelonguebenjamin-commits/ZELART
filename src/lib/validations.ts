import { z } from "zod";

export const reservationSchema = z.object({
  prestationId: z.string().min(1, "Choisissez une prestation."),
  debut: z.string().min(1, "Choisissez un créneau."),
  prenom: z.string().trim().min(1, "Indiquez votre prénom.").max(60, "Prénom trop long."),
  nom: z.string().trim().min(1, "Indiquez votre nom.").max(60, "Nom trop long."),
  email: z.string().trim().toLowerCase().max(120, "Adresse e-mail trop longue.").email("Adresse e-mail invalide."),
  telephone: z
    .string()
    .trim()
    .regex(/^(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/, "Numéro de téléphone invalide (format français attendu)."),
  noteCliente: z.string().trim().max(500, "Votre message ne doit pas dépasser 500 caractères.").optional(),
});

export type DonneesReservation = z.infer<typeof reservationSchema>;
