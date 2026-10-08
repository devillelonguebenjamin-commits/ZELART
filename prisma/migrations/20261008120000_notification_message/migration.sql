-- Le moment où un message de Zélia a été signalé à la cliente par e-mail.
--
-- Chaque message de Zélia partait aussitôt par e-mail, sans limite : une
-- conversation de cinq échanges dans l'après-midi, c'était cinq e-mails. Au-delà
-- de deux par jour, le message reste dans l'espace de la cliente sans e-mail.
-- Cette date est ce qui permet de compter. Nulle quand aucun e-mail n'est parti :
-- plafond atteint, cliente sans adresse, ou envoi en échec.
ALTER TABLE "MessageCliente" ADD COLUMN "emailEnvoyeLe" TIMESTAMP(3);
