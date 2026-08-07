-- Repos le dimanche et le lundi, à partir d'octobre 2026.
--
-- Le dimanche était déjà fermé. Le lundi doit le devenir, mais **pas tout de
-- suite** : les lundis d'août et de septembre restent ouverts, et ceux déjà
-- réservés doivent le rester. Une simple suppression de la ligne les aurait
-- fermés rétroactivement, retirant de l'agenda des rendez-vous pris.
--
-- D'où une période de validité sur le calendrier d'ouverture : la ligne du
-- lundi cesse de s'appliquer après le 30 septembre 2026, sans disparaître.

ALTER TABLE "Disponibilite"
  ADD COLUMN "actifDu" TIMESTAMP(3),
  ADD COLUMN "actifJusquau" TIMESTAMP(3);

UPDATE "Disponibilite"
   SET "actifJusquau" = TIMESTAMP '2026-09-30 00:00:00'
 WHERE "jourSemaine" = 1;
