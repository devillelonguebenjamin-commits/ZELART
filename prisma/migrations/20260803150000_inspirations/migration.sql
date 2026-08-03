-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN "inspiration" TEXT;

-- CreateTable
CREATE TABLE "InspirationImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspirationImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InspirationImage_rendezVousId_idx" ON "InspirationImage"("rendezVousId");

-- AddForeignKey
ALTER TABLE "InspirationImage" ADD CONSTRAINT "InspirationImage_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
