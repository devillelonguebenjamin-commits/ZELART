-- Créneau proposé par la cliente quand aucun horaire ouvert ne lui convient.
-- Le rendez-vous suit le circuit habituel (« à confirmer », puis Zélia
-- tranche) mais sort des fenêtres d'ouverture : le drapeau le signale.

ALTER TABLE "RendezVous" ADD COLUMN "creneauPropose" BOOLEAN NOT NULL DEFAULT false;
