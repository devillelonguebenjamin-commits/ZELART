-- Ce que la personne en liste d'attente accepterait réellement.
--
-- Jusqu'ici, la seule indication était une phrase libre (« plutôt un samedi »),
-- que rien ne pouvait exploiter : chaque annulation prévenait tout le monde, et
-- consommait l'unique notification promise même quand le créneau ne convenait
-- pas. NULL signifie « n'importe quand », jamais « aucun jour ».
ALTER TABLE "ListeAttente" ADD COLUMN "joursSouhaites" TEXT;
ALTER TABLE "ListeAttente" ADD COLUMN "momentSouhaite" TEXT;
