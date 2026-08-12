-- Référence SumUp propre à chaque acompte : sans elle, aucun paiement ne peut
-- être rattaché à un rendez-vous, une transaction SumUp ne portant aucune
-- identité de payeuse.
ALTER TABLE "RendezVous" ADD COLUMN "acompteReference" TEXT;
ALTER TABLE "RendezVous" ADD COLUMN "acompteCheckoutId" TEXT;
ALTER TABLE "RendezVous" ADD COLUMN "acompteVerifieLe" TIMESTAMP(3);

-- Unique : deux rendez-vous ne peuvent pas partager une référence de paiement,
-- sans quoi un règlement serait attribué au hasard entre eux.
CREATE UNIQUE INDEX "RendezVous_acompteReference_key" ON "RendezVous"("acompteReference");
