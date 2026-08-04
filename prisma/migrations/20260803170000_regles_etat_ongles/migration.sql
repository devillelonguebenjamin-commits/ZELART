-- CreateEnum
CREATE TYPE "TypeActe" AS ENUM ('POSE', 'REMPLISSAGE', 'DEPOSE');
CREATE TYPE "TypePose" AS ENUM ('VSP', 'GAINAGE', 'GEL_X', 'POP_IT');
CREATE TYPE "EtatOngles" AS ENUM ('NATUREL', 'POSE_ZELART', 'POSE_EXTERIEURE');

-- AlterTable Prestation : colonnes ajoutées en optionnel puis renseignées
-- d'après le catalogue existant, avant d'être rendues obligatoires.
ALTER TABLE "Prestation" ADD COLUMN "typeActe" "TypeActe" NOT NULL DEFAULT 'POSE',
ADD COLUMN "typePose" "TypePose";

UPDATE "Prestation" SET "typeActe" = 'DEPOSE' WHERE nom ILIKE 'Dépose%';
UPDATE "Prestation" SET "typeActe" = 'REMPLISSAGE' WHERE nom ILIKE 'Remplissage%';

UPDATE "Prestation" SET "typePose" = CASE
  WHEN categorie = 'Vernis semi-permanent' THEN 'VSP'::"TypePose"
  WHEN categorie = 'Gainage'               THEN 'GAINAGE'::"TypePose"
  WHEN categorie = 'Pose Gel X'            THEN 'GEL_X'::"TypePose"
  WHEN categorie = 'Pose Pop-it'           THEN 'POP_IT'::"TypePose"
  ELSE 'VSP'::"TypePose"
END WHERE "typePose" IS NULL;

ALTER TABLE "Prestation" ALTER COLUMN "typePose" SET NOT NULL;

-- AlterTable RendezVous
ALTER TABLE "RendezVous" ADD COLUMN "etatOngles" "EtatOngles",
ADD COLUMN "typePoseActuel" "TypePose",
ADD COLUMN "deposeId" TEXT,
ADD COLUMN "consentementSante" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_deposeId_fkey" FOREIGN KEY ("deposeId") REFERENCES "Prestation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
