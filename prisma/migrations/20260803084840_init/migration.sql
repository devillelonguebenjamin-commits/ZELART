-- CreateEnum
CREATE TYPE "StatutRendezVous" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ANNULE', 'TERMINE', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "notes" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "dureeMin" INTEGER NOT NULL,
    "prixCents" INTEGER NOT NULL,
    "aPartirDe" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Prestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disponibilite" (
    "id" TEXT NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,

    CONSTRAINT "Disponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indisponibilite" (
    "id" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,

    CONSTRAINT "Indisponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RendezVous" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "prestationId" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutRendezVous" NOT NULL DEFAULT 'EN_ATTENTE',
    "noteCliente" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Disponibilite_jourSemaine_idx" ON "Disponibilite"("jourSemaine");

-- CreateIndex
CREATE INDEX "RendezVous_debut_idx" ON "RendezVous"("debut");

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
