-- La cliente ne choisit plus son niveau de nail art sur les press-on.
--
-- Même abus que sur les rendez-vous, et même remède : les clientes commandaient
-- le niveau 1, le moins cher, puis décrivaient un set qui relevait du niveau 2
-- ou 3. Elles commandent désormais « avec nail art » et décrivent ce qu'elles
-- veulent ; Zélia fixe le niveau et ajuste la commande avant de demander le
-- règlement, c'est-à-dire avant que quoi que ce soit soit payé ou fabriqué.

ALTER TABLE "ModelePressOn" ADD COLUMN "choixCliente" BOOLEAN NOT NULL DEFAULT true;

-- Les niveaux restent au catalogue : ils servent à Zélia pour ajuster une
-- commande, ils ne sont plus commandables.
UPDATE "ModelePressOn" SET "choixCliente" = false WHERE "nom" LIKE '%nail art niveau %';

-- Un « + nail art » sans niveau, bâti sur le niveau 1 puisque le nail art
-- commence là. « aPartirDe » est vrai : le prix final dépend du niveau retenu.
INSERT INTO "ModelePressOn" (
  "id", "nom", "collection", "description", "prixCents",
  "aPartirDe", "surMesure", "photoUrl", "actif", "ordre", "choixCliente"
)
SELECT
  'cnp' || replace(gen_random_uuid()::text, '-', ''),
  replace(un."nom", ' niveau 1', ''),
  un."collection",
  un."description",
  un."prixCents",
  true,
  un."surMesure",
  un."photoUrl",
  un."actif",
  un."ordre",
  true
FROM "ModelePressOn" un
WHERE un."nom" LIKE '%nail art niveau 1'
  -- Rejouable sans créer de doublon.
  AND NOT EXISTS (
    SELECT 1 FROM "ModelePressOn" deja
    WHERE deja."nom" = replace(un."nom", ' niveau 1', '')
  );
