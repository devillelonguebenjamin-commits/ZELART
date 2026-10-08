-- Un rendez-vous rétabli à la main ne doit plus jamais être réannulé par le site.
--
-- Le bouton « Rétablir » remettait le rendez-vous en confirmé sans toucher à la
-- date de demande d'acompte. Vieille de plus de 48 h, elle le désignait de
-- nouveau à la libération automatique, qui le réannulait au passage suivant —
-- moins de 24 h après que Zélia l'avait rétabli. Deux fois de suite pour le
-- même rendez-vous.

-- Posé quand Zélia maintient un rendez-vous sans exiger l'acompte : la
-- libération automatique ne le touche plus. C'est une décision humaine, et un
-- automate n'a pas à la défaire.
ALTER TABLE "RendezVous" ADD COLUMN "maintenuManuellementLe" TIMESTAMP(3);

-- Posé quand Zélia a examiné une annulation et choisi de la laisser en place.
-- Sans lui, une annulation voulue restait dans le bloc « à vérifier » jusqu'à
-- la date du rendez-vous, sans moyen de l'en sortir.
ALTER TABLE "RendezVous" ADD COLUMN "annulationConfirmeeLe" TIMESTAMP(3);
