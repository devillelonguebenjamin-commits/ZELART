-- Une demande peut désormais porter plusieurs prestations.
CREATE TABLE "LignePrestation" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "prestationId" TEXT NOT NULL,
    "automatique" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LignePrestation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LignePrestation_rendezVousId_prestationId_key" ON "LignePrestation"("rendezVousId", "prestationId");
CREATE INDEX "LignePrestation_rendezVousId_idx" ON "LignePrestation"("rendezVousId");

ALTER TABLE "LignePrestation" ADD CONSTRAINT "LignePrestation_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LignePrestation" ADD CONSTRAINT "LignePrestation_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "Prestation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reprise des rendez-vous existants : la prestation principale puis la dépose.
INSERT INTO "LignePrestation" ("id", "rendezVousId", "prestationId", "automatique", "ordre")
SELECT replace(gen_random_uuid()::text, '-', ''), "id", "prestationId", false, 0
FROM "RendezVous";

INSERT INTO "LignePrestation" ("id", "rendezVousId", "prestationId", "automatique", "ordre")
SELECT replace(gen_random_uuid()::text, '-', ''), "id", "deposeId", true, 1
FROM "RendezVous"
WHERE "deposeId" IS NOT NULL
  AND "deposeId" <> "prestationId";

ALTER TABLE "RendezVous" DROP COLUMN "prestationId";
ALTER TABLE "RendezVous" DROP COLUMN "deposeId";
