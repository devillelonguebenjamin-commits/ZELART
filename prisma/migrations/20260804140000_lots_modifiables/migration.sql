-- Les lots de la roue passent en base pour être gérés depuis l'espace gérante.
CREATE TABLE "LotFidelite" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "texteSurRoue" TEXT NOT NULL,
    "chance" INTEGER NOT NULL,
    "couleur" TEXT NOT NULL DEFAULT '#f9a8d4',
    "aRetirerAuSalon" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LotFidelite_pkey" PRIMARY KEY ("id")
);

-- Reprise des lots existants, avec des identifiants stables pour la conversion
-- des récompenses déjà gagnées.
INSERT INTO "LotFidelite" ("id", "libelle", "texteSurRoue", "chance", "couleur", "aRetirerAuSalon", "ordre") VALUES
  ('lotpose50',   'Votre prochaine pose à −50 %',    '−50 %',       1,  '#be185d', true,  0),
  ('lotporteclef','Un porte-clefs nail art offert',  'Porte-clefs', 10, '#ec4899', true,  1),
  ('lotmoins5',   '−5 % sur votre prochaine pose',   '−5 %',        30, '#f9a8d4', true,  2),
  ('lotinaka',    '−10 % sur le site INAKA',         '−10 % INAKA', 59, '#fbcfe8', false, 3);

ALTER TABLE "Recompense" ADD COLUMN "lotId" TEXT;

UPDATE "Recompense" SET "lotId" = CASE "lot"
  WHEN 'POSE_MOINS_50' THEN 'lotpose50'
  WHEN 'PORTE_CLEF'    THEN 'lotporteclef'
  WHEN 'MOINS_5'       THEN 'lotmoins5'
  ELSE 'lotinaka'
END;

ALTER TABLE "Recompense" ALTER COLUMN "lotId" SET NOT NULL;
ALTER TABLE "Recompense" DROP COLUMN "lot";
DROP TYPE "LotRoue";

ALTER TABLE "Recompense" ADD CONSTRAINT "Recompense_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotFidelite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
