-- Trois données que personne ne notait, et sans lesquelles le tableau de bord
-- ne peut rien dire de ce qui se décide.

-- 1. L'heure à laquelle la cliente est réellement partie.
--
-- Les durées du catalogue pilotent les créneaux proposés aux clientes. Rien ne
-- les confronte à la réalité : sous-estimées, chaque journée déborde, et la
-- fatigue vient d'une erreur de tableur que personne ne peut constater.
--
-- Nulle tant que rien n'est saisi : l'absence de mesure ne doit pas se
-- confondre avec une prestation qui aurait duré exactement le temps prévu.
ALTER TABLE "RendezVous" ADD COLUMN "finReelle" TIMESTAMP(3);

-- 2. Le moment où une demande a cessé d'attendre.
--
-- Seul l'état final était conservé : on savait qu'un rendez-vous est confirmé,
-- jamais s'il l'a été en dix minutes ou en deux jours. Or une demande qui
-- attend deux jours est souvent une cliente qui a réservé ailleurs entre-temps.
--
-- Rétroactivement inconnaissable, donc laissée nulle sur l'existant : les
-- moyennes ne porteront que sur les demandes reçues à partir d'ici, et le
-- diront.
ALTER TABLE "RendezVous" ADD COLUMN "repondueLe" TIMESTAMP(3);

-- 3. Le coût matière indicatif d'une prestation.
--
-- Ce qui transforme un chiffre d'affaires en marge. Nul par défaut, et c'est
-- volontaire : un coût jamais renseigné est une information absente, un coût
-- figé à zéro serait une marge fausse qui a l'air juste.
ALTER TABLE "Prestation" ADD COLUMN "coutMatiereCents" INTEGER;
