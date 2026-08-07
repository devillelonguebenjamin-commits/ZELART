-- Nouveau barème du programme Squad.
--
-- Les anciennes valeurs de TypeAvantage sont conservées : un avantage déjà
-- gagné reste ce qu'il était. Réutiliser les mêmes valeurs avec de nouveaux
-- libellés aurait transformé rétroactivement un « −15 % » promis en « huile à
-- cuticule », ce qu'aucune cliente n'accepterait.

ALTER TYPE "TypeAvantage" ADD VALUE IF NOT EXISTS 'BESTIE_HUILE';
ALTER TYPE "TypeAvantage" ADD VALUE IF NOT EXISTS 'SQUAD_REMISE';
ALTER TYPE "TypeAvantage" ADD VALUE IF NOT EXISTS 'ICONE_NAIL_ART';

-- La remise filleule était un simple drapeau, le pourcentage vivant dans le
-- code : passer de 15 à 10 aurait rétroactivement réduit la remise annoncée aux
-- demandes déjà envoyées. On fige donc le taux sur le rendez-vous, et on
-- rattrape l'existant au taux qui avait cours.
ALTER TABLE "RendezVous" ADD COLUMN "remiseFilleulePourcent" INTEGER;
UPDATE "RendezVous" SET "remiseFilleulePourcent" = 15 WHERE "remiseFilleule" = true;
