-- Heure limite de règlement de l'acompte demandé à la réservation (10 minutes).
ALTER TABLE "RendezVous" ADD COLUMN "acompteLimite" TIMESTAMP(3);

CREATE INDEX "RendezVous_acompteLimite_idx" ON "RendezVous"("acompteLimite") WHERE "acompteLimite" IS NOT NULL;
