-- Fiche technique de la pose, remplie par la gérante après le rendez-vous.
ALTER TABLE "RendezVous" ADD COLUMN "forme" TEXT,
ADD COLUMN "longueur" TEXT,
ADD COLUMN "produits" TEXT,
ADD COLUMN "noteTechnique" TEXT;

CREATE TABLE "Realisation" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "publiee" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Realisation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Realisation_rendezVousId_idx" ON "Realisation"("rendezVousId");

ALTER TABLE "Realisation" ADD CONSTRAINT "Realisation_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
