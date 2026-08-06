-- Programme de parrainage « Squad » : avantages accordés aux marraines selon le
-- nombre de filleules réellement venues, et remise de bienvenue des filleules.

CREATE TYPE "TypeAvantage" AS ENUM (
  'BESTIE_REMISE',
  'SQUAD_MANUCURE',
  'ICONE_CHOIX',
  'DIVA_POSE_ANNUELLE'
);

CREATE TABLE "AvantageParrainage" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "type" "TypeAvantage" NOT NULL,
    "periode" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    "gagneLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utiliseLe" TIMESTAMP(3),

    CONSTRAINT "AvantageParrainage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvantageParrainage_code_key" ON "AvantageParrainage"("code");

-- Garde-fou principal : un même avantage ne peut être accordé deux fois pour la
-- même période, quelle que soit la façon dont l'attribution est déclenchée.
CREATE UNIQUE INDEX "AvantageParrainage_clienteId_type_periode_key"
  ON "AvantageParrainage"("clienteId", "type", "periode");

CREATE INDEX "AvantageParrainage_clienteId_idx" ON "AvantageParrainage"("clienteId");

ALTER TABLE "AvantageParrainage" ADD CONSTRAINT "AvantageParrainage_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RendezVous" ADD COLUMN "remiseFilleule" BOOLEAN NOT NULL DEFAULT false;
