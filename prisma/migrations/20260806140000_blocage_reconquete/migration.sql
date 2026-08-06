-- Blocage manuel d'une cliente (réservation et press-on refusés) et suivi du
-- message de reconquête après une longue absence.

ALTER TABLE "Cliente" ADD COLUMN "bloqueeLe" TIMESTAMP(3);
ALTER TABLE "Cliente" ADD COLUMN "motifBlocage" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "reconqueteEnvoyeeLe" TIMESTAMP(3);

-- Le blocage se vérifie à chaque tentative de réservation, sur l'adresse comme
-- sur le numéro : deux index pour que ce contrôle reste immédiat.
CREATE INDEX "Cliente_bloqueeLe_idx" ON "Cliente"("bloqueeLe");
CREATE INDEX "Cliente_telephone_idx" ON "Cliente"("telephone");
