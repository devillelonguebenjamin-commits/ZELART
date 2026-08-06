-- Mot laissé par Zélia au moment de valider la venue d'une cliente, distinct de
-- la fiche technique : celle-ci décrit la pose, celui-ci raconte la visite.

ALTER TABLE "RendezVous" ADD COLUMN "commentaireVisite" TEXT;
