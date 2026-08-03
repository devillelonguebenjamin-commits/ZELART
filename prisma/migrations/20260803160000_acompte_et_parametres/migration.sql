-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN "acompteDemandeLe" TIMESTAMP(3),
ADD COLUMN "acompteRegleLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Parametre" (
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("cle")
);
