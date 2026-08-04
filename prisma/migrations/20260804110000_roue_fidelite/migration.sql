-- Roue de fidélité : un tour gagné toutes les 3 poses réalisées.
CREATE TYPE "LotRoue" AS ENUM ('POSE_MOINS_50', 'PORTE_CLEF', 'MOINS_5', 'INAKA_10');

CREATE TABLE "Recompense" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "lot" "LotRoue" NOT NULL,
    "code" TEXT NOT NULL,
    "gagneLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utiliseLe" TIMESTAMP(3),

    CONSTRAINT "Recompense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recompense_code_key" ON "Recompense"("code");
CREATE INDEX "Recompense_clienteId_idx" ON "Recompense"("clienteId");

ALTER TABLE "Recompense" ADD CONSTRAINT "Recompense_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
