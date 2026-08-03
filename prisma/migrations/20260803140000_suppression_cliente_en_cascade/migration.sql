-- Permet d'effacer une cliente et son historique en une opération
-- (droit à l'effacement annoncé dans la politique de confidentialité).
ALTER TABLE "RendezVous" DROP CONSTRAINT "RendezVous_clienteId_fkey";

ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
