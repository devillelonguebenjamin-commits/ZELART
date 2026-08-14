-- La cliente ne choisit plus son niveau de nail art.
--
-- Le motif est un abus constaté : les clientes cochaient massivement le niveau
-- 1, le moins cher, puis décrivaient et envoyaient des photos d'un dessin qui
-- relevait du niveau 2 ou 3. L'écart se découvrait au fauteuil, une main déjà
-- limée, quand il était trop tard pour en parler sereinement.
--
-- Elle choisit désormais « avec ou sans nail art », décrit ce qu'elle veut, et
-- Zélia détermine le niveau à la lecture de la description et des photos.

ALTER TABLE "Prestation" ADD COLUMN "choixCliente" BOOLEAN NOT NULL DEFAULT true;

-- Les niveaux restent au catalogue : ils servent à Zélia pour ajuster la ligne,
-- ils restent affichés et tarifés publiquement, ils ne sont plus cochables.
UPDATE "Prestation" SET "choixCliente" = false WHERE "nom" LIKE '%nail art niveau %';

-- Une prestation « avec nail art » par technique et par nature d'acte, bâtie
-- sur celles qui existent déjà plutôt que réécrite à la main : le tarif de
-- départ est celui du niveau 1, puisque le nail art commence là ; la durée est
-- celle du niveau 2, parce que c'est le niveau le plus demandé et qu'une durée
-- calée sur le niveau 1 ferait déborder une pose sur deux.
--
-- « aPartirDe » est vrai : le prix final dépend du niveau retenu, et annoncer
-- un prix ferme serait une promesse que la pose ne tiendra pas.
INSERT INTO "Prestation" (
  "id", "nom", "categorie", "description", "dureeMin", "prixCents",
  "aPartirDe", "active", "ordre", "typeActe", "typePose", "choixCliente"
)
SELECT
  'cnv' || replace(gen_random_uuid()::text, '-', ''),
  replace(un."nom", ' niveau 1', ''),
  un."categorie",
  un."description",
  COALESCE(deux."dureeMin", un."dureeMin"),
  un."prixCents",
  true,
  un."active",
  un."ordre",
  un."typeActe",
  un."typePose",
  true
FROM "Prestation" un
LEFT JOIN "Prestation" deux
  ON deux."nom" = replace(un."nom", 'niveau 1', 'niveau 2')
WHERE un."nom" LIKE '%nail art niveau 1'
  -- Rejouable sans créer de doublon.
  AND NOT EXISTS (
    SELECT 1 FROM "Prestation" deja
    WHERE deja."nom" = replace(un."nom", ' niveau 1', '')
  );
