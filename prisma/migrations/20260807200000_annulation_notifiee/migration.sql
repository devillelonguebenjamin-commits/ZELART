-- Trace de l'annulation expliquée : sait-on si la cliente a été prévenue ?
ALTER TABLE "RendezVous" ADD COLUMN "annulationNotifieeLe" TIMESTAMP(3);
