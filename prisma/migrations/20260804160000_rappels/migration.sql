-- Rappels de rendez-vous et relances de repousse : on horodate les envois
-- pour garantir qu'une cliente ne reçoive jamais deux fois le même message.
ALTER TABLE "RendezVous" ADD COLUMN "rappelEnvoyeLe" TIMESTAMP(3),
ADD COLUMN "relanceEnvoyeeLe" TIMESTAMP(3);

CREATE INDEX "RendezVous_rappelEnvoyeLe_idx" ON "RendezVous"("rappelEnvoyeLe");
CREATE INDEX "RendezVous_relanceEnvoyeeLe_idx" ON "RendezVous"("relanceEnvoyeeLe");
