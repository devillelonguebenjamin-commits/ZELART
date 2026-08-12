-- Acompte non demandé aux clientes déjà connues.
--
-- L'acompte protège d'une inconnue qui ne vient pas. Il n'avait aucun sens pour
-- les clientes que Zélia reçoit depuis longtemps : le site ne voyait d'elles
-- qu'une fiche sans rendez-vous enregistré, les déclarait « nouvelles », et leur
-- réclamait quinze euros pour un fauteuil qu'elles occupent tous les mois.
ALTER TABLE "Cliente" ADD COLUMN "acompteDispense" BOOLEAN NOT NULL DEFAULT false;

-- Toutes les fiches qui existent aujourd'hui sont, par définition, celles de
-- clientes déjà connues : elles ont été saisies par Zélia ou ont déjà réservé.
-- Les suivantes partiront à false, sinon une inscription en ligne suffirait à
-- contourner l'acompte et il ne servirait plus à rien.
UPDATE "Cliente" SET "acompteDispense" = true;
