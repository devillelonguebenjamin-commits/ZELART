-- Demande d'annulation de la cliente, validée ou refusée par Zélia.
ALTER TABLE "RendezVous" ADD COLUMN "annulationDemandeeLe" TIMESTAMP(3);
ALTER TABLE "RendezVous" ADD COLUMN "motifAnnulation" TEXT;
