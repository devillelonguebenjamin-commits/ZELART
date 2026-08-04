-- Prix figé à la demande : le tableau de bord ne doit pas voir son historique
-- réécrit à chaque changement de tarif. Les lignes déjà enregistrées gardent
-- NULL et retombent sur le tarif courant de la prestation.
ALTER TABLE "LignePrestation" ADD COLUMN "prixCents" INTEGER;
