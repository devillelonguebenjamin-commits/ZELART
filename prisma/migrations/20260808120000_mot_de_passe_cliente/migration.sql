-- Mot de passe facultatif pour l'espace cliente. Nul par défaut : personne n'en
-- a, et le lien reçu par e-mail continue de fonctionner pour tout le monde.
ALTER TABLE "Cliente" ADD COLUMN "motDePasseHash" TEXT;
