-- Vente de press-on nails : catalogue (sur-mesure et collections) et commandes.

CREATE TYPE "ModeRemise" AS ENUM ('MAIN_PROPRE', 'POSTAL');

CREATE TYPE "StatutCommandePressOn" AS ENUM ('DEMANDE', 'A_PAYER', 'PAYEE', 'EN_FABRICATION', 'PRETE', 'REMISE', 'ANNULEE');

CREATE TABLE "ModelePressOn" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "description" TEXT,
    "prixCents" INTEGER NOT NULL,
    "aPartirDe" BOOLEAN NOT NULL DEFAULT false,
    "surMesure" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModelePressOn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommandePressOn" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "modeleId" TEXT NOT NULL,
    "prixCents" INTEGER NOT NULL,
    "aPartirDe" BOOLEAN NOT NULL DEFAULT false,
    "fraisPortCents" INTEGER,
    "modeRemise" "ModeRemise" NOT NULL,
    "adresse" TEXT,
    "forme" TEXT,
    "longueur" TEXT,
    "mesures" TEXT,
    "inspiration" TEXT,
    "statut" "StatutCommandePressOn" NOT NULL DEFAULT 'DEMANDE',
    "note" TEXT,
    "paiementDemandeLe" TIMESTAMP(3),
    "paiementRecuLe" TIMESTAMP(3),
    "remiseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandePressOn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommandePressOn_clienteId_idx" ON "CommandePressOn"("clienteId");

CREATE INDEX "CommandePressOn_statut_idx" ON "CommandePressOn"("statut");

CREATE TABLE "ImagePressOn" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagePressOn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImagePressOn_commandeId_idx" ON "ImagePressOn"("commandeId");

ALTER TABLE "CommandePressOn" ADD CONSTRAINT "CommandePressOn_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommandePressOn" ADD CONSTRAINT "CommandePressOn_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModelePressOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImagePressOn" ADD CONSTRAINT "ImagePressOn_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandePressOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
