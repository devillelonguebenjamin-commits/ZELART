-- CreateEnum
CREATE TYPE "StatutCampagne" AS ENUM ('BROUILLON', 'EN_COURS', 'ENVOYEE');

-- AlterTable : le jeton de désinscription est d'abord ajouté en optionnel,
-- rempli pour les clientes déjà enregistrées, puis rendu obligatoire.
ALTER TABLE "Cliente" ADD COLUMN     "consentementLe" TIMESTAMP(3),
ADD COLUMN     "consentementMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "desabonneLe" TIMESTAMP(3),
ADD COLUMN     "jetonDesabonnement" TEXT;

UPDATE "Cliente" SET "jetonDesabonnement" = replace(gen_random_uuid()::text, '-', '') WHERE "jetonDesabonnement" IS NULL;

ALTER TABLE "Cliente" ALTER COLUMN "jetonDesabonnement" SET NOT NULL;

-- CreateTable
CREATE TABLE "Campagne" (
    "id" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "statut" "StatutCampagne" NOT NULL DEFAULT 'BROUILLON',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoyeeLe" TIMESTAMP(3),

    CONSTRAINT "Campagne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvoiCampagne" (
    "id" TEXT NOT NULL,
    "campagneId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "erreur" TEXT,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvoiCampagne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvoiCampagne_campagneId_clienteId_key" ON "EnvoiCampagne"("campagneId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_jetonDesabonnement_key" ON "Cliente"("jetonDesabonnement");

-- AddForeignKey
ALTER TABLE "EnvoiCampagne" ADD CONSTRAINT "EnvoiCampagne_campagneId_fkey" FOREIGN KEY ("campagneId") REFERENCES "Campagne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvoiCampagne" ADD CONSTRAINT "EnvoiCampagne_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
